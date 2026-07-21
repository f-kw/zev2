import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {request} from 'node:http';
import path from 'node:path';
import test from 'node:test';

import {openPresentationFirstRealDataVerifiedFileV001} from './presentation_first_real_data_gate_v001.mjs';
import {
  createPresentationFirstRealDataGateServerV001,
  loadPresentationFirstRealDataServingInputsV001,
  parsePresentationFirstRealDataGateServerCliV001,
  parsePresentationMediaRangeV001,
} from './serve_presentation_first_real_data_gate_v001.mjs';

test('単一bytes rangeだけを正確に解決する', () => {
  assert.equal(parsePresentationMediaRangeV001(undefined, 10), null);
  assert.deepEqual(parsePresentationMediaRangeV001('bytes=2-5', 10), {
    status: 'partial', start: 2, end: 5, length: 4,
  });
  assert.deepEqual(parsePresentationMediaRangeV001('bytes=7-', 10), {
    status: 'partial', start: 7, end: 9, length: 3,
  });
  assert.deepEqual(parsePresentationMediaRangeV001('bytes=-3', 10), {
    status: 'partial', start: 7, end: 9, length: 3,
  });
  assert.deepEqual(parsePresentationMediaRangeV001('bytes=10-11', 10), {status: 'invalid'});
  assert.deepEqual(parsePresentationMediaRangeV001('bytes=1-2,4-5', 10), {status: 'invalid'});
});

const fetchLocal = (port, {method = 'GET', pathname = '/', headers = {}} = {}) => new Promise((resolve, reject) => {
  const req = request({host: '127.0.0.1', port, method, path: pathname, headers}, (response) => {
    const chunks = [];
    response.on('data', (chunk) => chunks.push(chunk));
    response.on('end', () => resolve({
      status: response.statusCode,
      headers: response.headers,
      body: Buffer.concat(chunks),
    }));
  });
  req.on('error', reject);
  req.end();
});

test('確認HTMLとmedia rangeだけをread-onlyで配信し一時directoryを削除する', async () => {
  const base = path.resolve('evals/clip_composition/outputs/presentation');
  const directory = await mkdtemp(path.join(base, '.zev-real-gate-server-'));
  const reviewHtmlPath = path.join(directory, 'review.html');
  const mediaPath = path.join(directory, 'media.mp4');
  const reviewHtmlBytes = Buffer.from('<!doctype html><title>review</title>');
  const mediaBytes = Buffer.from([0, 1, 2, 3, 4, 5]);
  let mediaResource = null;
  let server = null;
  try {
    await writeFile(reviewHtmlPath, reviewHtmlBytes);
    await writeFile(mediaPath, mediaBytes);
    mediaResource = await openPresentationFirstRealDataVerifiedFileV001({
      path: path.relative(process.cwd(), mediaPath),
      fileSha256: createHash('sha256').update(mediaBytes).digest('hex'),
    });
    server = createPresentationFirstRealDataGateServerV001({reviewHtmlBytes, mediaResource});
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;

    const page = await fetchLocal(port, {pathname: '/review.html'});
    assert.equal(page.status, 200);
    assert.match(page.body.toString(), /review/);
    assert.equal(page.headers['cache-control'], 'no-store');

    const partial = await fetchLocal(port, {pathname: '/media', headers: {range: 'bytes=1-3'}});
    assert.equal(partial.status, 206);
    assert.deepEqual([...partial.body], [1, 2, 3]);
    assert.equal(partial.headers['content-range'], 'bytes 1-3/6');

    const writeAttempt = await fetchLocal(port, {method: 'POST', pathname: '/review.html'});
    assert.equal(writeAttempt.status, 405);
    const unknown = await fetchLocal(port, {pathname: '/not-registered'});
    assert.equal(unknown.status, 404);
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    if (mediaResource) await mediaResource.close();
    await rm(directory, {recursive: true, force: true});
  }
});

test('正式配信loaderは固定review-pageとHTMLと実行媒体だけを返す', async () => {
  const servingInputs = await loadPresentationFirstRealDataServingInputsV001();
  try {
    assert.match(servingInputs.reviewHtmlBytes.toString('utf8'), /初回実データ接続 内部詰め確認/u);
    assert.match(servingInputs.references.reviewPage.path, /review-page\.json$/u);
    assert.match(servingInputs.references.reviewHtml.path, /review\.html$/u);
    assert.deepEqual(
      servingInputs.references.executionMedia,
      {
        path: servingInputs.mediaResource.path,
        fileSha256: servingInputs.mediaResource.fileSha256,
      },
    );
  } finally {
    await servingInputs.mediaResource.close();
  }
});

test('正式配信CLIは固定localhost:4318以外と別HTML・別media・未知引数を拒否する', () => {
  assert.deepEqual(parsePresentationFirstRealDataGateServerCliV001([]), {
    host: '127.0.0.1', port: 4318,
  });
  assert.deepEqual(
    parsePresentationFirstRealDataGateServerCliV001(['--host', '127.0.0.1', '--port', '4318']),
    {host: '127.0.0.1', port: 4318},
  );
  assert.throws(
    () => parsePresentationFirstRealDataGateServerCliV001(['--host', '0.0.0.0']),
    /--hostは127\.0\.0\.1に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataGateServerCliV001(['--host', 'localhost']),
    /--hostは127\.0\.0\.1に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataGateServerCliV001(['--port', '4319']),
    /--portは4318に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataGateServerCliV001(['--port', 'not-a-number']),
    /--portは4318に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataGateServerCliV001(['--host', '127.0.0.1', '--host', '127.0.0.1']),
    /CLI引数が重複/u,
  );
  for (const flag of ['--review-html', '--media', '--summary']) {
    assert.throws(
      () => parsePresentationFirstRealDataGateServerCliV001([flag, '/tmp/alternate']),
      /未対応のCLI引数/u,
    );
  }
  assert.throws(
    () => createPresentationFirstRealDataGateServerV001({
      reviewHtmlPath: '/tmp/alternate.html', mediaPath: '/tmp/alternate.mp4',
    }),
    /verified reviewHtmlBytes and mediaResource/u,
  );
});

test('正式配信loaderへ別summary・HTML・mediaを注入できない', async () => {
  await assert.rejects(
    loadPresentationFirstRealDataServingInputsV001({
      summaryPath: '/tmp/alternate-summary.json',
      reviewHtmlPath: '/tmp/alternate.html',
      mediaPath: '/tmp/alternate.mp4',
    }),
    /does not accept alternate files/u,
  );
});

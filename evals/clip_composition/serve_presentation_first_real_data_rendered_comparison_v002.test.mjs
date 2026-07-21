import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {request} from 'node:http';
import test from 'node:test';

import {
  closePresentationFirstRealDataRenderedComparisonServingInputsV002,
  createPresentationFirstRealDataRenderedComparisonServerV002,
  loadPresentationFirstRealDataRenderedComparisonServingInputsV002,
  parsePresentationFirstRealDataRenderedComparisonServerCliV002,
  PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V002,
} from './serve_presentation_first_real_data_rendered_comparison_v002.mjs';
import {
  PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001,
  PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fetchLocal = (port, {method = 'GET', pathname = '/', headers = {}} = {}) => new Promise(
  (resolve, reject) => {
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
  },
);

test('v002 summaryの実byte hashをコード定数で固定する', async () => {
  assert.equal(
    sha256(await readFile(PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH)),
    PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V002,
  );
});
test('v002 loaderは引数を取らず、固定provenanceと4媒体を検証済みで開く', async () => {
  await assert.rejects(
    loadPresentationFirstRealDataRenderedComparisonServingInputsV002({
      summaryPath: 'evals/clip_composition/outputs/presentation/alternate.json',
    }),
    /does not accept alternate files/u,
  );
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV002();
  try {
    assert.equal(servingInputs.reviewHtmlBytes.subarray(0, 15).toString('utf8'), '<!doctype html>');
    assert.deepEqual([...servingInputs.mediaResources.keys()], [
      'keep-both', 'cut-both', 'cut-gap1', 'cut-gap2',
    ]);
    assert.deepEqual(
      servingInputs.references.comparisonProvenance,
      PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001,
    );
    assert.equal(servingInputs.loadedJson.reviewPage.inspectionPlayback.points.length, 8);
    assert.equal(servingInputs.loadedJson.comparisonProvenance.humanReviewOnly, true);
    assert.equal(servingInputs.loadedJson.comparisonProvenance.formalAssemblyDecision, false);
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(servingInputs);
  }
});

test('v002 read-only serverは固定HTMLと4媒体だけを配信し来歴を公開しない', async () => {
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV002();
  const server = createPresentationFirstRealDataRenderedComparisonServerV002(servingInputs);
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    const page = await fetchLocal(port, {pathname: '/review.html'});
    assert.equal(page.status, 200);
    assert.equal(page.body.includes(Buffer.from('確認箇所1を2秒前から再生')), true);
    const media = await fetchLocal(port, {
      method: 'HEAD',
      pathname: '/preview/cut-both.mp4',
      headers: {range: 'bytes=0-31'},
    });
    assert.equal(media.status, 206);
    assert.equal(media.headers['content-range'].startsWith('bytes 0-31/'), true);
    assert.equal((await fetchLocal(port, {pathname: '/comparison-preview-provenance.json'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/comparison-preview-build-summary.json'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/review.html?alternate=1'})).status, 404);
    assert.equal((await fetchLocal(port, {method: 'POST', pathname: '/review.html'})).status, 405);
  } finally {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(servingInputs);
  }
});

test('v002正式CLIは127.0.0.1:4318だけを許可しartifact差し替えを拒否する', () => {
  assert.deepEqual(parsePresentationFirstRealDataRenderedComparisonServerCliV002([]), {
    host: '127.0.0.1', port: 4318,
  });
  assert.deepEqual(parsePresentationFirstRealDataRenderedComparisonServerCliV002([
    '--host', '127.0.0.1', '--port', '4318',
  ]), {host: '127.0.0.1', port: 4318});
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV002(['--host', '0.0.0.0']),
    /127\.0\.0\.1/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV002(['--port', '4319']),
    /4318/u,
  );
  for (const flag of ['--summary', '--page', '--provenance', '--manifest', '--media']) {
    assert.throws(
      () => parsePresentationFirstRealDataRenderedComparisonServerCliV002([flag, '/tmp/alternate']),
      /未対応/u,
    );
  }
});

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, rename, rm, writeFile} from 'node:fs/promises';
import {request} from 'node:http';
import path from 'node:path';
import test from 'node:test';

import {openPresentationFirstRealDataVerifiedFileV001} from './presentation_first_real_data_gate_v001.mjs';
import {
  assertPresentationFirstRealDataRenderedComparisonReferenceChainV001,
  closePresentationFirstRealDataRenderedComparisonServingInputsV001,
  createPresentationFirstRealDataRenderedComparisonServerV001,
  loadPresentationFirstRealDataRenderedComparisonServingInputsV001,
  parsePresentationFirstRealDataRenderedComparisonServerCliV001,
  PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001,
} from './serve_presentation_first_real_data_rendered_comparison_v001.mjs';

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

const openFixedTestResources = async (directory) => {
  const entries = [];
  for (const [index, variantId] of PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.entries()) {
    const mediaPath = path.join(directory, `${variantId}.mp4`);
    const bytes = Buffer.from([index, index + 1, index + 2, index + 3, index + 4]);
    await writeFile(mediaPath, bytes);
    const resource = await openPresentationFirstRealDataVerifiedFileV001({
      path: path.relative(process.cwd(), mediaPath),
      fileSha256: sha256(bytes),
    });
    entries.push([variantId, resource]);
  }
  return new Map(entries);
};

const makeReferenceChainFixture = () => {
  const mediaVariants = PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.map((variantId) => ({
    variantId,
    path: `evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v001/media/${variantId}.mp4`,
    fileSha256: sha256(Buffer.from(variantId)),
  }));
  const comparisonManifest = {
    path: 'evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v001/comparison-preview-manifest.json',
    fileSha256: sha256(Buffer.from('manifest')),
  };
  return {
    artifactBindings: {comparisonManifest, mediaVariants},
    reviewPage: {
      schemaVersion: 'presentation-first-real-data-rendered-comparison-page-v001',
      pageId: 'page-v001',
      pageRevision: 'revision-v001',
      comparisonManifest,
      candidate: {candidateId: 13},
      mediaVariants: mediaVariants.map((entry) => ({
        variantId: entry.variantId,
        url: `/preview/${entry.variantId}.mp4`,
        fileSha256: entry.fileSha256,
      })),
    },
    comparisonManifest: {
      schemaVersion: 'presentation-first-real-data-rendered-comparison-manifest-v001',
      manifestId: 'manifest-v001',
      human_review_only: true,
      formalOutput: false,
      candidate: {candidateId: 13},
      gaps: [],
      mediaVariants: mediaVariants.map((entry) => ({
        variantId: entry.variantId,
        url: `/preview/${entry.variantId}.mp4`,
        fileSha256: entry.fileSha256,
      })),
    },
  };
};

test('page・manifest・summaryの4媒体path/hashと固定routeを相互照合する', () => {
  const fixture = makeReferenceChainFixture();
  assert.doesNotThrow(() => (
    assertPresentationFirstRealDataRenderedComparisonReferenceChainV001(fixture)
  ));

  const wrongPageHash = structuredClone(fixture);
  wrongPageHash.reviewPage.mediaVariants[0].fileSha256 = sha256(Buffer.from('alternate'));
  assert.throws(
    () => assertPresentationFirstRealDataRenderedComparisonReferenceChainV001(wrongPageHash),
    /review-page media binding mismatch: keep-both/u,
  );

  const wrongManifestHash = structuredClone(fixture);
  wrongManifestHash.comparisonManifest.mediaVariants[1].fileSha256 = sha256(
    Buffer.from('alternate'),
  );
  assert.throws(
    () => assertPresentationFirstRealDataRenderedComparisonReferenceChainV001(wrongManifestHash),
    /manifest media binding mismatch: cut-both/u,
  );

  const wrongRoute = structuredClone(fixture);
  wrongRoute.reviewPage.mediaVariants[2].url = '/preview/keep-both.mp4';
  assert.throws(
    () => assertPresentationFirstRealDataRenderedComparisonReferenceChainV001(wrongRoute),
    /review-page media binding mismatch: cut-gap1/u,
  );

  const missingManifestBinding = structuredClone(fixture);
  delete missingManifestBinding.reviewPage.comparisonManifest;
  assert.throws(
    () => assertPresentationFirstRealDataRenderedComparisonReferenceChainV001(
      missingManifestBinding,
    ),
    /review-page schema mismatch/u,
  );
});

test('固定reviewと4つの実媒体だけをGET/HEAD/Rangeで配信する', async () => {
  const parent = path.resolve('evals/clip_composition/outputs/presentation');
  const directory = await mkdtemp(path.join(parent, '.zev-rendered-comparison-server-'));
  const reviewHtmlBytes = Buffer.from('<!doctype html><title>rendered comparison</title>');
  let mediaResources;
  let server;
  try {
    mediaResources = await openFixedTestResources(directory);
    server = createPresentationFirstRealDataRenderedComparisonServerV001({
      reviewHtmlBytes,
      mediaResources,
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;

    const page = await fetchLocal(port, {pathname: '/review.html'});
    assert.equal(page.status, 200);
    assert.deepEqual(page.body, reviewHtmlBytes);
    assert.equal(page.headers['cache-control'], 'no-store');
    const pageHead = await fetchLocal(port, {method: 'HEAD', pathname: '/review.html'});
    assert.equal(pageHead.status, 200);
    assert.equal(pageHead.body.length, 0);
    assert.equal(pageHead.headers['content-length'], String(reviewHtmlBytes.length));

    for (const [index, variantId] of PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.entries()) {
      const route = `/preview/${variantId}.mp4`;
      const full = await fetchLocal(port, {pathname: route});
      assert.equal(full.status, 200);
      assert.deepEqual([...full.body], [index, index + 1, index + 2, index + 3, index + 4]);
      assert.equal(full.headers['content-type'], 'video/mp4');
      const partial = await fetchLocal(port, {pathname: route, headers: {range: 'bytes=1-3'}});
      assert.equal(partial.status, 206);
      assert.deepEqual([...partial.body], [index + 1, index + 2, index + 3]);
      assert.equal(partial.headers['content-range'], 'bytes 1-3/5');
      const head = await fetchLocal(port, {
        method: 'HEAD',
        pathname: route,
        headers: {range: 'bytes=2-'},
      });
      assert.equal(head.status, 206);
      assert.equal(head.body.length, 0);
      assert.equal(head.headers['content-range'], 'bytes 2-4/5');
    }

    assert.equal((await fetchLocal(port, {pathname: '/'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/review.html?alternate=1'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/preview/keep-both.mp4?x=1'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/preview/unknown.mp4'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/comparison-preview-build-summary.json'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/review-page.json'})).status, 404);
    assert.equal((await fetchLocal(port, {pathname: '/comparison-preview-manifest.json'})).status, 404);
    const invalidRange = await fetchLocal(port, {
      pathname: '/preview/cut-both.mp4',
      headers: {range: 'bytes=9-10'},
    });
    assert.equal(invalidRange.status, 416);
    assert.equal(invalidRange.headers['content-range'], 'bytes */5');
    const writeAttempt = await fetchLocal(port, {method: 'POST', pathname: '/review.html'});
    assert.equal(writeAttempt.status, 405);
    assert.equal(writeAttempt.headers.allow, 'GET, HEAD');
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    if (mediaResources) {
      await closePresentationFirstRealDataRenderedComparisonServingInputsV001({mediaResources});
    }
    await rm(directory, {recursive: true, force: true});
  }
});

test('検証後にmedia pathを差し替えると保持handleを別物として配信せず停止する', async () => {
  const parent = path.resolve('evals/clip_composition/outputs/presentation');
  const directory = await mkdtemp(path.join(parent, '.zev-rendered-comparison-swap-'));
  let mediaResources;
  let server;
  try {
    mediaResources = await openFixedTestResources(directory);
    server = createPresentationFirstRealDataRenderedComparisonServerV001({
      reviewHtmlBytes: Buffer.from('<!doctype html><title>review</title>'),
      mediaResources,
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const port = server.address().port;
    const targetPath = path.join(directory, 'keep-both.mp4');
    const displacedPath = path.join(directory, 'keep-both-original.mp4');
    await rename(targetPath, displacedPath);
    await writeFile(targetPath, Buffer.from([9, 9, 9, 9, 9]));
    const result = await fetchLocal(port, {pathname: '/preview/keep-both.mp4'});
    assert.equal(result.status, 500);
    assert.equal(result.body.length, 0);
    assert.equal(result.headers['x-zev-error'], 'UNEXPECTED_READ_ERROR');
  } finally {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    if (mediaResources) {
      await closePresentationFirstRealDataRenderedComparisonServingInputsV001({mediaResources});
    }
    await rm(directory, {recursive: true, force: true});
  }
});

test('server constructorは固定順4媒体以外を受け付けない', async () => {
  const parent = path.resolve('evals/clip_composition/outputs/presentation');
  const directory = await mkdtemp(path.join(parent, '.zev-rendered-comparison-constructor-'));
  let mediaResources;
  try {
    mediaResources = await openFixedTestResources(directory);
    const missing = new Map(mediaResources);
    missing.delete('cut-gap2');
    assert.throws(
      () => createPresentationFirstRealDataRenderedComparisonServerV001({
        reviewHtmlBytes: Buffer.from('review'), mediaResources: missing,
      }),
      /all four fixed verified preview resources/u,
    );
    const reordered = new Map([
      ['cut-both', mediaResources.get('cut-both')],
      ['keep-both', mediaResources.get('keep-both')],
      ['cut-gap1', mediaResources.get('cut-gap1')],
      ['cut-gap2', mediaResources.get('cut-gap2')],
    ]);
    assert.throws(
      () => createPresentationFirstRealDataRenderedComparisonServerV001({
        reviewHtmlBytes: Buffer.from('review'), mediaResources: reordered,
      }),
      /fixed order/u,
    );
    const extra = new Map(mediaResources);
    extra.set('alternate', mediaResources.get('keep-both'));
    assert.throws(
      () => createPresentationFirstRealDataRenderedComparisonServerV001({
        reviewHtmlBytes: Buffer.from('review'), mediaResources: extra,
      }),
      /all four fixed verified preview resources/u,
    );
    assert.throws(
      () => createPresentationFirstRealDataRenderedComparisonServerV001({
        reviewHtmlBytes: Buffer.alloc(0), mediaResources,
      }),
      /verified reviewHtmlBytes/u,
    );
  } finally {
    if (mediaResources) {
      await closePresentationFirstRealDataRenderedComparisonServingInputsV001({mediaResources});
    }
    await rm(directory, {recursive: true, force: true});
  }
});

test('正式CLIは127.0.0.1:4318以外と任意artifact指定を拒否する', () => {
  assert.deepEqual(parsePresentationFirstRealDataRenderedComparisonServerCliV001([]), {
    host: '127.0.0.1', port: 4318,
  });
  assert.deepEqual(
    parsePresentationFirstRealDataRenderedComparisonServerCliV001([
      '--host', '127.0.0.1', '--port', '4318',
    ]),
    {host: '127.0.0.1', port: 4318},
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV001(['--host', '0.0.0.0']),
    /--hostは127\.0\.0\.1に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV001(['--host', 'localhost']),
    /--hostは127\.0\.0\.1に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV001(['--port', '4319']),
    /--portは4318に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV001(['--port', 'invalid']),
    /--portは4318に固定/u,
  );
  assert.throws(
    () => parsePresentationFirstRealDataRenderedComparisonServerCliV001([
      '--host', '127.0.0.1', '--host', '127.0.0.1',
    ]),
    /CLI引数が重複/u,
  );
  for (const flag of ['--summary', '--review-html', '--review-page', '--manifest', '--media']) {
    assert.throws(
      () => parsePresentationFirstRealDataRenderedComparisonServerCliV001([
        flag, '/tmp/alternate',
      ]),
      /未対応のCLI引数/u,
    );
  }
});

test('正式loaderへ別summary・HTML・manifest・mediaを注入できない', async () => {
  await assert.rejects(
    loadPresentationFirstRealDataRenderedComparisonServingInputsV001({
      summaryPath: '/tmp/alternate-summary.json',
      reviewHtmlPath: '/tmp/alternate.html',
      manifestPath: '/tmp/alternate.json',
      mediaRoot: '/tmp/media',
    }),
    /does not accept alternate files/u,
  );
});

test('pin済みsummaryから実HTMLと実MP4 4本を固定順で開ける', async () => {
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV001();
  try {
    assert.equal(servingInputs.reviewHtmlBytes.subarray(0, 15).toString('utf8'), '<!doctype html>');
    assert.deepEqual(
      [...servingInputs.mediaResources.keys()],
      PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001,
    );
    assert.equal(servingInputs.loadedJson.comparisonManifest.human_review_only, true);
    assert.equal(servingInputs.loadedJson.comparisonManifest.formalOutput, false);
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV001(servingInputs);
  }
});

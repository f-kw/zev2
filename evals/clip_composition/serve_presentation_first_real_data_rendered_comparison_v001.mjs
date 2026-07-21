#!/usr/bin/env node

import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  loadPresentationFirstRealDataArtifactBindingV001,
  openPresentationFirstRealDataVerifiedFileV001,
  presentationFirstRealDataCanonicalSha256,
  readPresentationFirstRealDataVerifiedFileBytesV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {parsePresentationMediaRangeV001} from './serve_presentation_first_real_data_gate_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260722-first-real-data-rendered-comparison-v001',
);
const OUTPUT_REPO_PATH = path.relative(WORKSPACE_ROOT, OUTPUT_DIRECTORY);
const SUMMARY_REPO_PATH = path.join(OUTPUT_REPO_PATH, 'comparison-preview-build-summary.json');
const REVIEW_HTML_REPO_PATH = path.join(OUTPUT_REPO_PATH, 'review.html');
const REVIEW_PAGE_REPO_PATH = path.join(OUTPUT_REPO_PATH, 'review-page.json');
const MANIFEST_REPO_PATH = path.join(OUTPUT_REPO_PATH, 'comparison-preview-manifest.json');

export const PRESENTATION_RENDERED_COMPARISON_SUMMARY_SCHEMA_V001 =
  'presentation-rendered-comparison-build-summary-v001';
export const PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-manifest-v001';
export const PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V001 =
  'presentation-first-real-data-rendered-comparison-page-v001';
export const PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V001 =
  '612f0c8d80a5619a36162ba1e7e783f5d61aab853ce49a9dcff557714d33db1c';
export const PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V001 = '127.0.0.1';
export const PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V001 = 4318;
export const PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001 = Object.freeze([
  'keep-both',
  'cut-both',
  'cut-gap1',
  'cut-gap2',
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const exactFields = (value, expected) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const isReference = (value) => exactFields(value, ['path', 'fileSha256'])
  && typeof value.path === 'string'
  && SHA256_PATTERN.test(value.fileSha256);
const expectedMediaPath = (variantId) => path.join(
  OUTPUT_REPO_PATH,
  'media',
  `${variantId}.mp4`,
);
const fixedPreviewRoute = (variantId) => `/preview/${variantId}.mp4`;

const endEmpty = (response, status, headers = {}) => {
  response.writeHead(status, headers);
  response.end();
};

const serveHtml = (request, response, reviewHtmlBytes) => {
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'content-length': String(reviewHtmlBytes.length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else response.end(reviewHtmlBytes);
};

const servePreviewMedia = async (request, response, mediaResource) => {
  await mediaResource.assertUnchanged();
  const headers = {
    'content-type': 'video/mp4',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  const range = parsePresentationMediaRangeV001(request.headers.range, mediaResource.size);
  if (range?.status === 'invalid') {
    endEmpty(response, 416, {...headers, 'content-range': `bytes */${mediaResource.size}`});
    return;
  }
  if (range?.status === 'partial') {
    response.writeHead(206, {
      ...headers,
      'accept-ranges': 'bytes',
      'content-range': `bytes ${range.start}-${range.end}/${mediaResource.size}`,
      'content-length': String(range.length),
    });
    if (request.method === 'HEAD') response.end();
    else mediaResource.fileHandle.createReadStream({
      start: range.start,
      end: range.end,
      autoClose: false,
    }).pipe(response);
    return;
  }
  response.writeHead(200, {
    ...headers,
    'accept-ranges': 'bytes',
    'content-length': String(mediaResource.size),
  });
  if (request.method === 'HEAD') response.end();
  else mediaResource.fileHandle.createReadStream({start: 0, autoClose: false}).pipe(response);
};

const normalizeMediaResources = (mediaResources) => {
  const entries = mediaResources instanceof Map
    ? [...mediaResources.entries()]
    : Object.entries(mediaResources ?? {});
  const expected = [...PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001];
  if (
    entries.length !== expected.length
    || entries.some(([variantId], index) => variantId !== expected[index])
    || entries.some(([, resource]) => (
      !resource?.fileHandle
      || !Number.isInteger(resource.size)
      || resource.size <= 0
      || typeof resource.assertUnchanged !== 'function'
    ))
  ) throw new TypeError('all four fixed verified preview resources are required in fixed order');
  return new Map(entries);
};

export const createPresentationFirstRealDataRenderedComparisonServerV001 = ({
  reviewHtmlBytes,
  mediaResources,
}) => {
  if (!Buffer.isBuffer(reviewHtmlBytes) || reviewHtmlBytes.length === 0) {
    throw new TypeError('verified reviewHtmlBytes are required');
  }
  const fixedMediaResources = normalizeMediaResources(mediaResources);
  const routeToVariant = new Map(PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.map(
    (variantId) => [fixedPreviewRoute(variantId), variantId],
  ));
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method ?? '')) {
        endEmpty(response, 405, {allow: 'GET, HEAD'});
        return;
      }
      const requestTarget = request.url ?? '';
      const url = new URL(requestTarget, 'http://127.0.0.1');
      // Query、encoded alias、dot segmentを固定routeの別名として受理しない。
      if (requestTarget !== url.pathname || url.search !== '') {
        endEmpty(response, 404, {'content-type': 'text/plain; charset=utf-8'});
        return;
      }
      if (url.pathname === '/review.html') {
        serveHtml(request, response, reviewHtmlBytes);
        return;
      }
      const variantId = routeToVariant.get(url.pathname);
      if (variantId) {
        await servePreviewMedia(request, response, fixedMediaResources.get(variantId));
        return;
      }
      endEmpty(response, 404, {'content-type': 'text/plain; charset=utf-8'});
    } catch (error) {
      endEmpty(response, 500, {
        'content-type': 'text/plain; charset=utf-8',
        'x-zev-error': error?.code ?? 'UNEXPECTED_READ_ERROR',
      });
    }
  });
};

const validateFixedSummary = (summary) => {
  if (
    !exactFields(summary, ['schemaVersion', 'status', 'artifactBindings'])
    || summary.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_SUMMARY_SCHEMA_V001
    || summary.status !== 'passed'
    || !exactFields(summary.artifactBindings, [
      'reviewHtml', 'reviewPage', 'comparisonManifest', 'mediaVariants',
    ])
    || !isReference(summary.artifactBindings.reviewHtml)
    || !isReference(summary.artifactBindings.reviewPage)
    || !isReference(summary.artifactBindings.comparisonManifest)
    || !Array.isArray(summary.artifactBindings.mediaVariants)
    || summary.artifactBindings.mediaVariants.length
      !== PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.length
  ) throw new TypeError('fixed comparison-preview summary schema mismatch');

  const {artifactBindings} = summary;
  if (
    artifactBindings.reviewHtml.path !== REVIEW_HTML_REPO_PATH
    || artifactBindings.reviewPage.path !== REVIEW_PAGE_REPO_PATH
    || artifactBindings.comparisonManifest.path !== MANIFEST_REPO_PATH
  ) throw new TypeError('fixed comparison-preview artifact path mismatch');

  artifactBindings.mediaVariants.forEach((entry, index) => {
    const expectedVariantId = PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001[index];
    if (
      !exactFields(entry, ['variantId', 'path', 'fileSha256'])
      || entry.variantId !== expectedVariantId
      || entry.path !== expectedMediaPath(expectedVariantId)
      || !SHA256_PATTERN.test(entry.fileSha256)
    ) throw new TypeError(`fixed comparison-preview media reference mismatch: ${expectedVariantId}`);
  });
  return summary;
};

const readJsonObject = async (reference, label) => {
  const loaded = await readPresentationFirstRealDataVerifiedFileBytesV001(reference);
  let value;
  try {
    value = JSON.parse(loaded.bytes.toString('utf8'));
  } catch {
    throw new TypeError(`${label} is not valid JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} JSON root must be an object`);
  }
  return {...loaded, value};
};

/**
 * pageとmanifestがsummaryから独立した別媒体一式を指す状態を拒否する。
 * 個々のJSON schema検査は各生成側へ委譲し、ここでは固定されたpath/hash/routeの一致だけを見る。
 */
export const assertPresentationFirstRealDataRenderedComparisonReferenceChainV001 = ({
  artifactBindings,
  reviewPage,
  comparisonManifest,
}) => {
  if (
    !exactFields(reviewPage, [
      'schemaVersion', 'pageId', 'pageRevision', 'comparisonManifest', 'candidate',
      'mediaVariants',
    ])
    || reviewPage.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V001
    || !isReference(reviewPage.comparisonManifest)
    || !Array.isArray(reviewPage.mediaVariants)
    || reviewPage.mediaVariants.length !== PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.length
  ) throw new TypeError('fixed rendered-comparison review-page schema mismatch');
  if (
    !exactFields(comparisonManifest, [
      'schemaVersion', 'manifestId', 'human_review_only', 'formalOutput',
      'candidate', 'gaps', 'mediaVariants',
    ])
    || comparisonManifest.schemaVersion !== PRESENTATION_RENDERED_COMPARISON_MANIFEST_SCHEMA_V001
    || comparisonManifest.human_review_only !== true
    || comparisonManifest.formalOutput !== false
    || !Array.isArray(comparisonManifest.mediaVariants)
    || comparisonManifest.mediaVariants.length
      !== PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V001.length
  ) throw new TypeError('fixed rendered-comparison manifest schema mismatch');
  if (
    presentationFirstRealDataCanonicalSha256(reviewPage.candidate)
    !== presentationFirstRealDataCanonicalSha256(comparisonManifest.candidate)
  ) {
    throw new TypeError('review-page and comparison-preview manifest candidate mismatch');
  }
  if (
    reviewPage.comparisonManifest.path !== artifactBindings.comparisonManifest.path
    || reviewPage.comparisonManifest.fileSha256
      !== artifactBindings.comparisonManifest.fileSha256
  ) throw new TypeError('review-page does not bind the fixed comparison-preview manifest');

  for (const [index, mediaReference] of artifactBindings.mediaVariants.entries()) {
    const pageMedia = reviewPage.mediaVariants[index];
    const manifestMedia = comparisonManifest.mediaVariants[index];
    if (
      !exactFields(pageMedia, ['variantId', 'url', 'fileSha256'])
      || pageMedia.variantId !== mediaReference.variantId
      || pageMedia.fileSha256 !== mediaReference.fileSha256
      || pageMedia.url !== fixedPreviewRoute(mediaReference.variantId)
    ) {
      throw new TypeError(`review-page media binding mismatch: ${mediaReference.variantId}`);
    }
    if (
      !exactFields(manifestMedia, ['variantId', 'url', 'fileSha256'])
      || manifestMedia.variantId !== mediaReference.variantId
      || manifestMedia.fileSha256 !== mediaReference.fileSha256
      || manifestMedia.url !== fixedPreviewRoute(mediaReference.variantId)
    ) {
      throw new TypeError(`comparison-preview manifest media binding mismatch: ${mediaReference.variantId}`);
    }
  }
};

export const loadPresentationFirstRealDataRenderedComparisonServingInputsV001 = async (...args) => {
  if (args.length !== 0) {
    throw new TypeError('formal comparison server loader does not accept alternate files');
  }
  if (!SHA256_PATTERN.test(PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V001)) {
    throw new TypeError('comparison-preview summary hash has not been pinned');
  }
  const summaryBinding = await loadPresentationFirstRealDataArtifactBindingV001(SUMMARY_REPO_PATH);
  if (summaryBinding.fileSha256 !== PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V001) {
    throw new TypeError('fixed comparison-preview summary byte hash mismatch');
  }
  const summary = validateFixedSummary(summaryBinding.value);
  const {artifactBindings} = summary;
  const openedResources = [];
  try {
    const [reviewHtml, reviewPage, comparisonManifest] = await Promise.all([
      readPresentationFirstRealDataVerifiedFileBytesV001(artifactBindings.reviewHtml),
      readJsonObject(artifactBindings.reviewPage, 'review-page'),
      readJsonObject(artifactBindings.comparisonManifest, 'comparison-preview manifest'),
    ]);
    assertPresentationFirstRealDataRenderedComparisonReferenceChainV001({
      artifactBindings,
      reviewPage: reviewPage.value,
      comparisonManifest: comparisonManifest.value,
    });
    const mediaEntries = [];
    for (const reference of artifactBindings.mediaVariants) {
      const resource = await openPresentationFirstRealDataVerifiedFileV001({
        path: reference.path,
        fileSha256: reference.fileSha256,
      });
      openedResources.push(resource);
      mediaEntries.push([reference.variantId, resource]);
    }
    return {
      reviewHtmlBytes: reviewHtml.bytes,
      mediaResources: new Map(mediaEntries),
      references: {
        summary: {path: summaryBinding.path, fileSha256: summaryBinding.fileSha256},
        reviewHtml: {path: reviewHtml.path, fileSha256: reviewHtml.fileSha256},
        reviewPage: {path: reviewPage.path, fileSha256: reviewPage.fileSha256},
        comparisonManifest: {
          path: comparisonManifest.path,
          fileSha256: comparisonManifest.fileSha256,
        },
        mediaVariants: artifactBindings.mediaVariants.map((entry) => ({...entry})),
      },
      loadedJson: {
        reviewPage: reviewPage.value,
        comparisonManifest: comparisonManifest.value,
      },
    };
  } catch (error) {
    await Promise.allSettled(openedResources.map((resource) => resource.close()));
    throw error;
  }
};

export const closePresentationFirstRealDataRenderedComparisonServingInputsV001 = async (
  servingInputs,
) => {
  const resources = servingInputs?.mediaResources instanceof Map
    ? [...servingInputs.mediaResources.values()]
    : [];
  await Promise.allSettled(resources.map((resource) => resource.close()));
};

export const parsePresentationFirstRealDataRenderedComparisonServerCliV001 = (argv) => {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) {
      throw new Error('CLI引数は --name value 形式です');
    }
    if (values.has(flag)) throw new Error(`CLI引数が重複しています: ${flag}`);
    values.set(flag, value);
  }
  for (const flag of values.keys()) {
    if (!['--host', '--port'].includes(flag)) throw new Error(`未対応のCLI引数です: ${flag}`);
  }
  const host = values.get('--host') ?? PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V001;
  const port = Number(
    values.get('--port') ?? String(PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V001),
  );
  if (host !== PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V001) {
    throw new Error(`--hostは${PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V001}に固定されています`);
  }
  if (port !== PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V001) {
    throw new Error(`--portは${PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V001}に固定されています`);
  }
  return {host, port};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parsePresentationFirstRealDataRenderedComparisonServerCliV001(
    process.argv.slice(2),
  );
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV001();
  const server = createPresentationFirstRealDataRenderedComparisonServerV001(servingInputs);
  let resourcesClosed = false;
  const closeResources = async () => {
    if (resourcesClosed) return;
    resourcesClosed = true;
    await closePresentationFirstRealDataRenderedComparisonServingInputsV001(servingInputs);
  };
  server.once('close', () => { closeResources().catch(() => {}); });
  server.once('error', () => { closeResources().catch(() => {}); });
  server.listen(options.port, options.host, () => {
    process.stdout.write(`read-only rendered comparison: http://${options.host}:${options.port}/review.html\n`);
  });
}

#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  loadPresentationFirstRealDataArtifactBindingV001,
  openPresentationFirstRealDataVerifiedFileV001,
  presentationFirstRealDataCanonicalSha256,
  readPresentationFirstRealDataVerifiedFileBytesV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {buildTrustedPresentationFirstRealDataReviewBundleV001} from './prepare_presentation_first_real_data_gate_v001.mjs';
import {
  buildPresentationFirstRealDataReviewHtmlV001,
  validatePresentationFirstRealDataReviewPageV001,
} from './presentation_first_real_data_review_ui_v001.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/20260721-first-real-data-assembly-gate-v001',
);
const DEFAULT_REVIEW_HTML = path.join(DEFAULT_OUTPUT_DIRECTORY, 'review.html');
const DEFAULT_REVIEW_PAGE = path.join(DEFAULT_OUTPUT_DIRECTORY, 'review-page.json');
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const repoPath = (absolutePath) => path.relative(WORKSPACE_ROOT, absolutePath);
const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const FORMAL_HOST = '127.0.0.1';
const FORMAL_PORT = 4318;

export const parsePresentationMediaRangeV001 = (rangeHeader, size) => {
  if (!Number.isInteger(size) || size <= 0) throw new TypeError('size must be a positive integer');
  if (rangeHeader === undefined || rangeHeader === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/u.exec(String(rangeHeader).trim());
  if (!match || (match[1] === '' && match[2] === '')) return {status: 'invalid'};
  let start;
  let end;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return {status: 'invalid'};
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)
      || start < 0 || end < start || start >= size) return {status: 'invalid'};
  end = Math.min(end, size - 1);
  return {status: 'partial', start, end, length: end - start + 1};
};

const endEmpty = (response, status, headers = {}) => {
  response.writeHead(status, headers);
  response.end();
};

const serveHtml = (request, response, reviewHtmlBytes) => {
  const baseHeaders = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  response.writeHead(200, {...baseHeaders, 'content-length': String(reviewHtmlBytes.length)});
  if (request.method === 'HEAD') response.end();
  else response.end(reviewHtmlBytes);
};

const serveMedia = async (request, response, mediaResource) => {
  await mediaResource.assertUnchanged();
  const baseHeaders = {
    'content-type': 'video/mp4',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  };
  const range = parsePresentationMediaRangeV001(request.headers.range, mediaResource.size);
  if (range?.status === 'invalid') {
    endEmpty(response, 416, {...baseHeaders, 'content-range': `bytes */${mediaResource.size}`});
    return;
  }
  if (range?.status === 'partial') {
    response.writeHead(206, {
      ...baseHeaders,
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
    ...baseHeaders,
    'accept-ranges': 'bytes',
    'content-length': String(mediaResource.size),
  });
  if (request.method === 'HEAD') response.end();
  else mediaResource.fileHandle.createReadStream({start: 0, autoClose: false}).pipe(response);
};

export const createPresentationFirstRealDataGateServerV001 = ({reviewHtmlBytes, mediaResource}) => {
  if (!Buffer.isBuffer(reviewHtmlBytes)
      || reviewHtmlBytes.length === 0
      || !mediaResource?.fileHandle
      || !Number.isInteger(mediaResource.size)
      || typeof mediaResource.assertUnchanged !== 'function') {
    throw new TypeError('verified reviewHtmlBytes and mediaResource are required');
  }
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method ?? '')) {
        endEmpty(response, 405, {allow: 'GET, HEAD'});
        return;
      }
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/' || url.pathname === '/review.html') {
        serveHtml(request, response, reviewHtmlBytes);
        return;
      }
      if (url.pathname === '/media') {
        await serveMedia(request, response, mediaResource);
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

export const loadPresentationFirstRealDataServingInputsV001 = async (...args) => {
  if (args.length !== 0) throw new TypeError('formal server loader does not accept alternate files');
  const trusted = await buildTrustedPresentationFirstRealDataReviewBundleV001();
  const expectedPage = trusted.bundle.page;
  const actualPageBinding = await loadPresentationFirstRealDataArtifactBindingV001(
    repoPath(DEFAULT_REVIEW_PAGE),
  );
  validatePresentationFirstRealDataReviewPageV001(actualPageBinding.value);
  if (
    actualPageBinding.valueCanonicalSha256
    !== presentationFirstRealDataCanonicalSha256(expectedPage)
  ) throw new TypeError('formal review-page does not match the fixed trusted bundle');
  const expectedHtmlBytes = Buffer.from(
    buildPresentationFirstRealDataReviewHtmlV001(expectedPage),
    'utf8',
  );
  const reviewHtml = await readPresentationFirstRealDataVerifiedFileBytesV001({
    path: repoPath(DEFAULT_REVIEW_HTML),
    fileSha256: sha256Bytes(expectedHtmlBytes),
  });
  if (!reviewHtml.bytes.equals(expectedHtmlBytes)) {
    throw new TypeError('formal review HTML does not match the fixed review-page');
  }
  const mediaResource = await openPresentationFirstRealDataVerifiedFileV001(
    trusted.sourceFiles.executionMedia,
  );
  return {
    reviewHtmlBytes: reviewHtml.bytes,
    mediaResource,
    references: {
      reviewPage: {path: actualPageBinding.path, fileSha256: actualPageBinding.fileSha256},
      reviewHtml: {path: reviewHtml.path, fileSha256: reviewHtml.fileSha256},
      executionMedia: trusted.sourceFiles.executionMedia,
    },
  };
};

export const parsePresentationFirstRealDataGateServerCliV001 = (argv) => {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error('CLI引数は --name value 形式です');
    if (values.has(flag)) throw new Error(`CLI引数が重複しています: ${flag}`);
    values.set(flag, value);
  }
  for (const flag of values.keys()) {
    if (!['--host', '--port'].includes(flag)) throw new Error(`未対応のCLI引数です: ${flag}`);
  }
  const host = values.get('--host') ?? FORMAL_HOST;
  const port = Number(values.get('--port') ?? String(FORMAL_PORT));
  if (host !== FORMAL_HOST) throw new Error(`--hostは${FORMAL_HOST}に固定されています`);
  if (port !== FORMAL_PORT) throw new Error(`--portは${FORMAL_PORT}に固定されています`);
  return {
    host,
    port,
  };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parsePresentationFirstRealDataGateServerCliV001(process.argv.slice(2));
  const servingInputs = await loadPresentationFirstRealDataServingInputsV001();
  const server = createPresentationFirstRealDataGateServerV001(servingInputs);
  let mediaClosed = false;
  const closeMedia = async () => {
    if (mediaClosed) return;
    mediaClosed = true;
    await servingInputs.mediaResource.close();
  };
  server.once('close', () => { closeMedia().catch(() => {}); });
  server.once('error', () => { closeMedia().catch(() => {}); });
  server.listen(options.port, options.host, () => {
    process.stdout.write(`read-only review: http://${options.host}:${options.port}/review.html\n`);
  });
}

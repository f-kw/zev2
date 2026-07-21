#!/usr/bin/env node

import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  loadPresentationFirstRealDataArtifactBindingV001,
  openPresentationFirstRealDataVerifiedFileV001,
  readPresentationFirstRealDataVerifiedFileBytesV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  closePresentationFirstRealDataRenderedComparisonServingInputsV001,
  createPresentationFirstRealDataRenderedComparisonServerV001,
} from './serve_presentation_first_real_data_rendered_comparison_v001.mjs';
import {
  assertPresentationRenderedComparisonReferenceChainV002,
  PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V002,
  PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH,
  validatePresentationRenderedComparisonBuildSummaryV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

export const PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V002 =
  'e4272a5c95a46546abc4287048e8b1a0b39c3b2f67b4ab647127b31baa2ca4fc';
export const PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V002 = '127.0.0.1';
export const PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V002 = 4318;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

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

export const loadPresentationFirstRealDataRenderedComparisonServingInputsV002 = async (...args) => {
  if (args.length !== 0) {
    throw new TypeError('formal comparison v002 server loader does not accept alternate files');
  }
  if (!SHA256_PATTERN.test(PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V002)) {
    throw new TypeError('comparison v002 summary hash has not been pinned');
  }
  const summaryBinding = await loadPresentationFirstRealDataArtifactBindingV001(
    PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH,
  );
  if (summaryBinding.fileSha256 !== PRESENTATION_RENDERED_COMPARISON_SUMMARY_SHA256_V002) {
    throw new TypeError('fixed comparison v002 summary byte hash mismatch');
  }
  const summary = validatePresentationRenderedComparisonBuildSummaryV002(summaryBinding.value);
  const {artifactBindings} = summary;
  const openedResources = [];
  try {
    const [reviewHtml, reviewPage, comparisonManifest, comparisonProvenance] = await Promise.all([
      readPresentationFirstRealDataVerifiedFileBytesV001(artifactBindings.reviewHtml),
      readJsonObject(artifactBindings.reviewPage, 'rendered-comparison v002 review-page'),
      readJsonObject(artifactBindings.comparisonManifest, 'fixed comparison manifest'),
      readJsonObject(artifactBindings.comparisonProvenance, 'fixed comparison provenance'),
    ]);
    assertPresentationRenderedComparisonReferenceChainV002({
      summary,
      page: reviewPage.value,
      manifest: comparisonManifest.value,
      provenance: comparisonProvenance.value,
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
        summary: {
          path: summaryBinding.path,
          fileSha256: summaryBinding.fileSha256,
        },
        reviewHtml: {
          path: reviewHtml.path,
          fileSha256: reviewHtml.fileSha256,
        },
        reviewPage: {
          path: reviewPage.path,
          fileSha256: reviewPage.fileSha256,
        },
        comparisonManifest: {
          path: comparisonManifest.path,
          fileSha256: comparisonManifest.fileSha256,
        },
        comparisonProvenance: {
          path: comparisonProvenance.path,
          fileSha256: comparisonProvenance.fileSha256,
        },
        mediaVariants: artifactBindings.mediaVariants.map((entry) => ({...entry})),
      },
      loadedJson: {
        summary,
        reviewPage: reviewPage.value,
        comparisonManifest: comparisonManifest.value,
        comparisonProvenance: comparisonProvenance.value,
      },
    };
  } catch (error) {
    await Promise.allSettled(openedResources.map((resource) => resource.close()));
    throw error;
  }
};

export const closePresentationFirstRealDataRenderedComparisonServingInputsV002 = async (
  servingInputs,
) => closePresentationFirstRealDataRenderedComparisonServingInputsV001(servingInputs);

export const createPresentationFirstRealDataRenderedComparisonServerV002 = (servingInputs) => (
  createPresentationFirstRealDataRenderedComparisonServerV001(servingInputs)
);

export const parsePresentationFirstRealDataRenderedComparisonServerCliV002 = (argv) => {
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
  const host = values.get('--host') ?? PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V002;
  const port = Number(
    values.get('--port') ?? String(PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V002),
  );
  if (host !== PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V002) {
    throw new Error(`--hostは${PRESENTATION_RENDERED_COMPARISON_FORMAL_HOST_V002}に固定されています`);
  }
  if (port !== PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V002) {
    throw new Error(`--portは${PRESENTATION_RENDERED_COMPARISON_FORMAL_PORT_V002}に固定されています`);
  }
  return {host, port};
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parsePresentationFirstRealDataRenderedComparisonServerCliV002(
    process.argv.slice(2),
  );
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV002();
  const server = createPresentationFirstRealDataRenderedComparisonServerV002(servingInputs);
  let resourcesClosed = false;
  const closeResources = async () => {
    if (resourcesClosed) return;
    resourcesClosed = true;
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(servingInputs);
  };
  server.once('close', () => { closeResources().catch(() => {}); });
  server.once('error', () => { closeResources().catch(() => {}); });
  server.listen(options.port, options.host, () => {
    process.stdout.write(
      `read-only rendered comparison v002: http://${options.host}:${options.port}/review.html\n`,
    );
  });
}

export {PRESENTATION_RENDERED_COMPARISON_VARIANT_IDS_V002};

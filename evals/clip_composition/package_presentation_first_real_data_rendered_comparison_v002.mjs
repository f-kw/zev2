#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  readPresentationFirstRealDataVerifiedFileBytesV001,
  verifyPresentationFirstRealDataFileReferenceV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  buildPresentationRenderedComparisonHtmlV002,
  validatePresentationRenderedComparisonGeneratedHtmlV002,
} from './presentation_first_real_data_rendered_comparison_ui_v002.mjs';
import {
  assertPresentationRenderedComparisonReferenceChainV002,
  derivePresentationRenderedComparisonInspectionPlaybackV002,
  PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_V002,
  PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001,
  PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001,
  PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V002,
  PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH,
  PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH,
  PRESENTATION_RENDERED_COMPARISON_V002_ROOT,
  PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH,
  validatePresentationRenderedComparisonManifestV001ForV002,
  validatePresentationRenderedComparisonPageV002,
  validatePresentationRenderedComparisonProvenanceV001ForV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

export const PRESENTATION_RENDERED_COMPARISON_PACKAGER_VERSION_V002 =
  'presentation-first-real-data-rendered-comparison-packager-v002';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(WORKSPACE_ROOT, PRESENTATION_RENDERED_COMPARISON_V002_ROOT);

const fileSha256 = (filePath) => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  const input = createReadStream(filePath);
  input.on('data', (chunk) => hash.update(chunk));
  input.on('error', reject);
  input.on('end', () => resolve(hash.digest('hex')));
});
const writeJson = (filePath, value) => writeFile(
  filePath,
  `${JSON.stringify(value, null, 2)}\n`,
  'utf8',
);

const readVerifiedJson = async (reference, label) => {
  const loaded = await readPresentationFirstRealDataVerifiedFileBytesV001(reference);
  let value;
  try {
    value = JSON.parse(loaded.bytes.toString('utf8'));
  } catch {
    throw new TypeError(`${label} is not valid JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} root must be an object`);
  }
  return value;
};

export const createPresentationRenderedComparisonPackageDocumentsV002 = ({
  manifest,
  provenance,
}) => {
  validatePresentationRenderedComparisonManifestV001ForV002(manifest);
  validatePresentationRenderedComparisonProvenanceV001ForV002(provenance, manifest);
  const page = {
    schemaVersion: PRESENTATION_RENDERED_COMPARISON_PAGE_SCHEMA_V002,
    pageId: 'DmWu0jVQfTE-candidate-13-rendered-comparison-review-v002',
    pageRevision: 2,
    comparisonManifest: {...PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001},
    comparisonProvenance: {...PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001},
    candidate: structuredClone(manifest.candidate),
    mediaVariants: structuredClone(manifest.mediaVariants),
    inspectionPlayback: derivePresentationRenderedComparisonInspectionPlaybackV002(provenance),
  };
  validatePresentationRenderedComparisonPageV002(page, manifest, provenance);
  const reviewHtml = buildPresentationRenderedComparisonHtmlV002(page, manifest);
  validatePresentationRenderedComparisonGeneratedHtmlV002(reviewHtml);
  return {page, reviewHtml};
};

export const buildPresentationRenderedComparisonPackageV002 = async ({
  outputRoot = OUTPUT_ROOT,
} = {}) => {
  if (path.resolve(outputRoot) !== OUTPUT_ROOT) {
    throw new TypeError('production v002 comparison output root is fixed');
  }
  try {
    await lstat(outputRoot);
    throw new Error(`fixed v002 comparison output already exists: ${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const parent = path.dirname(outputRoot);
  await mkdir(parent, {recursive: true});
  const temporaryRoot = await mkdtemp(path.join(parent, '.rendered-comparison-v002-'));
  try {
    const [manifest, provenance] = await Promise.all([
      readVerifiedJson(PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001, 'fixed v001 manifest'),
      readVerifiedJson(PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001, 'fixed v001 provenance'),
      ...PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001.map(
        ({path: mediaPath, fileSha256: mediaSha256}) => (
          verifyPresentationFirstRealDataFileReferenceV001({
            path: mediaPath,
            fileSha256: mediaSha256,
          })
        ),
      ),
    ]);
    const {page, reviewHtml} = createPresentationRenderedComparisonPackageDocumentsV002({
      manifest,
      provenance,
    });
    const reviewPagePath = path.join(temporaryRoot, 'review-page.json');
    const reviewHtmlPath = path.join(temporaryRoot, 'review.html');
    await writeJson(reviewPagePath, page);
    await writeFile(reviewHtmlPath, reviewHtml, 'utf8');
    const summary = {
      schemaVersion: PRESENTATION_RENDERED_COMPARISON_BUILD_SUMMARY_SCHEMA_V002,
      status: 'passed',
      artifactBindings: {
        reviewPage: {
          path: PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_PAGE_PATH,
          fileSha256: await fileSha256(reviewPagePath),
        },
        reviewHtml: {
          path: PRESENTATION_RENDERED_COMPARISON_V002_REVIEW_HTML_PATH,
          fileSha256: await fileSha256(reviewHtmlPath),
        },
        comparisonManifest: {...PRESENTATION_RENDERED_COMPARISON_FIXED_MANIFEST_V001},
        comparisonProvenance: {...PRESENTATION_RENDERED_COMPARISON_FIXED_PROVENANCE_V001},
        mediaVariants: PRESENTATION_RENDERED_COMPARISON_FIXED_MEDIA_V001.map((entry) => ({...entry})),
      },
    };
    assertPresentationRenderedComparisonReferenceChainV002({
      summary,
      page,
      manifest,
      provenance,
    });
    await writeJson(
      path.join(temporaryRoot, path.basename(PRESENTATION_RENDERED_COMPARISON_V002_SUMMARY_PATH)),
      summary,
    );
    const names = (await readdir(temporaryRoot)).sort();
    if (JSON.stringify(names) !== JSON.stringify([
      'comparison-preview-build-summary.json',
      'review-page.json',
      'review.html',
    ])) throw new Error('v002 package contains an unexpected output');
    await rename(temporaryRoot, outputRoot);
    return {outputRoot, page, reviewHtml, summary};
  } catch (error) {
    await rm(temporaryRoot, {recursive: true, force: true});
    throw error;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPresentationRenderedComparisonPackageV002()
    .then(() => process.stdout.write(`${PRESENTATION_RENDERED_COMPARISON_V002_ROOT}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}

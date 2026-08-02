import {createHash} from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import {dirname, relative, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_CAPTION_DISPLAY_PAIR_JOB_SCHEMA_V002,
  PRESENTATION_CAPTION_PAIR_REPORT_SCHEMA_V003,
  buildPresentationCaptionDisplayPairV004,
  validatePresentationCaptionDisplayPairGenerationJobV002,
} from './presentation_caption_display_pair_v004.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pairs/';
const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const OUTPUT_FILES = Object.freeze([
  'display-plan.json',
  'layout-preflight.json',
  'caption-check-report.json',
  'instruction-bundle.json',
  'review-render-request.json',
  'pair-generation-manifest.json',
  'pair-validation-report.json',
]);

const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const safePath = (value) => typeof value === 'string'
  && value.length > 0
  && !value.startsWith('/')
  && !value.split('/').some((part) => part === '' || part === '.' || part === '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal serialization failed');
  return result.bytes;
};
const canonicalSha = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result.status === 'canonicalized' ? hash(result.bytes) : null;
};
const canonicalizeAny = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeAny);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalizeAny(value[key])]),
  );
};
const canonicalShaAny = (value) =>
  hash(Buffer.from(JSON.stringify(canonicalizeAny(value)), 'utf8'));
const strictDecode = (bytes) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result.status !== 'decoded') throw new TypeError('strict JSON required');
  return result.value;
};
const inside = (root, path) => {
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel === '') {
    throw new TypeError('path outside repository');
  }
  return absolute;
};
const clone = (value) => structuredClone(value);
const cloneBuildContext = (value) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(cloneBuildContext);
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      cloneBuildContext(entry),
    ]));
  }
  return value;
};

const fatal = () => ({
  schemaVersion: 'presentation-formal-runner-fatal-v001',
  runnerId: PRESENTATION_CAPTION_DISPLAY_PAIR_JOB_SCHEMA_V002,
  status: 'fatal',
  diagnosticCode: 'CAPTION_B4_V002_RUNNER_FATAL',
});

const rejectedReport = (job, jobPath, jobBytes, violations, failureStage) => ({
  schemaVersion: PRESENTATION_CAPTION_PAIR_REPORT_SCHEMA_V003,
  validatorVersion: 'presentation-caption-display-pair-validator-v004',
  status: 'rejected',
  failureStage,
  jobBinding: {
    path: jobPath,
    fileSha256: hash(jobBytes),
    canonicalSha256: canonicalSha(job),
  },
  implementationBinding: job?.implementationBinding ?? null,
  runtimeBinding: job?.expectedRuntime ?? null,
  inputBindings: {
    sourcePackageBinding: job?.sourcePackageBinding ?? null,
    semanticCheckBinding: job?.semanticCheckBinding ?? null,
    retainedSourceBinding: job?.retainedSourceBinding ?? null,
    baseMediaBinding: job?.baseMediaBinding ?? null,
    registryBinding: job?.registryBinding ?? null,
    compilerInput: null,
    cropDecisionBinding: job?.cropDecisionBinding ?? null,
  },
  outputBindings: {
    displayPlan: null,
    instructionBundle: null,
    captionCheckReport: null,
    layoutPreflight: null,
    reviewRenderRequest: null,
    pairGenerationManifest: null,
  },
  checks: [
    'jobBinding',
    'implementationBinding',
    'inputBinding',
    'semanticCompiler',
    'displayPlan',
    'instructionContract',
    'layoutPreflight',
    'reviewRequest',
    'determinism',
  ].map((name) => ({
    name,
    status: name === failureStage ? 'failed' : 'not_run_with_upstream_failure',
    violationCodes: name === failureStage
      ? [...new Set(violations.map((entry) => entry.code))]
      : [],
  })),
  violations,
  observedProjection: {
    sourceAtomCount: null,
    containerCount: null,
    meaningGroupCount: null,
    cueCount: null,
    lineCount: null,
    timelineSegmentCount: null,
    maximumObservedLineLogicalWidth: null,
    positiveCueOverlapCount: null,
    sourceAtomPositiveOverlapObservationCount: null,
    formatSelection: null,
    displayConstraintInput: null,
    screenLayoutBinding: null,
    cropSourceMediaBinding: null,
  },
  reviewState: {
    stage: 'not_created',
    reviewOnly: true,
    publicationAllowed: false,
  },
  readOnlyObservation: {
    status: 'verified',
    unchanged: true,
  },
  scope: {
    validatedState: 'presentation-caption-display-pair',
    renderedLayoutQcVerified: false,
    humanReviewCompleted: false,
    publicationAllowed: false,
  },
});

const readChecked = async (binding, root, reader, decoder = strictDecode) => {
  const bytes = await reader(inside(root, binding.path));
  if (hash(bytes) !== binding.fileSha256) throw new TypeError('file hash mismatch');
  const value = decoder(bytes);
  if (Object.prototype.hasOwnProperty.call(binding, 'canonicalSha256')
    && binding.canonicalSha256 !== canonicalSha(value)) {
    throw new TypeError('canonical hash mismatch');
  }
  return {binding: clone(binding), bytes, value};
};

const implementationValid = async (job, root, reader) => {
  for (const entry of [
    ...job.implementationBinding.files,
    ...job.implementationBinding.dependencyFiles,
  ]) {
    const bytes = await reader(inside(root, entry.path));
    if (hash(bytes) !== entry.fileSha256) return false;
  }
  return true;
};

const loadPackage = async (job, root, reader) => {
  const snapshots = [];
  const values = [];
  for (const fileName of PACKAGE_FILES) {
    const path = `${job.sourcePackageBinding.rootPath}/${fileName}`;
    const bytes = await reader(inside(root, path));
    snapshots.push({path, bytes, fileSha256: hash(bytes)});
    values.push(strictDecode(bytes));
  }
  if (values[5].schemaVersion
      !== 'presentation-caption-semantic-source-package-manifest-v002'
    || values[6].schemaVersion
      !== 'presentation-caption-semantic-source-package-validation-report-v002'
    || hash(snapshots[5].bytes) !== job.sourcePackageBinding.manifest.fileSha256
    || hash(snapshots[6].bytes)
      !== job.sourcePackageBinding.validationReport.fileSha256) {
    throw new TypeError('source package mismatch');
  }
  return {
    snapshots,
    manifest: values[5],
    sourceInput: values[2],
    expansionMap: values[3],
  };
};

const registryEntry = async (binding, root, reader) => {
  const loaded = await readChecked(binding, root, reader);
  return {binding: clone(binding), value: loaded.value};
};

const loadContext = async (job, jobPath, jobBytes, root, reader) => {
  const sourcePackage = await loadPackage(job, root, reader);
  const semanticReport = await readChecked(
    job.semanticCheckBinding.validationReport,
    root,
    reader,
  );
  const raw = await readChecked(job.semanticCheckBinding.rawSemanticOutput, root, reader);
  const retainedAtoms = await readChecked(job.retainedSourceBinding.sourceAtoms, root, reader);
  const rendererTrustFile = job.implementationBinding.dependencyFiles.find(
    (entry) => entry.role === 'rendererTrust',
  );
  if (!rendererTrustFile) throw new TypeError('renderer trust binding missing');
  const rendererTrustBytes = await reader(inside(root, rendererTrustFile.path));
  if (hash(rendererTrustBytes) !== rendererTrustFile.fileSha256) {
    throw new TypeError('renderer trust hash mismatch');
  }
  const rendererTrustValue = strictDecode(rendererTrustBytes);
  const cropBytes = await reader(inside(root, job.cropDecisionBinding.path));
  if (hash(cropBytes) !== job.cropDecisionBinding.fileSha256) {
    throw new TypeError('crop decision hash mismatch');
  }
  const cropDecision = JSON.parse(cropBytes.toString('utf8'));
  const selectionRelative = cropDecision.provenance?.selectionPackageManifest;
  if (!exactKeys(selectionRelative, ['path', 'fileSha256'])
    || !safePath(selectionRelative.path)
    || selectionRelative.path.includes('/')) {
    throw new TypeError('crop selection package binding invalid');
  }
  const cropDirectory = dirname(job.cropDecisionBinding.path);
  const selectionPath = `${cropDirectory}/${selectionRelative.path}`;
  const selectionBytes = await reader(inside(root, selectionPath));
  if (hash(selectionBytes) !== selectionRelative.fileSha256) {
    throw new TypeError('crop selection package hash mismatch');
  }
  const selectionPackage = JSON.parse(selectionBytes.toString('utf8'));
  const rendererTrustBinding = {
    path: rendererTrustFile.path,
    fileSha256: rendererTrustFile.fileSha256,
    canonicalSha256: canonicalSha(rendererTrustValue),
  };
  return {
    job,
    jobBinding: {
      path: jobPath,
      fileSha256: hash(jobBytes),
      canonicalSha256: canonicalSha(job),
    },
    sourcePackage,
    semantic: {
      reportBinding: clone(job.semanticCheckBinding.validationReport),
      report: semanticReport.value,
      rawSemanticOutputSnapshot: {
        path: job.semanticCheckBinding.rawSemanticOutput.path,
        bytes: raw.bytes,
        fileSha256: hash(raw.bytes),
      },
    },
    retainedSource: {
      binding: {
        generationManifest: clone(job.retainedSourceBinding.generationManifest),
        sourceAtoms: clone(job.retainedSourceBinding.sourceAtoms),
        validationReport: clone(job.retainedSourceBinding.validationReport),
        rawSourceAtomsCanonicalSha256:
          retainedAtoms.value.rawSourceAtomsCanonicalSha256,
      },
      value: retainedAtoms.value,
    },
    baseMedia: {
      baseMedia: clone(job.baseMediaBinding.baseMedia),
      timeline: clone(job.baseMediaBinding.timeline),
      generationManifest: clone(job.baseMediaBinding.generationManifest),
      validationReport: clone(job.baseMediaBinding.validationReport),
    },
    registry: {
      trustedRegistryBindings: await registryEntry(
        job.registryBinding.trustedRegistryBindings,
        root,
        reader,
      ),
      presetRegistry: await registryEntry(
        job.registryBinding.presetRegistry,
        root,
        reader,
      ),
      presetValidationIndex: await registryEntry(
        job.registryBinding.presetValidationIndex,
        root,
        reader,
      ),
      materialValidationIndex: await registryEntry(
        job.registryBinding.materialValidationIndex,
        root,
        reader,
      ),
      rendererTrust: {
        binding: rendererTrustBinding,
        value: rendererTrustValue,
      },
    },
    crop: {
      binding: {
        path: job.cropDecisionBinding.path,
        fileSha256: job.cropDecisionBinding.fileSha256,
        canonicalSha256: canonicalShaAny(cropDecision),
      },
      decision: cropDecision,
      selectionPackageManifestBinding: {
        path: selectionPath,
        fileSha256: selectionRelative.fileSha256,
        canonicalSha256: canonicalShaAny(selectionPackage),
      },
      selectionPackage,
    },
    runtimeBinding: clone(job.expectedRuntime),
  };
};

const outputPresence = async (absolute) => {
  try {
    await stat(absolute);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const publish = async (job, artifacts, root) => {
  const output = inside(root, job.publication.formalOutputPath);
  const work = inside(root, job.publication.workPath);
  const lock = inside(root, job.publication.lockPath);
  if (!job.publication.formalOutputPath.startsWith(OUTPUT_ROOT)
    || await outputPresence(output)
    || await outputPresence(work)
    || await outputPresence(lock)) {
    throw Object.assign(new Error('output already exists'), {code: 'EEXIST'});
  }
  await mkdir(dirname(output), {recursive: true});
  await mkdir(lock, {recursive: false});
  try {
    await mkdir(work, {recursive: false});
    for (const [index, entry] of artifacts.entries()) {
      if (entry.fileName !== OUTPUT_FILES[index]) {
        throw new TypeError('output artifact order mismatch');
      }
      const handle = await open(resolve(work, entry.fileName), 'wx');
      try {
        await handle.writeFile(entry.bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
    await rename(work, output);
    await rm(lock, {recursive: true});
  } catch (error) {
    await rm(work, {recursive: true, force: true});
    await rm(lock, {recursive: true, force: true});
    throw error;
  }
};

export async function runPresentationCaptionDisplayPairJobV002(
  jobPath,
  options = {},
) {
  try {
    if (typeof jobPath !== 'string'
      || !jobPath.startsWith(JOB_ROOT)
      || !jobPath.endsWith('.json')
      || !safePath(jobPath)) {
      return {exitCode: 2, value: fatal(), outputRoot: null};
    }
    const root = options.repositoryRoot ?? ROOT;
    const reader = options.readFile ?? readFile;
    const jobBytes = options.jobBytes ?? await reader(inside(root, jobPath));
    const job = strictDecode(jobBytes);
    const jobCheck = validatePresentationCaptionDisplayPairGenerationJobV002(job);
    if (jobCheck.status !== 'passed') {
      return {
        exitCode: 1,
        value: rejectedReport(job, jobPath, jobBytes, jobCheck.violations, 'jobBinding'),
        outputRoot: null,
      };
    }
    if (!await implementationValid(job, root, reader)) {
      const violations = [{
        code: 'IMPLEMENTATION_MISMATCH',
        path: '$.implementationBinding',
        details: {},
      }];
      return {
        exitCode: 1,
        value: rejectedReport(
          job,
          jobPath,
          jobBytes,
          violations,
          'implementationBinding',
        ),
        outputRoot: null,
      };
    }
    let context;
    try {
      context = options.context ?? await loadContext(job, jobPath, jobBytes, root, reader);
    } catch {
      const violations = [{
        code: 'INPUT_SCHEMA_UNSUPPORTED',
        path: '$.inputBindings',
        details: {},
      }];
      return {
        exitCode: 1,
        value: rejectedReport(job, jobPath, jobBytes, violations, 'inputBinding'),
        outputRoot: null,
      };
    }
    const build = options.build ?? buildPresentationCaptionDisplayPairV004;
    const first = await build(cloneBuildContext(context));
    const second = await build(cloneBuildContext(context));
    if (first.status !== second.status
      || first.status === 'built' && (
        first.artifacts.length !== second.artifacts.length
        || !first.artifacts.every(
          (entry, index) => entry.bytes.equals(second.artifacts[index].bytes),
        )
      )) {
      return {exitCode: 2, value: fatal(), outputRoot: null};
    }
    if (first.status !== 'built') {
      return {
        exitCode: 1,
        value: rejectedReport(
          job,
          jobPath,
          jobBytes,
          first.violations,
          'displayPlan',
        ),
        outputRoot: null,
      };
    }
    const jobReread = options.jobBytes ?? await reader(inside(root, jobPath));
    if (!Buffer.from(jobReread).equals(Buffer.from(jobBytes))
      || !await implementationValid(job, root, reader)) {
      return {exitCode: 2, value: fatal(), outputRoot: null};
    }
    if (options.publish !== false) {
      try {
        await publish(job, first.artifacts, root);
      } catch (error) {
        if (error?.code !== 'EEXIST') {
          return {exitCode: 2, value: fatal(), outputRoot: null};
        }
        const violations = [{
          code: 'OUTPUT_ROOT_ALREADY_EXISTS',
          path: '$.publication.formalOutputPath',
          details: {},
        }];
        return {
          exitCode: 1,
          value: rejectedReport(job, jobPath, jobBytes, violations, 'displayPlan'),
          outputRoot: null,
        };
      }
    }
    return {
      exitCode: 0,
      value: first.report,
      outputRoot: job.publication.formalOutputPath,
    };
  } catch {
    return {exitCode: 2, value: fatal(), outputRoot: null};
  }
}

export async function runPresentationCaptionDisplayPairCliV002(
  argv = process.argv.slice(2),
  streams = {stdout: process.stdout},
) {
  const result = argv.length === 1
    ? await runPresentationCaptionDisplayPairJobV002(argv[0])
    : {exitCode: 2, value: fatal(), outputRoot: null};
  streams.stdout.write(formalBytes(result.value));
  return result.exitCode;
}

const direct = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const exitCode = await runPresentationCaptionDisplayPairCliV002();
  process.exitCode = exitCode;
}

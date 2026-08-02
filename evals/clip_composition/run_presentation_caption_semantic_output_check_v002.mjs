import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {dirname, relative, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  buildPresentationCaptionSemanticCompilerInputForContractV001,
  validatePresentationCaptionSemanticSelectionForContractV001,
} from './presentation_caption_semantic_output_v001.mjs';

export const PRESENTATION_CAPTION_SEMANTIC_OUTPUT_JOB_SCHEMA_V002 =
  'presentation-caption-semantic-output-check-job-v002';
export const PRESENTATION_CAPTION_SEMANTIC_OUTPUT_COMPILER_SCHEMA_V002 =
  'presentation-caption-semantic-output-compiler-input-v002';
export const PRESENTATION_CAPTION_SEMANTIC_OUTPUT_REPORT_SCHEMA_V002 =
  'presentation-caption-semantic-output-validation-report-v002';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RUNNER_ID = PRESENTATION_CAPTION_SEMANTIC_OUTPUT_JOB_SCHEMA_V002;
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/';
const PACKAGE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/';
const RAW_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/';
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,191}$/;
const CHARACTER_WIDTH_RULE = 'U+0000..U+00FF=1; other Unicode code point=2';
const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const FILE_BINDINGS = Object.freeze([
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs'],
]);
const DEPENDENCY_BINDINGS = Object.freeze([
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);
const CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'packageShape',
  'semanticOutput',
  'compilerBuild',
  'compilerInput',
  'deterministicExpansion',
  'determinism',
  'readOnlyCheck',
  'jobStability',
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
const decode = (bytes) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result.status !== 'decoded') throw new TypeError('strict JSON required');
  return result.value;
};
const bindingShape = (value, expected) => exactKeys(
  value,
  ['role', 'path', 'fileSha256'],
)
  && value.role === expected[0]
  && value.path === expected[1]
  && SHA256.test(value.fileSha256 ?? '');
const dualBinding = (value) => exactKeys(value, ['path', 'fileSha256', 'canonicalSha256'])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '')
  && SHA256.test(value.canonicalSha256 ?? '');

export function validatePresentationCaptionSemanticOutputCheckJobV002(value) {
  const violations = [];
  const add = (path) =>
    violations.push({code: 'CAPTION_B1_JOB_INVALID', path, details: {}});
  try {
    if (!exactKeys(value, [
      'schemaVersion',
      'jobId',
      'artifactId',
      'mode',
      'implementationBinding',
      'sourcePackageBinding',
      'semanticOutputBinding',
      'expectedRuntime',
      'expectedProjection',
      'readOnlyGuard',
    ])) {
      add('$');
      return {status: 'rejected', violations};
    }
    if (value.schemaVersion !== PRESENTATION_CAPTION_SEMANTIC_OUTPUT_JOB_SCHEMA_V002) {
      add('$.schemaVersion');
    }
    if (!ID.test(value.jobId ?? '')) add('$.jobId');
    if (!ID.test(value.artifactId ?? '')) add('$.artifactId');
    if (value.mode !== 'read-only-check') add('$.mode');
    const implementation = value.implementationBinding;
    if (!exactKeys(implementation, ['gitCommit', 'files', 'dependencyFiles'])
      || !COMMIT.test(implementation?.gitCommit ?? '')
      || !Array.isArray(implementation.files)
      || implementation.files.length !== FILE_BINDINGS.length
      || !implementation.files.every(
        (entry, index) => bindingShape(entry, FILE_BINDINGS[index]),
      )
      || !Array.isArray(implementation.dependencyFiles)
      || implementation.dependencyFiles.length !== DEPENDENCY_BINDINGS.length
      || !implementation.dependencyFiles.every(
        (entry, index) => bindingShape(entry, DEPENDENCY_BINDINGS[index]),
      )) {
      add('$.implementationBinding');
    }
    const source = value.sourcePackageBinding;
    if (!exactKeys(source, ['rootPath', 'manifest', 'validationReport'])
      || !safePath(source.rootPath)
      || !source.rootPath.startsWith(PACKAGE_ROOT)
      || !dualBinding(source.manifest)
      || !dualBinding(source.validationReport)
      || source.manifest.path !== `${source.rootPath}/package-manifest.json`
      || source.validationReport.path
        !== `${source.rootPath}/package-validation-report.json`) {
      add('$.sourcePackageBinding');
    }
    if (!exactKeys(value.semanticOutputBinding, ['path', 'fileSha256'])
      || !safePath(value.semanticOutputBinding.path)
      || !value.semanticOutputBinding.path.startsWith(RAW_ROOT)
      || !SHA256.test(value.semanticOutputBinding.fileSha256 ?? '')) {
      add('$.semanticOutputBinding');
    }
    return {
      status: violations.length === 0 ? 'passed' : 'rejected',
      violations,
    };
  } catch {
    return {
      status: 'rejected',
      violations: [{code: 'CAPTION_B1_JOB_INVALID', path: '$', details: {}}],
    };
  }
}

const compilerContract = (manifest) => ({
  sourceInputSchemaVersion: 'presentation-caption-semantic-source-input-v002',
  expansionMapSchemaVersion: 'presentation-caption-semantic-expansion-map-v002',
  manifestSchemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
  packageReportSchemaVersion:
    'presentation-caption-semantic-source-package-validation-report-v002',
  compilerSchemaVersion: PRESENTATION_CAPTION_SEMANTIC_OUTPUT_COMPILER_SCHEMA_V002,
  presetId: manifest.formatSelection.presetId,
  visualStateId: manifest.formatSelection.visualStateId,
  maxLogicalWidthPerLine: manifest.displayConstraintInput.maxLogicalWidthPerLine,
  maxLinesPerMeaningGroup: manifest.displayConstraintInput.maxLinesPerMeaningGroup,
  characterWidthRule: manifest.displayConstraintInput.characterWidthRule,
  manifestHasDisplayPolicy: true,
});

const fatal = () => ({
  schemaVersion: 'presentation-formal-runner-fatal-v001',
  runnerId: RUNNER_ID,
  status: 'fatal',
  diagnosticCode: 'CAPTION_B1_V002_RUNNER_FATAL',
});

const inside = (root, path) => {
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel === '') {
    throw new TypeError('path outside repository');
  }
  return absolute;
};

const report = ({
  status,
  failureStage,
  job,
  jobPath,
  jobBytes,
  violations,
  packageValues,
  packageBytes,
  rawValue,
  rawBytes,
  compiler,
}) => {
  const manifest = packageValues?.[5] ?? null;
  const packageReport = packageValues?.[6] ?? null;
  const lines = compiler?.containers?.flatMap((container) =>
    container.meaningGroups.flatMap((group) => group.lines)) ?? [];
  const checkStatus = (name) => {
    if (status === 'passed') return 'passed';
    if (status === 'abstained') {
      return ['compilerBuild', 'compilerInput', 'deterministicExpansion', 'determinism']
        .includes(name)
        ? 'not_applicable_by_abstention'
        : 'passed';
    }
    const failedIndex = CHECK_NAMES.indexOf(failureStage);
    const index = CHECK_NAMES.indexOf(name);
    if (index < failedIndex) return 'passed';
    if (index === failedIndex) return 'failed';
    return 'not_run_with_upstream_failure';
  };
  return {
    schemaVersion: PRESENTATION_CAPTION_SEMANTIC_OUTPUT_REPORT_SCHEMA_V002,
    status,
    failureStage,
    jobBinding: {
      path: jobPath,
      fileSha256: hash(jobBytes),
    },
    implementationBinding: job?.implementationBinding ?? null,
    runtimeBinding: job?.expectedRuntime ?? null,
    inputBindings: {
      sourcePackageManifest: manifest
        ? {
          path: job.sourcePackageBinding.manifest.path,
          fileSha256: hash(packageBytes[5]),
          canonicalSha256: canonicalSha(manifest),
        }
        : null,
      sourcePackageValidationReport: packageReport
        ? {
          path: job.sourcePackageBinding.validationReport.path,
          fileSha256: hash(packageBytes[6]),
          canonicalSha256: canonicalSha(packageReport),
        }
        : null,
      rawSemanticOutput: rawValue
        ? {
          path: job.semanticOutputBinding.path,
          observationStatus: 'read',
          fileSha256: hash(rawBytes),
          canonicalSha256: canonicalSha(rawValue),
        }
        : null,
    },
    checks: CHECK_NAMES.map((name) => ({
      name,
      status: checkStatus(name),
      violationCodes: [...new Set(
        violations.filter((entry) => (
          name === failureStage
          || (name === 'semanticOutput' && entry.code.startsWith('SEMANTIC_'))
        )).map((entry) => entry.code),
      )],
    })),
    violations,
    observedProjection: status === 'passed'
      ? {
        containerCount: compiler.containers.length,
        meaningGroupCount: compiler.containers.reduce(
          (sum, container) => sum + container.meaningGroups.length,
          0,
        ),
        lineCount: lines.length,
        boundaryCandidateCount: lines.reduce(
          (sum, line) => sum + line.boundaryCandidateIds.length,
          0,
        ),
        sourceAtomCount: lines.reduce(
          (sum, line) => sum + line.sourceAtomIds.length,
          0,
        ),
        maximumObservedLineLogicalWidth: Math.max(...lines.map((line) => line.logicalWidth)),
      }
      : {
        containerCount: null,
        meaningGroupCount: null,
        lineCount: null,
        boundaryCandidateCount: null,
        sourceAtomCount: null,
        maximumObservedLineLogicalWidth: null,
      },
    compilerInput: status === 'passed'
      ? {
        status: 'generated',
        canonicalSha256: canonicalSha(compiler),
        observedByteSha256: hash(formalBytes(compiler)),
      }
      : {
        status: 'not_generated',
        canonicalSha256: null,
        observedByteSha256: null,
      },
    readOnlyObservation: {
      status: 'verified',
      beforeCanonicalSha256: job?.readOnlyGuard?.expectedBeforeCanonicalSha256 ?? null,
      afterCanonicalSha256: job?.readOnlyGuard?.expectedBeforeCanonicalSha256 ?? null,
      unchanged: true,
    },
    scope: {
      validatedState: 'semantic-boundary-selection-only',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      renderReadabilityVerified: false,
    },
  };
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
  const packageBytes = [];
  const packageValues = [];
  for (const fileName of PACKAGE_FILES) {
    const path = `${job.sourcePackageBinding.rootPath}/${fileName}`;
    const bytes = await reader(inside(root, path));
    packageBytes.push(bytes);
    packageValues.push(decode(bytes));
  }
  const manifest = packageValues[5];
  const packageReport = packageValues[6];
  if (manifest.schemaVersion
      !== 'presentation-caption-semantic-source-package-manifest-v002'
    || packageReport.schemaVersion
      !== 'presentation-caption-semantic-source-package-validation-report-v002'
    || hash(packageBytes[5]) !== job.sourcePackageBinding.manifest.fileSha256
    || canonicalSha(manifest) !== job.sourcePackageBinding.manifest.canonicalSha256
    || hash(packageBytes[6]) !== job.sourcePackageBinding.validationReport.fileSha256
    || canonicalSha(packageReport)
      !== job.sourcePackageBinding.validationReport.canonicalSha256
    || packageReport.status !== 'passed'
    || !exactKeys(manifest.formatSelection, [
      'format',
      'screenLayoutId',
      'presetId',
      'visualStateId',
    ])
    || !exactKeys(manifest.displayConstraintInput, [
      'maxLogicalWidthPerLine',
      'maxLinesPerMeaningGroup',
      'characterWidthRule',
    ])
    || !Number.isSafeInteger(manifest.displayConstraintInput.maxLogicalWidthPerLine)
    || manifest.displayConstraintInput.maxLogicalWidthPerLine <= 0
    || manifest.displayConstraintInput.characterWidthRule !== CHARACTER_WIDTH_RULE) {
    throw new TypeError('source package binding mismatch');
  }
  return {packageBytes, packageValues};
};

export async function runPresentationCaptionSemanticOutputCheckV002(
  jobPath,
  options = {},
) {
  try {
    if (typeof jobPath !== 'string'
      || !jobPath.startsWith(JOB_ROOT)
      || !jobPath.endsWith('.json')
      || !safePath(jobPath)) {
      return {exitCode: 2, value: fatal()};
    }
    const root = options.repositoryRoot ?? ROOT;
    const reader = options.readFile ?? readFile;
    const jobBytes = options.jobBytes ?? await reader(inside(root, jobPath));
    const job = decode(jobBytes);
    const jobCheck = validatePresentationCaptionSemanticOutputCheckJobV002(job);
    if (jobCheck.status !== 'passed') {
      return {
        exitCode: 1,
        value: report({
          status: 'rejected',
          failureStage: 'jobBinding',
          job,
          jobPath,
          jobBytes,
          violations: jobCheck.violations,
          packageValues: null,
          packageBytes: null,
          rawValue: null,
          rawBytes: null,
          compiler: null,
        }),
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
        value: report({
          status: 'rejected',
          failureStage: 'implementationBinding',
          job,
          jobPath,
          jobBytes,
          violations,
          packageValues: null,
          packageBytes: null,
          rawValue: null,
          rawBytes: null,
          compiler: null,
        }),
      };
    }
    let packageData;
    try {
      packageData = await loadPackage(job, root, reader);
    } catch {
      const violations = [{code: 'PACKAGE_SCHEMA_INVALID', path: '$.sourcePackage', details: {}}];
      return {
        exitCode: 1,
        value: report({
          status: 'rejected',
          failureStage: 'packageShape',
          job,
          jobPath,
          jobBytes,
          violations,
          packageValues: null,
          packageBytes: null,
          rawValue: null,
          rawBytes: null,
          compiler: null,
        }),
      };
    }
    const rawBytes = await reader(inside(root, job.semanticOutputBinding.path));
    if (hash(rawBytes) !== job.semanticOutputBinding.fileSha256) {
      const violations = [{code: 'INPUT_HASH_MISMATCH', path: '$.semanticOutputBinding', details: {}}];
      return {
        exitCode: 1,
        value: report({
          status: 'rejected',
          failureStage: 'inputBinding',
          job,
          jobPath,
          jobBytes,
          violations,
          ...packageData,
          rawValue: null,
          rawBytes,
          compiler: null,
        }),
      };
    }
    const rawValue = decode(rawBytes);
    if (rawValue.status === 'abstained') {
      return {
        exitCode: 1,
        value: report({
          status: 'abstained',
          failureStage: null,
          job,
          jobPath,
          jobBytes,
          violations: [],
          ...packageData,
          rawValue,
          rawBytes,
          compiler: null,
        }),
      };
    }
    const manifest = packageData.packageValues[5];
    const contract = compilerContract(manifest);
    const selection = validatePresentationCaptionSemanticSelectionForContractV001({
      rawSemanticOutput: rawValue,
      sourceInput: packageData.packageValues[2],
      expansionMap: packageData.packageValues[3],
      contract,
    });
    if (selection.status !== 'passed') {
      return {
        exitCode: 1,
        value: report({
          status: 'rejected',
          failureStage: 'semanticOutput',
          job,
          jobPath,
          jobBytes,
          violations: selection.violations,
          ...packageData,
          rawValue,
          rawBytes,
          compiler: null,
        }),
      };
    }
    const compilerInput = {
      sourcePackageSnapshots: packageData.packageBytes.map((bytes, index) => ({
        path: `${job.sourcePackageBinding.rootPath}/${PACKAGE_FILES[index]}`,
        bytes,
        fileSha256: hash(bytes),
      })),
      rawSemanticOutputSnapshot: {
        path: job.semanticOutputBinding.path,
        bytes: rawBytes,
        fileSha256: hash(rawBytes),
      },
    };
    const compilerA =
      buildPresentationCaptionSemanticCompilerInputForContractV001(
        compilerInput,
        contract,
      );
    const compilerB =
      buildPresentationCaptionSemanticCompilerInputForContractV001(
        compilerInput,
        contract,
      );
    if (!formalBytes(compilerA).equals(formalBytes(compilerB))) {
      return {exitCode: 2, value: fatal()};
    }
    const value = report({
      status: 'passed',
      failureStage: null,
      job,
      jobPath,
      jobBytes,
      violations: [],
      ...packageData,
      rawValue,
      rawBytes,
      compiler: compilerA,
    });
    return {exitCode: 0, value};
  } catch {
    return {exitCode: 2, value: fatal()};
  }
}

export async function runPresentationCaptionSemanticOutputCheckCliV002(
  argv = process.argv.slice(2),
  streams = {stdout: process.stdout},
) {
  const result = argv.length === 1
    ? await runPresentationCaptionSemanticOutputCheckV002(argv[0])
    : {exitCode: 2, value: fatal()};
  streams.stdout.write(formalBytes(result.value));
  return result.exitCode;
}

const direct = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const exitCode = await runPresentationCaptionSemanticOutputCheckCliV002();
  process.exitCode = exitCode;
}

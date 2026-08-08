#!/usr/bin/env -S node --import tsx

import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import type {
  ShortsScreenLayoutPlan,
  ShortsScreenLayoutId,
} from '../../runner/src/screen-layout.js';
import type {
  TelopRenderModel,
} from '../../runner/src/telop/telop-render-model.js';
import type {
  FormalRemotionRuntimeBinding,
  FormalRemotionTelopRenderInput,
} from '../../runner/src/telop-remotion.js';
import {
  executeValidatedPresentationDrawAndQcV001,
  inspectFrameCountWithToolV001,
  inspectGitStateV001,
  publishPresentationArtifactsV002,
} from './render_presentation_v002.mjs';
import {
  mapPresentationSourceIntervalV002,
} from './presentation_base_media_timeline_v002.mjs';
import {
  indexExplicitLinesV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  fileSha256V002,
  inspectRenderedMediaWithToolsV001,
  evaluatePresentationVerticalReviewRendererQcV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  validatePresentationCaptionDisplayPlanV002,
  validatePresentationCaptionPublishedReviewInputV004,
  validatePresentationCaptionReviewRenderRequestV004,
} from './presentation_caption_display_pair_v004.mjs';
import {
  validatePresentationInstructionContractV004,
} from './presentation_instruction_contract_v004.mjs';
export const PRESENTATION_VERTICAL_RENDER_JOB_SCHEMA_VERSION =
  'presentation-vertical-review-render-job-v001';
export const PRESENTATION_VERTICAL_RENDERER_ID =
  'presentation-vertical-review-renderer-v001';
export const PRESENTATION_VERTICAL_RENDER_MANIFEST_SCHEMA_VERSION =
  'presentation-vertical-review-render-manifest-v001';
export const PRESENTATION_VERTICAL_RENDER_QC_SCHEMA_VERSION =
  'presentation-vertical-review-renderer-qc-v001';
export const PRESENTATION_VERTICAL_RENDER_FAILURE_SCHEMA_VERSION =
  'presentation-vertical-review-render-failure-v001';
export const PRESENTATION_VERTICAL_RENDER_FATAL_DIAGNOSTIC =
  'VERTICAL_RENDER_V001_RUNNER_FATAL';

export const PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES = Object.freeze([
  'VERTICAL_PRESET_REGISTRY_INVALID',
  'VERTICAL_SCREEN_LAYOUT_VOCABULARY_INVALID',
  'VERTICAL_SCREEN_LAYOUT_NOT_REGISTERED',
  'VERTICAL_PRESET_APPROVAL_BINDING_MISMATCH',
  'VERTICAL_PRESET_TRUST_BINDING_MISMATCH',
  'DISPLAY_POLICY_BINDING_INVALID',
  'DISPLAY_POLICY_REGISTRY_MISMATCH',
  'DISPLAY_POLICY_WIDTH_MISMATCH',
  'DISPLAY_FORMAT_BINDING_MISMATCH',
  'DISPLAY_PRESET_BINDING_MISMATCH',
  'DISPLAY_SCREEN_LAYOUT_BINDING_MISMATCH',
  'VERTICAL_LAYOUT_DECISION_INVALID',
  'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH',
  'VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH',
  'VERTICAL_LAYOUT_FILTER_BUILD_FAILED',
  'VERTICAL_BASE_FORMAT_MISMATCH',
  'VERTICAL_BASE_FRAME_COUNT_MISMATCH',
  'VERTICAL_BASE_AUDIO_MISMATCH',
  'VERTICAL_RENDER_TEXT_MODEL_MISMATCH',
  'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
  'API_BUDGET_BINDING_INVALID',
  'API_MODEL_OR_PRICE_UNVERIFIED',
  'API_COUNT_TOKENS_BILLING_UNVERIFIED',
  'API_COUNT_TO_PROMPT_BOUND_UNVERIFIED',
  'API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED',
  'API_COST_PROBE_INVALID',
  'API_BUDGET_EXCEEDED_BEFORE_SEND',
  'API_BUDGET_REQUEST_MISMATCH',
  'API_TRANSPORT_CONTRACT_VIOLATION',
  'API_USAGE_ACCOUNTING_INVALID',
  'API_RESPONSE_TIER_MISMATCH',
  'SECRET_LEAK_DETECTED',
  'API_USAGE_BUDGET_VIOLATION',
  'B6_DOWNSTREAM_EXECUTION_FAILED',
  'VERTICAL_RENDER_INPUT_BINDING_MISMATCH',
  'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH',
] as const);

export type PresentationVerticalRenderViolationCode =
  typeof PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES[number];

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = 'evals/clip_composition/outputs/presentation/vertical-review-renders';
const JOB_ROOT = 'evals/clip_composition/outputs/presentation/vertical-review-render-jobs';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const ALLOWED_SCREEN_LAYOUT_IDS = Object.freeze([
  'speaker_only',
  'screen_speaker',
  'speaker_pair',
] as const);

export const PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES = Object.freeze({
  video: 'presentation-vertical-review-rendered-v001.mp4',
  overlays: 'overlays',
  plan: 'presentation-vertical-review-render-plan-v001.json',
  applicationResults: 'presentation-vertical-review-render-application-results-v001.json',
  manifest: 'presentation-vertical-review-render-manifest-v001.json',
  qc: 'presentation-vertical-review-render-qc-v001.json',
  failure: 'presentation-vertical-review-render-failure-v001.json',
});

export const PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS = Object.freeze([
  ['vertical-review-renderer', 'evals/clip_composition/render_presentation_vertical_review_v001.ts'],
  ['instruction-contract-v004', 'evals/clip_composition/presentation_instruction_contract_v004.mjs'],
  ['display-pair-v004', 'evals/clip_composition/presentation_caption_display_pair_v004.mjs'],
  ['instruction-contract-v003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['display-pair-v003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['semantic-source-package-v001', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semantic-output-v001', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['segmenter-boundary-v001', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['segmenter-preflight-v001', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['retained-source-atoms-v001', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['renderer-core', 'evals/clip_composition/render_presentation_v002.mjs'],
  ['layout-inspector-v001', 'evals/clip_composition/inspect_presentation_render_layout_v001.ts'],
  ['presentation-renderer-entry-v001', 'evals/clip_composition/presentation_renderer_entry_v001.tsx'],
  ['screen-layout', 'runner/src/screen-layout.ts'],
  ['shared-package-manifest', 'packages/shared/package.json'],
  ['shared-runtime-index', 'packages/shared/dist/index.js'],
  ['shared-runtime-common', 'packages/shared/dist/common.js'],
  ['shared-runtime-activity', 'packages/shared/dist/activity.js'],
  ['shared-runtime-web-gemini-review', 'packages/shared/dist/web-gemini-review.js'],
  ['telop-remotion', 'runner/src/telop-remotion.ts'],
  ['renderer-qc', 'evals/clip_composition/presentation_renderer_qc_v002.mjs'],
  ['caption-contract-v002', 'evals/clip_composition/presentation_caption_contract_v002.mjs'],
  ['caption-contract-v003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['instruction-contract-v002', 'evals/clip_composition/presentation_instruction_contract_v002.mjs'],
  ['base-media-timeline-v002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['renderer-plan-v002', 'evals/clip_composition/presentation_renderer_plan_v002.mjs'],
  ['renderer-text-layout-v001', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['source-speaker-policy-v001', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['source-speaker-registry-v001', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
] as const);

export const PRESENTATION_VERTICAL_INPUT_BINDING_KEYS = Object.freeze([
  'reviewRenderRequest',
  'baseMedia',
  'baseMediaGenerationManifest',
  'baseMediaTimeline',
  'baseMediaValidationReport',
  'displayPlan',
  'instructionBundle',
  'captionCheck',
  'layoutPreflight',
  'cropDecision',
  'presetRegistry',
  'presetValidationIndex',
  'materialValidationIndex',
  'trustedRegistryBindings',
  'rendererTrust',
] as const);

type JsonObject = Record<string, unknown>;
type Violation = {
  code: PresentationVerticalRenderViolationCode;
  relatedPaths: string[];
};

const isObject = (value: unknown): value is JsonObject => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);
const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0
);
const exactKeys = (value: unknown, keys: readonly string[]): value is JsonObject => (
  isObject(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(keys)
);
const sha256 = (value: Uint8Array | string): string => (
  createHash('sha256').update(value).digest('hex')
);
const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalSha256 = (value: unknown): string => (
  sha256(JSON.stringify(canonicalize(value)))
);
const uniqueSorted = (values: string[]): string[] => (
  [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'))
);
const sameArray = (left: unknown, right: unknown): boolean => (
  Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index])
);
const uniqueBy = (
  values: unknown,
  readId: (value: JsonObject) => unknown,
): Map<string, JsonObject> | null => {
  const result = new Map<string, JsonObject>();
  for (const value of Array.isArray(values) ? values : []) {
    if (!isObject(value)) return null;
    const id = readId(value);
    if (!isNonEmptyString(id) || result.has(id)) return null;
    result.set(id, value);
  }
  return result;
};
const makeViolation = (
  code: PresentationVerticalRenderViolationCode,
  relatedPaths: string[],
): Violation => ({code, relatedPaths: uniqueSorted(relatedPaths)});
const report = (violations: Violation[]) => ({
  status: violations.length === 0 ? 'passed' as const : 'rejected' as const,
  violations,
});
const resolveRepoPath = (value: string): string => (
  path.isAbsolute(value) ? value : path.resolve(WORKSPACE_ROOT, value)
);
const toRepoPath = (value: string): string => (
  path.relative(WORKSPACE_ROOT, value).split(path.sep).join('/')
);
const formalJsonBytes = (value: unknown): Buffer => (
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8')
);
const insideWorkspace = (absolutePath: string): boolean => {
  const relative = path.relative(WORKSPACE_ROOT, absolutePath);
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
};
const resolveBoundPath = (
  bindingPath: string,
  siblingDirectory: string | null = null,
): string => {
  if (!isNonEmptyString(bindingPath) || path.isAbsolute(bindingPath)) {
    throw new TypeError('bound artifact path must be repository relative');
  }
  const normalized = bindingPath.split('/').join(path.sep);
  const absolutePath = (
    siblingDirectory !== null
    && path.dirname(bindingPath) === '.'
  )
    ? path.resolve(siblingDirectory, normalized)
    : path.resolve(WORKSPACE_ROOT, normalized);
  if (!insideWorkspace(absolutePath)) {
    throw new TypeError('bound artifact path escapes the repository');
  }
  return absolutePath;
};
const readBoundArtifactV001 = async (
  binding: unknown,
  {
    canonicalRequired = true,
    siblingDirectory = null,
  }: {
    canonicalRequired?: boolean;
    siblingDirectory?: string | null;
  } = {},
) => {
  if (!validateTransportBinding(binding, canonicalRequired)) {
    throw new TypeError('artifact binding is invalid');
  }
  const absolutePath = resolveBoundPath(
    binding.path as string,
    siblingDirectory,
  );
  const bytes = await readFile(absolutePath);
  if (sha256(bytes) !== binding.fileSha256) {
    throw new TypeError('artifact byte SHA does not match its binding');
  }
  if (!canonicalRequired) {
    return {
      binding: {
        path: toRepoPath(absolutePath),
        fileSha256: binding.fileSha256 as string,
      },
      absolutePath,
      bytes,
      value: null,
    };
  }
  const value = JSON.parse(bytes.toString('utf8')) as unknown;
  if (canonicalSha256(value) !== binding.canonicalSha256) {
    throw new TypeError('artifact canonical SHA does not match its binding');
  }
  return {
    binding: {
      path: toRepoPath(absolutePath),
      fileSha256: binding.fileSha256 as string,
      canonicalSha256: binding.canonicalSha256 as string,
    },
    absolutePath,
    bytes,
    value,
  };
};
const runBoundProcessV001 = async (
  command: string,
  args: string[],
  options: {cwd?: string; timeoutMs?: number} = {},
): Promise<{exitCode: number | null; stdout: Buffer; stderr: Buffer}> => (
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? WORKSPACE_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let timedOut = false;
    const timer = options.timeoutMs === undefined
      ? null
      : setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, options.timeoutMs);
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (timer !== null) clearTimeout(timer);
      if (timedOut) {
        reject(new Error('bound process timed out'));
        return;
      }
      resolve({
        exitCode,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  })
);
const decodeToolVersionV001 = (stdout: Uint8Array): string => {
  const bytes = Buffer.from(stdout);
  if (
    bytes.length < 2
    || bytes[bytes.length - 1] !== 0x0a
    || bytes[bytes.length - 2] === 0x0a
    || bytes.includes(0)
  ) {
    throw new TypeError('tool version output is not one LF-terminated UTF-8 value');
  }
  const end = bytes[bytes.length - 2] === 0x0d
    ? bytes.length - 2
    : bytes.length - 1;
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes.subarray(0, end));
};

export async function validatePresentationVerticalRuntimeProfileV001(
  runtimeProfile: unknown,
  {observeVersions = true}: {observeVersions?: boolean} = {},
) {
  const roles = [
    'node',
    'tsx',
    'remotion',
    'browser',
    'ffmpeg',
    'ffprobe',
    'imageMagick',
  ] as const;
  const violations: Violation[] = [];
  let verifiedRuntimeToolCount = 0;
  if (!exactKeys(runtimeProfile, roles)) {
    return {
      ...report([makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        ['$.runtimeProfile'],
      )]),
      metrics: {verifiedRuntimeToolCount: 0, requiredRuntimeToolCount: 7},
    };
  }
  for (const role of roles) {
    const tool = runtimeProfile[role];
    if (!validateRuntimeBinding(tool)) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        [`$.runtimeProfile.${role}`],
      ));
      continue;
    }
    try {
      const bytes = await readFile(tool.path as string);
      if (sha256(bytes) !== tool.fileSha256) {
        throw new TypeError('tool SHA mismatch');
      }
      if (observeVersions) {
        const command = role === 'tsx' || role === 'remotion'
          ? (runtimeProfile.node as JsonObject).path as string
          : tool.path as string;
        const args = role === 'tsx'
          ? [tool.path as string, '--version']
          : role === 'remotion'
            ? [tool.path as string, '--help']
            : role === 'node' || role === 'browser'
              ? ['--version']
              : ['-version'];
        const observation = await runBoundProcessV001(command, args, {
          timeoutMs: 120_000,
        });
        if (observation.exitCode !== 0 || observation.stderr.length !== 0) {
          throw new TypeError('tool version command failed');
        }
        const version = role === 'remotion'
          ? parseRemotionHelpVersionV001(observation)
          : {status: 'passed' as const, version: decodeToolVersionV001(observation.stdout)};
        if (version.status !== 'passed' || version.version !== tool.version) {
          throw new TypeError('tool version mismatch');
        }
      }
      verifiedRuntimeToolCount += 1;
    } catch {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        [tool.path as string],
      ));
    }
  }
  return {
    ...report(dedupeViolations(violations)),
    metrics: {verifiedRuntimeToolCount, requiredRuntimeToolCount: 7},
  };
}

export function parseRemotionHelpVersionV001(result: {
  exitCode: number | null;
  stdout: Uint8Array;
  stderr: Uint8Array;
}): {status: 'passed'; version: string} | {status: 'rejected'} {
  if (result.exitCode !== 0 || result.stderr.byteLength !== 0) {
    return {status: 'rejected'};
  }
  const firstLine = Buffer.from(result.stdout).toString('utf8').split(/\r?\n/u, 1)[0] ?? '';
  const match = /^@remotion\/cli ([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)$/u.exec(firstLine);
  return match ? {status: 'passed', version: match[1]} : {status: 'rejected'};
}

export function validatePresentationVerticalRenderJobV001(job: unknown) {
  const violations: Violation[] = [];
  const keys = [
    'schemaVersion',
    'jobId',
    'reviewRenderRequest',
    'implementationBindings',
    'runtimeProfile',
    'outputDirectory',
  ] as const;
  if (!exactKeys(job, keys)) {
    return report([makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', ['$job'])]);
  }
  const jobId = job.jobId;
  if (
    job.schemaVersion !== PRESENTATION_VERTICAL_RENDER_JOB_SCHEMA_VERSION
    || !isNonEmptyString(jobId)
    || !SAFE_ID_PATTERN.test(jobId)
  ) {
    violations.push(makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', ['$job']));
  }
  const expectedOutput = isNonEmptyString(jobId)
    ? `${OUTPUT_ROOT}/${jobId}-result`
    : '';
  if (job.outputDirectory !== expectedOutput) {
    violations.push(makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', ['$job.outputDirectory']));
  }
  if (!validateTransportBinding(job.reviewRenderRequest, true)) {
    violations.push(makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', ['$.reviewRenderRequest']));
  }
  const bindings = job.implementationBindings;
  if (
    !Array.isArray(bindings)
    || bindings.length !== PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS.length
  ) {
    violations.push(makeViolation(
      'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH',
      ['$.implementationBindings'],
    ));
  } else {
    for (let index = 0; index < bindings.length; index += 1) {
      const item = bindings[index];
      const expected = PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS[index];
      if (
        !exactKeys(item, ['role', 'path', 'fileSha256'])
        || item.role !== expected[0]
        || item.path !== expected[1]
        || !isNonEmptyString(item.fileSha256)
        || !SHA256_PATTERN.test(item.fileSha256)
      ) {
        violations.push(makeViolation(
          expected[0] === 'screen-layout'
            ? 'VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH'
            : 'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH',
          [`$.implementationBindings[${index}]`],
        ));
      }
    }
  }
  if (
    !exactKeys(job.runtimeProfile, [
      'node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick',
    ])
  ) {
    violations.push(makeViolation('VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH', ['$.runtimeProfile']));
  } else {
    for (const key of Object.keys(job.runtimeProfile)) {
      if (!validateRuntimeBinding(job.runtimeProfile[key])) {
        violations.push(makeViolation(
          'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
          [`$.runtimeProfile.${key}`],
        ));
      }
    }
  }
  return report(dedupeViolations(violations));
}

const validateTransportBinding = (value: unknown, canonicalRequired: boolean): boolean => (
  exactKeys(
    value,
    canonicalRequired
      ? ['path', 'fileSha256', 'canonicalSha256']
      : ['path', 'fileSha256'],
  )
  && isNonEmptyString(value.path)
  && isNonEmptyString(value.fileSha256)
  && SHA256_PATTERN.test(value.fileSha256)
  && (
    !canonicalRequired
    || (
      isNonEmptyString(value.canonicalSha256)
      && SHA256_PATTERN.test(value.canonicalSha256)
    )
  )
);

const validateRuntimeBinding = (value: unknown): boolean => (
  exactKeys(value, ['path', 'version', 'fileSha256'])
  && isNonEmptyString(value.path)
  && path.isAbsolute(value.path)
  && isNonEmptyString(value.version)
  && isNonEmptyString(value.fileSha256)
  && SHA256_PATTERN.test(value.fileSha256)
);

const dedupeViolations = (violations: Violation[]): Violation[] => {
  const byCode = new Map<PresentationVerticalRenderViolationCode, string[]>();
  for (const violation of violations) {
    byCode.set(violation.code, [
      ...(byCode.get(violation.code) ?? []),
      ...violation.relatedPaths,
    ]);
  }
  return PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES
    .filter((code) => byCode.has(code))
    .map((code) => makeViolation(code, byCode.get(code) ?? []));
};

const viewportKeysFor = (screenLayoutId: ShortsScreenLayoutId): string[] => {
  if (screenLayoutId === 'speaker_only') return ['speaker'];
  if (screenLayoutId === 'screen_speaker') return ['screen', 'speaker'];
  return ['speaker1', 'speaker2'];
};

const validViewport = (value: unknown): value is [number, number, number, number] => (
  Array.isArray(value)
  && value.length === 4
  && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
  && value[0] >= 0
  && value[0] < value[2]
  && value[2] <= 1
  && value[1] >= 0
  && value[1] < value[3]
  && value[3] <= 1
);

export function validatePresentationVerticalCropDecisionV001(value: unknown) {
  const violations: Violation[] = [];
  if (
    !exactKeys(value, [
      'schemaVersion',
      'status',
      'externalApiCallsByThisScript',
      'classification',
      'selection',
      'selectedPlan',
      'provenance',
    ])
    || value.schemaVersion !== 'vertical-preset-type-crop-decision-v006'
    || value.status !== 'passed'
  ) {
    return report([makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$cropDecision'])]);
  }
  const selectedPlan = value.selectedPlan;
  if (
    !isObject(selectedPlan)
    || !exactKeys(selectedPlan, [
      'screenLayoutId',
      'classificationReason',
      'detections',
      'viewports',
      'displaySummary',
      'selectedCandidateId',
      'candidateSummary',
      'selectionReason',
      'candidateOptions',
    ])
    || !ALLOWED_SCREEN_LAYOUT_IDS.includes(selectedPlan.screenLayoutId as never)
  ) {
    return report([makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$.selectedPlan'])]);
  }
  const screenLayoutId = selectedPlan.screenLayoutId as ShortsScreenLayoutId;
  const requiredViewportKeys = viewportKeysFor(screenLayoutId);
  if (
    !exactKeys(selectedPlan.viewports, requiredViewportKeys)
    || requiredViewportKeys.some((key) => !validViewport(selectedPlan.viewports[key]))
  ) {
    violations.push(makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$.selectedPlan.viewports']));
  }
  if (!Array.isArray(selectedPlan.candidateOptions) || selectedPlan.candidateOptions.length === 0) {
    violations.push(makeViolation(
      'VERTICAL_LAYOUT_DECISION_INVALID',
      ['$.selectedPlan.candidateOptions'],
    ));
  } else {
    const selected = selectedPlan.candidateOptions.find(
      (candidate) => isObject(candidate) && candidate.id === selectedPlan.selectedCandidateId,
    );
    if (
      !isObject(selected)
      || !exactKeys(selected, ['id', 'label', 'reason', 'viewports'])
      || JSON.stringify(selected.viewports) !== JSON.stringify(selectedPlan.viewports)
    ) {
      violations.push(makeViolation(
        'VERTICAL_LAYOUT_DECISION_INVALID',
        ['$.selectedPlan.selectedCandidateId'],
      ));
    }
  }
  const classification = value.classification;
  if (
    !exactKeys(classification, [
      'responsePath',
      'responseFileSha256',
      'screenLayoutId',
      'classificationReason',
      'candidateSetCanonicalSha256',
    ])
    || classification.screenLayoutId !== screenLayoutId
  ) {
    violations.push(makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$.classification']));
  }
  const selection = value.selection;
  if (
    !exactKeys(selection, ['responsePath', 'responseFileSha256', 'selectedCandidateId', 'reason'])
    || selection.selectedCandidateId !== selectedPlan.selectedCandidateId
  ) {
    violations.push(makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$.selection']));
  }
  if (
    screenLayoutId === 'speaker_only'
    && (
      !exactKeys(selectedPlan.detections, ['speaker'])
      || !exactKeys(selectedPlan.detections.speaker, ['face', 'body'])
      || !Array.isArray(selectedPlan.detections.speaker.face)
      || !Array.isArray(selectedPlan.detections.speaker.body)
    )
  ) {
    violations.push(makeViolation('VERTICAL_LAYOUT_DECISION_INVALID', ['$.selectedPlan.detections']));
  }
  return report(dedupeViolations(violations));
}

export async function validatePresentationVerticalCropSourceBindingV001({
  cropDecisionArtifact,
  baseMediaBinding,
}: {
  cropDecisionArtifact: Awaited<ReturnType<typeof readBoundArtifactV001>>;
  baseMediaBinding: {path: string; fileSha256: string};
}) {
  const decision = cropDecisionArtifact.value;
  if (
    !isObject(decision)
    || !exactKeys(decision.provenance, [
      'classificationWebObservation',
      'selectionWebObservation',
      'selectionPackageManifest',
      'canonicalSelector',
    ])
    || !validateTransportBinding(
      decision.provenance.selectionPackageManifest,
      false,
    )
  ) {
    return report([makeViolation(
      'VERTICAL_LAYOUT_DECISION_INVALID',
      ['$.cropDecision.provenance'],
    )]);
  }
  try {
    const selectionPackage =
      await readBoundArtifactV001(
        decision.provenance.selectionPackageManifest,
        {
          canonicalRequired: false,
          siblingDirectory: path.dirname(cropDecisionArtifact.absolutePath),
        },
      );
    const value = JSON.parse(selectionPackage.bytes.toString('utf8')) as unknown;
    if (
      !isObject(value)
      || value.schemaVersion !== 'vertical-preset-type-crop-selection-package-v006'
      || !exactKeys(value.sourceMedia, ['path', 'fileSha256', 'previewSecond'])
      || value.sourceMedia.path !== baseMediaBinding.path
      || value.sourceMedia.fileSha256 !== baseMediaBinding.fileSha256
    ) {
      throw new TypeError('crop selection source media differs from the review base media');
    }
    return report([]);
  } catch {
    return report([makeViolation(
      'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH',
      ['$.cropDecision.provenance.selectionPackageManifest'],
    )]);
  }
}

export async function buildPresentationVerticalCropFilterV001(input: {
  cropDecision: JsonObject;
  sourceWidth: number;
  sourceHeight: number;
  frameCount: number;
  fps: number;
}): {
  status: 'passed';
  screenLayoutId: ShortsScreenLayoutId;
  filter: string;
  filterCanonicalSha256: string;
} | {
  status: 'rejected';
  violations: Violation[];
} {
  const cropReport = validatePresentationVerticalCropDecisionV001(input.cropDecision);
  if (cropReport.status !== 'passed') return cropReport;
  if (
    !Number.isInteger(input.sourceWidth)
    || input.sourceWidth <= 0
    || !Number.isInteger(input.sourceHeight)
    || input.sourceHeight <= 0
    || !Number.isInteger(input.frameCount)
    || input.frameCount <= 0
    || !Number.isInteger(input.fps)
    || input.fps <= 0
  ) {
    return report([makeViolation('VERTICAL_LAYOUT_FILTER_BUILD_FAILED', ['$cropInput'])]);
  }
  const selectedPlan = input.cropDecision.selectedPlan as ShortsScreenLayoutPlan;
  try {
    const {buildLayoutVideoFilter} = await import(pathToFileURL(
      resolveRepoPath('runner/src/screen-layout.ts'),
    ).href);
    const filter = buildLayoutVideoFilter({
      inputLabel: '[0:v]',
      outputLabel: 'layoutv',
      sourceWidth: input.sourceWidth,
      sourceHeight: input.sourceHeight,
      durationSeconds: input.frameCount / input.fps,
      screenLayout: selectedPlan,
    });
    return {
      status: 'passed',
      screenLayoutId: selectedPlan.screenLayoutId,
      filter,
      filterCanonicalSha256: sha256(filter),
    };
  } catch {
    return report([makeViolation('VERTICAL_LAYOUT_FILTER_BUILD_FAILED', ['$cropDecision'])]);
  }
}

export function validatePresentationVerticalCropOutputV001(input: {
  source: {
    width: number;
    height: number;
    fpsNumerator: number;
    fpsDenominator: number;
    frameCount: number;
    audioPacketPayloadSha256: string;
  };
  output: {
    width: number;
    height: number;
    fpsNumerator: number;
    fpsDenominator: number;
    frameCount: number;
    audioPacketPayloadSha256: string;
  };
}) {
  const violations: Violation[] = [];
  if (
    input.output.width !== 1080
    || input.output.height !== 1920
    || input.output.fpsNumerator !== 30
    || input.output.fpsDenominator !== 1
  ) {
    violations.push(makeViolation('VERTICAL_BASE_FORMAT_MISMATCH', ['$cropOutput.video']));
  }
  if (input.output.frameCount !== input.source.frameCount) {
    violations.push(makeViolation(
      'VERTICAL_BASE_FRAME_COUNT_MISMATCH',
      ['$cropOutput.frameCount'],
    ));
  }
  if (
    !SHA256_PATTERN.test(input.source.audioPacketPayloadSha256)
    || input.output.audioPacketPayloadSha256 !== input.source.audioPacketPayloadSha256
  ) {
    violations.push(makeViolation('VERTICAL_BASE_AUDIO_MISMATCH', ['$cropOutput.audio']));
  }
  return report(dedupeViolations(violations));
}

export async function createPresentationVerticalCroppedBaseMediaV001({
  baseMediaPath,
  cropDecision,
  runtimeProfile,
}: {
  baseMediaPath: string;
  cropDecision: JsonObject;
  runtimeProfile: JsonObject;
}) {
  const ffmpeg = runtimeProfile.ffmpeg as JsonObject;
  const ffprobe = runtimeProfile.ffprobe as JsonObject;
  if (!validateRuntimeBinding(ffmpeg) || !validateRuntimeBinding(ffprobe)) {
    throw new TypeError('vertical crop runtime is not bound');
  }
  const sourceMedia = await inspectRenderedMediaWithToolsV001(baseMediaPath, {
    ffprobePath: ffprobe.path as string,
    ffmpegPath: ffmpeg.path as string,
  });
  const sourceFrameCount = await inspectFrameCountWithToolV001(
    baseMediaPath,
    ffprobe.path as string,
  );
  if (
    !sourceMedia.video
    || sourceMedia.video.fps !== 30
    || !sourceMedia.audio
    || !Number.isSafeInteger(sourceFrameCount)
    || sourceFrameCount <= 0
  ) {
    throw new TypeError('vertical crop source media is not the required 30fps AV input');
  }
  sourceMedia.video.frameCount = sourceFrameCount;
  const filter = await buildPresentationVerticalCropFilterV001({
    cropDecision,
    sourceWidth: sourceMedia.video.width,
    sourceHeight: sourceMedia.video.height,
    frameCount: sourceFrameCount,
    fps: 30,
  });
  if (filter.status !== 'passed') {
    return filter;
  }
  const workDirectory = await mkdtemp(
    path.join(tmpdir(), 'zev2-presentation-vertical-crop-v001-'),
  );
  const outputPath = path.join(workDirectory, 'base-media-vertical-v001.mp4');
  try {
    const execution = await runBoundProcessV001(
      ffmpeg.path as string,
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        baseMediaPath,
        '-filter_complex',
        filter.filter,
        '-map',
        '[layoutv]',
        '-map',
        '0:a:0?',
        '-frames:v',
        String(sourceFrameCount),
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'copy',
        '-movflags',
        '+faststart',
        outputPath,
      ],
      {timeoutMs: 600_000},
    );
    if (
      execution.exitCode !== 0
      || execution.stdout.length !== 0
      || execution.stderr.length !== 0
    ) {
      throw new TypeError('bound FFmpeg crop process failed');
    }
    const outputMedia = await inspectRenderedMediaWithToolsV001(outputPath, {
      ffprobePath: ffprobe.path as string,
      ffmpegPath: ffmpeg.path as string,
    });
    const outputFrameCount = await inspectFrameCountWithToolV001(
      outputPath,
      ffprobe.path as string,
    );
    if (outputMedia.video) outputMedia.video.frameCount = outputFrameCount;
    const cropValidation = validatePresentationVerticalCropOutputV001({
      source: {
        width: sourceMedia.video.width,
        height: sourceMedia.video.height,
        fpsNumerator: 30,
        fpsDenominator: 1,
        frameCount: sourceFrameCount,
        audioPacketPayloadSha256: sourceMedia.audio.packetPayloadSha256,
      },
      output: {
        width: outputMedia.video?.width ?? 0,
        height: outputMedia.video?.height ?? 0,
        fpsNumerator: outputMedia.video?.fps === 30 ? 30 : 0,
        fpsDenominator: 1,
        frameCount: outputFrameCount,
        audioPacketPayloadSha256:
          outputMedia.audio?.packetPayloadSha256 ?? '',
      },
    });
    if (cropValidation.status !== 'passed') {
      return {
        ...cropValidation,
        workDirectory,
      };
    }
    return {
      status: 'passed' as const,
      workDirectory,
      outputPath,
      sourceMedia,
      outputMedia,
      sourceFrameCount,
      filter: filter.filter,
      filterCanonicalSha256: filter.filterCanonicalSha256,
    };
  } catch (error) {
    await rm(workDirectory, {recursive: true, force: true});
    throw error;
  }
}

export function validatePresentationVerticalAlphaBoundsV001(input: {
  alphaBounds: {left: number; top: number; right: number; bottom: number} | null;
  safeAreaPx: {top: number; right: number; bottom: number; left: number};
  canvas: {width: number; height: number};
}) {
  const {alphaBounds, safeAreaPx, canvas} = input;
  const passed = alphaBounds !== null
    && alphaBounds.left >= safeAreaPx.left
    && alphaBounds.top >= safeAreaPx.top
    && alphaBounds.right <= canvas.width - safeAreaPx.right
    && alphaBounds.bottom <= canvas.height - safeAreaPx.bottom;
  return {
    status: passed ? 'passed' as const : 'rejected' as const,
    insideSafeArea: passed,
  };
}

const FAILURE_OWNERSHIP = Object.freeze({
  VERTICAL_LAYOUT_DECISION_INVALID: ['input-binding', 'input-binding-summary'],
  VERTICAL_LAYOUT_INPUT_HASH_MISMATCH: ['input-binding', 'input-binding-summary'],
  VERTICAL_RENDER_INPUT_BINDING_MISMATCH: ['input-binding', 'input-binding-summary'],
  VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH: [
    'implementation-binding',
    'implementation-binding-summary',
  ],
  VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH: [
    'implementation-binding',
    'implementation-binding-summary',
  ],
  VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH: ['runtime-binding', 'runtime-binding-summary'],
  VERTICAL_LAYOUT_FILTER_BUILD_FAILED: ['crop', 'crop-filter-build'],
  VERTICAL_BASE_FORMAT_MISMATCH: ['crop', 'crop-output-format'],
  VERTICAL_RENDER_TEXT_MODEL_MISMATCH: ['text-layout', 'text-model'],
  VERTICAL_BASE_FRAME_COUNT_MISMATCH: ['composition', 'frame-count'],
  VERTICAL_BASE_AUDIO_MISMATCH: ['composition', 'audio-payload'],
} as const);

export function buildPresentationVerticalRejectedFailureV001({
  jobBinding,
  violations,
  metrics,
}: {
  jobBinding: JsonObject;
  violations: Violation[];
  metrics: JsonObject;
}) {
  if (violations.length === 0) {
    throw new TypeError('vertical rejected failure requires a violation');
  }
  const ownership = FAILURE_OWNERSHIP[
    violations[0].code as keyof typeof FAILURE_OWNERSHIP
  ];
  if (
    !ownership
    || violations.some((entry) => {
      const entryOwnership = FAILURE_OWNERSHIP[
        entry.code as keyof typeof FAILURE_OWNERSHIP
      ];
      return !entryOwnership
        || entryOwnership[0] !== ownership[0]
        || entryOwnership[1] !== ownership[1];
    })
  ) {
    throw new TypeError('vertical rejected failure mixes ownership variants');
  }
  return {
    schemaVersion: PRESENTATION_VERTICAL_RENDER_FAILURE_SCHEMA_VERSION,
    status: 'rejected',
    failureStage: ownership[0],
    jobBinding: structuredClone(jobBinding),
    violations: dedupeViolations(violations),
    observedProjection: {
      stage: ownership[0],
      variant: ownership[1],
      metrics: structuredClone(metrics),
    },
  };
}

export async function validatePresentationVerticalImplementationBindingsV001(
  bindings: unknown,
) {
  const violations: Violation[] = [];
  let verifiedImplementationBindingCount = 0;
  if (!Array.isArray(bindings)) {
    return {
      ...report([makeViolation(
        'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH',
        ['$.implementationBindings'],
      )]),
      metrics: {verifiedImplementationBindingCount: 0, requiredImplementationBindingCount: 29},
    };
  }
  for (let index = 0; index < PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS.length; index += 1) {
    const expected = PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS[index];
    const binding = bindings[index];
    const code = expected[0] === 'screen-layout'
      ? 'VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH'
      : 'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH';
    if (
      !exactKeys(binding, ['role', 'path', 'fileSha256'])
      || binding.role !== expected[0]
      || binding.path !== expected[1]
      || !isNonEmptyString(binding.fileSha256)
      || !SHA256_PATTERN.test(binding.fileSha256)
    ) {
      violations.push(makeViolation(code, [`$.implementationBindings[${index}]`]));
      continue;
    }
    try {
      const bytes = await readFile(resolveRepoPath(binding.path));
      if (sha256(bytes) !== binding.fileSha256) {
        violations.push(makeViolation(code, [binding.path]));
        continue;
      }
      verifiedImplementationBindingCount += 1;
    } catch {
      violations.push(makeViolation(code, [binding.path]));
    }
  }
  if (bindings.length !== 29) {
    violations.push(makeViolation(
      'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH',
      ['$.implementationBindings'],
    ));
  }
  return {
    ...report(dedupeViolations(violations)),
    metrics: {
      verifiedImplementationBindingCount,
      requiredImplementationBindingCount: 29,
    },
  };
}

export async function validatePresentationVerticalInputBindingsV001(
  bindings: unknown,
) {
  const violations: Violation[] = [];
  let verifiedInputBindingCount = 0;
  if (!exactKeys(bindings, PRESENTATION_VERTICAL_INPUT_BINDING_KEYS)) {
    return {
      ...report([makeViolation(
        'VERTICAL_RENDER_INPUT_BINDING_MISMATCH',
        ['$.inputBindings'],
      )]),
      metrics: {verifiedInputBindingCount: 0, requiredInputBindingCount: 15},
    };
  }
  for (const key of PRESENTATION_VERTICAL_INPUT_BINDING_KEYS) {
    const binding = bindings[key];
    const isMedia = key === 'baseMedia';
    const code = key === 'cropDecision'
      ? 'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH'
      : 'VERTICAL_RENDER_INPUT_BINDING_MISMATCH';
    if (!validateTransportBinding(binding, !isMedia)) {
      violations.push(makeViolation(code, [`$.inputBindings.${key}`]));
      continue;
    }
    try {
      const bytes = await readFile(resolveRepoPath(binding.path as string));
      if (sha256(bytes) !== binding.fileSha256) {
        violations.push(makeViolation(code, [binding.path as string]));
        continue;
      }
      if (!isMedia) {
        const value = JSON.parse(bytes.toString('utf8')) as unknown;
        if (canonicalSha256(value) !== binding.canonicalSha256) {
          violations.push(makeViolation(code, [binding.path as string]));
          continue;
        }
      }
      verifiedInputBindingCount += 1;
    } catch {
      violations.push(makeViolation(code, [binding.path as string]));
    }
  }
  return {
    ...report(dedupeViolations(violations)),
    metrics: {verifiedInputBindingCount, requiredInputBindingCount: 15},
  };
}

const asCanonicalBinding = (artifact: {
  binding: {path: string; fileSha256: string; canonicalSha256?: string};
}) => ({
  path: artifact.binding.path,
  fileSha256: artifact.binding.fileSha256,
  canonicalSha256: artifact.binding.canonicalSha256 as string,
});

const asMediaBinding = (artifact: {
  binding: {path: string; fileSha256: string};
}) => ({
  path: artifact.binding.path,
  fileSha256: artifact.binding.fileSha256,
});

const readReviewRequestArtifactV001 = async (
  binding: unknown,
  reviewDirectory: string,
  canonicalRequired = true,
) => readBoundArtifactV001(binding, {
  canonicalRequired,
  siblingDirectory: reviewDirectory,
});

/**
 * review request v004を唯一の入口として、正式rendererが使う15件を解決する。
 * request内のbasenameは同じB4成果物directory基準で解決し、暗黙固定pathを補わない。
 */
export async function resolvePresentationVerticalReviewInputsV001(
  reviewRenderRequestArtifact: Awaited<ReturnType<typeof readBoundArtifactV001>>,
) {
  const request = reviewRenderRequestArtifact.value;
  if (!isObject(request)) {
    throw new TypeError('vertical review request is not a JSON object');
  }
  const requestValidation = validatePresentationCaptionReviewRenderRequestV004(request);
  if (requestValidation.status !== 'passed') {
    throw new TypeError('vertical review request contract is rejected');
  }
  const reviewDirectory = path.dirname(reviewRenderRequestArtifact.absolutePath);
  const baseMediaBinding = request.baseMediaBinding as JsonObject;
  const registryBindings = request.registryBindings as JsonObject;
  const [
    displayPlan,
    instructionBundle,
    captionCheck,
    layoutPreflight,
    cropDecision,
    baseMedia,
    baseMediaGenerationManifest,
    baseMediaTimeline,
    baseMediaValidationReport,
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
    trustedRegistryBindings,
    rendererTrust,
  ] = await Promise.all([
    readReviewRequestArtifactV001(request.displayPlanBinding, reviewDirectory),
    readReviewRequestArtifactV001(request.instructionBundleBinding, reviewDirectory),
    readReviewRequestArtifactV001(request.captionCheckBinding, reviewDirectory),
    readReviewRequestArtifactV001(request.layoutPreflightBinding, reviewDirectory),
    readReviewRequestArtifactV001(request.cropDecisionBinding, reviewDirectory),
    readReviewRequestArtifactV001(baseMediaBinding.baseMedia, reviewDirectory, false),
    readReviewRequestArtifactV001(
      baseMediaBinding.generationManifest,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(baseMediaBinding.timeline, reviewDirectory),
    readReviewRequestArtifactV001(
      baseMediaBinding.validationReport,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(
      registryBindings.presetRegistry,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(
      registryBindings.presetValidationIndex,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(
      registryBindings.materialValidationIndex,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(
      registryBindings.trustedRegistryBindings,
      reviewDirectory,
    ),
    readReviewRequestArtifactV001(
      registryBindings.rendererTrust,
      reviewDirectory,
    ),
  ]);
  const inputBindings = {
    reviewRenderRequest: asCanonicalBinding(reviewRenderRequestArtifact),
    baseMedia: asMediaBinding(baseMedia),
    baseMediaGenerationManifest: asCanonicalBinding(baseMediaGenerationManifest),
    baseMediaTimeline: asCanonicalBinding(baseMediaTimeline),
    baseMediaValidationReport: asCanonicalBinding(baseMediaValidationReport),
    displayPlan: asCanonicalBinding(displayPlan),
    instructionBundle: asCanonicalBinding(instructionBundle),
    captionCheck: asCanonicalBinding(captionCheck),
    layoutPreflight: asCanonicalBinding(layoutPreflight),
    cropDecision: asCanonicalBinding(cropDecision),
    presetRegistry: asCanonicalBinding(presetRegistry),
    presetValidationIndex: asCanonicalBinding(presetValidationIndex),
    materialValidationIndex: asCanonicalBinding(materialValidationIndex),
    trustedRegistryBindings: asCanonicalBinding(trustedRegistryBindings),
    rendererTrust: asCanonicalBinding(rendererTrust),
  };
  const bindingValidation =
    await validatePresentationVerticalInputBindingsV001(inputBindings);
  if (bindingValidation.status !== 'passed') {
    throw new TypeError('vertical review input binding set is rejected');
  }
  const publishedReviewValidation =
    validatePresentationCaptionPublishedReviewInputV004({
      reviewRenderRequest: request,
      displayPlan: displayPlan.value,
      instructionBundle: instructionBundle.value,
      captionCheckReport: captionCheck.value,
      layoutPreflight: layoutPreflight.value,
    });
  const displayValidation =
    validatePresentationCaptionDisplayPlanV002(displayPlan.value);
  if (
    publishedReviewValidation.status !== 'passed'
    || displayValidation.status !== 'passed'
  ) {
    throw new TypeError('vertical B4 artifacts do not form an accepted review input');
  }
  if (
    !isObject(displayPlan.value)
    || !isObject(displayPlan.value.sourceAtomBinding)
    || !isObject(displayPlan.value.semanticCompilerInputBinding)
  ) {
    throw new TypeError('vertical display plan provenance bindings are absent');
  }
  const retainedSourceAtoms = await readBoundArtifactV001(
    displayPlan.value.sourceAtomBinding.sourceAtoms,
  );
  const semanticValidationReport = await readBoundArtifactV001(
    displayPlan.value.semanticCompilerInputBinding.validationReport,
  );
  if (
    !isObject(semanticValidationReport.value)
    || !isObject(semanticValidationReport.value.inputBindings)
  ) {
    throw new TypeError('vertical semantic validation provenance is absent');
  }
  const sourcePackageManifest = await readBoundArtifactV001(
    semanticValidationReport.value.inputBindings.sourcePackageManifest,
  );
  const instructionValidation = validatePresentationInstructionContractV004({
    instructionBundle: instructionBundle.value,
    displayPlan: displayPlan.value,
    retainedSourceAtoms: retainedSourceAtoms.value,
    trustedRegistryBindings: trustedRegistryBindings.value,
    presetRegistry: presetRegistry.value,
    presetValidationIndex: presetValidationIndex.value,
    materialValidationIndex: materialValidationIndex.value,
    sourcePackageManifest: sourcePackageManifest.value,
  });
  if (instructionValidation.status !== 'passed') {
    throw new TypeError('vertical instruction contract is rejected');
  }
  return {
    request,
    inputBindings,
    artifacts: {
      displayPlan,
      instructionBundle,
      captionCheck,
      layoutPreflight,
      cropDecision,
      baseMedia,
      baseMediaGenerationManifest,
      baseMediaTimeline,
      baseMediaValidationReport,
      presetRegistry,
      presetValidationIndex,
      materialValidationIndex,
      trustedRegistryBindings,
      rendererTrust,
      retainedSourceAtoms,
      semanticValidationReport,
      sourcePackageManifest,
    },
  };
}

type VerticalPresetProjection = {
  registryVersion: string;
  canvas: {
    width: number;
    height: number;
    fps: number;
    safeAreaPx: {top: number; right: number; bottom: number; left: number};
  };
  fontAsset: {fileName: string};
  visualState: {
    stateId: string;
    textStyle: {
      fontSizePx: number;
      fontColor: string;
      borderColor: string;
      borderWidthPx: number;
      lineSpacingPercent: number;
      glowColor: string;
      glowWidthPx: number;
      glowOpacityPercent: number;
    };
    position: {
      preset: string;
      alignment: 'left' | 'center' | 'right';
      offsetXPercent: number;
      offsetYPercent: number;
    };
    background: null;
    layout: {
      maxSupportedLogicalWidthPerLine: number;
      maxLines: number;
      singleLine: boolean;
      characterWidthRule: string;
    };
  };
};

export function resolvePresentationVerticalPresetProjectionV001(
  registry: unknown,
  presetId: string,
  visualStateId: string,
): VerticalPresetProjection {
  if (
    !isObject(registry)
    || registry.schemaVersion !== 'presentation-preset-registry-v002'
    || registry.registryVersion !== 'vertical-short-preset-registry-v001'
    || registry.format !== 'vertical-short-1080x1920'
    || !Array.isArray(registry.presets)
    || !Array.isArray(registry.fontAssets)
    || !isObject(registry.canvas)
  ) {
    throw new TypeError('vertical preset registry is invalid');
  }
  const preset = registry.presets.find(
    (entry) => isObject(entry) && entry.presetId === presetId,
  );
  if (
    !isObject(preset)
    || preset.screenLayoutId !== 'speaker_only'
    || !Array.isArray(preset.visualStates)
  ) {
    throw new TypeError('vertical preset is not registered for speaker_only');
  }
  const visualState = preset.visualStates.find(
    (entry) => isObject(entry) && entry.stateId === visualStateId,
  );
  if (
    !isObject(visualState)
    || !isObject(visualState.textStyle)
    || !isObject(visualState.position)
    || !isObject(visualState.layout)
  ) {
    throw new TypeError('vertical visual state is invalid');
  }
  const fontAsset = registry.fontAssets.find(
    (entry) => isObject(entry)
      && entry.fontAssetId === visualState.textStyle.fontAssetId,
  );
  if (!isObject(fontAsset) || !isNonEmptyString(fontAsset.fileName)) {
    throw new TypeError('vertical font asset is unresolved');
  }
  return {
    registryVersion: registry.registryVersion as string,
    canvas: structuredClone(registry.canvas) as VerticalPresetProjection['canvas'],
    fontAsset: {fileName: fontAsset.fileName},
    visualState: structuredClone(visualState) as VerticalPresetProjection['visualState'],
  };
}

export async function validatePresentationVerticalRendererTrustV001({
  trust,
  presetRegistry,
  runtimeProfile,
  implementationBindings,
}: {
  trust: unknown;
  presetRegistry: unknown;
  runtimeProfile: unknown;
  implementationBindings: unknown;
}) {
  const violations: Violation[] = [];
  if (
    !exactKeys(trust, [
      'schemaVersion',
      'trustVersion',
      'rendererContractVersion',
      'presetRegistry',
      'registryBinding',
      'approvedPreview',
      'rendererDependencies',
      'fontAssets',
      'layoutRules',
      'toolVersions',
    ])
    || trust.schemaVersion !== 'presentation-vertical-renderer-trust-v001'
    || trust.trustVersion !== 'presentation-vertical-renderer-trust-v001'
    || !isObject(presetRegistry)
    || trust.presetRegistry?.registryVersion !== presetRegistry.registryVersion
    || JSON.stringify(trust.toolVersions) !== JSON.stringify(runtimeProfile)
    || !Array.isArray(trust.rendererDependencies)
    || trust.rendererDependencies.length !== 15
    || !Array.isArray(trust.fontAssets)
    || trust.fontAssets.length !== 1
    || !Array.isArray(implementationBindings)
  ) {
    return {
      ...report([makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        ['$.rendererTrust'],
      )]),
      metrics: {verifiedRuntimeToolCount: 0, requiredRuntimeToolCount: 7},
    };
  }
  const implementationByPath = new Map(
    implementationBindings
      .filter(isObject)
      .map((binding) => [binding.path, binding]),
  );
  for (const dependency of trust.rendererDependencies) {
    if (
      !exactKeys(dependency, ['role', 'path', 'fileSha256'])
      || !isNonEmptyString(dependency.path)
      || !isNonEmptyString(dependency.fileSha256)
    ) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        ['$.rendererTrust.rendererDependencies'],
      ));
      continue;
    }
    try {
      const bytes = await readFile(resolveRepoPath(dependency.path));
      const jobBinding = implementationByPath.get(dependency.path);
      const observedSha256 = sha256(bytes);
      if (jobBinding !== undefined
        ? observedSha256 !== jobBinding.fileSha256
        : observedSha256 !== dependency.fileSha256) {
        throw new TypeError('renderer trust dependency mismatch');
      }
    } catch {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        [dependency.path],
      ));
    }
  }
  for (const font of trust.fontAssets) {
    if (
      !exactKeys(font, [
        'fontAssetId',
        'path',
        'fileSha256',
        'licensePath',
        'licenseFileSha256',
      ])
      || !isNonEmptyString(font.path)
      || !isNonEmptyString(font.licensePath)
    ) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        ['$.rendererTrust.fontAssets'],
      ));
      continue;
    }
    try {
      const [fontBytes, licenseBytes] = await Promise.all([
        readFile(resolveRepoPath(font.path)),
        readFile(resolveRepoPath(font.licensePath)),
      ]);
      if (
        sha256(fontBytes) !== font.fileSha256
        || sha256(licenseBytes) !== font.licenseFileSha256
      ) {
        throw new TypeError('font trust mismatch');
      }
    } catch {
      violations.push(makeViolation(
        'VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH',
        [font.path, font.licensePath],
      ));
    }
  }
  return {
    ...report(dedupeViolations(violations)),
    metrics: {
      verifiedRuntimeToolCount: violations.length === 0 ? 7 : 7,
      requiredRuntimeToolCount: 7,
    },
  };
}

export function buildPresentationVerticalTelopPropsV001({
  element,
  plan,
  presetRegistry,
  inspectionLineIndex = null,
}: {
  element: JsonObject;
  plan: JsonObject;
  presetRegistry: unknown;
  inspectionLineIndex?: number | null;
}): FormalRemotionTelopRenderInput {
  const visualState = isObject(element.visualState) ? element.visualState : {};
  const stateId = isNonEmptyString(element.stateId)
    ? element.stateId
    : visualState.stateId;
  if (
    !isNonEmptyString(element.instructionId)
    || !isNonEmptyString(element.text)
    || !Array.isArray(element.indexedLines)
    || !isNonEmptyString(element.appliedPresetId)
    || !isNonEmptyString(stateId)
    || !isObject(plan.canvas)
    || !isObject(plan.layoutRules)
  ) {
    throw new TypeError('vertical render plan element is invalid');
  }
  const projection = resolvePresentationVerticalPresetProjectionV001(
    presetRegistry,
    element.appliedPresetId,
    stateId,
  );
  const maximumWidth = plan.layoutRules.maxLogicalWidthPerLine;
  if (
    !Number.isInteger(maximumWidth)
    || maximumWidth <= 0
    || maximumWidth > projection.visualState.layout.maxSupportedLogicalWidthPerLine
  ) {
    throw new TypeError('vertical job display width is invalid');
  }
  if (
    plan.canvas.width !== projection.canvas.width
    || plan.canvas.height !== projection.canvas.height
    || plan.canvas.fps !== projection.canvas.fps
  ) {
    throw new TypeError('vertical render canvas differs from the registered preset');
  }
  const explicitText = element.indexedLines
    .map((line) => {
      if (!isObject(line) || !isNonEmptyString(line.renderedText)) {
        throw new TypeError('vertical indexed line is invalid');
      }
      return line.renderedText;
    })
    .join('\n');
  const sourceText = element.indexedLines
    .map((line) => (line as JsonObject).renderedText as string)
    .join('');
  if (sourceText !== element.text) {
    throw new TypeError('vertical explicit lines do not reproduce the element text');
  }
  const textStyle = projection.visualState.textStyle;
  const position = projection.visualState.position;
  return {
    text: explicitText,
    style: {
      fontFamily: projection.fontAsset.fileName,
      fontSize: textStyle.fontSizePx,
      fontColor: textStyle.fontColor,
      borderColor: textStyle.borderColor,
      borderWidth: textStyle.borderWidthPx,
      lineSpacing: textStyle.lineSpacingPercent,
      glowColor: textStyle.glowColor,
      glowColorMode: 'fixed',
      glowWidth: textStyle.glowWidthPx,
      glowOpacity: textStyle.glowOpacityPercent,
    },
    position: {
      preset: position.preset,
      alignment: position.alignment,
      offsetX: position.offsetXPercent,
      offsetY: position.offsetYPercent,
    },
    maxCharsPerLine: maximumWidth,
    width: projection.canvas.width,
    height: projection.canvas.height,
    glowSeedHint: element.instructionId,
    inspectionLineIndex,
    fontFailurePolicy: 'strict-cancel',
  };
}

export async function validatePresentationVerticalTextModelV001(
  props: FormalRemotionTelopRenderInput,
  expectedLines: string[],
): {
  status: 'passed';
  model: TelopRenderModel;
} | {
  status: 'rejected';
  violations: Violation[];
} {
  const {buildTelopRenderModel} = await import(pathToFileURL(
    resolveRepoPath('runner/src/telop/telop-render-model.ts'),
  ).href);
  const model = buildTelopRenderModel({
    text: props.text,
    style: props.style,
    position: props.position,
    maxCharsPerLine: props.maxCharsPerLine,
    singleLine: false,
    width: props.width,
    height: props.height,
    glowSeedHint: props.glowSeedHint,
  });
  const actualLines = model.text.lines.map((line) => line.text);
  if (
    model.resolvedText !== props.text
    || JSON.stringify(actualLines) !== JSON.stringify(expectedLines)
    || actualLines.join('\n') !== props.text
  ) {
    return report([makeViolation('VERTICAL_RENDER_TEXT_MODEL_MISMATCH', ['$textModel'])]);
  }
  return {status: 'passed', model};
}

type VerticalLineRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const positiveRectIntersection = (
  left: VerticalLineRect,
  right: VerticalLineRect,
) => ({
  width: Math.min(left.right, right.right) - Math.max(left.left, right.left),
  height: Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
});

/**
 * 縦型は横型の保守的wrapper外枠を合否に使わず、同じ文字modelから
 * 行mask検査へ渡す座標だけを作る。安全領域の正本は描画後PNGのalpha境界。
 */
export async function inspectPresentationVerticalTextLayoutV001({
  plan,
  presetRegistry,
}: {
  plan: JsonObject;
  presetRegistry: JsonObject;
}) {
  const violations: Violation[] = [];
  const items: JsonObject[] = [];
  const elements = Array.isArray(plan.elements) ? plan.elements : [];
  for (const [elementIndex, elementValue] of elements.entries()) {
    if (!isObject(elementValue)) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_TEXT_MODEL_MISMATCH',
        [`$.plan.elements[${elementIndex}]`],
      ));
      continue;
    }
    try {
      const props = buildPresentationVerticalTelopPropsV001({
        element: elementValue,
        plan,
        presetRegistry,
      });
      const expectedLines = Array.isArray(elementValue.indexedLines)
        ? elementValue.indexedLines.map((line) => (
          isObject(line) ? line.renderedText : null
        ))
        : [];
      if (
        expectedLines.length < 1
        || expectedLines.some((line) => !isNonEmptyString(line))
      ) {
        throw new TypeError('vertical explicit line list is invalid');
      }
      const textModel = await validatePresentationVerticalTextModelV001(
        props,
        expectedLines as string[],
      );
      if (textModel.status !== 'passed') {
        violations.push(...textModel.violations);
        continue;
      }
      const {model} = textModel;
      const strokeExtent = Math.max(
        model.text.borderStrokeWidth,
        model.text.glowStrokeWidth,
      ) / 2;
      const lineRects = model.text.lines.map((line) => ({
        left: model.wrapper.left + line.x - strokeExtent,
        top: model.wrapper.top + line.y - strokeExtent,
        right: model.wrapper.left + line.x + line.width + strokeExtent,
        bottom: model.wrapper.top + line.y + model.text.fontSize + strokeExtent,
      }));
      const maximumLines = isObject(plan.layoutRules)
        ? plan.layoutRules.maxLinesPerMeaningGroup
        : null;
      if (
        !Number.isInteger(maximumLines)
        || maximumLines < 1
        || lineRects.length > maximumLines
      ) {
        throw new TypeError('vertical line count exceeds the bound display constraint');
      }
      for (let leftIndex = 0; leftIndex < lineRects.length; leftIndex += 1) {
        for (
          let rightIndex = leftIndex + 1;
          rightIndex < lineRects.length;
          rightIndex += 1
        ) {
          const overlap = positiveRectIntersection(
            lineRects[leftIndex],
            lineRects[rightIndex],
          );
          if (overlap.width > 0 && overlap.height > 0) {
            throw new TypeError('vertical text lines positively intersect');
          }
        }
      }
      items.push({
        instructionId: elementValue.instructionId,
        stateId: elementValue.stateId,
        lineCount: lineRects.length,
        lineRects,
        wrapper: structuredClone(model.wrapper),
      });
    } catch {
      violations.push(makeViolation(
        'VERTICAL_RENDER_TEXT_MODEL_MISMATCH',
        [`$.plan.elements[${elementIndex}]`],
      ));
    }
  }
  return {
    schemaVersion: 'presentation-vertical-render-layout-inspection-v001',
    status: violations.length === 0 ? 'passed' as const : 'rejected' as const,
    canvas: structuredClone(plan.canvas),
    items,
    violations: dedupeViolations(violations),
  };
}

export function buildPresentationVerticalOverlayAdapterV001(
  presetRegistry: unknown,
  runtime: FormalRemotionRuntimeBinding,
) {
  const buildProps = (element: JsonObject, plan: JsonObject) => {
    return buildPresentationVerticalTelopPropsV001({
      element,
      plan,
      presetRegistry,
    });
  };
  return {
    buildProps,
    renderStill: (
      props: FormalRemotionTelopRenderInput,
      outputPath: string,
    ) => import(pathToFileURL(
      resolveRepoPath('runner/src/telop-remotion.ts'),
    ).href).then(
      ({renderFormalRemotionTelopPng}) => (
        renderFormalRemotionTelopPng(props, outputPath, runtime)
      ),
    ),
    renderLineMask: (
      props: FormalRemotionTelopRenderInput,
      lineIndex: number,
      outputPath: string,
    ) => import(pathToFileURL(
      resolveRepoPath('runner/src/telop-remotion.ts'),
    ).href).then(
      ({renderFormalRemotionTelopPng}) => renderFormalRemotionTelopPng(
        {...props, inspectionLineIndex: lineIndex},
        outputPath,
        runtime,
      ),
    ),
  };
}

/**
 * B4 v004の明示行を、v003へ変換せず共通描画エンジンの物理計画へ写す。
 */
export function buildPresentationVerticalRenderPlanV001({
  instructionBundle,
  displayPlan,
  presetRegistry,
  timeline,
}: {
  instructionBundle: JsonObject;
  displayPlan: JsonObject;
  presetRegistry: JsonObject;
  timeline: JsonObject;
}): {
  status: 'passed';
  plan: JsonObject;
} | {
  status: 'rejected';
  violations: Violation[];
} {
  const violations: Violation[] = [];
  const instructionSet = isObject(instructionBundle.instructionSet)
    ? instructionBundle.instructionSet
    : null;
  const resolutionPackage = isObject(instructionBundle.resolutionPackage)
    ? instructionBundle.resolutionPackage
    : null;
  const instructions = uniqueBy(
    instructionSet?.instructions,
    (instruction) => instruction.instructionId,
  );
  const presets = uniqueBy(presetRegistry.presets, (preset) => preset.presetId);
  const transitions = uniqueBy(
    presetRegistry.transitions,
    (transition) => transition.transitionId,
  );
  if (!instructionSet || !resolutionPackage || !instructions || !presets || !transitions) {
    return report([makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', ['$renderPlan'])]);
  }

  const formatSelection = isObject(displayPlan.formatSelection)
    ? displayPlan.formatSelection
    : null;
  const displayConstraints = isObject(displayPlan.displayConstraints)
    ? displayPlan.displayConstraints
    : null;
  if (
    !formatSelection
    || !displayConstraints
    || formatSelection.format !== 'vertical-short-1080x1920'
    || formatSelection.screenLayoutId !== 'speaker_only'
  ) {
    violations.push(makeViolation(
      'DISPLAY_FORMAT_BINDING_MISMATCH',
      ['$.displayPlan.formatSelection'],
    ));
  }

  const cueRecords: Array<{container: JsonObject; cue: JsonObject}> = [];
  for (const container of Array.isArray(displayPlan.containers) ? displayPlan.containers : []) {
    if (!isObject(container) || !Array.isArray(container.cues)) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_INPUT_BINDING_MISMATCH',
        ['$.displayPlan.containers'],
      ));
      continue;
    }
    for (const cue of container.cues) {
      if (isObject(cue)) cueRecords.push({container, cue});
    }
  }
  cueRecords.sort(
    (left, right) => Number(left.cue.globalCueOrdinal) - Number(right.cue.globalCueOrdinal),
  );

  const elements: JsonObject[] = [];
  const usedInstructionIds = new Set<string>();
  for (const [index, {container, cue}] of cueRecords.entries()) {
    const cuePath = `$.displayPlan.containers.cues[${index}]`;
    const instructionId = cue.instructionId;
    const instruction = isNonEmptyString(instructionId)
      ? instructions.get(instructionId)
      : undefined;
    if (
      !instruction
      || usedInstructionIds.has(instructionId as string)
      || instruction.kind !== 'speech-caption'
      || !sameArray(
        isObject(instruction.target) ? instruction.target.targetRefIds : null,
        [cue.targetRefId],
      )
      || instruction.presetId !== formatSelection?.presetId
      || !Array.isArray(instruction.materialRefs)
      || instruction.materialRefs.length !== 0
    ) {
      violations.push(makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', [cuePath]));
      continue;
    }
    usedInstructionIds.add(instructionId as string);

    const preset = presets.get(instruction.presetId as string);
    const policy = isObject(preset) && Array.isArray(preset.kindPolicies)
      ? preset.kindPolicies.find(
        (entry) => isObject(entry) && entry.kind === instruction.kind,
      )
      : undefined;
    const visualState = isObject(preset) && Array.isArray(preset.visualStates)
      ? preset.visualStates.find(
        (entry) => isObject(entry)
          && isObject(policy)
          && entry.stateId === policy.stateId,
      )
      : undefined;
    const transition = isObject(visualState)
      ? transitions.get(visualState.transitionId as string)
      : undefined;
    const cueLines = Array.isArray(cue.lines) ? cue.lines : [];
    const textLayout = indexExplicitLinesV001(
      cueLines.map((line) => isObject(line) ? line.text : null),
    );
    const mapping = mapPresentationSourceIntervalV002(
      timeline,
      cue.sourceStartMs,
      cue.sourceEndMs,
    );
    if (
      !preset
      || preset.presetId !== instruction.presetId
      || presetRegistry.registryVersion
        !== (isObject(instructionSet.presetRegistryBinding)
          ? instructionSet.presetRegistryBinding.registryVersion
          : null)
      || !isObject(policy)
      || policy.endResponsibility !== 'target-anchor'
      || !isObject(visualState)
      || visualState.stateId !== formatSelection?.visualStateId
      || !transition
      || textLayout.status !== 'passed'
      || !isObject(visualState.layout)
      || cueLines.length > visualState.layout.maxLines
      || mapping.status !== 'passed'
      || mapping.mapping.timelineSegmentId !== container.timelineSegmentId
    ) {
      violations.push(makeViolation('VERTICAL_RENDER_INPUT_BINDING_MISMATCH', [cuePath]));
      continue;
    }
    elements.push({
      instructionId: instruction.instructionId,
      kind: instruction.kind,
      text: textLayout.sourceText,
      indexedLines: textLayout.indexedLines,
      sourceStartMs: cue.sourceStartMs,
      sourceEndMs: cue.sourceEndMs,
      startFrame: mapping.mapping.startFrame,
      endFrameExclusive: mapping.mapping.endFrameExclusive,
      displayFrameCount: mapping.mapping.displayFrameCount,
      requestedPresetId: instruction.presetId,
      appliedPresetId: preset.presetId,
      presetId: preset.presetId,
      registryVersion: presetRegistry.registryVersion,
      presetRegistryVersion: presetRegistry.registryVersion,
      stateId: visualState.stateId,
      visualState: structuredClone(visualState),
      transition: structuredClone(transition),
      timelineSegmentId: mapping.mapping.timelineSegmentId,
      targetProvenance: {
        targetRefId: cue.targetRefId,
        targetType: 'caption-target',
        sourceAtomIds: cueLines.flatMap(
          (line) => isObject(line) && Array.isArray(line.sourceAtomIds)
            ? [...line.sourceAtomIds]
            : [],
        ),
        cueId: cue.cueId,
        captionTargetId: cue.targetRefId,
        lineAtomIds: cueLines.map(
          (line) => isObject(line) && Array.isArray(line.sourceAtomIds)
            ? [...line.sourceAtomIds]
            : [],
        ),
        startAnchor: structuredClone(cue.startAnchor),
        endAnchor: structuredClone(cue.endAnchor),
      },
      materialRefs: [],
    });
  }
  if (elements.length !== instructions.size || elements.length !== cueRecords.length) {
    violations.push(makeViolation(
      'VERTICAL_RENDER_INPUT_BINDING_MISMATCH',
      ['$.displayPlan.containers'],
    ));
  }
  for (let index = 1; index < elements.length; index += 1) {
    if (
      Number(elements[index].startFrame)
      < Number(elements[index - 1].endFrameExclusive)
    ) {
      violations.push(makeViolation(
        'VERTICAL_RENDER_INPUT_BINDING_MISMATCH',
        [`$.elements[${index}]`],
      ));
    }
  }
  if (violations.length > 0) return report(dedupeViolations(violations));

  return {
    status: 'passed',
    plan: {
      schemaVersion: 'presentation-vertical-review-render-plan-draft-v001',
      rendererVersion: PRESENTATION_VERTICAL_RENDERER_ID,
      sharedRenderEngineVersion: 'presentation-renderer-v002',
      instructionSetId: instructionSet.instructionSetId,
      resolutionPackageId: resolutionPackage.resolutionPackageId,
      timelineId: timeline.timelineId,
      timelineSchemaVersion: timeline.schemaVersion,
      presetRegistryVersion: presetRegistry.registryVersion,
      format: formatSelection?.format,
      screenLayoutId: formatSelection?.screenLayoutId,
      canvas: structuredClone(presetRegistry.canvas),
      layoutRules: {
        maxLogicalWidthPerLine: displayConstraints?.maxLogicalWidthPerLine,
        maxLinesPerMeaningGroup: displayConstraints?.maxLinesPerMeaningGroup,
        characterWidthRule: displayConstraints?.characterWidthRule,
      },
      elements,
    },
  };
}

const verticalManifestArtifactProjectionV001 = (
  manifest: JsonObject,
  artifactNames: typeof PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES,
) => ({
  rootFiles: [
    {
      name: artifactNames.video,
      declaredName: path.posix.basename(
        (manifest.output as JsonObject).videoPath as string,
      ),
      fileSha256: (manifest.output as JsonObject).videoFileSha256,
    },
    {
      name: artifactNames.plan,
      declaredName: path.posix.basename(
        (manifest.output as JsonObject).renderPlanPath as string,
      ),
      fileSha256: (manifest.output as JsonObject).renderPlanFileSha256,
    },
    {
      name: artifactNames.applicationResults,
      declaredName: path.posix.basename(
        (manifest.output as JsonObject).applicationResultsPath as string,
      ),
      fileSha256: (manifest.output as JsonObject).applicationResultsFileSha256,
    },
    {
      name: artifactNames.qc,
      declaredName: path.posix.basename(
        (manifest.output as JsonObject).qcPath as string,
      ),
      fileSha256: (manifest.output as JsonObject).qcFileSha256,
    },
  ],
  overlayDirectory: artifactNames.overlays,
  overlays: ((manifest.output as JsonObject).overlays as JsonObject[]).map(
    (entry) => ({
      path: path.posix.join(
        artifactNames.overlays,
        path.posix.basename(entry.path as string),
      ),
      fileSha256: entry.fileSha256,
    }),
  ),
  overlaySetCanonicalSource: (manifest.output as JsonObject).overlays,
  overlaySetCanonicalSha256:
    (manifest.output as JsonObject).overlaySetCanonicalSha256,
});

const nearestFrameDurationMs = (frameCount: number, fps: number): number => (
  Number(
    (BigInt(frameCount) * 1000n + BigInt(Math.floor(fps / 2)))
    / BigInt(fps),
  )
);

const readVerticalRenderJobFileV001 = async (jobPath: string) => {
  const absolutePath = path.isAbsolute(jobPath)
    ? path.resolve(jobPath)
    : path.resolve(WORKSPACE_ROOT, jobPath);
  if (!insideWorkspace(absolutePath)) {
    throw new TypeError('vertical render job escapes the repository');
  }
  const bytes = await readFile(absolutePath);
  const value = JSON.parse(bytes.toString('utf8')) as unknown;
  if (!isObject(value)) throw new TypeError('vertical render job is not an object');
  const expected = path.resolve(
    WORKSPACE_ROOT,
    JOB_ROOT,
    `${String(value.jobId)}.json`,
  );
  if (absolutePath !== expected) {
    throw new TypeError('vertical render job path differs from its job ID');
  }
  return {
    absolutePath,
    bytes,
    value,
    binding: {
      path: toRepoPath(absolutePath),
      fileSha256: sha256(bytes),
      canonicalSha256: canonicalSha256(value),
    },
  };
};

const verifyVerticalJobStableV001 = async (
  jobArtifact: Awaited<ReturnType<typeof readVerticalRenderJobFileV001>>,
) => {
  const bytes = await readFile(jobArtifact.absolutePath);
  return bytes.equals(jobArtifact.bytes);
};

const buildVerticalRuntimeAdapterV001 = (
  runtimeProfile: JsonObject,
): FormalRemotionRuntimeBinding => ({
  nodePath: (runtimeProfile.node as JsonObject).path as string,
  remotionCliPath: (runtimeProfile.remotion as JsonObject).path as string,
  browserExecutablePath: (runtimeProfile.browser as JsonObject).path as string,
});

const buildVerticalDrawToolPathsV001 = (runtimeProfile: JsonObject) => ({
  ffmpegPath: (runtimeProfile.ffmpeg as JsonObject).path as string,
  ffprobePath: (runtimeProfile.ffprobe as JsonObject).path as string,
  imageMagickPath: (runtimeProfile.imageMagick as JsonObject).path as string,
});

const writeFormalJsonExclusiveV001 = async (
  outputPath: string,
  value: unknown,
) => {
  await writeFile(outputPath, formalJsonBytes(value), {
    flag: 'wx',
    mode: 0o600,
  });
};

export async function executePresentationVerticalReviewRendererV001(
  jobArtifact: Awaited<ReturnType<typeof readVerticalRenderJobFileV001>>,
) {
  const job = jobArtifact.value;
  const jobValidation = validatePresentationVerticalRenderJobV001(job);
  if (jobValidation.status !== 'passed') {
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: jobValidation.violations,
        metrics: {
          verifiedInputBindingCount: 0,
          requiredInputBindingCount: 15,
        },
      }),
    };
  }
  const git = await inspectGitStateV001();
  const implementationValidation =
    await validatePresentationVerticalImplementationBindingsV001(
      job.implementationBindings,
    );
  if (implementationValidation.status !== 'passed') {
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: implementationValidation.violations,
        metrics: implementationValidation.metrics,
      }),
    };
  }
  const runtimeValidation =
    await validatePresentationVerticalRuntimeProfileV001(job.runtimeProfile);
  if (runtimeValidation.status !== 'passed') {
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: runtimeValidation.violations,
        metrics: runtimeValidation.metrics,
      }),
    };
  }
  const reviewRenderRequest = await readBoundArtifactV001(
    job.reviewRenderRequest,
  );
  const context = await resolvePresentationVerticalReviewInputsV001(
    reviewRenderRequest,
  );
  const cropSourceValidation =
    await validatePresentationVerticalCropSourceBindingV001({
      cropDecisionArtifact: context.artifacts.cropDecision,
      baseMediaBinding: context.inputBindings.baseMedia,
    });
  if (cropSourceValidation.status !== 'passed') {
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: cropSourceValidation.violations,
        metrics: {
          verifiedInputBindingCount: 15,
          requiredInputBindingCount: 15,
        },
      }),
    };
  }
  const trustValidation = await validatePresentationVerticalRendererTrustV001({
    trust: context.artifacts.rendererTrust.value,
    presetRegistry: context.artifacts.presetRegistry.value,
    runtimeProfile: job.runtimeProfile,
    implementationBindings: job.implementationBindings,
  });
  if (trustValidation.status !== 'passed') {
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: trustValidation.violations,
        metrics: trustValidation.metrics,
      }),
    };
  }

  const cropResult = await createPresentationVerticalCroppedBaseMediaV001({
    baseMediaPath: context.artifacts.baseMedia.absolutePath,
    cropDecision: context.artifacts.cropDecision.value as JsonObject,
    runtimeProfile: job.runtimeProfile as JsonObject,
  });
  if (cropResult.status !== 'passed') {
    if ('workDirectory' in cropResult) {
      await rm(cropResult.workDirectory as string, {recursive: true, force: true});
    }
    return {
      exitCode: 1,
      failure: buildPresentationVerticalRejectedFailureV001({
        jobBinding: jobArtifact.binding,
        violations: cropResult.violations,
        metrics: {
          sourceWidth: 0,
          sourceHeight: 0,
          outputWidth: 0,
          outputHeight: 0,
          fps: 0,
          frameCount: 0,
        },
      }),
    };
  }
  try {
    const planResult = buildPresentationVerticalRenderPlanV001({
      instructionBundle: context.artifacts.instructionBundle.value as JsonObject,
      displayPlan: context.artifacts.displayPlan.value as JsonObject,
      presetRegistry: context.artifacts.presetRegistry.value as JsonObject,
      timeline: context.artifacts.baseMediaTimeline.value as JsonObject,
    });
    if (planResult.status !== 'passed') {
      return {
        exitCode: 1,
        failure: buildPresentationVerticalRejectedFailureV001({
          jobBinding: jobArtifact.binding,
          violations: planResult.violations,
          metrics: {
            verifiedInputBindingCount: 15,
            requiredInputBindingCount: 15,
          },
        }),
      };
    }
    const layoutInspection = await inspectPresentationVerticalTextLayoutV001({
      plan: planResult.plan,
      presetRegistry: context.artifacts.presetRegistry.value as JsonObject,
    });
    if (layoutInspection.status !== 'passed') {
      return {
        exitCode: 1,
        failure: buildPresentationVerticalRejectedFailureV001({
          jobBinding: jobArtifact.binding,
          violations: layoutInspection.violations,
          metrics: {
            instructionCount: (planResult.plan.elements as unknown[]).length,
            lineCount: layoutInspection.items.reduce(
              (sum, item) => sum + Number(item.lineCount),
              0,
            ),
          },
        }),
      };
    }
    const baseMediaInspection = {
      fileSha256: await fileSha256V002(cropResult.outputPath),
      frameCount: cropResult.sourceFrameCount,
      media: cropResult.outputMedia,
    };
    const outputDirectory = resolveRepoPath(job.outputDirectory as string);
    const drawResult = await executeValidatedPresentationDrawAndQcV001({
      outputDirectory,
      plan: planResult.plan,
      presetRegistry: context.artifacts.presetRegistry.value,
      baseMediaPath: cropResult.outputPath,
      baseMediaInspection,
      expectedFrameCount: cropResult.sourceFrameCount,
      artifactNames: PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES,
      evaluateQc: evaluatePresentationVerticalReviewRendererQcV001,
      overlayAdapter: buildPresentationVerticalOverlayAdapterV001(
        context.artifacts.presetRegistry.value,
        buildVerticalRuntimeAdapterV001(job.runtimeProfile as JsonObject),
      ),
      toolPaths: buildVerticalDrawToolPathsV001(job.runtimeProfile as JsonObject),
      validatedLayoutInspection: layoutInspection,
    });
    if (drawResult.exitCode !== 0) return drawResult;
    const {
      reservation,
      stagingDirectory,
      cleanupWarnings,
      overlayRecords,
      applicationResults,
      outputMedia,
      finalQc,
      workVideo,
    } = drawResult;
    const finalPlan = {
      ...planResult.plan,
      schemaVersion: 'presentation-vertical-review-render-plan-v001',
      elements: (planResult.plan.elements as JsonObject[]).map((element) => {
        const record = overlayRecords.find(
          (entry: JsonObject) => (
            (entry.element as JsonObject).instructionId === element.instructionId
          ),
        );
        return {...element, overlaySha256: record?.pngSha256};
      }),
    };
    const applicationDocument = {
      schemaVersion: 'presentation-vertical-review-render-application-results-v001',
      rendererVersion: PRESENTATION_VERTICAL_RENDERER_ID,
      presetRegistryVersion:
        (context.artifacts.presetRegistry.value as JsonObject).registryVersion,
      results: applicationResults,
    };
    const planPath = path.join(
      stagingDirectory,
      PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.plan,
    );
    const applicationResultsPath = path.join(
      stagingDirectory,
      PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.applicationResults,
    );
    const qcPath = path.join(
      stagingDirectory,
      PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.qc,
    );
    await Promise.all([
      writeFormalJsonExclusiveV001(planPath, finalPlan),
      writeFormalJsonExclusiveV001(applicationResultsPath, applicationDocument),
      writeFormalJsonExclusiveV001(qcPath, finalQc),
    ]);
    const [
      videoFileSha256,
      renderPlanFileSha256,
      applicationResultsFileSha256,
      qcFileSha256,
    ] = await Promise.all([
      fileSha256V002(workVideo),
      fileSha256V002(planPath),
      fileSha256V002(applicationResultsPath),
      fileSha256V002(qcPath),
    ]);
    const overlays = overlayRecords.map((record: JsonObject) => ({
      path: path.posix.join(
        job.outputDirectory as string,
        PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.overlays,
        path.basename(record.pngPath as string),
      ),
      fileSha256: record.pngSha256,
    }));
    const lines = (planResult.plan.elements as JsonObject[]).flatMap(
      (element) => element.indexedLines as JsonObject[],
    );
    const formatSelection =
      (context.artifacts.displayPlan.value as JsonObject).formatSelection;
    const displayConstraints =
      (context.artifacts.displayPlan.value as JsonObject).displayConstraints as JsonObject;
    const manifest = {
      schemaVersion: PRESENTATION_VERTICAL_RENDER_MANIFEST_SCHEMA_VERSION,
      status: 'passed',
      renderId: `${job.jobId as string}-result`,
      reviewOnly: true,
      publicReleaseAllowed: false,
      state: 'review_rendered',
      jobBinding: structuredClone(jobArtifact.binding),
      formatSelection: structuredClone(formatSelection),
      inputBindings: structuredClone(context.inputBindings),
      implementationBindings: structuredClone(job.implementationBindings),
      runtimeProfile: structuredClone(job.runtimeProfile),
      cropResult: {
        sourceWidth: cropResult.sourceMedia.video?.width,
        sourceHeight: cropResult.sourceMedia.video?.height,
        outputWidth: cropResult.outputMedia.video?.width,
        outputHeight: cropResult.outputMedia.video?.height,
        fps: 30,
        frameCount: cropResult.sourceFrameCount,
        audioPacketPayloadSha256:
          cropResult.outputMedia.audio?.packetPayloadSha256,
        filterCanonicalSha256: cropResult.filterCanonicalSha256,
      },
      textLayout: {
        instructionCount: (planResult.plan.elements as unknown[]).length,
        lineCount: lines.length,
        allLinesByteIdentical: true,
        maximumObservedLogicalWidth: Math.max(
          0,
          ...lines.map((line) => Number(line.logicalWidth)),
        ),
        maximumAllowedLogicalWidth:
          displayConstraints.maxLogicalWidthPerLine,
        maximumLinesPerMeaningGroup:
          displayConstraints.maxLinesPerMeaningGroup,
      },
      output: {
        videoPath: path.posix.join(
          job.outputDirectory as string,
          PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.video,
        ),
        videoFileSha256,
        durationMs: nearestFrameDurationMs(cropResult.sourceFrameCount, 30),
        frameCount: cropResult.sourceFrameCount,
        audioPacketPayloadSha256:
          outputMedia.audio?.packetPayloadSha256,
        renderPlanPath: path.posix.join(
          job.outputDirectory as string,
          PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.plan,
        ),
        renderPlanFileSha256,
        applicationResultsPath: path.posix.join(
          job.outputDirectory as string,
          PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.applicationResults,
        ),
        applicationResultsFileSha256,
        qcPath: path.posix.join(
          job.outputDirectory as string,
          PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.qc,
        ),
        qcFileSha256,
        overlays,
        overlaySetCanonicalSha256: canonicalSha256(overlays),
      },
      requiredReviewQc: {
        state: 'passed',
        requiredQc: [
          'presetApplication',
          'lineIntersection',
          'safeArea',
          'captionCompleteness',
          'framePreservation',
          'audioPreservation',
        ],
      },
      git,
    };
    const manifestPath = path.join(
      stagingDirectory,
      PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES.manifest,
    );
    await writeFormalJsonExclusiveV001(manifestPath, manifest);

    if (!await verifyVerticalJobStableV001(jobArtifact)) {
      throw new TypeError('vertical render job changed before publication');
    }
    const [
      finalImplementationValidation,
      finalRuntimeValidation,
      finalInputValidation,
      finalTrustValidation,
    ] = await Promise.all([
      validatePresentationVerticalImplementationBindingsV001(
        job.implementationBindings,
      ),
      validatePresentationVerticalRuntimeProfileV001(job.runtimeProfile),
      validatePresentationVerticalInputBindingsV001(context.inputBindings),
      validatePresentationVerticalRendererTrustV001({
        trust: context.artifacts.rendererTrust.value,
        presetRegistry: context.artifacts.presetRegistry.value,
        runtimeProfile: job.runtimeProfile,
        implementationBindings: job.implementationBindings,
      }),
    ]);
    if (
      finalImplementationValidation.status !== 'passed'
      || finalRuntimeValidation.status !== 'passed'
      || finalInputValidation.status !== 'passed'
      || finalTrustValidation.status !== 'passed'
    ) {
      throw new TypeError('vertical render bindings changed before publication');
    }
    const publication = await publishPresentationArtifactsV002({
      stagingDirectory,
      outputDirectory,
      reservation,
      artifactNames: PRESENTATION_VERTICAL_RENDER_OUTPUT_NAMES,
      projectManifestArtifacts: verticalManifestArtifactProjectionV001,
    });
    return {
      exitCode: 0,
      outputDirectory,
      publication,
      cleanupWarnings,
      plan: finalPlan,
      applicationResults: applicationDocument,
      manifest,
      qc: finalQc,
    };
  } finally {
    await rm(cropResult.workDirectory, {recursive: true, force: true});
  }
}

export async function runPresentationVerticalReviewRendererJobFileV001(
  jobPath: string,
) {
  const jobArtifact = await readVerticalRenderJobFileV001(jobPath);
  return executePresentationVerticalReviewRendererV001(jobArtifact);
}

const validatePixelProbeInputV001 = (value: unknown): JsonObject => {
  if (
    !exactKeys(value, [
      'schemaVersion',
      'probeId',
      'sourceBinding',
      'presetProjection',
      'lines',
      'glowSeed',
      'fontSizeOverridePx',
      'runtimeProfile',
    ])
    || value.schemaVersion
      !== 'presentation-vertical-preset-pixel-equivalence-probe-input-v001'
    || !isNonEmptyString(value.probeId)
    || !isObject(value.presetProjection)
    || !Array.isArray(value.lines)
    || value.lines.length < 1
    || value.lines.length > 2
    || value.lines.some((line) => !isNonEmptyString(line))
    || !isNonEmptyString(value.glowSeed)
    || !isObject(value.runtimeProfile)
    || !exactKeys(value.runtimeProfile, ['node', 'tsx', 'remotion', 'browser'])
  ) {
    throw new TypeError('pixel equivalence probe input is invalid');
  }
  for (const role of ['node', 'tsx', 'remotion', 'browser']) {
    if (!validateRuntimeBinding(value.runtimeProfile[role])) {
      throw new TypeError(`pixel equivalence runtime binding is invalid: ${role}`);
    }
  }
  const projection = value.presetProjection;
  if (
    !exactKeys(projection, [
      'presetId',
      'stateId',
      'format',
      'screenLayoutId',
      'canvas',
      'textStyle',
      'position',
      'layout',
      'transition',
    ])
    || projection.presetId !== 'vertical-short-speaker-only-readable-pop-v001'
    || projection.stateId !== 'caption-core-vertical-speaker-only-v001'
    || projection.format !== 'vertical-short-1080x1920'
    || projection.screenLayoutId !== 'speaker_only'
    || !isObject(projection.canvas)
    || !isObject(projection.textStyle)
    || !isObject(projection.position)
    || !isObject(projection.layout)
    || projection.textStyle.fontAssetId !== 'line-seed-jp-extra-bold-v001'
  ) {
    throw new TypeError('pixel equivalence preset projection is invalid');
  }
  if (
    value.fontSizeOverridePx !== null
    && (!Number.isInteger(value.fontSizeOverridePx) || value.fontSizeOverridePx <= 0)
  ) {
    throw new TypeError('pixel equivalence font size override is invalid');
  }
  return value;
};

export function buildPresentationVerticalPixelProbePropsV001(
  inputValue: unknown,
): {
  props: FormalRemotionTelopRenderInput;
  runtime: FormalRemotionRuntimeBinding;
} {
  const input = validatePixelProbeInputV001(inputValue);
  const projection = input.presetProjection as JsonObject;
  const textStyle = projection.textStyle as JsonObject;
  const position = projection.position as JsonObject;
  const layout = projection.layout as JsonObject;
  const canvas = projection.canvas as JsonObject;
  const fontSize = input.fontSizeOverridePx ?? textStyle.fontSizePx;
  if (
    !Number.isInteger(fontSize)
    || !Number.isInteger(canvas.width)
    || !Number.isInteger(canvas.height)
    || !Number.isInteger(layout.maxSupportedLogicalWidthPerLine)
  ) {
    throw new TypeError('pixel equivalence numeric projection is invalid');
  }
  const runtimeProfile = input.runtimeProfile as JsonObject;
  return {
    props: {
      text: (input.lines as string[]).join('\n'),
      style: {
        fontFamily: 'LINESeedJP_A_OTF_Eb.otf',
        fontSize,
        fontColor: textStyle.fontColor as string,
        borderColor: textStyle.borderColor as string,
        borderWidth: textStyle.borderWidthPx as number,
        lineSpacing: textStyle.lineSpacingPercent as number,
        glowColor: textStyle.glowColor as string,
        glowColorMode: 'fixed',
        glowWidth: textStyle.glowWidthPx as number,
        glowOpacity: textStyle.glowOpacityPercent as number,
      },
      position: {
        preset: position.preset as string,
        alignment: position.alignment as 'left' | 'center' | 'right',
        offsetX: position.offsetXPercent as number,
        offsetY: position.offsetYPercent as number,
      },
      maxCharsPerLine: layout.maxSupportedLogicalWidthPerLine as number,
      width: canvas.width as number,
      height: canvas.height as number,
      glowSeedHint: input.glowSeed as string,
      inspectionLineIndex: null,
      fontFailurePolicy: 'strict-cancel',
    },
    runtime: {
      nodePath: (runtimeProfile.node as JsonObject).path as string,
      remotionCliPath: (runtimeProfile.remotion as JsonObject).path as string,
      browserExecutablePath: (runtimeProfile.browser as JsonObject).path as string,
    },
  };
}

export async function runPresentationVerticalPixelProbeV001(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  if (!path.isAbsolute(inputPath) || !path.isAbsolute(outputPath)) {
    throw new TypeError('pixel equivalence probe paths must be absolute');
  }
  const inputBytes = await readFile(inputPath);
  const {props, runtime} = buildPresentationVerticalPixelProbePropsV001(
    JSON.parse(inputBytes.toString('utf8')),
  );
  const {renderFormalRemotionTelopPng} = await import(pathToFileURL(
    resolveRepoPath('runner/src/telop-remotion.ts'),
  ).href);
  await renderFormalRemotionTelopPng(props, outputPath, runtime);
}

const parseCliArgumentsV001 = (argv: string[]): {
  mode: 'pixel-equivalence-probe';
  input: string;
  output: string;
} | {
  mode: 'formal-render-job';
  jobPath: string;
} => {
  if (argv.length === 1 && isNonEmptyString(argv[0])) {
    return {mode: 'formal-render-job', jobPath: argv[0]};
  }
  if (
    argv.length === 6
    && argv[0] === '--mode'
    && argv[1] === 'pixel-equivalence-probe'
    && argv[2] === '--input'
    && argv[4] === '--output'
  ) {
    return {
      mode: 'pixel-equivalence-probe',
      input: argv[3],
      output: argv[5],
    };
  }
  throw new TypeError('vertical renderer CLI arguments are invalid');
};

async function main(): Promise<void> {
  const args = parseCliArgumentsV001(process.argv.slice(2));
  if (args.mode === 'pixel-equivalence-probe') {
    await runPresentationVerticalPixelProbeV001(args.input, args.output);
    return;
  }
  const result = await runPresentationVerticalReviewRendererJobFileV001(
    args.jobPath,
  );
  const output = result.exitCode === 0 ? result.manifest : result.failure;
  process.stdout.write(formalJsonBytes(output));
  process.exitCode = result.exitCode;
}

if (
  process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch(() => {
    process.stdout.write(formalJsonBytes({
      schemaVersion: 'presentation-formal-runner-fatal-v001',
      runnerId: PRESENTATION_VERTICAL_RENDERER_ID,
      status: 'fatal',
      diagnosticCode: PRESENTATION_VERTICAL_RENDER_FATAL_DIAGNOSTIC,
    }));
    process.exitCode = 2;
  });
}

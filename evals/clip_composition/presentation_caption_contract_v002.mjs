import { createHash } from 'node:crypto';

import {
  validatePresentationCaptionGrammarSharedV001,
} from './presentation_caption_contract_v003.mjs';

export const PRESENTATION_CAPTION_SCHEMA_VERSION = 'presentation-caption-check-v002';
export const PRESENTATION_CAPTION_CHECKER_VERSION = 'presentation-caption-checker-v002';
export const PRESENTATION_CAPTION_SPEAKER_VIOLATION_CODES = Object.freeze([
  'SOURCE_ATOM_SPEAKER_TYPE_INVALID',
  'SOURCE_ATOM_SPEAKER_EMPTY',
  'SOURCE_ATOM_SPEAKER_NOT_CANONICAL',
  'SOURCE_ATOM_SPEAKER_NON_IDENTITY_TOKEN',
]);
export const PRESENTATION_CAPTION_SCOPE_EXCLUSIONS = Object.freeze([
  'SOURCE_ATOM_SPEAKER_IDENTITY_CLASSIFICATION_OUTSIDE_REGISTRY_NOT_VERIFIED',
]);

const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};

export const canonicalJson = (value) => JSON.stringify(canonicalize(value));

const makeIssue = (grammar, code, path, message, relatedIds = [], details = undefined) => {
  const issue = {
    grammar,
    code,
    path,
    message,
    relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  };
  if (details !== undefined) issue.details = canonicalize(details);
  return issue;
};

const issueSortKey = (issue) => [
  issue.grammar,
  issue.code,
  issue.path,
  issue.relatedIds.join(','),
  canonicalJson(issue.details ?? null),
].join('\u0000');

const sortIssues = (issues) => issues.sort(
  (left, right) => issueSortKey(left).localeCompare(issueSortKey(right), 'en'),
);

const checkStatus = (violations) => (violations.length > 0 ? 'failed' : 'passed');

export function validatePresentationCaptionContract(input) {
  const root = isObject(input) ? input : {};
  const source = isObject(root.source) ? root.source : {};
  const outerViolations = [];
  if (!isObject(input)) {
    outerViolations.push(makeIssue(
      'CONTRACT',
      'CONTRACT_INPUT_NOT_OBJECT',
      '$',
      '入力全体はJSON objectである必要があります。',
    ));
  }
  if (root.schemaVersion !== PRESENTATION_CAPTION_SCHEMA_VERSION) {
    outerViolations.push(makeIssue(
      'CONTRACT',
      'CONTRACT_SCHEMA_VERSION_UNSUPPORTED',
      '$.schemaVersion',
      `schemaVersionは${PRESENTATION_CAPTION_SCHEMA_VERSION}だけを受け付けます。`,
    ));
  }
  if (root.format !== 'normal-landscape') {
    outerViolations.push(makeIssue(
      'CONTRACT',
      'CONTRACT_FORMAT_UNSUPPORTED',
      '$.format',
      'formatはnormal-landscapeである必要があります。',
    ));
  }
  if (!isObject(root.source)) {
    outerViolations.push(makeIssue(
      'CONTRACT',
      'SOURCE_NOT_OBJECT',
      '$.source',
      'sourceはobjectである必要があります。',
    ));
  }
  if (!isNonEmptyString(source.atomProvenance)) {
    outerViolations.push(makeIssue(
      'CONTRACT',
      'SOURCE_ATOM_PROVENANCE_MISSING',
      '$.source.atomProvenance',
      '時刻要素の出所と版が必要です。',
    ));
  }

  const grammarReport = validatePresentationCaptionGrammarSharedV001({
    source: {
      atomGranularity: source.atomGranularity,
      atoms: source.atoms,
      captionTargets: source.captionTargets,
      allowedSimultaneousGroups: source.allowedSimultaneousGroups,
    },
    captionPlan: root.captionPlan,
  });
  const contractViolations = [
    ...outerViolations,
    ...grammarReport.contract.violations,
  ];
  sortIssues(contractViolations);
  const contract = {
    status: checkStatus(contractViolations),
    violations: contractViolations,
    observations: grammarReport.contract.observations,
  };
  const checks = grammarReport.checks;
  const statuses = [contract.status, checks.G1.status, checks.G2.status, checks.G3.status];
  const overallStatus = statuses.includes('failed')
    ? 'failed'
    : statuses.includes('passed_with_declared_limit')
      ? 'passed_with_declared_limit'
      : 'passed';
  return {
    checkerVersion: PRESENTATION_CAPTION_CHECKER_VERSION,
    inputSha256: createHash('sha256').update(canonicalJson(root)).digest('hex'),
    overallStatus,
    contract,
    checks,
    scopeExclusions: [...PRESENTATION_CAPTION_SCOPE_EXCLUSIONS],
  };
}

export const serializePresentationCaptionReport = (report) => `${JSON.stringify(report, null, 2)}\n`;

import {createHash} from 'node:crypto';

import {
  PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  PRESENTATION_RENDERER_TEXT_LAYOUT_VERSION,
  codePointWeightV001,
} from './presentation_renderer_text_layout_v001.mjs';
import {
  PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001,
  checkPresentationSegmenterBoundaryPreflightV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';
import {
  validatePresentationSegmenterBoundaryPreflightReportV001,
} from './run_presentation_segmenter_boundary_preflight_v001.mjs';

export const PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001 = Object.freeze([
  'CAPTION_B1_JOB_INVALID',
  'JOB_FILE_MISMATCH',
  'IMPLEMENTATION_MISMATCH',
  'INPUT_PATH_UNSAFE',
  'INPUT_HASH_MISMATCH',
  'INPUT_SCHEMA_UNSUPPORTED',
  'RUNTIME_MISMATCH',
  'GATE_A_CONTEXT_INVALID',
  'GATE_A_REPORT_INVALID',
  'GATE_A_NOT_PASSED',
  'EVIDENCE_NONDETERMINISTIC',
  'EVIDENCE_EXPECTED_HASH_MISMATCH',
  'PACKAGE_FILE_SET_INVALID',
  'PACKAGE_SCHEMA_INVALID',
  'PACKAGE_STRICT_JSON_INVALID',
  'PACKAGE_BINDING_MISMATCH',
  'PACKAGE_HASH_MISMATCH',
  'MODEL_INPUT_SCHEMA_INVALID',
  'MODEL_INPUT_PROJECTION_MISMATCH',
  'MODEL_INPUT_FORBIDDEN_FIELD',
  'MODEL_INPUT_LEAKAGE_DETECTED',
  'MAPPING_SCHEMA_INVALID',
  'MAPPING_COVERAGE_INVALID',
  'SEMANTIC_OUTPUT_BYTES_INVALID',
  'SEMANTIC_OUTPUT_SCHEMA_INVALID',
  'SEMANTIC_OUTPUT_FORBIDDEN_FIELD',
  'SEMANTIC_CONTAINER_SET_INVALID',
  'SEMANTIC_CONTAINER_ORDER_INVALID',
  'SEMANTIC_GROUP_INVALID',
  'SEMANTIC_LINE_COUNT_INVALID',
  'SEMANTIC_BOUNDARY_ID_UNKNOWN',
  'SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER',
  'SEMANTIC_BOUNDARY_ID_DUPLICATE',
  'SEMANTIC_BOUNDARY_ORDER_INVALID',
  'SEMANTIC_CONTAINER_END_MISSING',
  'SEMANTIC_LINE_WIDTH_EXCEEDED',
  'EXPANSION_CANDIDATE_MISSING',
  'EXPANSION_CANDIDATE_DUPLICATED',
  'EXPANSION_CANDIDATE_ORDER_REVERSED',
  'EXPANSION_SOURCE_ATOM_MISSING',
  'EXPANSION_SOURCE_ATOM_DUPLICATED',
  'EXPANSION_SOURCE_ATOM_ORDER_REVERSED',
  'EXPANSION_CONTAINER_CROSSED',
  'EXPANSION_TEXT_MISMATCH',
  'EXPANSION_ANCHOR_MISMATCH',
  'COMPILER_INPUT_SCHEMA_INVALID',
  'COMPILER_INPUT_BINDING_MISMATCH',
  'BUILD_FAILED',
  'NONDETERMINISTIC',
  'READ_ONLY_CONTRACT_VIOLATED',
  'OUTPUT_ROOT_ALREADY_EXISTS',
  'PUBLICATION_LOCK_UNAVAILABLE',
  'PUBLICATION_STAGING_INVALID',
  'PUBLICATION_INPUT_CHANGED',
  'PUBLICATION_FAILED',
  'PUBLISHED_PACKAGE_INVALID',
  'PUBLICATION_PRE_RENAME_INVALID',
]);

const JOB_SCHEMA_VERSION = 'presentation-caption-semantic-source-package-job-v001';
const MODEL_INPUT_SCHEMA_VERSION = 'presentation-caption-semantic-source-input-v001';
const EXPANSION_MAP_SCHEMA_VERSION = 'presentation-caption-semantic-expansion-map-v001';
const LEAKAGE_REPORT_SCHEMA_VERSION = 'presentation-caption-source-only-leakage-report-v001';
const MANIFEST_SCHEMA_VERSION = 'presentation-caption-semantic-source-package-manifest-v001';
const PACKAGE_REPORT_SCHEMA_VERSION =
  'presentation-caption-semantic-source-package-validation-report-v001';
const RUN_REPORT_SCHEMA_VERSION =
  'presentation-caption-semantic-source-package-run-report-v001';
const GATE_A_REPORT_SCHEMA_VERSION = 'presentation-segmenter-boundary-preflight-report-v001';
const TASK_DESCRIPTION =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。';
const PRESET_ID = 'normal-landscape-readable-pop-v001';
const VISUAL_STATE_ID = 'caption-core-v001';
const MAX_LOGICAL_WIDTH = 36;
const MAX_LINES = 2;
const TRUST_CANONICAL_SHA256 =
  '9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2';
const STRICT_INTEGER_NUMBER_PROFILE = 'b1-integer';
const EXTERNAL_DISPLAY_NUMBER_PROFILE = 'external-display';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CANONICAL_UNSIGNED_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/;
const CANONICAL_SIGNED_DECIMAL_PATTERN = /^(?:0|-?[1-9][0-9]*)$/;
const WORKSPACE_PATH_PATTERN =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/).+$/;
const PACKAGE_CORE_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const PACKAGE_RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs';
const RENDERER_TRUST_IMPLEMENTATION_PATH =
  'evals/clip_composition/presentation_renderer_plan_v002.mjs';
const TEXT_LAYOUT_IMPLEMENTATION_PATH =
  'evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
const PRESET_ROOT =
  'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001';
const TRUST_PATH =
  'evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json';
const WIDTH_POLICY_SLOTS_V001 = Object.freeze([
  Object.freeze({
    role: 'presetRegistry',
    path: `${PRESET_ROOT}/preset-registry.json`,
    profile: 'integer-json',
  }),
  Object.freeze({
    role: 'presetValidationIndex',
    path: `${PRESET_ROOT}/preset-validation-index.json`,
    profile: 'integer-json',
  }),
  Object.freeze({
    role: 'materialValidationIndex',
    path: `${PRESET_ROOT}/material-validation-index.json`,
    profile: 'integer-json',
  }),
  Object.freeze({
    role: 'registryBinding',
    path: `${PRESET_ROOT}/trusted-registry-bindings.json`,
    profile: 'integer-json',
  }),
  Object.freeze({
    role: 'rendererTrust',
    path: TRUST_PATH,
    profile: 'renderer-trust-json',
  }),
  Object.freeze({
    role: 'textLayoutImplementation',
    path: TEXT_LAYOUT_IMPLEMENTATION_PATH,
    profile: 'bytes',
  }),
]);
const APPROVED_RENDERER_LAYOUT_RULES_V001 = Object.freeze({
  layoutRuleVersion: 'normal-landscape-render-layout-v001',
  fontWeight: 800,
  minimumFontSizePx: 12,
  textSafePaddingRatio: 0.04,
  horizontalSafeMarginRatio: 0.04,
  verticalSafeMarginRatio: 0.02,
  fallbackTextAreaRatio: 0.98,
  lowerThirdAnchorPercent: 67,
  renderScale: 1,
  characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
  borderStrokeWidthRule: '2 * max(0, borderWidthPx)',
  glowStrokeWidthRule: '2 * max(0, glowWidthPx) + 2 * max(0, borderWidthPx)',
  marginRule: 'max(glowStrokeWidth, borderStrokeWidth) / 2',
  safePaddingRule: 'max(2, ceil(fontSizePx * textSafePaddingRatio))',
  placementClampRule: 'clamp full alpha bounds inside canvas safe margins',
  humanReapprovalRule:
    'Any numeric or formula change requires a new rendered preview and human approval before a new trust and renderer version may be activated.',
});
const APPROVED_RENDERER_TRUST_DECIMALS_V001 = Object.freeze([
  Object.freeze({path: 'layoutRules\u0000textSafePaddingRatio', value: 0.04}),
  Object.freeze({path: 'layoutRules\u0000horizontalSafeMarginRatio', value: 0.04}),
  Object.freeze({path: 'layoutRules\u0000verticalSafeMarginRatio', value: 0.02}),
  Object.freeze({path: 'layoutRules\u0000fallbackTextAreaRatio', value: 0.98}),
]);
const WATCHED_ROOT = 'evals/clip_composition/outputs/presentation';
const PREFLIGHT_JOB_ROOT =
  `${WATCHED_ROOT}/caption-semantic-source-package-preflight-jobs/`;
const FORMAL_JOB_ROOT =
  `${WATCHED_ROOT}/caption-semantic-source-package-jobs/`;
const GATE_A_JOB_ROOT =
  `${WATCHED_ROOT}/segmenter-boundary-preflight-jobs/`;
const GATE_A_REPORT_ROOT = 'evals/clip_composition/reports/presentation/';

const PACKAGE_FILES = Object.freeze([
  'segmenter-boundary-evidence.json',
  'embedded-gate-a-validation-report.json',
  'semantic-source-input.json',
  'deterministic-expansion-map.json',
  'source-only-leakage-report.json',
  'package-manifest.json',
  'package-validation-report.json',
]);
const CONTENT_ROLES = Object.freeze([
  'boundaryEvidence',
  'embeddedGateAReport',
  'semanticSourceInput',
  'deterministicExpansionMap',
  'sourceOnlyLeakageReport',
]);
const PACKAGE_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'gateAContext',
  'evidenceBuild',
  'evidenceDeterminism',
  'embeddedReportBuild',
  'gateAReport',
  'packageBuild',
  'packageShape',
  'modelInput',
  'expansionMap',
  'sourceOnlyLeakage',
  'determinism',
]);
const PREFLIGHT_CHECK_NAMES = Object.freeze([
  ...PACKAGE_CHECK_NAMES,
  'readOnlyPreflight',
  'jobStability',
]);
const FORMAL_CHECK_NAMES = Object.freeze([
  ...PACKAGE_CHECK_NAMES,
  'jobPrePublication',
  'publication',
  'publishedPackage',
  'jobStability',
]);
const LEAKAGE_CHECK_NAMES = Object.freeze([
  'schemaAllowlist',
  'taskDescriptionBinding',
  'sourceProjection',
  'widthPolicyBinding',
  'forbiddenProvenanceAbsence',
]);
const PACKAGE_PHASES = Object.freeze([
  'gate-a-context-gate',
  'evidence-gate',
  'embedded-report-gate',
  'core-gate',
  'publication-gate',
  'publication-staging-gate',
  'publication-input-gate',
  'publication-pre-rename-gate',
  'final-report',
]);
const CODE_ORDER = new Map(
  PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001.map((code, index) => [code, index]),
);
const IN_MEMORY_REASONS = Object.freeze([
  'unsupported-value',
  'non-plain-object',
  'sparse-array',
  'extra-array-property',
  'accessor',
  'to-json',
  'symbol-key',
  'non-enumerable-property',
  'number-invalid',
  'surrogate-invalid',
]);
const FORMAL_OUTPUT_STATES = new Set(['absent']);
const compareUtf16 = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const exactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const isDenseArray = (value) => Array.isArray(value)
  && Object.keys(value).length === value.length
  && Object.keys(value).every((key, index) => key === String(index));
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const isSafeInteger = (value) => Number.isSafeInteger(value) && !Object.is(value, -0);
const isNonNegativeInteger = (value) => isSafeInteger(value) && value >= 0;
const isPositiveInteger = (value) => isSafeInteger(value) && value >= 1;
const isSha256 = (value) => typeof value === 'string' && SHA256_PATTERN.test(value);
const isSafeWorkspacePath = (value) => typeof value === 'string'
  && WORKSPACE_PATH_PATTERN.test(value);
const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const sameBytes = (left, right) => Buffer.isBuffer(left)
  && Buffer.isBuffer(right)
  && left.equals(right);

const IMPORT_SPECIFIER_PATTERN =
  /(?:^|\n)\s*import(?:\s+[\s\S]*?\s+from\s+|\s*)['"]([^'"]+)['"]\s*;?/g;
const importSpecifiers = (bytes) => {
  const source = bytes.toString('utf8');
  const values = [];
  let match;
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(source)) !== null) values.push(match[1]);
  const scan = executableJavaScriptTokens(source);
  const tokens = scan.valid ? scan.tokens : [];
  return {
    values,
    lexicallyValid: scan.valid,
    hasDynamicImport: scan.valid && tokens.some((token, index) =>
      token.value === 'import' && tokens[index + 1]?.value === '('),
    hasRequire: scan.valid && tokens.some((token, index) =>
      token.value === 'require' && tokens[index + 1]?.value === '('),
    hasModuleLoadFileIo: scan.valid && hasTopLevelFileIoCall(tokens),
  };
};

const MODULE_LOAD_FILE_IO_CALLS = new Set([
  'access',
  'accessSync',
  'appendFile',
  'appendFileSync',
  'copyFile',
  'copyFileSync',
  'createReadStream',
  'createWriteStream',
  'existsSync',
  'lstat',
  'lstatBigInt',
  'lstatSync',
  'mkdir',
  'mkdirExclusive',
  'mkdirSync',
  'open',
  'openDirectoryReadOnly',
  'openReadOnly',
  'openSync',
  'openWriteExclusive',
  'opendir',
  'opendirSync',
  'readFile',
  'readFileSync',
  'readdir',
  'readdirSync',
  'readdirWithTypes',
  'readlink',
  'readlinkSync',
  'realpath',
  'realpathSync',
  'removeEmptyDirectory',
  'rename',
  'renameSync',
  'rm',
  'rmSync',
  'rmdir',
  'rmdirSync',
  'stat',
  'statSync',
  'unlink',
  'unlinkSync',
  'writeFile',
  'writeFileSync',
]);
const FUNCTION_BODY_CONTROL_WORDS = new Set([
  'catch',
  'for',
  'if',
  'switch',
  'while',
  'with',
]);
const CONCISE_ARROW_ASI_START_WORDS = new Set([
  'class',
  'const',
  'export',
  'function',
  'import',
  'let',
  'var',
]);
// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_BEGIN
const EXECUTABLE_JAVASCRIPT_EXPRESSION_START_OPERATORS_V001 = Object.freeze([
  '!',
  '~',
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '&',
  '|',
  '^',
  '&&',
  '||',
  '??',
  '<',
  '<=',
  '>',
  '>=',
  '==',
  '===',
  '!=',
  '!==',
  '<<',
  '>>',
  '>>>',
  '=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '**=',
  '&=',
  '|=',
  '^=',
  '&&=',
  '||=',
  '??=',
  '<<=',
  '>>=',
  '>>>=',
]);
const EXECUTABLE_JAVASCRIPT_EXPRESSION_START_KEYWORDS_V001 = Object.freeze([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);
const EXECUTABLE_JAVASCRIPT_CONTROL_CONDITION_KEYWORDS_V001 = Object.freeze([
  'if',
  'for',
  'while',
  'with',
  'switch',
  'catch',
]);
const EXECUTABLE_JAVASCRIPT_EXPRESSION_START_KEYWORD_SET_V001 =
  new Set(EXECUTABLE_JAVASCRIPT_EXPRESSION_START_KEYWORDS_V001);
const EXECUTABLE_JAVASCRIPT_CONTROL_CONDITION_KEYWORD_SET_V001 =
  new Set(EXECUTABLE_JAVASCRIPT_CONTROL_CONDITION_KEYWORDS_V001);
const EXECUTABLE_JAVASCRIPT_NON_SLASH_OPERATORS_V001 = Object.freeze(
  EXECUTABLE_JAVASCRIPT_EXPRESSION_START_OPERATORS_V001
    .filter((value) => value !== '/' && value !== '/=')
    .sort((left, right) => right.length - left.length || compareUtf16(left, right)),
);
const EXECUTABLE_JAVASCRIPT_SPREAD_PRECEDING_TOKENS_V001 =
  new Set(['(', '[', '{', ',']);
const EXECUTABLE_JAVASCRIPT_SCAN_STATE_START_V001 = 'expression-start';
const EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001 = 'expression-end';
const EXECUTABLE_JAVASCRIPT_SCAN_STATE_BRACE_V001 = 'brace-slash-undecidable';
const EXECUTABLE_JAVASCRIPT_LITERAL_TOKEN_V001 = '<literal>';
const EXECUTABLE_JAVASCRIPT_DECIMAL_NUMBER_PATTERN_V001 =
  /^(?:0|[1-9][0-9]*)\.[0-9]+/u;
const EXECUTABLE_JAVASCRIPT_BIGINT_PATTERN_V001 = /^(?:0|[1-9][0-9]*)n/u;
const EXECUTABLE_JAVASCRIPT_INTEGER_PATTERN_V001 = /^(?:0|[1-9][0-9]*)/u;
const EXECUTABLE_JAVASCRIPT_HEX_PATTERN_V001 = /^0[xX][0-9A-Fa-f]+/u;
const EXECUTABLE_JAVASCRIPT_OCTAL_PATTERN_V001 = /^0[oO][0-7]+/u;
const EXECUTABLE_JAVASCRIPT_NUMBER_PATTERNS_V001 = Object.freeze([
  EXECUTABLE_JAVASCRIPT_HEX_PATTERN_V001,
  EXECUTABLE_JAVASCRIPT_OCTAL_PATTERN_V001,
  EXECUTABLE_JAVASCRIPT_DECIMAL_NUMBER_PATTERN_V001,
  EXECUTABLE_JAVASCRIPT_BIGINT_PATTERN_V001,
  EXECUTABLE_JAVASCRIPT_INTEGER_PATTERN_V001,
]);
const executableJavaScriptTokens = (source) => {
  const tokens = [];
  const modes = [{
    type: 'code',
    templateExpression: false,
    delimiters: [],
    tokenStartIndex: 0,
  }];
  let state = EXECUTABLE_JAVASCRIPT_SCAN_STATE_START_V001;
  let memberRequirement = null;
  let spreadTargetRequired = false;
  let optionalChainForbidsTag = false;
  let line = 1;
  const invalid = () => ({valid: false, tokens: []});
  const advanceLine = (character) => {
    if (character === '\n') line += 1;
  };
  const isIdentifierStart = (character) =>
    typeof character === 'string' && /^[A-Za-z_$]$/u.test(character);
  const isIdentifierPart = (character) =>
    typeof character === 'string' && /^[A-Za-z0-9_$]$/u.test(character);
  const previousTokenValue = (mode) =>
    tokens.length > mode.tokenStartIndex ? tokens[tokens.length - 1].value : null;
  const pushToken = (value, tokenLine = line) => {
    tokens.push({value, line: tokenLine});
  };
  const completeExpression = () => {
    state = EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001;
    spreadTargetRequired = false;
  };
  const startExpression = () => {
    state = EXECUTABLE_JAVASCRIPT_SCAN_STATE_START_V001;
    optionalChainForbidsTag = false;
  };
  for (let index = 0; index < source.length;) {
    const mode = modes[modes.length - 1];
    const character = source[index];
    const next = source[index + 1];
    if (mode.type === 'template') {
      if (character === '\\') {
        if (index + 1 >= source.length) return invalid();
        advanceLine(character);
        advanceLine(source[index + 1]);
        index += 2;
        continue;
      }
      if (character === '`') {
        modes.pop();
        index += 1;
        pushToken(EXECUTABLE_JAVASCRIPT_LITERAL_TOKEN_V001, mode.startLine);
        completeExpression();
        optionalChainForbidsTag = false;
        continue;
      }
      if (character === '$' && next === '{') {
        modes.push({
          type: 'code',
          templateExpression: true,
          delimiters: [],
          tokenStartIndex: tokens.length,
        });
        startExpression();
        spreadTargetRequired = false;
        memberRequirement = null;
        index += 2;
        continue;
      }
      advanceLine(character);
      index += 1;
      continue;
    }
    if (mode.templateExpression && character === '}' && mode.delimiters.length === 0) {
      if (memberRequirement !== null || spreadTargetRequired) return invalid();
      modes.pop();
      index += 1;
      continue;
    }
    if (/\s/u.test(character)) {
      advanceLine(character);
      index += 1;
      continue;
    }
    if (character === '/' && next === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      index += 2;
      let closed = false;
      while (index < source.length) {
        if (source[index] === '*' && source[index + 1] === '/') {
          index += 2;
          closed = true;
          break;
        }
        advanceLine(source[index]);
        index += 1;
      }
      if (!closed) return invalid();
      continue;
    }
    if (memberRequirement !== null) {
      if (memberRequirement.kind === 'optional-target' && character === '[') {
        pushToken('[', line);
        mode.delimiters.push({
          value: '[',
          controlCondition: false,
          optionalChainContinuation: true,
        });
        memberRequirement = null;
        startExpression();
        index += 1;
        continue;
      }
      if (!isIdentifierStart(character)) return invalid();
      let end = index + 1;
      while (end < source.length && isIdentifierPart(source[end])) end += 1;
      pushToken(source.slice(index, end), line);
      const optionalChain = memberRequirement.optionalChain;
      memberRequirement = null;
      completeExpression();
      optionalChainForbidsTag = optionalChain;
      index = end;
      continue;
    }
    if (character === '\'' || character === '"') {
      const quote = character;
      const tokenLine = line;
      index += 1;
      let closed = false;
      while (index < source.length) {
        const quoted = source[index];
        if (quoted === '\\') {
          if (index + 1 >= source.length) return invalid();
          advanceLine(source[index + 1]);
          index += 2;
          continue;
        }
        if (quoted === '\n' || quoted === '\r'
          || quoted === '\u2028' || quoted === '\u2029') {
          return invalid();
        }
        advanceLine(quoted);
        index += 1;
        if (quoted === quote) {
          closed = true;
          break;
        }
      }
      if (!closed) return invalid();
      pushToken(EXECUTABLE_JAVASCRIPT_LITERAL_TOKEN_V001, tokenLine);
      completeExpression();
      optionalChainForbidsTag = false;
      continue;
    }
    if (character === '`') {
      if (optionalChainForbidsTag) return invalid();
      modes.push({type: 'template', startLine: line});
      index += 1;
      continue;
    }
    if (character === '/' && state === EXECUTABLE_JAVASCRIPT_SCAN_STATE_START_V001) {
      const tokenLine = line;
      let cursor = index + 1;
      let inCharacterClass = false;
      let closed = false;
      while (cursor < source.length) {
        const regexCharacter = source[cursor];
        if (regexCharacter === '\n' || regexCharacter === '\r'
          || regexCharacter === '\u2028' || regexCharacter === '\u2029') {
          return invalid();
        }
        if (regexCharacter === '\\') {
          if (cursor + 1 >= source.length) return invalid();
          const escaped = source[cursor + 1];
          if (escaped === '\n' || escaped === '\r'
            || escaped === '\u2028' || escaped === '\u2029') {
            return invalid();
          }
          cursor += 2;
          continue;
        }
        if (regexCharacter === '[') {
          inCharacterClass = true;
          cursor += 1;
          continue;
        }
        if (regexCharacter === ']' && inCharacterClass) {
          inCharacterClass = false;
          cursor += 1;
          continue;
        }
        if (regexCharacter === '/' && !inCharacterClass) {
          cursor += 1;
          closed = true;
          break;
        }
        cursor += 1;
      }
      if (!closed || inCharacterClass) return invalid();
      while (cursor < source.length && /^[A-Za-z]$/u.test(source[cursor])) cursor += 1;
      pushToken(EXECUTABLE_JAVASCRIPT_LITERAL_TOKEN_V001, tokenLine);
      completeExpression();
      optionalChainForbidsTag = false;
      index = cursor;
      continue;
    }
    if (character === '/') {
      if (state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001) return invalid();
      const value = next === '=' ? '/=' : '/';
      pushToken(value, line);
      index += value.length;
      startExpression();
      continue;
    }
    if (isIdentifierStart(character)) {
      let end = index + 1;
      while (end < source.length && isIdentifierPart(source[end])) end += 1;
      const value = source.slice(index, end);
      pushToken(value, line);
      if (EXECUTABLE_JAVASCRIPT_EXPRESSION_START_KEYWORD_SET_V001.has(value)) {
        startExpression();
      } else {
        completeExpression();
        optionalChainForbidsTag = false;
      }
      index = end;
      continue;
    }
    if (/^[0-9]$/u.test(character)) {
      const remainder = source.slice(index);
      let number = null;
      for (const pattern of EXECUTABLE_JAVASCRIPT_NUMBER_PATTERNS_V001) {
        const numberMatch = pattern.exec(remainder);
        if (numberMatch !== null) {
          number = numberMatch[0];
          break;
        }
      }
      if (number === null) return invalid();
      const trailing = source[index + number.length];
      if (isIdentifierPart(trailing)
        || (typeof trailing === 'string' && /^[0-9.]$/u.test(trailing))) {
        return invalid();
      }
      pushToken(number, line);
      completeExpression();
      optionalChainForbidsTag = false;
      index += number.length;
      continue;
    }
    if (source.startsWith('...', index)) {
      if (state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_START_V001
        || !EXECUTABLE_JAVASCRIPT_SPREAD_PRECEDING_TOKENS_V001.has(
          previousTokenValue(mode),
        )) {
        return invalid();
      }
      pushToken('...', line);
      spreadTargetRequired = true;
      optionalChainForbidsTag = false;
      index += 3;
      continue;
    }
    if (source.startsWith('?.', index)) {
      if (state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001
        && state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_BRACE_V001) {
        return invalid();
      }
      pushToken('?.', line);
      memberRequirement = {kind: 'optional-target', optionalChain: true};
      optionalChainForbidsTag = true;
      index += 2;
      continue;
    }
    if (character === '.') {
      if (state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001
        && state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_BRACE_V001) {
        return invalid();
      }
      pushToken('.', line);
      memberRequirement = {
        kind: 'member-name',
        optionalChain: optionalChainForbidsTag,
      };
      index += 1;
      continue;
    }
    if (character === '=' && next === '>') {
      if (spreadTargetRequired) return invalid();
      pushToken('=>', line);
      startExpression();
      index += 2;
      continue;
    }
    if ((character === '+' && next === '+') || (character === '-' && next === '-')) {
      if (state !== EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001
        || spreadTargetRequired) {
        return invalid();
      }
      pushToken(`${character}${next}`, line);
      completeExpression();
      optionalChainForbidsTag = false;
      index += 2;
      continue;
    }
    if (character === '(' || character === '[' || character === '{') {
      const previous = previousTokenValue(mode);
      const optionalChainContinuation =
        state === EXECUTABLE_JAVASCRIPT_SCAN_STATE_END_V001
        && optionalChainForbidsTag
        && (character === '(' || character === '[');
      const controlCondition = character === '('
        && EXECUTABLE_JAVASCRIPT_CONTROL_CONDITION_KEYWORD_SET_V001.has(previous);
      pushToken(character, line);
      mode.delimiters.push({
        value: character,
        controlCondition,
        optionalChainContinuation,
      });
      spreadTargetRequired = false;
      startExpression();
      index += 1;
      continue;
    }
    if (character === ')' || character === ']' || character === '}') {
      if (spreadTargetRequired) return invalid();
      const expectedOpening = character === ')' ? '(' : character === ']' ? '[' : '{';
      const opening = mode.delimiters.pop();
      if (opening?.value !== expectedOpening) return invalid();
      pushToken(character, line);
      if (character === '}') {
        state = EXECUTABLE_JAVASCRIPT_SCAN_STATE_BRACE_V001;
        optionalChainForbidsTag = false;
      } else if (opening.controlCondition) {
        startExpression();
      } else {
        completeExpression();
        optionalChainForbidsTag = opening.optionalChainContinuation;
      }
      index += 1;
      continue;
    }
    const matchedOperator = EXECUTABLE_JAVASCRIPT_NON_SLASH_OPERATORS_V001
      .find((value) => source.startsWith(value, index));
    if (matchedOperator !== undefined) {
      pushToken(matchedOperator, line);
      startExpression();
      index += matchedOperator.length;
      continue;
    }
    if (character === ',' || character === ';' || character === ':'
      || character === '?') {
      if (spreadTargetRequired) return invalid();
      pushToken(character, line);
      startExpression();
      index += 1;
      continue;
    }
    return invalid();
  }
  if (modes.length !== 1
    || modes[0].type !== 'code'
    || modes[0].delimiters.length !== 0
    || memberRequirement !== null
    || spreadTargetRequired) {
    return invalid();
  }
  return {valid: true, tokens};
};
// EXECUTABLE_JAVASCRIPT_SCANNER_GRAMMAR_V001_END
const tokenStructure = (tokens) => {
  const openingForClosing = new Map();
  const closingForOpening = new Map();
  const stacks = new Map([['(', []], ['[', []], ['{', []]]);
  const openingByClosing = new Map([[')', '('], [']', '['], ['}', '{']]);
  const depths = [];
  const depth = {'(': 0, '[': 0, '{': 0};
  tokens.forEach((token, index) => {
    depths.push({paren: depth['('], bracket: depth['['], brace: depth['{']});
    if (stacks.has(token.value)) {
      stacks.get(token.value).push(index);
      depth[token.value] += 1;
      return;
    }
    const opening = openingByClosing.get(token.value);
    if (!opening) return;
    const openingIndex = stacks.get(opening).pop();
    depth[opening] = Math.max(0, depth[opening] - 1);
    if (openingIndex === undefined) return;
    openingForClosing.set(index, openingIndex);
    closingForOpening.set(openingIndex, index);
  });
  return {openingForClosing, closingForOpening, depths};
};
const sameTokenDepth = (left, right) =>
  left.paren === right.paren
  && left.bracket === right.bracket
  && left.brace === right.brace;
const hasTopLevelFileIoCall = (tokens) => {
  const {openingForClosing, closingForOpening, depths} = tokenStructure(tokens);
  const deferred = new Array(tokens.length).fill(false);
  const eagerFunctionBodies = new Set();
  const markDeferred = (start, end) => {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return;
    for (let index = start; index <= end; index += 1) deferred[index] = true;
  };
  const isImmediatelyInvoked = (expressionStart, expressionEnd) => {
    if (!Number.isSafeInteger(expressionStart) || !Number.isSafeInteger(expressionEnd)) {
      return false;
    }
    let start = expressionStart;
    let end = expressionEnd;
    while (tokens[start - 1]?.value === '('
      && tokens[end + 1]?.value === ')'
      && closingForOpening.get(start - 1) === end + 1) {
      start -= 1;
      end += 1;
    }
    return tokens[end + 1]?.value === '(';
  };
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value === 'function') {
      let parameters = index + 1;
      while (parameters < tokens.length && tokens[parameters].value !== '(') parameters += 1;
      const parametersEnd = closingForOpening.get(parameters);
      const body = parametersEnd === undefined ? undefined : parametersEnd + 1;
      const bodyEnd = body === undefined || tokens[body]?.value !== '{'
        ? undefined
        : closingForOpening.get(body);
      if (bodyEnd !== undefined
        && !deferred[index]
        && isImmediatelyInvoked(index, bodyEnd)) {
        eagerFunctionBodies.add(body);
      } else if (bodyEnd !== undefined) {
        markDeferred(parameters, bodyEnd);
      }
      continue;
    }
    if (tokens[index].value !== '=>') continue;
    const previous = index - 1;
    const parameters = tokens[previous]?.value === ')'
      ? openingForClosing.get(previous)
      : previous;
    const expressionStart = tokens[parameters - 1]?.value === 'async'
      ? parameters - 1
      : parameters;
    const body = index + 1;
    if (tokens[body]?.value === '{') {
      const bodyEnd = closingForOpening.get(body);
      if (!deferred[index] && isImmediatelyInvoked(expressionStart, bodyEnd)) continue;
      markDeferred(parameters, previous);
      markDeferred(body, bodyEnd);
      continue;
    }
    const baseDepth = depths[index];
    let end = tokens.length;
    for (let cursor = body; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor];
      const atBase = sameTokenDepth(depths[cursor], baseDepth);
      if (atBase && (
        token.value === ','
        || token.value === ';'
        || token.value === ')'
        || token.value === ']'
        || token.value === '}'
      )) {
        end = cursor;
        break;
      }
      if (cursor > body
        && atBase
        && token.line > tokens[cursor - 1].line
        && CONCISE_ARROW_ASI_START_WORDS.has(token.value)) {
        end = cursor;
        break;
      }
    }
    if (!deferred[index] && isImmediatelyInvoked(expressionStart, end - 1)) continue;
    markDeferred(parameters, previous);
    markDeferred(body, end - 1);
  }
  for (let body = 0; body < tokens.length; body += 1) {
    if (tokens[body].value !== '{' || tokens[body - 1]?.value !== ')') continue;
    if (eagerFunctionBodies.has(body)) continue;
    const parameters = openingForClosing.get(body - 1);
    const leader = parameters === undefined ? undefined : tokens[parameters - 1]?.value;
    const isForAwait = leader === 'await' && tokens[parameters - 2]?.value === 'for';
    if (typeof leader !== 'string'
      || FUNCTION_BODY_CONTROL_WORDS.has(leader)
      || isForAwait) {
      continue;
    }
    markDeferred(parameters - 1, closingForOpening.get(body));
  }
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (deferred[index]
      || !MODULE_LOAD_FILE_IO_CALLS.has(tokens[index].value)
      || tokens[index + 1].value !== '('
      || tokens[index - 1]?.value === 'function') {
      continue;
    }
    return true;
  }
  return false;
};

const invalidPackageImportGraphIndexes = (implementationInputs) => {
  const invalidIndexes = [];
  const expected = [
    {
      builtins: new Set(['node:crypto']),
      locals: new Set([
        './presentation_renderer_text_layout_v001.mjs',
        './presentation_segmenter_boundary_evidence_v001.mjs',
        './run_presentation_segmenter_boundary_preflight_v001.mjs',
      ]),
    },
    {
      builtins: new Set([
        'node:crypto',
        'node:fs',
        'node:fs/promises',
        'node:path',
        'node:process',
        'node:url',
      ]),
      locals: new Set([
        './presentation_caption_semantic_source_package_v001.mjs',
        './presentation_segmenter_boundary_evidence_v001.mjs',
      ]),
    },
  ];
  expected.forEach(({builtins: allowedBuiltins, locals: allowedLocals}, index) => {
    const bytes = implementationInputs[index]?.snapshot?.bytes;
    if (!Buffer.isBuffer(bytes)) {
      invalidIndexes.push(index);
      return;
    }
    const imports = importSpecifiers(bytes);
    const builtins = imports.values.filter((specifier) => specifier.startsWith('node:'));
    const locals = imports.values.filter((specifier) => !specifier.startsWith('node:'));
    if (!imports.lexicallyValid
      || imports.hasDynamicImport
      || imports.hasRequire
      || imports.hasModuleLoadFileIo
      || builtins.some((specifier) => !allowedBuiltins.has(specifier))
      || locals.some((specifier) => !allowedLocals.has(specifier))
      || new Set(builtins).size !== builtins.length
      || new Set(locals).size !== locals.length
      || builtins.length !== allowedBuiltins.size
      || locals.length !== allowedLocals.size) {
      invalidIndexes.push(index);
    }
  });
  return invalidIndexes;
};

const canonicalJsonTextFromValidatedValue = (value) => {
  if (value === null
    || typeof value === 'boolean'
    || typeof value === 'number'
    || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonTextFromValidatedValue(entry)).join(',')}]`;
  }
  if (!isPlainObject(value)) throw new TypeError('canonical JSON value is not a plain object');
  const members = Object.keys(value).sort(compareUtf16).map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !hasOwn(descriptor, 'value')) {
      throw new TypeError('canonical JSON object member is not a data property');
    }
    return `${JSON.stringify(key)}:${canonicalJsonTextFromValidatedValue(descriptor.value)}`;
  });
  return `{${members.join(',')}}`;
};

const hasLoneSurrogate = (value) => {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const collectInMemoryReasons = (value, reasons, seen = new Set()) => {
  const type = typeof value;
  if (value === null || type === 'boolean' || type === 'string') {
    if (type === 'string' && hasLoneSurrogate(value)) reasons.add('surrogate-invalid');
    return;
  }
  if (type === 'number') {
    if (!Number.isSafeInteger(value) || !Number.isFinite(value) || Object.is(value, -0)) {
      reasons.add('number-invalid');
    }
    return;
  }
  if (type !== 'object') {
    reasons.add('unsupported-value');
    return;
  }
  if (seen.has(value)) {
    reasons.add('unsupported-value');
    return;
  }
  seen.add(value);
  const ownSymbols = Object.getOwnPropertySymbols(value);
  if (ownSymbols.length > 0) reasons.add('symbol-key');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (hasOwn(descriptor, 'get') || hasOwn(descriptor, 'set')) reasons.add('accessor');
    if (descriptor.enumerable === false && !(Array.isArray(value) && key === 'length')) {
      reasons.add('non-enumerable-property');
    }
  }
  if (hasOwn(descriptors, 'toJSON')) reasons.add('to-json');
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!hasOwn(value, String(index))) reasons.add('sparse-array');
    }
    const allowed = new Set(Array.from({length: value.length}, (_, index) => String(index)));
    for (const key of Object.keys(value)) {
      if (!allowed.has(key)) reasons.add('extra-array-property');
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor && hasOwn(descriptor, 'value')) {
        collectInMemoryReasons(descriptor.value, reasons, seen);
      }
    }
  } else {
    if (!isPlainObject(value)) reasons.add('non-plain-object');
    for (const key of Object.keys(value)) {
      const descriptor = descriptors[key];
      if (key !== 'toJSON' && descriptor && hasOwn(descriptor, 'value')) {
        collectInMemoryReasons(descriptor.value, reasons, seen);
      }
    }
  }
  seen.delete(value);
};

export function assertPresentationCaptionB1StrictValueV001(value) {
  try {
    const reasons = new Set();
    collectInMemoryReasons(value, reasons);
    for (const reason of IN_MEMORY_REASONS) {
      if (reasons.has(reason)) return {status: 'invalid', reason};
    }
    return {status: 'valid'};
  } catch {
    return {status: 'invalid', reason: 'unsupported-value'};
  }
}

class StrictJsonParser {
  constructor(text, numberProfile = STRICT_INTEGER_NUMBER_PROFILE) {
    this.text = text;
    this.index = 0;
    this.numberProfile = numberProfile;
  }
  fail(reason = 'syntax-invalid') {
    const error = new SyntaxError(reason);
    error.reason = reason;
    throw error;
  }
  skipWhitespace() {
    while (this.index < this.text.length && /[\u0009\u000a\u000d\u0020]/u.test(this.text[this.index])) {
      this.index += 1;
    }
  }
  parse() {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.text.length) this.fail('trailing-content');
    return value;
  }
  parseValue() {
    const character = this.text[this.index];
    if (character === '{') return this.parseObject();
    if (character === '[') return this.parseArray();
    if (character === '"') return this.parseString();
    if (character === '-' || (character >= '0' && character <= '9')) return this.parseNumber();
    for (const [token, value] of [['true', true], ['false', false], ['null', null]]) {
      if (this.text.startsWith(token, this.index)) {
        this.index += token.length;
        return value;
      }
    }
    this.fail();
  }
  parseObject() {
    this.index += 1;
    this.skipWhitespace();
    const value = Object.create(null);
    const keys = new Set();
    if (this.text[this.index] === '}') {
      this.index += 1;
      return value;
    }
    while (this.index < this.text.length) {
      if (this.text[this.index] !== '"') this.fail();
      const key = this.parseString();
      if (keys.has(key)) this.fail('duplicate-key');
      keys.add(key);
      this.skipWhitespace();
      if (this.text[this.index] !== ':') this.fail();
      this.index += 1;
      this.skipWhitespace();
      value[key] = this.parseValue();
      this.skipWhitespace();
      if (this.text[this.index] === '}') {
        this.index += 1;
        return value;
      }
      if (this.text[this.index] !== ',') this.fail();
      this.index += 1;
      this.skipWhitespace();
    }
    this.fail();
  }
  parseArray() {
    this.index += 1;
    this.skipWhitespace();
    const value = [];
    if (this.text[this.index] === ']') {
      this.index += 1;
      return value;
    }
    while (this.index < this.text.length) {
      value.push(this.parseValue());
      this.skipWhitespace();
      if (this.text[this.index] === ']') {
        this.index += 1;
        return value;
      }
      if (this.text[this.index] !== ',') this.fail();
      this.index += 1;
      this.skipWhitespace();
    }
    this.fail();
  }
  parseString() {
    const start = this.index;
    this.index += 1;
    while (this.index < this.text.length) {
      const unit = this.text.charCodeAt(this.index);
      if (unit === 0x22) {
        this.index += 1;
        let parsed;
        try {
          parsed = JSON.parse(this.text.slice(start, this.index));
        } catch {
          this.fail();
        }
        if (hasLoneSurrogate(parsed)) this.fail('surrogate-invalid');
        return parsed;
      }
      if (unit < 0x20) this.fail();
      if (unit === 0x5c) {
        this.index += 1;
        const escaped = this.text[this.index];
        if (!'"\\/bfnrtu'.includes(escaped ?? '')) this.fail();
        if (escaped === 'u') {
          if (!/^[0-9a-fA-F]{4}$/u.test(this.text.slice(this.index + 1, this.index + 5))) this.fail();
          this.index += 4;
        }
      }
      this.index += 1;
    }
    this.fail();
  }
  parseNumber() {
    const rest = this.text.slice(this.index);
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u.exec(rest);
    if (!match) this.fail();
    const token = match[0];
    this.index += token.length;
    if (this.numberProfile === STRICT_INTEGER_NUMBER_PROFILE
      && (token.includes('.') || /[eE]/u.test(token))) {
      this.fail('number-invalid');
    }
    if (![STRICT_INTEGER_NUMBER_PROFILE, EXTERNAL_DISPLAY_NUMBER_PROFILE].includes(
      this.numberProfile,
    )) {
      this.fail('number-invalid');
    }
    const value = Number(token);
    if (!Number.isFinite(value)
      || Object.is(value, -0)
      || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      this.fail('number-invalid');
    }
    if (this.numberProfile === STRICT_INTEGER_NUMBER_PROFILE && !Number.isSafeInteger(value)) {
      this.fail('number-invalid');
    }
    return value;
  }
}

const decodeJsonBytesWithNumberProfile = (bytes, numberProfile) => {
  if (!Buffer.isBuffer(bytes)) return {status: 'invalid', reason: 'invalid-utf8'};
  if (bytes.length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf) {
    return {status: 'invalid', reason: 'bom-present'};
  }
  let text;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    return {status: 'invalid', reason: 'invalid-utf8'};
  }
  if (text.charCodeAt(0) === 0xfeff) return {status: 'invalid', reason: 'bom-present'};
  if (/^\s*```/u.test(text)) return {status: 'invalid', reason: 'code-fence'};
  try {
    return {status: 'decoded', value: new StrictJsonParser(text, numberProfile).parse()};
  } catch (error) {
    return {
      status: 'invalid',
      reason: [
        'trailing-content',
        'duplicate-key',
        'number-invalid',
        'surrogate-invalid',
      ].includes(error?.reason)
        ? error.reason
        : 'syntax-invalid',
    };
  }
};

export function decodePresentationCaptionB1StrictJsonV001(bytes) {
  return decodeJsonBytesWithNumberProfile(bytes, STRICT_INTEGER_NUMBER_PROFILE);
}

export function serializePresentationCaptionB1FormalJsonV001(value) {
  const checked = assertPresentationCaptionB1StrictValueV001(value);
  if (checked.status !== 'valid') return checked;
  try {
    return {status: 'serialized', bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8')};
  } catch {
    return {status: 'invalid', reason: 'unsupported-value'};
  }
}

export function canonicalizePresentationCaptionB1JsonV001(value) {
  const checked = assertPresentationCaptionB1StrictValueV001(value);
  if (checked.status !== 'valid') return checked;
  try {
    return {
      status: 'canonicalized',
      bytes: Buffer.from(canonicalJsonTextFromValidatedValue(value), 'utf8'),
    };
  } catch {
    return {status: 'invalid', reason: 'unsupported-value'};
  }
}

export function sha256PresentationCaptionB1BytesV001(bytes) {
  if (!Buffer.isBuffer(bytes)) return {status: 'invalid-argument'};
  try {
    return {status: 'hashed', sha256: createHash('sha256').update(bytes).digest('hex')};
  } catch {
    return {status: 'invalid-argument'};
  }
}

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') throw new TypeError('formal JSON serialization failed');
  return result.bytes;
};
const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result.status !== 'canonicalized') throw new TypeError('canonical JSON serialization failed');
  return result.bytes;
};
const hashBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result.status !== 'hashed') throw new TypeError('byte hashing failed');
  return result.sha256;
};
const canonicalSha = (value) => hashBytes(canonicalBytes(value));

const addPath = (paths, path) => paths.add(path);
const validateBinding = (value, role, path, withCanonical, paths, base) => {
  const fields = withCanonical
    ? ['role', 'path', 'fileSha256', 'canonicalSha256']
    : ['role', 'path', 'fileSha256'];
  if (!exactKeys(value, fields)) {
    addPath(paths, base);
    return;
  }
  if (value.role !== role) addPath(paths, `${base}.role`);
  if (value.path !== path) addPath(paths, `${base}.path`);
  if (!isSha256(value.fileSha256)) addPath(paths, `${base}.fileSha256`);
  if (withCanonical) {
    if (role === 'textLayoutImplementation') {
      if (value.canonicalSha256 !== null) addPath(paths, `${base}.canonicalSha256`);
    } else if (!isSha256(value.canonicalSha256)) {
      addPath(paths, `${base}.canonicalSha256`);
    }
  }
};

const validateProjectionJobShape = (value, paths, base) => {
  if (!exactKeys(value, [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'containers',
  ])) {
    addPath(paths, base);
    return;
  }
  for (const field of ['sourceAtomCount', 'containerCount', 'boundaryCandidateCount']) {
    if (!isNonNegativeInteger(value[field])) addPath(paths, `${base}.${field}`);
  }
  if (!isDenseArray(value.containers)) {
    addPath(paths, `${base}.containers`);
    return;
  }
  const ids = new Set();
  let atomTotal = 0;
  let candidateTotal = 0;
  let atomTotalAvailable = true;
  let candidateTotalAvailable = true;
  value.containers.forEach((entry, index) => {
    const entryPath = `${base}.containers[${index}]`;
    if (!exactKeys(entry, ['containerId', 'sourceAtomCount', 'boundaryCandidateCount'])) {
      addPath(paths, entryPath);
      atomTotalAvailable = false;
      candidateTotalAvailable = false;
      return;
    }
    if (!isNonEmptyString(entry.containerId) || ids.has(entry.containerId)) {
      addPath(paths, `${entryPath}.containerId`);
    }
    ids.add(entry.containerId);
    if (!isNonNegativeInteger(entry.sourceAtomCount)) {
      addPath(paths, `${entryPath}.sourceAtomCount`);
      atomTotalAvailable = false;
    }
    if (!isNonNegativeInteger(entry.boundaryCandidateCount)) {
      addPath(paths, `${entryPath}.boundaryCandidateCount`);
      candidateTotalAvailable = false;
    }
    if (isNonNegativeInteger(entry.sourceAtomCount)) atomTotal += entry.sourceAtomCount;
    if (isNonNegativeInteger(entry.boundaryCandidateCount)) {
      candidateTotal += entry.boundaryCandidateCount;
    }
  });
  if (isNonNegativeInteger(value.containerCount)
    && value.containerCount !== value.containers.length) {
    addPath(paths, `${base}.containerCount`);
  }
  if (atomTotalAvailable
    && isNonNegativeInteger(value.sourceAtomCount)
    && value.sourceAtomCount !== atomTotal) {
    addPath(paths, `${base}.sourceAtomCount`);
  }
  if (candidateTotalAvailable
    && isNonNegativeInteger(value.boundaryCandidateCount)
    && value.boundaryCandidateCount !== candidateTotal) {
    addPath(paths, `${base}.boundaryCandidateCount`);
  }
};

export function validatePresentationCaptionSemanticSourcePackageJobV001(value) {
  try {
    const paths = new Set();
    const rootKeys = [
      'schemaVersion',
      'jobId',
      'artifactId',
      'mode',
      'gateA',
      'implementationBinding',
      'widthPolicyBindings',
      'expectedRuntime',
      'expectedProjection',
      'publication',
      'readOnlyGuard',
    ];
    if (!isPlainObject(value)) {
      return {status: 'invalid', paths: ['$']};
    }
    const actualRootKeys = Object.keys(value);
    const missingRootKeys = rootKeys.filter((key) => !hasOwn(value, key));
    const unknownRootKeys = actualRootKeys.filter((key) => !rootKeys.includes(key));
    missingRootKeys.forEach((key) => addPath(paths, `$.${key}`));
    unknownRootKeys.forEach((key) => addPath(paths, `$.${key}`));
    if (missingRootKeys.length === 0
      && unknownRootKeys.length === 0
      && actualRootKeys.some((key, index) => key !== rootKeys[index])) {
      addPath(paths, '$');
    }
    if (value.schemaVersion !== JOB_SCHEMA_VERSION) addPath(paths, '$.schemaVersion');
    if (!ID_PATTERN.test(value.jobId ?? '')) addPath(paths, '$.jobId');
    if (!ID_PATTERN.test(value.artifactId ?? '')) addPath(paths, '$.artifactId');
    if (!['read-only-preflight', 'formal-generation'].includes(value.mode)) {
      addPath(paths, '$.mode');
    }
    if (!exactKeys(value.gateA, ['job', 'completionReport', 'expectedEvidenceHashes'])) {
      addPath(paths, '$.gateA');
    } else {
      for (const [field, root] of [
        ['job', GATE_A_JOB_ROOT],
        ['completionReport', GATE_A_REPORT_ROOT],
      ]) {
        const binding = value.gateA[field];
        const base = `$.gateA.${field}`;
        if (!exactKeys(binding, ['path', 'fileSha256'])) {
          addPath(paths, base);
        } else {
          if (!isSafeWorkspacePath(binding.path)
            || !binding.path.startsWith(root)
            || binding.path.slice(root.length).includes('/')
            || (field === 'job' ? !binding.path.endsWith('.json') : !binding.path.endsWith('.md'))) {
            addPath(paths, `${base}.path`);
          }
          if (!isSha256(binding.fileSha256)) addPath(paths, `${base}.fileSha256`);
        }
      }
      const hashes = value.gateA.expectedEvidenceHashes;
      if (!exactKeys(hashes, [
        'boundaryCandidatesCanonicalSha256',
        'sourceAtomMembershipCanonicalSha256',
        'evidenceCanonicalSha256',
      ])) {
        addPath(paths, '$.gateA.expectedEvidenceHashes');
      } else {
        for (const field of Object.keys(hashes)) {
          if (!isSha256(hashes[field])) addPath(paths, `$.gateA.expectedEvidenceHashes.${field}`);
        }
      }
    }
    if (!exactKeys(value.implementationBinding, ['gitCommit', 'files', 'dependencyFiles'])) {
      addPath(paths, '$.implementationBinding');
    } else {
      if (!COMMIT_PATTERN.test(value.implementationBinding.gitCommit ?? '')) {
        addPath(paths, '$.implementationBinding.gitCommit');
      }
      const implementationRoles = [
        ['packageCore', PACKAGE_CORE_PATH],
        ['packageRunner', PACKAGE_RUNNER_PATH],
        ['rendererTrustImplementation', RENDERER_TRUST_IMPLEMENTATION_PATH],
      ];
      if (!isDenseArray(value.implementationBinding.files)
        || value.implementationBinding.files.length !== implementationRoles.length) {
        addPath(paths, '$.implementationBinding.files');
      } else {
        implementationRoles.forEach(([role, path], index) => validateBinding(
          value.implementationBinding.files[index],
          role,
          path,
          false,
          paths,
          `$.implementationBinding.files[${index}]`,
        ));
      }
      if (!isDenseArray(value.implementationBinding.dependencyFiles)
        || value.implementationBinding.dependencyFiles.length !== 0) {
        addPath(paths, '$.implementationBinding.dependencyFiles');
      }
    }
    if (!isDenseArray(value.widthPolicyBindings)
      || value.widthPolicyBindings.length !== WIDTH_POLICY_SLOTS_V001.length) {
      addPath(paths, '$.widthPolicyBindings');
    } else {
      WIDTH_POLICY_SLOTS_V001.forEach(({role, path}, index) => validateBinding(
        value.widthPolicyBindings[index],
        role,
        path,
        true,
        paths,
        `$.widthPolicyBindings[${index}]`,
      ));
    }
    if (!exactKeys(value.expectedRuntime, [
      'nodeBinarySha256',
      'nodeVersion',
      'icuVersion',
      'resolvedLocale',
      'resolvedGranularity',
    ])) {
      addPath(paths, '$.expectedRuntime');
    } else {
      if (!isSha256(value.expectedRuntime.nodeBinarySha256)) {
        addPath(paths, '$.expectedRuntime.nodeBinarySha256');
      }
      if (!isNonEmptyString(value.expectedRuntime.nodeVersion)) {
        addPath(paths, '$.expectedRuntime.nodeVersion');
      }
      if (!isNonEmptyString(value.expectedRuntime.icuVersion)) {
        addPath(paths, '$.expectedRuntime.icuVersion');
      }
      if (value.expectedRuntime.resolvedLocale !== 'ja') {
        addPath(paths, '$.expectedRuntime.resolvedLocale');
      }
      if (value.expectedRuntime.resolvedGranularity !== 'word') {
        addPath(paths, '$.expectedRuntime.resolvedGranularity');
      }
    }
    validateProjectionJobShape(value.expectedProjection, paths, '$.expectedProjection');
    if (!exactKeys(value.publication, ['packageId', 'formalOutputPath', 'expectedState'])) {
      addPath(paths, '$.publication');
    } else {
      if (!ID_PATTERN.test(value.publication.packageId ?? '')) {
        addPath(paths, '$.publication.packageId');
      }
      if (!isSafeWorkspacePath(value.publication.formalOutputPath)
        || !value.publication.formalOutputPath.startsWith(
          `${WATCHED_ROOT}/segmenter-boundary-evidence/`,
        )) {
        addPath(paths, '$.publication.formalOutputPath');
      }
      if (!FORMAL_OUTPUT_STATES.has(value.publication.expectedState)) {
        addPath(paths, '$.publication.expectedState');
      }
    }
    if (!exactKeys(value.readOnlyGuard, [
      'watchedRoot',
      'excludedPaths',
      'expectedBeforeCanonicalSha256',
    ])) {
      addPath(paths, '$.readOnlyGuard');
    } else {
      if (value.readOnlyGuard.watchedRoot !== WATCHED_ROOT) {
        addPath(paths, '$.readOnlyGuard.watchedRoot');
      }
      if (!isDenseArray(value.readOnlyGuard.excludedPaths)
        || value.readOnlyGuard.excludedPaths.length !== 1
        || !isSafeWorkspacePath(value.readOnlyGuard.excludedPaths[0])) {
        addPath(paths, '$.readOnlyGuard.excludedPaths');
      } else {
        const root = value.mode === 'formal-generation' ? FORMAL_JOB_ROOT : PREFLIGHT_JOB_ROOT;
        const excluded = value.readOnlyGuard.excludedPaths[0];
        if (!excluded.startsWith(root)
          || excluded.slice(root.length).includes('/')
          || !excluded.endsWith('.json')) {
          addPath(paths, '$.readOnlyGuard.excludedPaths[0]');
        }
      }
      if (!isSha256(value.readOnlyGuard.expectedBeforeCanonicalSha256)) {
        addPath(paths, '$.readOnlyGuard.expectedBeforeCanonicalSha256');
      }
    }
    const sorted = [...paths].sort(compareUtf16);
    return sorted.length === 0 ? {status: 'valid', value} : {status: 'invalid', paths: sorted};
  } catch {
    return {status: 'invalid', paths: ['$']};
  }
}

const validateStat = (value) => exactKeys(value, ['kind', 'dev', 'ino', 'size', 'mtimeNs', 'nlink'])
  && ['regular-file', 'directory', 'symlink', 'other'].includes(value.kind)
  && CANONICAL_UNSIGNED_DECIMAL_PATTERN.test(value.dev)
  && CANONICAL_UNSIGNED_DECIMAL_PATTERN.test(value.ino)
  && CANONICAL_UNSIGNED_DECIMAL_PATTERN.test(value.size)
  && CANONICAL_SIGNED_DECIMAL_PATTERN.test(value.mtimeNs)
  && CANONICAL_UNSIGNED_DECIMAL_PATTERN.test(value.nlink);
const sameStat = (left, right) => validateStat(left)
  && validateStat(right)
  && Object.keys(left).every((key) => left[key] === right[key]);
const validatePathResolution = (value) => exactKeys(value, [
  'workspaceRootRealPath',
  'lexicalWorkspaceRelativePath',
  'targetRealPath',
  'ancestors',
])
  && isNonEmptyString(value.workspaceRootRealPath)
  && isSafeWorkspacePath(value.lexicalWorkspaceRelativePath)
  && isNonEmptyString(value.targetRealPath)
  && isDenseArray(value.ancestors)
  && value.ancestors.every((entry) => exactKeys(entry, [
    'workspaceRelativePath',
    'lstatKind',
    'realPath',
  ])
    && typeof entry.workspaceRelativePath === 'string'
    && ['directory', 'symlink', 'other'].includes(entry.lstatKind)
    && isNonEmptyString(entry.realPath));
const validateStableSnapshot = (value) => exactKeys(value, [
  'path',
  'bytes',
  'fileSha256',
  'pathLstatBeforeOpen',
  'fdStatAfterOpen',
  'fdStatAfterRead',
  'pathResolutionObservation',
])
  && isSafeWorkspacePath(value.path)
  && Buffer.isBuffer(value.bytes)
  && isSha256(value.fileSha256)
  && hashBytes(value.bytes) === value.fileSha256
  && validateStat(value.pathLstatBeforeOpen)
  && value.pathLstatBeforeOpen.kind === 'regular-file'
  && value.pathLstatBeforeOpen.nlink === '1'
  && sameStat(value.pathLstatBeforeOpen, value.fdStatAfterOpen)
  && sameStat(value.pathLstatBeforeOpen, value.fdStatAfterRead)
  && validatePathResolution(value.pathResolutionObservation)
  && value.pathResolutionObservation.lexicalWorkspaceRelativePath === value.path
  && value.pathResolutionObservation.ancestors.every((entry) => entry.lstatKind === 'directory');
const validateReadObservation = (value, expectedRole = null) => exactKeys(value, [
  'role',
  'path',
  'status',
  'snapshot',
])
  && (expectedRole === null || value.role === expectedRole)
  && value.status === 'read'
  && value.path === value.snapshot?.path
  && validateStableSnapshot(value.snapshot);
const decodedSnapshotValue = (observation) => {
  if (!validateReadObservation(observation)) return null;
  const decoded = decodePresentationCaptionB1StrictJsonV001(observation.snapshot.bytes);
  return decoded.status === 'decoded' ? decoded.value : null;
};
const sameReadObservation = (initial, final) => validateReadObservation(initial)
  && validateReadObservation(final)
  && initial.role === final.role
  && initial.path === final.path
  && initial.snapshot.fileSha256 === final.snapshot.fileSha256
  && sameStat(initial.snapshot.pathLstatBeforeOpen, final.snapshot.pathLstatBeforeOpen);

const exactPathAndHashRecord = (value, fields) => exactKeys(value, fields)
  && fields.every((field) => {
    if (field === 'path') return isSafeWorkspacePath(value[field]);
    if (field.endsWith('Sha256')) return isSha256(value[field]);
    return isNonEmptyString(value[field]);
  });

const validateApprovedRendererLayoutRulesV001 = (value) => {
  const keys = Object.keys(APPROVED_RENDERER_LAYOUT_RULES_V001);
  return exactKeys(value, keys)
    && keys.every((key) => Object.is(
      value[key],
      APPROVED_RENDERER_LAYOUT_RULES_V001[key],
    ));
};

const validateRendererTrustSchemaV001 = (value) => {
  if (!exactKeys(value, [
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
    || value.schemaVersion !== 'presentation-renderer-trust-v001'
    || value.trustVersion !== 'presentation-renderer-trust-v001'
    || value.rendererContractVersion !== 'zev-renderer-boundary-v002'
    || !exactPathAndHashRecord(
      value.presetRegistry,
      ['registryVersion', 'path', 'fileSha256', 'canonicalSha256'],
    )
    || !exactPathAndHashRecord(
      value.registryBinding,
      ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256'],
    )
    || !exactKeys(value.approvedPreview, [
      'previewId',
      'path',
      'fileSha256',
      'canonicalSha256',
      'componentProvenance',
    ])
    || !isNonEmptyString(value.approvedPreview.previewId)
    || !isSafeWorkspacePath(value.approvedPreview.path)
    || !isSha256(value.approvedPreview.fileSha256)
    || !isSha256(value.approvedPreview.canonicalSha256)
    || !isDenseArray(value.approvedPreview.componentProvenance)
    || !value.approvedPreview.componentProvenance.every((entry) =>
      exactPathAndHashRecord(entry, ['path', 'fileSha256']))
    || !isDenseArray(value.rendererDependencies)
    || !value.rendererDependencies.every((entry) =>
      exactPathAndHashRecord(entry, ['path', 'fileSha256']))
    || !isDenseArray(value.fontAssets)
    || !value.fontAssets.every((entry) =>
      exactPathAndHashRecord(entry, ['fontAssetId', 'path', 'fileSha256']))
    || !validateApprovedRendererLayoutRulesV001(value.layoutRules)
    || !exactKeys(value.toolVersions, [
      'nodeVersion',
      'remotionVersion',
      'browserVersion',
      'ffmpegVersion',
      'ffprobeVersion',
    ])
    || !Object.values(value.toolVersions).every(isNonEmptyString)) {
    return false;
  }
  return value.presetRegistry.registryVersion === 'normal-landscape-preset-registry-v001'
    && value.registryBinding.schemaVersion === 'presentation-registry-trust-v001';
};

const validateWidthJsonSchemaAtSlotV001 = (value, slotIndex) => {
  if (!isPlainObject(value)) return false;
  if (slotIndex === 0) {
    return exactKeys(value, [
      'schemaVersion',
      'registryVersion',
      'format',
      'canvas',
      'fontAssets',
      'componentProvenance',
      'transitions',
      'endPolicies',
      'presets',
    ])
      && value.schemaVersion === 'presentation-preset-registry-v001'
      && isNonEmptyString(value.registryVersion)
      && isDenseArray(value.presets);
  }
  if (slotIndex === 1) {
    return exactKeys(value, ['registryVersion', 'presets'])
      && isNonEmptyString(value.registryVersion)
      && isDenseArray(value.presets);
  }
  if (slotIndex === 2) {
    return exactKeys(value, ['registryVersion', 'materials'])
      && isNonEmptyString(value.registryVersion)
      && isDenseArray(value.materials);
  }
  if (slotIndex === 3) {
    return exactKeys(value, [
      'schemaVersion',
      'presetRegistryVersion',
      'presetValidationIndexSha256',
      'materialRegistryVersion',
      'materialValidationIndexSha256',
    ])
      && value.schemaVersion === 'presentation-registry-trust-v001'
      && isNonEmptyString(value.presetRegistryVersion)
      && isSha256(value.presetValidationIndexSha256)
      && isNonEmptyString(value.materialRegistryVersion)
      && isSha256(value.materialValidationIndexSha256);
  }
  return slotIndex === 4 && validateRendererTrustSchemaV001(value);
};

const validateExternalDisplayNumbersAtSlotV001 = (
  value,
  slotIndex,
  pathSegments = [],
) => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') {
    if (Number.isSafeInteger(value) && !Object.is(value, -0)) return true;
    if (slotIndex !== 4 || !Number.isFinite(value) || Object.is(value, -0)) return false;
    const path = pathSegments.join('\u0000');
    return APPROVED_RENDERER_TRUST_DECIMALS_V001.some(
      (entry) => entry.path === path && Object.is(entry.value, value),
    );
  }
  if (Array.isArray(value)) {
    return isDenseArray(value)
      && value.every((entry, index) =>
        validateExternalDisplayNumbersAtSlotV001(entry, slotIndex, [
          ...pathSegments,
          String(index),
        ]));
  }
  if (!isPlainObject(value)) return false;
  return Object.keys(value).every((key) =>
    validateExternalDisplayNumbersAtSlotV001(value[key], slotIndex, [
      ...pathSegments,
      key,
    ]));
};

const decodeWidthJsonAtFixedSlotV001 = (bytes, slotIndex) => {
  if (!Number.isSafeInteger(slotIndex)
    || slotIndex < 0
    || slotIndex >= WIDTH_POLICY_SLOTS_V001.length - 1) {
    return {status: 'invalid'};
  }
  const decoded = decodeJsonBytesWithNumberProfile(bytes, EXTERNAL_DISPLAY_NUMBER_PROFILE);
  if (decoded.status !== 'decoded'
    || !validateExternalDisplayNumbersAtSlotV001(decoded.value, slotIndex)
    || !validateWidthJsonSchemaAtSlotV001(decoded.value, slotIndex)) {
    return {status: 'invalid'};
  }
  const canonicalBytes = Buffer.from(
    canonicalJsonTextFromValidatedValue(decoded.value),
    'utf8',
  );
  return {
    status: 'decoded',
    value: decoded.value,
    canonicalSha256: hashBytes(canonicalBytes),
  };
};

const resolveWidthPolicySnapshotAtSlotV001 = (binding, snapshot, slotIndex) => {
  const expected = WIDTH_POLICY_SLOTS_V001[slotIndex];
  if (!expected
    || !isPlainObject(binding)
    || binding.role !== expected.role
    || binding.path !== expected.path
    || !validateStableSnapshot(snapshot)
    || snapshot.path !== expected.path) {
    return {status: 'unsafe'};
  }
  if (snapshot.fileSha256 !== binding.fileSha256) {
    return {status: 'file-mismatch'};
  }
  if (expected.profile === 'bytes') {
    return binding.canonicalSha256 === null
      ? {
        status: 'resolved',
        role: expected.role,
        path: expected.path,
        snapshot,
        value: null,
        canonicalSha256: null,
      }
      : {status: 'canonical-mismatch'};
  }
  const decoded = decodeWidthJsonAtFixedSlotV001(snapshot.bytes, slotIndex);
  if (decoded.status !== 'decoded') return {status: 'schema-unsupported'};
  if (decoded.canonicalSha256 !== binding.canonicalSha256) {
    return {status: 'canonical-mismatch'};
  }
  return {
    status: 'resolved',
    role: expected.role,
    path: expected.path,
    snapshot,
    value: decoded.value,
    canonicalSha256: decoded.canonicalSha256,
  };
};

const resolveWidthPolicyObservationAtSlotV001 = (observation, binding, slotIndex) => {
  const expected = WIDTH_POLICY_SLOTS_V001[slotIndex];
  if (!expected
    || !isPlainObject(observation)
    || !isPlainObject(binding)
    || binding.role !== expected.role
    || binding.path !== expected.path
    || observation.role !== expected.role
    || observation.path !== expected.path
    || observation.status === 'lexically-rejected'
    || observation.status === 'observed-unsafe') {
    return {status: 'unsafe'};
  }
  if (observation.status === 'missing') return {status: 'file-mismatch'};
  if (!validateReadObservation(observation, expected.role)) return {status: 'unsafe'};
  return resolveWidthPolicySnapshotAtSlotV001(binding, observation.snapshot, slotIndex);
};

const evaluateResolvedWidthPolicyV001 = (resolvedWidthPolicy) => {
  if (!isDenseArray(resolvedWidthPolicy)
    || resolvedWidthPolicy.length !== WIDTH_POLICY_SLOTS_V001.length
    || !resolvedWidthPolicy.every((entry) => entry?.status === 'resolved')) {
    return {status: 'hash-mismatch'};
  }
  const [registryInput, presetIndexInput, materialIndexInput, bindingInput, trustInput,
    textLayoutInput] = resolvedWidthPolicy;
  const registry = registryInput.value;
  const presetIndex = presetIndexInput.value;
  const materialIndex = materialIndexInput.value;
  const registryBinding = bindingInput.value;
  const trust = trustInput.value;
  const trustPolicy = registry.presets.filter((entry) => entry?.presetId === PRESET_ID);
  const stateMatches = isDenseArray(trustPolicy[0]?.visualStates)
    ? trustPolicy[0].visualStates.filter((entry) => entry?.stateId === VISUAL_STATE_ID)
    : [];
  const policyMatches = presetIndex.presets.filter((entry) => entry?.presetId === PRESET_ID);
  const trustDependency = trust.rendererDependencies.filter(
    (entry) => entry?.path === TEXT_LAYOUT_IMPLEMENTATION_PATH,
  );
  const chainOk = trustInput.canonicalSha256 === TRUST_CANONICAL_SHA256
    && registryBinding.presetRegistryVersion === registry.registryVersion
    && presetIndex.registryVersion === registryBinding.presetRegistryVersion
    && registryBinding.presetValidationIndexSha256 === presetIndexInput.canonicalSha256
    && materialIndex.registryVersion === registryBinding.materialRegistryVersion
    && registryBinding.materialValidationIndexSha256 === materialIndexInput.canonicalSha256
    && trust.presetRegistry.registryVersion === registry.registryVersion
    && trust.presetRegistry.path === registryInput.path
    && trust.presetRegistry.fileSha256 === registryInput.snapshot.fileSha256
    && trust.presetRegistry.canonicalSha256 === registryInput.canonicalSha256
    && trust.registryBinding.schemaVersion === registryBinding.schemaVersion
    && trust.registryBinding.path === bindingInput.path
    && trust.registryBinding.fileSha256 === bindingInput.snapshot.fileSha256
    && trust.registryBinding.canonicalSha256 === bindingInput.canonicalSha256
    && trustDependency.length === 1
    && trustDependency[0].fileSha256 === textLayoutInput.snapshot.fileSha256;
  if (!chainOk) return {status: 'hash-mismatch'};
  const projectionOk = trustPolicy.length === 1
    && stateMatches.length === 1
    && policyMatches.length === 1
    && exactKeys(stateMatches[0].layout, ['maxCharsPerLine', 'maxLines', 'singleLine'])
    && stateMatches[0].layout.maxCharsPerLine === MAX_LOGICAL_WIDTH
    && stateMatches[0].layout.maxLines === MAX_LINES
    && stateMatches[0].layout.singleLine === false
    && trust.layoutRules.characterWidthRule
      === PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001
    && PRESENTATION_RENDERER_TEXT_LAYOUT_VERSION === 'presentation-renderer-text-layout-v001';
  return {status: projectionOk ? 'passed' : 'projection-mismatch'};
};

const resolveWidthPolicySnapshotsForBuilderV001 = (job, snapshots) => {
  if (!isDenseArray(snapshots)
    || snapshots.length !== WIDTH_POLICY_SLOTS_V001.length
    || !isDenseArray(job.widthPolicyBindings)
    || job.widthPolicyBindings.length !== WIDTH_POLICY_SLOTS_V001.length) {
    throw new TypeError('invalid width policy builder inputs');
  }
  const resolved = snapshots.map((snapshot, index) =>
    resolveWidthPolicySnapshotAtSlotV001(job.widthPolicyBindings[index], snapshot, index));
  if (resolved.some((entry) => entry.status !== 'resolved')
    || evaluateResolvedWidthPolicyV001(resolved).status !== 'passed') {
    throw new TypeError('width policy trust chain is not valid');
  }
  return resolved;
};

const validateRuntimeObservation = (value) => exactKeys(value, [
  'nodeBinaryInput',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'diagnostics',
])
  && exactKeys(value.nodeBinaryInput, ['role', 'status', 'snapshot'])
  && value.nodeBinaryInput.role === 'nodeBinary'
  && value.nodeBinaryInput.status === 'read'
  && value.nodeBinaryInput.snapshot !== null
  && Buffer.isBuffer(value.nodeBinaryInput.snapshot.bytes)
  && isSha256(value.nodeBinaryInput.snapshot.fileSha256)
  && hashBytes(value.nodeBinaryInput.snapshot.bytes) === value.nodeBinaryInput.snapshot.fileSha256
  && isNonEmptyString(value.nodeVersion)
  && isNonEmptyString(value.icuVersion)
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word'
  && exactKeys(value.diagnostics, [
    'resolvedNodePath',
    'platform',
    'arch',
    'v8Version',
    'unicodeVersion',
    'cldrVersion',
  ])
  && Object.values(value.diagnostics).every(isNonEmptyString);

const legacyDirectoryState = (state, entries) => {
  if (state !== 'absent' || !isDenseArray(entries)) return null;
  if (!entries.every((entry) => exactKeys(entry, ['name', 'type'])
    && isNonEmptyString(entry.name)
    && isNonEmptyString(entry.type))) return null;
  const sorted = [...entries].sort((left, right) => compareUtf16(left.name, right.name));
  if (sorted.some((entry, index) => entry.name !== entries[index].name)) return null;
  return {
    formalPathState: state,
    entryCount: entries.length,
    entriesCanonicalSha256: canonicalSha(entries),
  };
};

function derivePresentationCaptionGateALegacyBaseContextV001(context) {
  try {
    if (!exactKeys(context, [
      'jobValue',
      'jobInput',
      'implementationInputs',
      'sourceInputs',
      'legacyRecheck',
      'legacyReadOnlyObservation',
      'runtimeObservation',
    ])
      || !isPlainObject(context.jobValue)
      || !validateReadObservation(context.jobInput)
      || !isDenseArray(context.implementationInputs)
      || context.implementationInputs.length !== 3
      || !isDenseArray(context.sourceInputs)
      || context.sourceInputs.length !== 3
      || !exactKeys(context.legacyRecheck, [
        'jobInput',
        'implementationInputs',
        'sourceInputs',
      ])
      || !isDenseArray(context.legacyRecheck.implementationInputs)
      || context.legacyRecheck.implementationInputs.length !== 3
      || !isDenseArray(context.legacyRecheck.sourceInputs)
      || context.legacyRecheck.sourceInputs.length !== 3
      || !validateRuntimeObservation(context.runtimeObservation)
      || !exactKeys(context.legacyReadOnlyObservation, [
        'formalOutputPath',
        'watchedAncestorPath',
        'beforeFormalPathState',
        'afterFormalPathState',
        'beforeEntries',
        'afterEntries',
      ])) {
      return {status: 'context-invalid'};
    }
    if (!sameReadObservation(context.jobInput, context.legacyRecheck.jobInput)) {
      return {status: 'context-invalid'};
    }
    const decodedJob = decodedSnapshotValue(context.jobInput);
    if (decodedJob === null
      || JSON.stringify(decodedJob) !== JSON.stringify(context.jobValue)
      || !isDenseArray(context.jobValue.implementationBinding?.files)
      || !isDenseArray(context.jobValue.inputs)
      || context.jobValue.implementationBinding.files.length !== 3
      || context.jobValue.inputs.length !== 3) {
      return {status: 'context-invalid'};
    }
    const loadedUrls = [
      PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.core,
      PRESENTATION_SEGMENTER_BOUNDARY_MODULE_URLS_V001.retainedSourceAtomsCore,
      new URL('./run_presentation_segmenter_boundary_preflight_v001.mjs', import.meta.url).href,
    ];
    const implementationFiles = [];
    for (let index = 0; index < 3; index += 1) {
      const initial = context.implementationInputs[index];
      const recheck = context.legacyRecheck.implementationInputs[index];
      const binding = context.jobValue.implementationBinding.files[index];
      if (!sameReadObservation(initial, recheck)
        || !isPlainObject(binding)
        || initial.role !== binding.role
        || initial.path !== binding.path
        || initial.snapshot.fileSha256 !== binding.fileSha256) {
        return {status: 'context-invalid'};
      }
      implementationFiles.push({
        role: binding.role,
        path: binding.path,
        firstFileSha256: initial.snapshot.fileSha256,
        secondFileSha256: recheck.snapshot.fileSha256,
        loadedModuleUrl: loadedUrls[index],
        issues: [],
      });
    }
    const inputSnapshots = [];
    for (let index = 0; index < 3; index += 1) {
      const initial = context.sourceInputs[index];
      const recheck = context.legacyRecheck.sourceInputs[index];
      const binding = context.jobValue.inputs[index];
      const document = decodedSnapshotValue(initial);
      if (!sameReadObservation(initial, recheck)
        || !isPlainObject(binding)
        || document === null
        || initial.role !== binding.role
        || initial.path !== binding.path
        || initial.snapshot.fileSha256 !== binding.fileSha256) {
        return {status: 'context-invalid'};
      }
      inputSnapshots.push({
        role: binding.role,
        path: binding.path,
        firstFileSha256: initial.snapshot.fileSha256,
        secondFileSha256: recheck.snapshot.fileSha256,
        document,
        issues: [],
      });
    }
    const before = legacyDirectoryState(
      context.legacyReadOnlyObservation.beforeFormalPathState,
      context.legacyReadOnlyObservation.beforeEntries,
    );
    const after = legacyDirectoryState(
      context.legacyReadOnlyObservation.afterFormalPathState,
      context.legacyReadOnlyObservation.afterEntries,
    );
    if (before === null
      || after === null
      || JSON.stringify(before) !== JSON.stringify(after)
      || context.legacyReadOnlyObservation.formalOutputPath
        !== context.jobValue.readOnlyGuard?.formalOutputPath
      || !isNonEmptyString(context.legacyReadOnlyObservation.watchedAncestorPath)) {
      return {status: 'context-invalid'};
    }
    const runtimeBinding = {
      nodeBinarySha256: context.runtimeObservation.nodeBinaryInput.snapshot.fileSha256,
      nodeVersion: context.runtimeObservation.nodeVersion,
      icuVersion: context.runtimeObservation.icuVersion,
      resolvedLocale: context.runtimeObservation.resolvedLocale,
      resolvedGranularity: context.runtimeObservation.resolvedGranularity,
      diagnostics: cloneJson(context.runtimeObservation.diagnostics),
    };
    return {
      status: 'derived',
      value: {
        jobValue: context.jobValue,
        jobSnapshot: {
          path: context.jobInput.path,
          firstFileSha256: context.jobInput.snapshot.fileSha256,
          secondFileSha256: context.legacyRecheck.jobInput.snapshot.fileSha256,
          issues: [],
        },
        observedImplementationBinding: {files: implementationFiles},
        inputSnapshots,
        runtimeBinding,
        readOnlyGuard: {
          formalOutputPath: context.legacyReadOnlyObservation.formalOutputPath,
          watchedAncestorPath: context.legacyReadOnlyObservation.watchedAncestorPath,
          before,
          after,
        },
        productionMode: true,
      },
    };
  } catch {
    return {status: 'context-invalid'};
  }
}

const validateBuildSuccess = (value) => {
  if (!exactKeys(value, [
    'value',
    'bytes',
    'fileSha256',
    'canonicalSha256',
    'inputByteCopies',
  ])
    || assertPresentationCaptionB1StrictValueV001(value.value).status !== 'valid'
    || !Buffer.isBuffer(value.bytes)
    || !isSha256(value.fileSha256)
    || !isSha256(value.canonicalSha256)
    || hashBytes(value.bytes) !== value.fileSha256
    || canonicalSha(value.value) !== value.canonicalSha256
    || !isDenseArray(value.inputByteCopies)) return false;
  return true;
};

export function derivePresentationCaptionEmbeddedGateAReportContextV001(context) {
  try {
    if (!exactKeys(context, ['gateA', 'runtimeObservation'])
      || !exactKeys(context.gateA, [
        'jobValue',
        'jobInput',
        'implementationInputs',
        'sourceInputs',
        'legacyRecheck',
        'legacyReadOnlyObservation',
        'evidencePasses',
      ])
      || !isDenseArray(context.gateA.evidencePasses)
      || context.gateA.evidencePasses.length !== 2
      || !context.gateA.evidencePasses.every(validateBuildSuccess)) {
      return {status: 'context-invalid'};
    }
    for (const pass of context.gateA.evidencePasses) {
      const serialized = serializePresentationCaptionB1FormalJsonV001(pass.value);
      if (serialized.status !== 'serialized'
        || !sameBytes(serialized.bytes, pass.bytes)
        || hashBytes(pass.bytes) !== pass.fileSha256
        || canonicalSha(pass.value) !== pass.canonicalSha256) {
        return {status: 'context-invalid'};
      }
    }
    const base = derivePresentationCaptionGateALegacyBaseContextV001({
      jobValue: context.gateA.jobValue,
      jobInput: context.gateA.jobInput,
      implementationInputs: context.gateA.implementationInputs,
      sourceInputs: context.gateA.sourceInputs,
      legacyRecheck: context.gateA.legacyRecheck,
      legacyReadOnlyObservation: context.gateA.legacyReadOnlyObservation,
      runtimeObservation: context.runtimeObservation,
    });
    if (base.status !== 'derived') return {status: 'context-invalid'};
    const evidencePasses = context.gateA.evidencePasses.map((pass) => pass.value);
    let checkReport;
    try {
      checkReport = checkPresentationSegmenterBoundaryPreflightV001({
        jobValue: base.value.jobValue,
        jobSnapshot: base.value.jobSnapshot,
        observedImplementationBinding: base.value.observedImplementationBinding,
        inputSnapshots: base.value.inputSnapshots,
        runtimeBinding: base.value.runtimeBinding,
        evidencePasses,
        buildFailure: null,
        readOnlyGuard: base.value.readOnlyGuard,
        productionMode: base.value.productionMode,
      });
    } catch {
      return {status: 'context-invalid'};
    }
    return {
      status: 'derived',
      value: {
        jobValue: base.value.jobValue,
        jobSnapshot: base.value.jobSnapshot,
        inputSnapshots: base.value.inputSnapshots,
        runtimeBinding: base.value.runtimeBinding,
        evidencePasses,
        readOnlyGuard: base.value.readOnlyGuard,
        checkReport,
      },
    };
  } catch {
    return {status: 'context-invalid'};
  }
}

const checkStatus = (report, name) =>
  report?.checks?.find((entry) => entry?.name === name)?.status ?? null;

export function buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(context) {
  if (!exactKeys(context, [
    'jobValue',
    'jobSnapshot',
    'inputSnapshots',
    'runtimeBinding',
    'evidencePasses',
    'readOnlyGuard',
    'checkReport',
  ])
    || !isPlainObject(context.jobValue)
    || !isPlainObject(context.jobSnapshot)
    || !isDenseArray(context.inputSnapshots)
    || !isPlainObject(context.checkReport)) {
    throw new TypeError('invalid embedded Gate A report context');
  }
  const status = context.checkReport.status;
  const firstFailed = context.checkReport.checks?.find((entry) => entry.status === 'failed');
  const inputBindingPassed = checkStatus(context.checkReport, 'inputBinding') === 'passed';
  const runtimeRan = checkStatus(context.checkReport, 'runtimeBinding')
    !== 'not_run_with_upstream_failure';
  const segmentationPassed = checkStatus(context.checkReport, 'segmentation') === 'passed';
  const readOnlyRan = checkStatus(context.checkReport, 'readOnlyPreflight')
    !== 'not_run_with_upstream_failure';
  const evidence = context.evidencePasses[0];
  return {
    schemaVersion: GATE_A_REPORT_SCHEMA_VERSION,
    status,
    failureStage: status === 'passed' ? null : firstFailed?.name ?? null,
    job: {
      jobId: context.jobValue.jobId,
      path: context.jobSnapshot.path,
      fileSha256: context.jobSnapshot.firstFileSha256,
    },
    inputs: inputBindingPassed
      ? context.inputSnapshots.map((entry) => ({
        role: entry.role,
        path: entry.path,
        fileSha256: entry.firstFileSha256,
      }))
      : null,
    runtimeBinding: runtimeRan ? cloneJson(context.runtimeBinding) : null,
    observedProjection: context.checkReport.observedProjection,
    evidence: segmentationPassed
      ? {
        artifactId: evidence.artifactId,
        canonicalSha256: canonicalSha(evidence),
        boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
        sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
      }
      : null,
    readOnlyGuard: readOnlyRan ? cloneJson(context.readOnlyGuard) : null,
    checkReport: context.checkReport,
  };
}

const decodeSnapshot = (snapshot) => {
  if (!validateStableSnapshot(snapshot)) throw new TypeError('invalid stable snapshot');
  const decoded = decodePresentationCaptionB1StrictJsonV001(snapshot.bytes);
  if (decoded.status !== 'decoded') throw new TypeError('snapshot is not strict JSON');
  return decoded.value;
};
const logicalWidth = (text) => Array.from(text).reduce(
  (sum, character) => sum + codePointWeightV001(
    character,
    PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
  ),
  0,
);
const artifactFrom = (fileName, value, serializer = formalBytes) => {
  const bytes = serializer(value);
  return {
    fileName,
    value,
    bytes,
    fileSha256: hashBytes(bytes),
    canonicalSha256: canonicalSha(value),
  };
};
const embeddedReportBytes = (value) =>
  Buffer.from(`${canonicalJsonTextFromValidatedValue(value)}\n`, 'utf8');
const bindingForSnapshot = (snapshot, includeCanonical = true) => ({
  path: snapshot.path,
  fileSha256: snapshot.fileSha256,
  ...(includeCanonical ? {canonicalSha256: canonicalSha(decodeSnapshot(snapshot))} : {}),
});
const expectedBuilderContext = (context) => {
  if (!exactKeys(context, [
    'job',
    'gateA',
    'implementationSnapshots',
    'sourceSnapshots',
    'widthPolicySnapshots',
    'runtimeObservation',
  ])
    || !exactKeys(context.job, ['value', 'snapshot'])
    || !exactKeys(context.gateA, [
      'jobValue',
      'jobSnapshot',
      'completionReportSnapshot',
      'evidenceValue',
      'evidenceBytes',
      'embeddedReportValue',
      'embeddedReportBytes',
    ])
    || !validateStableSnapshot(context.job.snapshot)
    || !validateStableSnapshot(context.gateA.jobSnapshot)
    || !validateStableSnapshot(context.gateA.completionReportSnapshot)
    || !Buffer.isBuffer(context.gateA.evidenceBytes)
    || !Buffer.isBuffer(context.gateA.embeddedReportBytes)
    || !isDenseArray(context.implementationSnapshots)
    || context.implementationSnapshots.length !== 3
    || !context.implementationSnapshots.every(validateStableSnapshot)
    || !isDenseArray(context.sourceSnapshots)
    || context.sourceSnapshots.length !== 3
    || !context.sourceSnapshots.every(validateStableSnapshot)
    || !isDenseArray(context.widthPolicySnapshots)
    || context.widthPolicySnapshots.length !== 6
    || !context.widthPolicySnapshots.every(validateStableSnapshot)
    || !validateRuntimeObservation(context.runtimeObservation)) {
    throw new TypeError('invalid package builder context');
  }
};

const makeModelInput = (evidence) => {
  if (!isPlainObject(evidence) || !isDenseArray(evidence.boundaryCandidates)) {
    throw new TypeError('invalid boundary evidence');
  }
  const containers = [];
  const byId = new Map();
  for (const candidate of evidence.boundaryCandidates) {
    if (!isPlainObject(candidate)
      || !isNonEmptyString(candidate.containerId)
      || !isNonEmptyString(candidate.boundaryCandidateId)
      || !isNonEmptyString(candidate.text)) {
      throw new TypeError('invalid boundary candidate');
    }
    let container = byId.get(candidate.containerId);
    if (!container) {
      container = {
        containerId: candidate.containerId,
        text: '',
        boundaryCandidates: [],
      };
      byId.set(candidate.containerId, container);
      containers.push(container);
    }
    const width = logicalWidth(candidate.text);
    container.text += candidate.text;
    container.boundaryCandidates.push({
      boundaryCandidateId: candidate.boundaryCandidateId,
      text: candidate.text,
      logicalWidth: width,
    });
  }
  return {
    schemaVersion: MODEL_INPUT_SCHEMA_VERSION,
    taskDescription: TASK_DESCRIPTION,
    displayConstraints: {
      maxLogicalWidthPerLine: MAX_LOGICAL_WIDTH,
      maxLinesPerMeaningGroup: MAX_LINES,
    },
    containers,
  };
};

const makeExpansionMap = ({
  job,
  evidence,
  sourceSnapshot,
  resolvedWidthPolicy,
  implementationSnapshots,
  modelInputArtifact,
  evidenceArtifact,
}) => {
  const byContainer = new Map();
  const containers = [];
  for (const candidate of evidence.boundaryCandidates) {
    let container = byContainer.get(candidate.containerId);
    if (!container) {
      container = {
        containerId: candidate.containerId,
        timelineSegmentId: candidate.timelineSegmentId,
        speechId: candidate.speechId,
        candidates: [],
      };
      byContainer.set(candidate.containerId, container);
      containers.push(container);
    }
    container.candidates.push({
      boundaryCandidateId: candidate.boundaryCandidateId,
      sourceAtomIds: [...candidate.sourceAtomIds],
      startAnchor: cloneJson(candidate.startAnchor),
      endAnchor: cloneJson(candidate.endAnchor),
      logicalWidth: logicalWidth(candidate.text),
    });
  }
  const widthByRole = Object.fromEntries(
    resolvedWidthPolicy.map((entry) => [entry.role, entry]),
  );
  const implementationByRole = Object.fromEntries(
    job.implementationBinding.files.map((entry, index) => [entry.role, {
      job: entry,
      snapshot: implementationSnapshots[index],
    }]),
  );
  const jsonWidthBinding = (role) => ({
    path: widthByRole[role].snapshot.path,
    fileSha256: widthByRole[role].snapshot.fileSha256,
    canonicalSha256: widthByRole[role].canonicalSha256,
  });
  return {
    schemaVersion: EXPANSION_MAP_SCHEMA_VERSION,
    artifactId: job.artifactId,
    sourceBindings: {
      sourceAtoms: {
        path: sourceSnapshot.path,
        fileSha256: sourceSnapshot.fileSha256,
        canonicalSha256: canonicalSha(decodeSnapshot(sourceSnapshot)),
      },
      boundaryEvidence: {
        fileName: evidenceArtifact.fileName,
        fileSha256: evidenceArtifact.fileSha256,
        canonicalSha256: evidenceArtifact.canonicalSha256,
        boundaryCandidatesCanonicalSha256: evidence.boundaryCandidatesCanonicalSha256,
        sourceAtomMembershipCanonicalSha256: evidence.sourceAtomMembershipCanonicalSha256,
      },
    },
    widthPolicyBinding: {
      presetRegistry: jsonWidthBinding('presetRegistry'),
      presetValidationIndex: jsonWidthBinding('presetValidationIndex'),
      materialValidationIndex: jsonWidthBinding('materialValidationIndex'),
      registryBinding: jsonWidthBinding('registryBinding'),
      rendererTrust: jsonWidthBinding('rendererTrust'),
      rendererTrustImplementation: {
        path: implementationByRole.rendererTrustImplementation.snapshot.path,
        fileSha256: implementationByRole.rendererTrustImplementation.snapshot.fileSha256,
      },
      textLayoutImplementation: {
        path: widthByRole.textLayoutImplementation.snapshot.path,
        fileSha256: widthByRole.textLayoutImplementation.snapshot.fileSha256,
      },
      presetId: PRESET_ID,
      visualStateId: VISUAL_STATE_ID,
      maxLogicalWidthPerLine: MAX_LOGICAL_WIDTH,
      maxLinesPerMeaningGroup: MAX_LINES,
      characterWidthRule: PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,
    },
    modelInputBinding: {
      fileName: modelInputArtifact.fileName,
      fileSha256: modelInputArtifact.fileSha256,
      canonicalSha256: modelInputArtifact.canonicalSha256,
    },
    containers,
  };
};

const makeLeakageReport = ({
  modelInputArtifact,
  expansionArtifact,
  sourceSnapshot,
  evidenceArtifact,
  resolvedWidthPolicy,
  implementationSnapshots,
}) => ({
  schemaVersion: LEAKAGE_REPORT_SCHEMA_VERSION,
  status: 'passed',
  failureStage: null,
  modelInputBinding: {
    packageFileName: modelInputArtifact.fileName,
    fileSha256: modelInputArtifact.fileSha256,
    canonicalSha256: modelInputArtifact.canonicalSha256,
  },
  sourceBindings: {
    sourceAtomsCanonicalSha256: canonicalSha(decodeSnapshot(sourceSnapshot)),
    boundaryEvidenceCanonicalSha256: evidenceArtifact.canonicalSha256,
    expansionMapCanonicalSha256: expansionArtifact.canonicalSha256,
    presetRegistryCanonicalSha256: resolvedWidthPolicy[0].canonicalSha256,
    presetValidationIndexCanonicalSha256: resolvedWidthPolicy[1].canonicalSha256,
    materialValidationIndexCanonicalSha256: resolvedWidthPolicy[2].canonicalSha256,
    registryBindingCanonicalSha256: resolvedWidthPolicy[3].canonicalSha256,
    rendererTrustCanonicalSha256: resolvedWidthPolicy[4].canonicalSha256,
    rendererTrustImplementationFileSha256: implementationSnapshots[2].fileSha256,
    textLayoutImplementationFileSha256: resolvedWidthPolicy[5].snapshot.fileSha256,
  },
  checks: LEAKAGE_CHECK_NAMES.map((name) => ({
    name,
    status: 'passed',
    violationCodes: [],
  })),
  violations: [],
});

const safeBasename = (value) => value.split('/').at(-1);
const makeManifest = ({
  job,
  jobSnapshot,
  gateAJob,
  gateAJobSnapshot,
  completionReportSnapshot,
  implementationSnapshots,
  sourceSnapshots,
  resolvedWidthPolicy,
  runtimeObservation,
  embeddedReportArtifact,
  contentArtifacts,
}) => {
  const externalInputBindings = [
    ...sourceSnapshots.map((snapshot, index) => ({
      role: ['sourceAtoms', 'sourceGenerationManifest', 'sourceValidationReport'][index],
      path: snapshot.path,
      fileSha256: snapshot.fileSha256,
      canonicalSha256: canonicalSha(decodeSnapshot(snapshot)),
    })),
    ...resolvedWidthPolicy.map((entry) => ({
      role: entry.role,
      path: entry.snapshot.path,
      fileSha256: entry.snapshot.fileSha256,
      canonicalSha256: entry.canonicalSha256,
    })),
  ];
  const contentProjection = contentArtifacts.map((artifact, index) => ({
    role: CONTENT_ROLES[index],
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  }));
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    packageId: job.publication.packageId,
    artifactId: job.artifactId,
    formalOutputPath: job.publication.formalOutputPath,
    packageJobBinding: {
      path: jobSnapshot.path,
      fileSha256: jobSnapshot.fileSha256,
    },
    sourceGateBinding: {
      gateAJob: {
        path: gateAJobSnapshot.path,
        fileSha256: gateAJobSnapshot.fileSha256,
      },
      gateACompletionReport: {
        path: completionReportSnapshot.path,
        fileSha256: completionReportSnapshot.fileSha256,
      },
      expectedEvidenceHashes: cloneJson(job.gateA.expectedEvidenceHashes),
      gateAImplementationFiles: gateAJob.implementationBinding.files.map((entry) => ({
        role: entry.role,
        path: entry.path,
        fileSha256: entry.fileSha256,
      })),
      embeddedReport: {
        fileName: embeddedReportArtifact.fileName,
        fileSha256: embeddedReportArtifact.fileSha256,
        canonicalSha256: embeddedReportArtifact.canonicalSha256,
      },
    },
    implementationBinding: {
      files: job.implementationBinding.files.map((entry, index) => ({
        role: entry.role,
        path: implementationSnapshots[index].path,
        fileSha256: implementationSnapshots[index].fileSha256,
      })),
      dependencyFiles: [],
    },
    runtimeBinding: {
      nodeBinarySha256: runtimeObservation.nodeBinaryInput.snapshot.fileSha256,
      nodeVersion: runtimeObservation.nodeVersion,
      icuVersion: runtimeObservation.icuVersion,
      resolvedLocale: runtimeObservation.resolvedLocale,
      resolvedGranularity: runtimeObservation.resolvedGranularity,
      diagnostics: {
        nodeExecutableFileName: safeBasename(runtimeObservation.diagnostics.resolvedNodePath),
        platform: runtimeObservation.diagnostics.platform,
        arch: runtimeObservation.diagnostics.arch,
        v8Version: runtimeObservation.diagnostics.v8Version,
        unicodeVersion: runtimeObservation.diagnostics.unicodeVersion,
        cldrVersion: runtimeObservation.diagnostics.cldrVersion,
      },
    },
    externalInputBindings,
    contentArtifacts: contentProjection,
    validationReportDeclaration: {
      fileName: 'package-validation-report.json',
      schemaVersion: PACKAGE_REPORT_SCHEMA_VERSION,
      selfHashPolicy: 'report-is-not-hashed-by-manifest-v001',
    },
    contentSetCanonicalSha256: canonicalSha(contentProjection),
  };
};

const buildProjection = (sourceArtifact, evidence, modelInput) => {
  const atomById = new Map(sourceArtifact.rawSourceAtoms.map((atom) => [atom.atomId, atom]));
  const containers = modelInput.containers.map((container) => {
    const candidates = evidence.boundaryCandidates.filter(
      (candidate) => candidate.containerId === container.containerId,
    );
    const atomIds = candidates.flatMap((candidate) => candidate.sourceAtomIds);
    return {
      containerId: container.containerId,
      sourceAtomCount: new Set(atomIds.filter((atomId) => atomById.has(atomId))).size,
      boundaryCandidateCount: candidates.length,
    };
  });
  const widths = modelInput.containers.flatMap(
    (container) => container.boundaryCandidates.map((candidate) => candidate.logicalWidth),
  );
  return {
    sourceAtomCount: sourceArtifact.rawSourceAtoms.length,
    containerCount: containers.length,
    boundaryCandidateCount: evidence.boundaryCandidates.length,
    containers,
    maximumObservedCandidateLogicalWidth: Math.max(...widths),
  };
};

const makePackageValidationReport = ({
  job,
  jobSnapshot,
  manifestArtifact,
  contentArtifacts,
  projection,
}) => ({
  schemaVersion: PACKAGE_REPORT_SCHEMA_VERSION,
  status: 'passed',
  failureStage: null,
  jobBinding: {
    path: jobSnapshot.path,
    fileSha256: jobSnapshot.fileSha256,
  },
  package: {
    packageId: job.publication.packageId,
    artifactId: job.artifactId,
    formalOutputPath: job.publication.formalOutputPath,
  },
  manifestBinding: {
    fileName: manifestArtifact.fileName,
    fileSha256: manifestArtifact.fileSha256,
    canonicalSha256: manifestArtifact.canonicalSha256,
  },
  checks: PACKAGE_CHECK_NAMES.map((name) => ({
    name,
    status: 'passed',
    violationCodes: [],
  })),
  violations: [],
  validatedContentArtifacts: contentArtifacts.map((artifact, index) => ({
    role: CONTENT_ROLES[index],
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  })),
  observedProjection: projection,
  scope: {
    validatedState: 'source-package-only',
    postPublishValidationRequired: true,
    semanticQualityVerified: false,
    naturalBreakQualityVerified: false,
    nonCooperativePublicationRaceProtected: false,
  },
});

export function buildPresentationCaptionSemanticSourcePackageV001(context) {
  expectedBuilderContext(context);
  const job = context.job.value;
  if (validatePresentationCaptionSemanticSourcePackageJobV001(job).status !== 'valid') {
    throw new TypeError('invalid package job');
  }
  const resolvedWidthPolicy = resolveWidthPolicySnapshotsForBuilderV001(
    job,
    context.widthPolicySnapshots,
  );
  const sourceArtifact = decodeSnapshot(context.sourceSnapshots[0]);
  const evidence = context.gateA.evidenceValue;
  const embeddedReport = context.gateA.embeddedReportValue;
  if (!sameBytes(context.gateA.evidenceBytes, formalBytes(evidence))
    || !sameBytes(context.gateA.embeddedReportBytes, embeddedReportBytes(embeddedReport))) {
    throw new TypeError('Gate A artifact byte binding mismatch');
  }
  const evidenceArtifact = {
    fileName: PACKAGE_FILES[0],
    value: evidence,
    bytes: Buffer.from(context.gateA.evidenceBytes),
    fileSha256: hashBytes(context.gateA.evidenceBytes),
    canonicalSha256: canonicalSha(evidence),
  };
  const embeddedReportArtifact = {
    fileName: PACKAGE_FILES[1],
    value: embeddedReport,
    bytes: Buffer.from(context.gateA.embeddedReportBytes),
    fileSha256: hashBytes(context.gateA.embeddedReportBytes),
    canonicalSha256: canonicalSha(embeddedReport),
  };
  const modelInputArtifact = artifactFrom(PACKAGE_FILES[2], makeModelInput(evidence));
  const expansionArtifact = artifactFrom(PACKAGE_FILES[3], makeExpansionMap({
    job,
    evidence,
    sourceSnapshot: context.sourceSnapshots[0],
    resolvedWidthPolicy,
    implementationSnapshots: context.implementationSnapshots,
    modelInputArtifact,
    evidenceArtifact,
  }));
  const leakageArtifact = artifactFrom(PACKAGE_FILES[4], makeLeakageReport({
    modelInputArtifact,
    expansionArtifact,
    sourceSnapshot: context.sourceSnapshots[0],
    evidenceArtifact,
    resolvedWidthPolicy,
    implementationSnapshots: context.implementationSnapshots,
  }));
  const contentArtifacts = [
    evidenceArtifact,
    embeddedReportArtifact,
    modelInputArtifact,
    expansionArtifact,
    leakageArtifact,
  ];
  const manifestArtifact = artifactFrom(PACKAGE_FILES[5], makeManifest({
    job,
    jobSnapshot: context.job.snapshot,
    gateAJob: context.gateA.jobValue,
    gateAJobSnapshot: context.gateA.jobSnapshot,
    completionReportSnapshot: context.gateA.completionReportSnapshot,
    implementationSnapshots: context.implementationSnapshots,
    sourceSnapshots: context.sourceSnapshots,
    resolvedWidthPolicy,
    runtimeObservation: context.runtimeObservation,
    embeddedReportArtifact,
    contentArtifacts,
  }));
  const projection = buildProjection(sourceArtifact, evidence, modelInputArtifact.value);
  const validationArtifact = artifactFrom(PACKAGE_FILES[6], makePackageValidationReport({
    job,
    jobSnapshot: context.job.snapshot,
    manifestArtifact,
    contentArtifacts,
    projection,
  }));
  return {
    artifacts: [
      ...contentArtifacts,
      manifestArtifact,
      validationArtifact,
    ],
  };
}

const makeViolation = (code, path) => ({code, path, details: {}});
const sortViolations = (violations) => [...violations].sort((left, right) => {
  const codeDelta = CODE_ORDER.get(left.code) - CODE_ORDER.get(right.code);
  return codeDelta !== 0 ? codeDelta : compareUtf16(left.path, right.path);
});
const uniqueViolations = (violations) => {
  const seen = new Set();
  return sortViolations(violations.filter((entry) => {
    const key = `${entry.code}\u0000${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
};
const addViolation = (state, check, code, path) => {
  const violation = makeViolation(code, path);
  state.violations.push(violation);
  state.records.push({check, violation});
  if (!state.byCheck.has(check)) state.byCheck.set(check, []);
  state.byCheck.get(check).push(code);
};
const distinctCodes = (codes) => [...new Set(codes)].sort(
  (left, right) => CODE_ORDER.get(left) - CODE_ORDER.get(right),
);
const sameJson = (left, right) => {
  const a = canonicalizePresentationCaptionB1JsonV001(left);
  const b = canonicalizePresentationCaptionB1JsonV001(right);
  return a.status === 'canonicalized'
    && b.status === 'canonicalized'
    && a.bytes.equals(b.bytes);
};
const sameSnapshotIdentityAndHash = (initial, observation) => validateStableSnapshot(initial)
  && validateReadObservation(observation)
  && initial.path === observation.path
  && initial.fileSha256 === observation.snapshot.fileSha256
  && sameStat(initial.pathLstatBeforeOpen, observation.snapshot.pathLstatBeforeOpen);

const validateObservationAgainstBinding = (observation, binding, unsafeCode, missingCode) => {
  if (!isPlainObject(observation) || observation.role !== binding.role
    || observation.path !== binding.path) {
    return {unsafe: true, mismatch: false, decoded: null};
  }
  if (observation.status === 'lexically-rejected' || observation.status === 'observed-unsafe') {
    return {unsafe: true, mismatch: false, decoded: null};
  }
  if (observation.status === 'missing') {
    return {unsafe: false, mismatch: true, decoded: null};
  }
  if (!validateReadObservation(observation, binding.role)) {
    return {unsafe: true, mismatch: false, decoded: null};
  }
  const decoded = decodePresentationCaptionB1StrictJsonV001(observation.snapshot.bytes);
  const actualCanonical = decoded.status === 'decoded' ? canonicalSha(decoded.value) : null;
  return {
    unsafe: false,
    mismatch: observation.snapshot.fileSha256 !== binding.fileSha256
      || (hasOwn(binding, 'canonicalSha256')
        && binding.canonicalSha256 !== null
        && actualCanonical !== binding.canonicalSha256),
    decoded: decoded.status === 'decoded' ? decoded.value : null,
    decodeFailed: decoded.status !== 'decoded',
    unsafeCode,
    missingCode,
  };
};

const gateAContextInputFrom = (context) => ({
  jobValue: context.gateA.jobValue,
  jobInput: context.gateA.jobInput,
  implementationInputs: context.gateA.implementationInputs,
  sourceInputs: context.gateA.sourceInputs,
  legacyRecheck: context.gateA.legacyRecheck,
  legacyReadOnlyObservation: context.gateA.legacyReadOnlyObservation,
  runtimeObservation: context.runtimeObservation,
});

const validatePackagePass = (value) => {
  if (!exactKeys(value, ['artifacts', 'inputByteCopies'])
    || !isDenseArray(value.artifacts)
    || !isDenseArray(value.inputByteCopies)) return false;
  return value.artifacts.every((artifact) => exactKeys(artifact, [
    'fileName',
    'value',
    'bytes',
    'fileSha256',
    'canonicalSha256',
  ])
    && typeof artifact.fileName === 'string'
    && !hasLoneSurrogate(artifact.fileName)
    && assertPresentationCaptionB1StrictValueV001(artifact.value).status === 'valid'
    && Buffer.isBuffer(artifact.bytes)
    && isSha256(artifact.fileSha256)
    && isSha256(artifact.canonicalSha256));
};
const validatePassArray = (passes, validator) => isDenseArray(passes)
  && (passes.length === 0
    || (passes.length === 2 && passes.every((entry) => entry === null || validator(entry))));
const successfulPair = (passes, validator) => validatePassArray(passes, validator)
  && passes.length === 2
  && passes.every((entry) => entry !== null);
const packageArtifact = (passes, fileName) => passes?.[0]?.artifacts?.find(
  (entry) => entry.fileName === fileName,
);

const validateModelInputShape = (value) => exactKeys(value, [
  'schemaVersion',
  'taskDescription',
  'displayConstraints',
  'containers',
])
  && value.schemaVersion === MODEL_INPUT_SCHEMA_VERSION
  && value.taskDescription === TASK_DESCRIPTION
  && exactKeys(value.displayConstraints, [
    'maxLogicalWidthPerLine',
    'maxLinesPerMeaningGroup',
  ])
  && value.displayConstraints.maxLogicalWidthPerLine === MAX_LOGICAL_WIDTH
  && value.displayConstraints.maxLinesPerMeaningGroup === MAX_LINES
  && isDenseArray(value.containers)
  && value.containers.every((container) => exactKeys(container, [
    'containerId',
    'text',
    'boundaryCandidates',
  ])
    && isNonEmptyString(container.containerId)
    && typeof container.text === 'string'
    && isDenseArray(container.boundaryCandidates)
    && container.boundaryCandidates.length > 0
    && container.boundaryCandidates.every((candidate) => exactKeys(candidate, [
      'boundaryCandidateId',
      'text',
      'logicalWidth',
    ])
      && isNonEmptyString(candidate.boundaryCandidateId)
      && isNonEmptyString(candidate.text)
      && isNonNegativeInteger(candidate.logicalWidth)));

const findForbiddenModelPath = (value) => {
  if (!isPlainObject(value)) return null;
  const allowedRoot = new Set([
    'schemaVersion',
    'taskDescription',
    'displayConstraints',
    'containers',
  ]);
  const rootUnknown = Object.keys(value).filter((key) => !allowedRoot.has(key)).sort(compareUtf16)[0];
  if (rootUnknown) return `$.modelInput.${rootUnknown}`;
  if (Array.isArray(value.containers)) {
    for (let index = 0; index < value.containers.length; index += 1) {
      const container = value.containers[index];
      if (!isPlainObject(container)) continue;
      const unknown = Object.keys(container)
        .filter((key) => !['containerId', 'text', 'boundaryCandidates'].includes(key))
        .sort(compareUtf16)[0];
      if (unknown) return `$.modelInput.containers[${index}].${unknown}`;
      if (Array.isArray(container.boundaryCandidates)) {
        for (let candidateIndex = 0;
          candidateIndex < container.boundaryCandidates.length;
          candidateIndex += 1) {
          const candidate = container.boundaryCandidates[candidateIndex];
          if (!isPlainObject(candidate)) continue;
          const candidateUnknown = Object.keys(candidate)
            .filter((key) => !['boundaryCandidateId', 'text', 'logicalWidth'].includes(key))
            .sort(compareUtf16)[0];
          if (candidateUnknown) {
            return `$.modelInput.containers[${index}].boundaryCandidates[${candidateIndex}].${candidateUnknown}`;
          }
        }
      }
    }
  }
  return null;
};

const modelInputKnownFieldScaffold = (value) => {
  if (!isPlainObject(value)) return value;
  const rootEntries = Object.entries(value)
    .filter(([key]) => [
      'schemaVersion',
      'taskDescription',
      'displayConstraints',
      'containers',
    ].includes(key))
    .map(([key, entry]) => {
      if (key !== 'containers' || !Array.isArray(entry)) return [key, entry];
      return [key, entry.map((container) => {
        if (!isPlainObject(container)) return container;
        return Object.fromEntries(
          Object.entries(container)
            .filter(([containerKey]) => [
              'containerId',
              'text',
              'boundaryCandidates',
            ].includes(containerKey))
            .map(([containerKey, containerEntry]) => {
              if (containerKey !== 'boundaryCandidates'
                || !Array.isArray(containerEntry)) {
                return [containerKey, containerEntry];
              }
              return [containerKey, containerEntry.map((candidate) => (
                isPlainObject(candidate)
                  ? Object.fromEntries(
                    Object.entries(candidate).filter(([candidateKey]) => [
                      'boundaryCandidateId',
                      'text',
                      'logicalWidth',
                    ].includes(candidateKey)),
                  )
                  : candidate
              ))];
            }),
        );
      })];
    });
  return Object.fromEntries(rootEntries);
};

const validateExpansionMapShape = (value) => exactKeys(value, [
  'schemaVersion',
  'artifactId',
  'sourceBindings',
  'widthPolicyBinding',
  'modelInputBinding',
  'containers',
])
  && value.schemaVersion === EXPANSION_MAP_SCHEMA_VERSION
  && isNonEmptyString(value.artifactId)
  && isPlainObject(value.sourceBindings)
  && isPlainObject(value.widthPolicyBinding)
  && isPlainObject(value.modelInputBinding)
  && isDenseArray(value.containers)
  && value.containers.every((container) => exactKeys(container, [
    'containerId',
    'timelineSegmentId',
    'speechId',
    'candidates',
  ])
    && isNonEmptyString(container.containerId)
    && isNonEmptyString(container.timelineSegmentId)
    && isPositiveInteger(container.speechId)
    && isDenseArray(container.candidates)
    && container.candidates.every((candidate) => exactKeys(candidate, [
      'boundaryCandidateId',
      'sourceAtomIds',
      'startAnchor',
      'endAnchor',
      'logicalWidth',
    ])
      && isNonEmptyString(candidate.boundaryCandidateId)
      && isDenseArray(candidate.sourceAtomIds)
      && candidate.sourceAtomIds.length > 0
      && candidate.sourceAtomIds.every(isNonEmptyString)
      && exactKeys(candidate.startAnchor, ['atomId', 'edge'])
      && candidate.startAnchor.edge === 'start'
      && exactKeys(candidate.endAnchor, ['atomId', 'edge'])
      && candidate.endAnchor.edge === 'end'
      && isNonNegativeInteger(candidate.logicalWidth)));

const validateLeakageShape = (value) => exactKeys(value, [
  'schemaVersion',
  'status',
  'failureStage',
  'modelInputBinding',
  'sourceBindings',
  'checks',
  'violations',
])
  && value.schemaVersion === LEAKAGE_REPORT_SCHEMA_VERSION
  && value.status === 'passed'
  && value.failureStage === null
  && isPlainObject(value.modelInputBinding)
  && exactKeys(value.sourceBindings, [
    'sourceAtomsCanonicalSha256',
    'boundaryEvidenceCanonicalSha256',
    'expansionMapCanonicalSha256',
    'presetRegistryCanonicalSha256',
    'presetValidationIndexCanonicalSha256',
    'materialValidationIndexCanonicalSha256',
    'registryBindingCanonicalSha256',
    'rendererTrustCanonicalSha256',
    'rendererTrustImplementationFileSha256',
    'textLayoutImplementationFileSha256',
  ])
  && Object.values(value.sourceBindings).every(isSha256)
  && isDenseArray(value.checks)
  && value.checks.length === LEAKAGE_CHECK_NAMES.length
  && value.checks.every((entry, index) => exactKeys(entry, [
    'name',
    'status',
    'violationCodes',
  ])
    && entry.name === LEAKAGE_CHECK_NAMES[index]
    && entry.status === 'passed'
    && isDenseArray(entry.violationCodes)
    && entry.violationCodes.length === 0)
  && isDenseArray(value.violations)
  && value.violations.length === 0;

const validateOuterManifest = (value) => exactKeys(value, [
  'schemaVersion',
  'packageId',
  'artifactId',
  'formalOutputPath',
  'packageJobBinding',
  'sourceGateBinding',
  'implementationBinding',
  'runtimeBinding',
  'externalInputBindings',
  'contentArtifacts',
  'validationReportDeclaration',
  'contentSetCanonicalSha256',
])
  && value.schemaVersion === MANIFEST_SCHEMA_VERSION;
const validateOuterPackageReport = (value) => exactKeys(value, [
  'schemaVersion',
  'status',
  'failureStage',
  'jobBinding',
  'package',
  'manifestBinding',
  'checks',
  'violations',
  'validatedContentArtifacts',
  'observedProjection',
  'scope',
])
  && value.schemaVersion === PACKAGE_REPORT_SCHEMA_VERSION;

const validateArtifactBytes = (artifact) => {
  if (!Buffer.isBuffer(artifact.bytes)) return false;
  const decoded = decodePresentationCaptionB1StrictJsonV001(artifact.bytes);
  if (decoded.status !== 'decoded' || !sameJson(decoded.value, artifact.value)) return false;
  const expected = artifact.fileName === PACKAGE_FILES[1]
    ? embeddedReportBytes(artifact.value)
    : formalBytes(artifact.value);
  return expected.equals(artifact.bytes);
};

const validatePackageArtifactSet = (artifacts) => isDenseArray(artifacts)
  && artifacts.length === PACKAGE_FILES.length
  && artifacts.every((artifact, index) => artifact.fileName === PACKAGE_FILES[index]);

const contentProjectionFromArtifacts = (artifacts) => artifacts
  .slice(0, CONTENT_ROLES.length)
  .map((artifact, index) => ({
    role: CONTENT_ROLES[index],
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  }));

const metadataDifferencePaths = (
  actual,
  expected,
  path,
  bindingPaths,
  hashPaths,
) => {
  if (sameJson(actual, expected)) return;
  const key = path.split('.').at(-1);
  const target = key?.endsWith('Sha256') ? hashPaths : bindingPaths;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)
      || actual.length !== expected.length) {
      target.add(path);
      return;
    }
    for (let index = 0; index < actual.length; index += 1) {
      metadataDifferencePaths(
        actual[index],
        expected[index],
        `${path}[${index}]`,
        bindingPaths,
        hashPaths,
      );
    }
    return;
  }
  if (isPlainObject(actual) || isPlainObject(expected)) {
    if (!isPlainObject(actual) || !isPlainObject(expected)) {
      target.add(path);
      return;
    }
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    if (!sameJson(actualKeys, expectedKeys)) {
      const union = [...new Set([...actualKeys, ...expectedKeys])].sort(compareUtf16);
      for (const field of union) {
        if (!hasOwn(actual, field) || !hasOwn(expected, field)) {
          (field.endsWith('Sha256') ? hashPaths : bindingPaths).add(`${path}.${field}`);
        }
      }
      if (actualKeys.length === expectedKeys.length
        && actualKeys.every((field) => expectedKeys.includes(field))) {
        bindingPaths.add(path);
      }
    }
    for (const field of expectedKeys) {
      if (hasOwn(actual, field)) {
        metadataDifferencePaths(
          actual[field],
          expected[field],
          `${path}.${field}`,
          bindingPaths,
          hashPaths,
        );
      }
    }
    return;
  }
  target.add(path);
};

const deriveExpectedPackageMetadataForActualArtifacts = (context, artifacts) => {
  const baseline = deriveExpectedPackage(context);
  if (baseline === null) return null;
  const contentProjection = contentProjectionFromArtifacts(artifacts);
  const manifest = cloneJson(baseline.artifacts[5].value);
  manifest.contentArtifacts = contentProjection;
  manifest.contentSetCanonicalSha256 = canonicalSha(contentProjection);
  const manifestArtifact = artifactFrom(PACKAGE_FILES[5], manifest);
  const report = cloneJson(baseline.artifacts[6].value);
  report.manifestBinding = {
    fileName: manifestArtifact.fileName,
    fileSha256: manifestArtifact.fileSha256,
    canonicalSha256: manifestArtifact.canonicalSha256,
  };
  report.validatedContentArtifacts = contentProjection;
  return {
    baseline,
    manifest,
    report,
  };
};

const deriveExpectedPackage = (context) => {
  try {
    const embedded = derivePresentationCaptionEmbeddedGateAReportContextV001({
      gateA: {
        jobValue: context.gateA.jobValue,
        jobInput: context.gateA.jobInput,
        implementationInputs: context.gateA.implementationInputs,
        sourceInputs: context.gateA.sourceInputs,
        legacyRecheck: context.gateA.legacyRecheck,
        legacyReadOnlyObservation: context.gateA.legacyReadOnlyObservation,
        evidencePasses: context.gateA.evidencePasses,
      },
      runtimeObservation: context.runtimeObservation,
    });
    if (embedded.status !== 'derived'
      || !successfulPair(context.gateA.embeddedReportPasses, validateBuildSuccess)) return null;
    const widthSnapshots = context.widthPolicyInputs.map((entry) => entry.snapshot);
    const implementationSnapshots = context.implementationInputs.map((entry) => entry.snapshot);
    const sourceSnapshots = context.gateA.sourceInputs.map((entry) => entry.snapshot);
    if ([...widthSnapshots, ...implementationSnapshots, ...sourceSnapshots].some(
      (entry) => !validateStableSnapshot(entry),
    )) return null;
    return buildPresentationCaptionSemanticSourcePackageV001({
      job: {
        value: context.job.value,
        snapshot: context.job.initialSnapshot,
      },
      gateA: {
        jobValue: context.gateA.jobValue,
        jobSnapshot: context.gateA.jobInput.snapshot,
        completionReportSnapshot: context.gateA.completionReportInput.snapshot,
        evidenceValue: context.gateA.evidencePasses[0].value,
        evidenceBytes: context.gateA.evidencePasses[0].bytes,
        embeddedReportValue: context.gateA.embeddedReportPasses[0].value,
        embeddedReportBytes: context.gateA.embeddedReportPasses[0].bytes,
      },
      implementationSnapshots,
      sourceSnapshots,
      widthPolicySnapshots: widthSnapshots,
      runtimeObservation: context.runtimeObservation,
    });
  } catch {
    return null;
  }
};

const phasePrefixLength = (phase) => ({
  'gate-a-context-gate': 5,
  'evidence-gate': 7,
  'embedded-report-gate': 9,
  'core-gate': 15,
}[phase] ?? null);

const validateCheckerOuterContext = (context) => exactKeys(context, [
  'contextPhase',
  'job',
  'gateA',
  'implementationInputs',
  'widthPolicyInputs',
  'builderInvocationProvenance',
  'runtimeObservation',
  'packageBuildPasses',
  'buildFailure',
  'readOnlyProcessObservation',
  'publicationProcessObservation',
  'productionMode',
])
  && PACKAGE_PHASES.includes(context.contextPhase)
  && exactKeys(context.job, ['value', 'initialSnapshot', 'prePublicationInput', 'preReportInput'])
  && exactKeys(context.gateA, [
    'jobValue',
    'jobInput',
    'completionReportInput',
    'implementationInputs',
    'sourceInputs',
    'legacyRecheck',
    'legacyReadOnlyObservation',
    'evidencePasses',
    'embeddedReportPasses',
  ])
  && isDenseArray(context.implementationInputs)
  && isDenseArray(context.widthPolicyInputs)
  && exactKeys(context.builderInvocationProvenance, ['passes'])
  && isDenseArray(context.builderInvocationProvenance.passes)
  && validatePassArray(context.gateA.evidencePasses, validateBuildSuccess)
  && validatePassArray(context.gateA.embeddedReportPasses, validateBuildSuccess)
  && validatePassArray(context.packageBuildPasses, validatePackagePass)
  && (context.buildFailure === null || isPlainObject(context.buildFailure))
  && ['read-only-preflight', 'formal-generation'].includes(context.productionMode);

const deriveCoreChecks = (context, state) => {
  const jobValid = validatePresentationCaptionSemanticSourcePackageJobV001(context.job.value);
  let jobPassed = jobValid.status === 'valid'
    && validateStableSnapshot(context.job.initialSnapshot);
  if (jobPassed) {
    const decoded = decodePresentationCaptionB1StrictJsonV001(context.job.initialSnapshot.bytes);
    jobPassed = decoded.status === 'decoded'
      && sameJson(decoded.value, context.job.value)
      && context.job.initialSnapshot.path === context.job.value.readOnlyGuard.excludedPaths[0];
  }
  if (!jobPassed) addViolation(state, 'jobBinding', 'CAPTION_B1_JOB_INVALID', '$.job.value');

  let implementationPassed = jobPassed
    && context.implementationInputs.length === 3;
  if (implementationPassed) {
    for (let index = 0; index < 3; index += 1) {
      const binding = context.job.value.implementationBinding.files[index];
      const result = validateObservationAgainstBinding(
        context.implementationInputs[index],
        binding,
      );
      if (result.unsafe || result.mismatch) {
        addViolation(
          state,
          'implementationBinding',
          'IMPLEMENTATION_MISMATCH',
          `$.implementationBindings[${index}]`,
        );
        implementationPassed = false;
      }
    }
    if (implementationPassed) {
      for (const index of invalidPackageImportGraphIndexes(context.implementationInputs)) {
        addViolation(
          state,
          'implementationBinding',
          'IMPLEMENTATION_MISMATCH',
          `$.implementationBindings[${index}]`,
        );
        implementationPassed = false;
      }
    }
  } else if (jobPassed) {
    addViolation(state, 'implementationBinding', 'IMPLEMENTATION_MISMATCH', '$.implementationBindings');
  }

  let inputPassed = jobPassed
    && context.widthPolicyInputs.length === WIDTH_POLICY_SLOTS_V001.length;
  const resolvedWidthPolicy = [];
  if (inputPassed) {
    for (let index = 0; index < WIDTH_POLICY_SLOTS_V001.length; index += 1) {
      const binding = context.job.value.widthPolicyBindings[index];
      const result = resolveWidthPolicyObservationAtSlotV001(
        context.widthPolicyInputs[index],
        binding,
        index,
      );
      resolvedWidthPolicy.push(result);
      if (result.status === 'unsafe') {
        addViolation(state, 'inputBinding', 'INPUT_PATH_UNSAFE', `$.inputBindings[${index}].path`);
        inputPassed = false;
      } else if (result.status === 'file-mismatch') {
        addViolation(
          state,
          'inputBinding',
          'INPUT_HASH_MISMATCH',
          `$.inputBindings[${index}].fileSha256`,
        );
        inputPassed = false;
      } else if (result.status === 'schema-unsupported') {
        addViolation(
          state,
          'inputBinding',
          'INPUT_SCHEMA_UNSUPPORTED',
          `$.inputBindings[${index}].decodedValue`,
        );
        inputPassed = false;
      } else if (result.status === 'canonical-mismatch') {
        addViolation(
          state,
          'inputBinding',
          'INPUT_HASH_MISMATCH',
          `$.inputBindings[${index}].canonicalSha256`,
        );
        inputPassed = false;
      }
    }
  } else if (jobPassed) {
    addViolation(state, 'inputBinding', 'INPUT_PATH_UNSAFE', '$.inputBindings');
  }
  if (inputPassed) {
    const trustEvaluation = evaluateResolvedWidthPolicyV001(resolvedWidthPolicy);
    if (trustEvaluation.status === 'hash-mismatch') {
      addViolation(state, 'inputBinding', 'INPUT_HASH_MISMATCH', '$.inputBindings');
      inputPassed = false;
    } else if (trustEvaluation.status === 'projection-mismatch') {
      addViolation(
        state,
        'modelInput',
        'MODEL_INPUT_PROJECTION_MISMATCH',
        '$.modelInput.displayConstraints',
      );
    }
  }

  let runtimePassed = jobPassed && validateRuntimeObservation(context.runtimeObservation);
  if (runtimePassed) {
    const expected = context.job.value.expectedRuntime;
    runtimePassed = context.runtimeObservation.nodeBinaryInput.snapshot.fileSha256
        === expected.nodeBinarySha256
      && context.runtimeObservation.nodeVersion === expected.nodeVersion
      && context.runtimeObservation.icuVersion === expected.icuVersion
      && context.runtimeObservation.resolvedLocale === expected.resolvedLocale
      && context.runtimeObservation.resolvedGranularity === expected.resolvedGranularity;
  }
  if (!runtimePassed && jobPassed) {
    addViolation(state, 'runtimeBinding', 'RUNTIME_MISMATCH', '$.runtime');
  }

  const gateABase = jobPassed && runtimePassed
    ? derivePresentationCaptionGateALegacyBaseContextV001(gateAContextInputFrom(context))
    : {status: 'context-invalid'};
  const gateAContextPassed = gateABase.status === 'derived';
  if (!gateAContextPassed && jobPassed && runtimePassed) {
    addViolation(state, 'gateAContext', 'GATE_A_CONTEXT_INVALID', '$.gateA');
  }

  let evidenceBuildPassed = gateAContextPassed;
  if (evidenceBuildPassed) {
    if (context.buildFailure?.stage === 'gate-a-evidence'
      || !successfulPair(context.gateA.evidencePasses, validateBuildSuccess)) {
      addViolation(state, 'evidenceBuild', 'BUILD_FAILED', '$.builds.buildFailure');
      evidenceBuildPassed = false;
    }
  }

  let evidenceDeterminismPassed = evidenceBuildPassed;
  if (evidenceDeterminismPassed) {
    const [first, second] = context.gateA.evidencePasses;
    if (!first.bytes.equals(second.bytes)) {
      addViolation(
        state,
        'evidenceDeterminism',
        'EVIDENCE_NONDETERMINISTIC',
        '$.builds.evidencePasses',
      );
      evidenceDeterminismPassed = false;
    }
    const expected = context.job.value.gateA.expectedEvidenceHashes;
    for (const [field, actual] of [
      ['boundaryCandidatesCanonicalSha256', first.value.boundaryCandidatesCanonicalSha256],
      ['sourceAtomMembershipCanonicalSha256', first.value.sourceAtomMembershipCanonicalSha256],
      ['evidenceCanonicalSha256', first.canonicalSha256],
    ]) {
      if (expected[field] !== actual) {
        addViolation(
          state,
          'evidenceDeterminism',
          'EVIDENCE_EXPECTED_HASH_MISMATCH',
          `$.job.value.gateA.expectedEvidenceHashes.${field}`,
        );
        evidenceDeterminismPassed = false;
      }
    }
  }

  let embeddedBuildPassed = evidenceDeterminismPassed;
  if (embeddedBuildPassed) {
    if (context.buildFailure?.stage === 'embedded-gate-a-report'
      || !successfulPair(context.gateA.embeddedReportPasses, validateBuildSuccess)) {
      addViolation(state, 'embeddedReportBuild', 'BUILD_FAILED', '$.builds.buildFailure');
      embeddedBuildPassed = false;
    }
  }

  let gateAReportPassed = embeddedBuildPassed;
  if (gateAReportPassed) {
    const [first, second] = context.gateA.embeddedReportPasses;
    if (!first.bytes.equals(second.bytes)) {
      addViolation(
        state,
        'gateAReport',
        'NONDETERMINISTIC',
        '$.builds.embeddedReportPasses',
      );
      gateAReportPassed = false;
    } else {
      const completion = context.gateA.completionReportInput;
      if (!validateReadObservation(completion)
        || completion.path !== context.job.value.gateA.completionReport.path
        || completion.snapshot.fileSha256
          !== context.job.value.gateA.completionReport.fileSha256) {
        addViolation(
          state,
          'gateAReport',
          'GATE_A_REPORT_INVALID',
          '$.gateA.completionReportInput',
        );
        gateAReportPassed = false;
      } else {
        const derived = derivePresentationCaptionEmbeddedGateAReportContextV001({
          gateA: {
            jobValue: context.gateA.jobValue,
            jobInput: context.gateA.jobInput,
            implementationInputs: context.gateA.implementationInputs,
            sourceInputs: context.gateA.sourceInputs,
            legacyRecheck: context.gateA.legacyRecheck,
            legacyReadOnlyObservation: context.gateA.legacyReadOnlyObservation,
            evidencePasses: context.gateA.evidencePasses,
          },
          runtimeObservation: context.runtimeObservation,
        });
        if (derived.status !== 'derived') {
          return {
            jobPassed,
            corePassed: false,
            internalContextInvalid: true,
          };
        }
        const valid = derived.status === 'derived'
          && validatePresentationSegmenterBoundaryPreflightReportV001({
            report: first.value,
            reportBytes: first.bytes,
            expectedExitCode: first.value.status === 'passed' ? 0 : 1,
            checkerContext: {
              jobValue: derived.value.jobValue,
              jobSnapshot: derived.value.jobSnapshot,
              observedImplementationBinding: gateABase.value.observedImplementationBinding,
              inputSnapshots: derived.value.inputSnapshots,
              runtimeBinding: derived.value.runtimeBinding,
              evidencePasses: derived.value.evidencePasses,
              buildFailure: null,
              readOnlyGuard: derived.value.readOnlyGuard,
              productionMode: true,
            },
          })?.valid === true;
        if (!valid) {
          addViolation(
            state,
            'gateAReport',
            'GATE_A_REPORT_INVALID',
            '$.gateA.embeddedReportPasses[0].value',
          );
          gateAReportPassed = false;
        } else if (first.value.status !== 'passed') {
          addViolation(
            state,
            'gateAReport',
            'GATE_A_NOT_PASSED',
            '$.gateA.embeddedReportPasses[0].value.status',
          );
          gateAReportPassed = false;
        }
      }
    }
  }

  let packageBuildPassed = gateAReportPassed;
  if (packageBuildPassed) {
    if (context.buildFailure?.stage === 'package'
      || !successfulPair(context.packageBuildPasses, validatePackagePass)) {
      addViolation(state, 'packageBuild', 'BUILD_FAILED', '$.builds.buildFailure');
      packageBuildPassed = false;
    }
  }

  let packageShapePassed = packageBuildPassed;
  if (packageShapePassed) {
    const artifacts = context.packageBuildPasses[0].artifacts;
    if (!validatePackageArtifactSet(artifacts)) {
      addViolation(state, 'packageShape', 'PACKAGE_FILE_SET_INVALID', '$.packageFiles');
      packageShapePassed = false;
    } else {
      for (let index = 0; index < artifacts.length; index += 1) {
        if (!validateArtifactBytes(artifacts[index])) {
          addViolation(
            state,
            'packageShape',
            'PACKAGE_STRICT_JSON_INVALID',
            `$.packageFiles[${index}].bytes`,
          );
          packageShapePassed = false;
        }
        if (Buffer.isBuffer(artifacts[index].bytes)
          && (hashBytes(artifacts[index].bytes) !== artifacts[index].fileSha256
            || canonicalSha(artifacts[index].value)
              !== artifacts[index].canonicalSha256)) {
          addViolation(
            state,
            'packageShape',
            'PACKAGE_HASH_MISMATCH',
            `$.packageFiles[${index}]`,
          );
          packageShapePassed = false;
        }
      }
      const outerManifestValid = validateOuterManifest(artifacts[5].value);
      const outerReportValid = validateOuterPackageReport(artifacts[6].value);
      if (!outerManifestValid) {
        addViolation(
          state,
          'packageShape',
          'PACKAGE_SCHEMA_INVALID',
          '$.packageFiles[5].value',
        );
        packageShapePassed = false;
      }
      if (!outerReportValid) {
        addViolation(
          state,
          'packageShape',
          'PACKAGE_SCHEMA_INVALID',
          '$.packageFiles[6].value',
        );
        packageShapePassed = false;
      }
      if (outerManifestValid && outerReportValid) {
        const expectedMetadata =
          deriveExpectedPackageMetadataForActualArtifacts(context, artifacts);
        if (expectedMetadata === null) {
          addViolation(
            state,
            'packageShape',
            'PACKAGE_BINDING_MISMATCH',
            '$.packageFiles',
          );
          packageShapePassed = false;
        } else {
          for (const index of [0, 1]) {
            if (!sameJson(
              artifacts[index].value,
              expectedMetadata.baseline.artifacts[index].value,
            )) {
              addViolation(
                state,
                'packageShape',
                'PACKAGE_BINDING_MISMATCH',
                `$.packageFiles[${index}].value`,
              );
              packageShapePassed = false;
            }
          }
          const bindingPaths = new Set();
          const hashPaths = new Set();
          metadataDifferencePaths(
            artifacts[5].value,
            expectedMetadata.manifest,
            '$.packageFiles[5].value',
            bindingPaths,
            hashPaths,
          );
          metadataDifferencePaths(
            artifacts[6].value,
            expectedMetadata.report,
            '$.packageFiles[6].value',
            bindingPaths,
            hashPaths,
          );
          for (const path of [...bindingPaths].sort(compareUtf16)) {
            addViolation(
              state,
              'packageShape',
              'PACKAGE_BINDING_MISMATCH',
              path,
            );
            packageShapePassed = false;
          }
          for (const path of [...hashPaths].sort(compareUtf16)) {
            addViolation(state, 'packageShape', 'PACKAGE_HASH_MISMATCH', path);
            packageShapePassed = false;
          }
        }
      }
    }
  }

  let modelInputPassed = packageShapePassed;
  if (modelInputPassed) {
    const value = packageArtifact(context.packageBuildPasses, PACKAGE_FILES[2]).value;
    const forbidden = findForbiddenModelPath(value);
    if (forbidden !== null) {
      addViolation(state, 'modelInput', 'MODEL_INPUT_FORBIDDEN_FIELD', forbidden);
      modelInputPassed = false;
    }
    const schemaValue = forbidden === null
      ? value
      : modelInputKnownFieldScaffold(value);
    if (!validateModelInputShape(schemaValue)) {
      addViolation(state, 'modelInput', 'MODEL_INPUT_SCHEMA_INVALID', '$.modelInput');
      modelInputPassed = false;
    } else if (forbidden === null) {
      const evidence = context.gateA.evidencePasses[0].value;
      const expected = makeModelInput(evidence);
      if (!sameJson(value, expected)
        || value.containers.some((container) => container.boundaryCandidates.some(
          (candidate) => candidate.logicalWidth > MAX_LOGICAL_WIDTH,
        ))) {
        addViolation(
          state,
          'modelInput',
          'MODEL_INPUT_PROJECTION_MISMATCH',
          '$.modelInput.containers',
        );
        modelInputPassed = false;
      }
    }
  }

  let expansionPassed = modelInputPassed;
  if (expansionPassed) {
    const value = packageArtifact(context.packageBuildPasses, PACKAGE_FILES[3]).value;
    if (!validateExpansionMapShape(value)) {
      addViolation(state, 'expansionMap', 'MAPPING_SCHEMA_INVALID', '$.expansionMap');
      expansionPassed = false;
    } else {
      const expected = deriveExpectedPackage(context)?.artifacts[3]?.value;
      if (expected === undefined || !sameJson(value, expected)) {
        addViolation(
          state,
          'expansionMap',
          'MAPPING_COVERAGE_INVALID',
          '$.expansionMap.containers',
        );
        expansionPassed = false;
      }
    }
  }

  let leakagePassed = expansionPassed;
  if (leakagePassed) {
    const value = packageArtifact(context.packageBuildPasses, PACKAGE_FILES[4]).value;
    const expected = deriveExpectedPackage(context)?.artifacts[4]?.value;
    const provenance = context.builderInvocationProvenance;
    const providedExpected = [
      ['job', context.job.initialSnapshot.path],
      ['gateA.job', context.gateA.jobInput.path],
      ['gateA.completionReport', context.gateA.completionReportInput.path],
      ['gateA.evidence', null],
      ['gateA.embeddedReport', null],
      ...context.implementationInputs.map((entry) => [
        `implementation.${entry.role}`,
        entry.path,
      ]),
      ...context.gateA.sourceInputs.map((entry) => [`source.${entry.role}`, entry.path]),
      ...context.widthPolicyInputs.map((entry) => [`width.${entry.role}`, entry.path]),
      ['runtimeObservation', null],
      ['runtimeObservation.nodeBinary', null],
    ];
    const provenanceOk = isDenseArray(provenance.passes)
      && provenance.passes.length === 2
      && provenance.passes.every((pass, index) => exactKeys(pass, [
        'passOrdinal',
        'providedEntries',
        'accessedEntries',
      ])
        && pass.passOrdinal === index + 1
        && isDenseArray(pass.providedEntries)
        && pass.providedEntries.length === 19
        && pass.providedEntries.every((entry, entryIndex) =>
          exactKeys(entry, ['role', 'path'])
          && entry.role === providedExpected[entryIndex]?.[0]
          && entry.path === providedExpected[entryIndex]?.[1])
        && isDenseArray(pass.accessedEntries)
        && pass.accessedEntries.every((entry) => exactKeys(entry, ['role', 'path'])
          && providedExpected.some(([role, path]) => entry.role === role && entry.path === path))
        && new Set(pass.accessedEntries.map((entry) =>
          `${entry.role}\u0000${entry.path ?? ''}`)).size === pass.accessedEntries.length)
      && sameJson(
        provenance.passes[0].providedEntries,
        provenance.passes[1].providedEntries,
      )
      && sameJson(
        provenance.passes[0].accessedEntries,
        provenance.passes[1].accessedEntries,
      );
    if (!validateLeakageShape(value)
      || expected === undefined
      || !sameJson(value, expected)
      || !provenanceOk) {
      addViolation(
        state,
        'sourceOnlyLeakage',
        'MODEL_INPUT_LEAKAGE_DETECTED',
        !provenanceOk ? '$.builds.packageProvenance' : '$.sourceOnlyLeakage',
      );
      leakagePassed = false;
    }
  }

  if (leakagePassed) {
    const [first, second] = context.packageBuildPasses;
    if (first.artifacts.length !== second.artifacts.length
      || first.artifacts.some((artifact, index) =>
        !artifact.bytes.equals(second.artifacts[index].bytes))) {
      addViolation(
        state,
        'determinism',
        'NONDETERMINISTIC',
        '$.builds.packageBuildPasses',
      );
    }
  }

  return {
    jobPassed,
    corePassed: PACKAGE_CHECK_NAMES.every(
      (name) => (state.byCheck.get(name) ?? []).length === 0,
    ),
    internalContextInvalid: false,
  };
};

const compareJobObservation = (initialSnapshot, observation) =>
  sameSnapshotIdentityAndHash(initialSnapshot, observation);
const treeProjectionHash = (entries) => {
  if (!isDenseArray(entries)
    || !entries.every((entry) => exactKeys(entry, ['path', 'kind', 'contentSha256'])
      && isSafeWorkspacePath(entry.path)
      && ['file', 'directory', 'symlink'].includes(entry.kind)
      && (entry.kind === 'directory'
        ? entry.contentSha256 === null
        : isSha256(entry.contentSha256)))) return null;
  const sorted = [...entries].sort((left, right) => compareUtf16(left.path, right.path));
  if (sorted.some((entry, index) => entry.path !== entries[index].path)) return null;
  return canonicalSha(entries);
};
const observationsEquivalent = (initial, final) => {
  if (!isDenseArray(initial) || !isDenseArray(final) || initial.length !== final.length) {
    return false;
  }
  return initial.every((entry, index) => {
    const other = final[index];
    if (!exactKeys(entry, ['role', 'observation'])
      || !exactKeys(other, ['role', 'observation'])
      || entry.role !== other.role) return false;
    if (entry.role === 'nodeBinary') {
      const a = entry.observation;
      const b = other.observation;
      return isPlainObject(a)
        && isPlainObject(b)
        && a.status === 'read'
        && b.status === 'read'
        && a.snapshot?.fileSha256 === b.snapshot?.fileSha256;
    }
    return sameReadObservation(entry.observation, other.observation);
  });
};

const deriveReadOnly = (context, state) => {
  const observation = context.readOnlyProcessObservation;
  if (context.productionMode === 'formal-generation') return;
  if (context.contextPhase !== 'final-report') return;
  let passed = exactKeys(observation, [
    'mode',
    'beforeEntries',
    'afterEntries',
    'inputReread',
    'attemptedWriteCalls',
  ])
    && observation.mode === 'observed'
    && isDenseArray(observation.attemptedWriteCalls);
  if (passed) {
    const beforeHash = treeProjectionHash(observation.beforeEntries);
    const afterHash = treeProjectionHash(observation.afterEntries);
    passed = beforeHash !== null
      && afterHash !== null
      && beforeHash === context.job.value.readOnlyGuard.expectedBeforeCanonicalSha256
      && beforeHash === afterHash
      && observation.attemptedWriteCalls.length === 0
      && isPlainObject(observation.inputReread);
    if (passed && observation.inputReread.status === 'completed') {
      passed = exactKeys(observation.inputReread, [
        'status',
        'initialInputs',
        'finalInputs',
      ])
        && observationsEquivalent(
          observation.inputReread.initialInputs,
          observation.inputReread.finalInputs,
        );
    } else if (passed) {
      passed = observation.inputReread.status === 'not-run-with-upstream-failure'
        && observation.inputReread.initialInputs === null
        && observation.inputReread.finalInputs === null;
    }
  }
  if (!passed) {
    addViolation(state, 'readOnlyPreflight', 'READ_ONLY_CONTRACT_VIOLATED', '$.readOnly');
  }
};

const publicationFailure = (state, path) =>
  addViolation(state, 'publication', 'PUBLICATION_FAILED', path);
const validateObservedArtifactSet = (observation) => {
  if (observation?.status !== 'observed'
    || !isDenseArray(observation.directoryEntries)
    || !isDenseArray(observation.artifactReads)
    || observation.artifactReads.length !== PACKAGE_FILES.length) return false;
  const entries = observation.directoryEntries;
  if (entries.length !== PACKAGE_FILES.length
    || entries.some((entry, index) =>
      !exactKeys(entry, ['name', 'kind'])
      || entry.name !== PACKAGE_FILES[index]
      || entry.kind !== 'file')) return false;
  return observation.artifactReads.every((read, index) =>
    exactKeys(read, ['fileName', 'status', 'snapshot', 'observedKind', 'failurePoint'])
    && read.fileName === PACKAGE_FILES[index]
    && read.status === 'read'
    && read.observedKind === 'regular-file'
    && read.failurePoint === null
    && validateStableSnapshot(read.snapshot));
};

const derivePublication = (context, state) => {
  if (context.productionMode !== 'formal-generation') return;
  const observation = context.publicationProcessObservation;
  if (!isPlainObject(observation) || observation.mode !== 'formal') {
    if (context.contextPhase === 'final-report') {
      publicationFailure(state, '$.publication');
    }
    return;
  }
  const initial = observation.initialPaths;
  if (initial?.status === 'io-error') publicationFailure(state, '$.publication.initialPaths.failurePoint');
  if (initial?.status === 'observed' && Array.isArray(initial.entries)
    && initial.entries.some((entry) => entry?.state === 'present')) {
    addViolation(
      state,
      'publication',
      'OUTPUT_ROOT_ALREADY_EXISTS',
      '$.job.value.publication.formalOutputPath',
    );
  }
  const lock = observation.lock;
  if (['create-exists', 'post-create-identity-invalid', 'identity-mismatch'].includes(lock?.state)) {
    addViolation(state, 'publication', 'PUBLICATION_LOCK_UNAVAILABLE', '$.publication.lock');
  }
  if (lock?.state === 'pre-rename-identity-mismatch') {
    addViolation(
      state,
      'publication',
      'PUBLICATION_LOCK_UNAVAILABLE',
      '$.publication.preRename.lockIdentity',
    );
  }
  if ([
    'create-io-error',
    'post-create-stat-io-error',
    'pre-release-stat-io-error',
    'release-io-error',
  ].includes(lock?.state)) publicationFailure(state, '$.publication.lock.failurePoint');
  if (observation.staging?.status === 'io-error') {
    publicationFailure(state, '$.publication.staging.failurePoint');
  } else if (observation.staging?.status === 'observed'
    && !validateObservedArtifactSet(observation.staging)) {
    addViolation(state, 'publication', 'PUBLICATION_STAGING_INVALID', '$.publication.staging');
  }
  if (observation.inputRecheck?.status === 'io-error') {
    publicationFailure(state, '$.publication.inputRecheck.failurePoint');
  } else if (observation.inputRecheck?.status === 'observed') {
    const inputs = observation.inputRecheck.observations;
    const reread = context.readOnlyProcessObservation?.inputReread;
    const initialInputs = reread?.status === 'completed' ? reread.initialInputs : null;
    if (!isDenseArray(inputs)
      || !isDenseArray(initialInputs)
      || !observationsEquivalent(initialInputs, inputs)) {
      addViolation(
        state,
        'publication',
        'PUBLICATION_INPUT_CHANGED',
        '$.publication.inputRecheck.observations',
      );
    }
  }
  const preRename = observation.preRename;
  if (preRename?.state === 'io-error') {
    publicationFailure(state, '$.publication.preRename.failurePoint');
  } else if (preRename?.state === 'lock-observed') {
    addViolation(
      state,
      'publication',
      'PUBLICATION_LOCK_UNAVAILABLE',
      '$.publication.preRename.lockIdentity',
    );
  } else if (preRename?.state === 'root-observed') {
    addViolation(
      state,
      'publication',
      'PUBLICATION_PRE_RENAME_INVALID',
      '$.publication.preRename.formalRoot',
    );
  } else if (preRename?.state === 'parents-observed') {
    if (preRename.sourceParentIdentity?.kind !== 'directory') {
      addViolation(
        state,
        'publication',
        'PUBLICATION_PRE_RENAME_INVALID',
        '$.publication.preRename.sourceParentIdentity',
      );
    }
    if (preRename.targetParentIdentity?.kind !== 'directory'
      || preRename.sourceParentIdentity?.dev !== preRename.targetParentIdentity?.dev) {
      addViolation(
        state,
        'publication',
        'PUBLICATION_PRE_RENAME_INVALID',
        '$.publication.preRename.targetParentIdentity',
      );
    }
  }
  if (observation.rename?.status === 'io-error') {
    publicationFailure(state, '$.publication.rename.failurePoint');
  }
  const durability = observation.parentDirectoryDurability;
  if (isPlainObject(durability)) {
    for (const operation of ['open', 'sync', 'stat', 'close']) {
      if (durability[operation]?.status === 'io-error') {
        publicationFailure(
          state,
          `$.publication.parentDirectoryDurability.${operation}.failurePoint`,
        );
      }
    }
  }
  if (observation.published?.status === 'io-error') {
    publicationFailure(state, '$.publication.published.failurePoint');
  } else if (observation.published?.status === 'observed'
    && !validateObservedArtifactSet(observation.published)) {
    addViolation(state, 'publishedPackage', 'PUBLISHED_PACKAGE_INVALID', '$.publishedPackage');
  }
};

const rowsFor = ({
  names,
  state,
  executedCount,
  intermediate,
  independentNames = new Set(),
}) => {
  let upstreamFailed = false;
  return names.map((name, index) => {
    if (index >= executedCount) {
      return {name, status: 'not_evaluated_in_phase', violationCodes: []};
    }
    const codes = distinctCodes(state.byCheck.get(name) ?? []);
    const independent = independentNames.has(name);
    if (upstreamFailed && !independent) {
      return {name, status: 'not_run_with_upstream_failure', violationCodes: []};
    }
    if (codes.length > 0) {
      upstreamFailed = true;
      return {name, status: 'failed', violationCodes: codes};
    }
    return {name, status: 'passed', violationCodes: []};
  });
};

export function checkPresentationCaptionSemanticSourcePackageV001(context) {
  try {
    if (!validateCheckerOuterContext(context)) return {status: 'context-invalid'};
    const state = {violations: [], records: [], byCheck: new Map()};
    const core = deriveCoreChecks(context, state);
    if (core.internalContextInvalid) return {status: 'context-invalid'};
    deriveReadOnly(context, state);
    derivePublication(context, state);
    if (context.productionMode === 'formal-generation'
      && context.job.prePublicationInput !== null
      && !compareJobObservation(context.job.initialSnapshot, context.job.prePublicationInput)) {
      addViolation(
        state,
        'jobPrePublication',
        'JOB_FILE_MISMATCH',
        '$.job.prePublicationInput',
      );
    }
    if (context.contextPhase === 'final-report'
      && !compareJobObservation(context.job.initialSnapshot, context.job.preReportInput)) {
      addViolation(state, 'jobStability', 'JOB_FILE_MISMATCH', '$.job.preReportInput');
    }

    let names = PACKAGE_CHECK_NAMES;
    let executedCount = phasePrefixLength(context.contextPhase);
    let intermediate = executedCount !== null;
    const independent = new Set();
    if (context.contextPhase === 'final-report') {
      names = context.productionMode === 'formal-generation'
        ? FORMAL_CHECK_NAMES
        : PREFLIGHT_CHECK_NAMES;
      executedCount = names.length;
      intermediate = false;
      independent.add('jobStability');
      if (context.productionMode === 'read-only-preflight') independent.add('readOnlyPreflight');
    } else if (context.contextPhase.startsWith('publication-')) {
      names = FORMAL_CHECK_NAMES;
      intermediate = true;
      const publicationIndex = names.indexOf('publication');
      const publishedIndex = names.indexOf('publishedPackage');
      if (context.contextPhase === 'publication-gate') {
        executedCount = names.indexOf('jobPrePublication') + 1;
      } else {
        executedCount = publicationIndex + 1;
      }
      if ((state.byCheck.get('publication') ?? []).length === 0
        && context.contextPhase !== 'publication-gate') {
        executedCount = publicationIndex;
      }
      if (context.contextPhase === 'publication-pre-rename-gate'
        && (state.byCheck.get('publication') ?? []).length > 0) {
        executedCount = publishedIndex;
      }
    }
    if (executedCount === null) return {status: 'context-invalid'};
    const checks = rowsFor({
      names,
      state,
      executedCount,
      intermediate,
      independentNames: independent,
    });
    const executedNames = new Set(
      checks.filter((entry) => entry.status === 'failed').map((entry) => entry.name),
    );
    const violations = uniqueViolations(
      state.records
        .filter((record) => executedNames.has(record.check))
        .map((record) => record.violation),
    );
    return {
      status: 'checked',
      checks,
      violations,
    };
  } catch {
    return {status: 'context-invalid'};
  }
}

const validateCheckRows = (checks, names) => isDenseArray(checks)
  && checks.length === names.length
  && checks.every((entry, index) => exactKeys(entry, [
    'name',
    'status',
    'violationCodes',
  ])
    && entry.name === names[index]
    && ['passed', 'failed', 'not_run_with_upstream_failure'].includes(entry.status)
    && isDenseArray(entry.violationCodes)
    && entry.violationCodes.every((code) =>
      PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001.includes(code)));
const validateViolationRows = (violations) => isDenseArray(violations)
  && violations.every((entry) => exactKeys(entry, ['code', 'path', 'details'])
    && PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001.includes(entry.code)
    && /^\$(?:\.[A-Za-z][A-Za-z0-9]*|\[[0-9]+\])*$/u.test(entry.path)
    && exactKeys(entry.details, []));

const allCoreRowsPassed = (checked) => PACKAGE_CHECK_NAMES.every(
  (name) => checked.checks.find((entry) => entry.name === name)?.status === 'passed',
);
const projectedArtifactHashes = (observation) => {
  if (!validateObservedArtifactSet(observation)) return null;
  const projection = [];
  for (const read of observation.artifactReads) {
    const decoded = decodePresentationCaptionB1StrictJsonV001(read.snapshot.bytes);
    if (decoded.status !== 'decoded') return null;
    projection.push({
      fileName: read.fileName,
      fileSha256: read.snapshot.fileSha256,
      canonicalSha256: canonicalSha(decoded.value),
    });
  }
  return projection;
};
const readSubjectPath = (context, path) => {
  if (!path.startsWith('$.publication.')) return null;
  const tokens = path.slice('$.publication.'.length).match(/[A-Za-z][A-Za-z0-9]*|[0-9]+/gu);
  let value = context.publicationProcessObservation;
  for (const token of tokens ?? []) {
    value = value?.[CANONICAL_UNSIGNED_DECIMAL_PATTERN.test(token) ? Number(token) : token];
  }
  return value ?? null;
};
const expectedRunReport = (checkerContext, checked) => {
  const job = checkerContext.job;
  const firstFailed = checked.checks.find((entry) => entry.status === 'failed');
  const status = firstFailed === undefined ? 'passed' : 'failed';
  const baseCandidate = {
    packageId: job.value.publication.packageId,
    formalOutputPath: job.value.publication.formalOutputPath,
    manifestFileSha256: null,
    validationReportFileSha256: null,
    contentSetCanonicalSha256: null,
  };
  let candidatePackage = baseCandidate;
  if (allCoreRowsPassed(checked)) {
    const manifest = packageArtifact(checkerContext.packageBuildPasses, PACKAGE_FILES[5]);
    const report = packageArtifact(checkerContext.packageBuildPasses, PACKAGE_FILES[6]);
    if (manifest && report) {
      candidatePackage = {
        packageId: baseCandidate.packageId,
        formalOutputPath: baseCandidate.formalOutputPath,
        manifestFileSha256: manifest.fileSha256,
        validationReportFileSha256: report.fileSha256,
        contentSetCanonicalSha256: manifest.value.contentSetCanonicalSha256,
      };
    }
  }
  let readOnlyObservation = null;
  let publicationObservation = null;
  let publicationFailures = [];
  if (checkerContext.productionMode === 'read-only-preflight') {
    const observation = checkerContext.readOnlyProcessObservation;
    const beforeCanonicalSha256 = treeProjectionHash(observation.beforeEntries);
    const afterCanonicalSha256 = treeProjectionHash(observation.afterEntries);
    const completed = observation.inputReread?.status === 'completed';
    readOnlyObservation = {
      status: completed ? 'verified' : 'not-run-with-upstream-failure',
      beforeCanonicalSha256,
      afterCanonicalSha256,
      unchanged: completed
        ? checked.checks.find((entry) => entry.name === 'readOnlyPreflight')?.status === 'passed'
        : null,
    };
  } else {
    const publication = checkerContext.publicationProcessObservation;
    const publishedProjection = projectedArtifactHashes(publication.published);
    if (publishedProjection !== null
      && checked.checks.find((entry) => entry.name === 'publishedPackage')?.status === 'passed') {
      publicationObservation = {
        state: 'published_validated',
        publishedRoot: job.value.publication.formalOutputPath,
        manifestFileSha256: publishedProjection[5].fileSha256,
        validationReportFileSha256: publishedProjection[6].fileSha256,
        observedFileSetCanonicalSha256: canonicalSha(publishedProjection),
      };
    } else {
      const stagingProjection = projectedArtifactHashes(publication.staging);
      const stagingInvalid = checked.violations.some((violation) =>
        ['PUBLICATION_STAGING_INVALID', 'PUBLICATION_INPUT_CHANGED'].includes(violation.code)
        || (violation.code === 'PUBLICATION_FAILED'
          && (violation.path.startsWith('$.publication.staging')
            || violation.path.startsWith('$.publication.inputRecheck'))));
      publicationObservation = stagingProjection !== null
        && publication.inputRecheck?.status === 'observed'
        && !stagingInvalid
        ? {
          state: 'staging_validated',
          publishedRoot: job.value.publication.formalOutputPath,
          manifestFileSha256: stagingProjection[5].fileSha256,
          validationReportFileSha256: stagingProjection[6].fileSha256,
          observedFileSetCanonicalSha256: null,
        }
        : {
          state: 'not_started',
          publishedRoot: job.value.publication.formalOutputPath,
          manifestFileSha256: null,
          validationReportFileSha256: null,
          observedFileSetCanonicalSha256: null,
        };
    }
    publicationFailures = checked.violations
      .filter((violation) => violation.code === 'PUBLICATION_FAILED')
      .map((violation) => ({
        path: violation.path,
        failurePoint: readSubjectPath(checkerContext, violation.path),
      }));
  }
  return {
    schemaVersion: RUN_REPORT_SCHEMA_VERSION,
    mode: checkerContext.productionMode,
    status,
    failureStage: firstFailed?.name ?? null,
    jobBinding: {
      path: job.initialSnapshot.path,
      fileSha256: job.initialSnapshot.fileSha256,
    },
    candidatePackage,
    checks: checked.checks,
    violations: checked.violations,
    readOnlyObservation,
    publicationObservation,
    publicationFailures,
    scope: {
      validatedState: checkerContext.productionMode === 'read-only-preflight'
        ? 'read-only-candidate-package'
        : 'published-source-package',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      nonCooperativePublicationRaceProtected: false,
    },
  };
};

export function validatePresentationCaptionSemanticSourcePackageRunReportV001(context) {
  try {
    if (!exactKeys(context, [
      'report',
      'reportBytes',
      'expectedExitCode',
      'checkerContext',
    ])
      || !Buffer.isBuffer(context.reportBytes)
      || ![0, 1].includes(context.expectedExitCode)
      || context.checkerContext?.contextPhase !== 'final-report') {
      return {valid: false};
    }
    const decoded = decodePresentationCaptionB1StrictJsonV001(context.reportBytes);
    const serialized = serializePresentationCaptionB1FormalJsonV001(context.report);
    if (decoded.status !== 'decoded'
      || serialized.status !== 'serialized'
      || !decoded.value
      || !sameJson(decoded.value, context.report)
      || !serialized.bytes.equals(context.reportBytes)) return {valid: false};
    const checked = checkPresentationCaptionSemanticSourcePackageV001(context.checkerContext);
    if (checked.status !== 'checked') return {valid: false};
    const names = context.checkerContext.productionMode === 'formal-generation'
      ? FORMAL_CHECK_NAMES
      : PREFLIGHT_CHECK_NAMES;
    const firstFailed = checked.checks.find((entry) => entry.status === 'failed');
    const expectedStatus = firstFailed === undefined ? 'passed' : 'failed';
    if (!exactKeys(context.report, [
      'schemaVersion',
      'mode',
      'status',
      'failureStage',
      'jobBinding',
      'candidatePackage',
      'checks',
      'violations',
      'readOnlyObservation',
      'publicationObservation',
      'publicationFailures',
      'scope',
    ])
      || context.report.schemaVersion !== RUN_REPORT_SCHEMA_VERSION
      || context.report.mode !== context.checkerContext.productionMode
      || !['passed', 'failed'].includes(context.report.status)
      || !validateCheckRows(context.report.checks, names)
      || !validateViolationRows(context.report.violations)
      || !sameJson(context.report.checks, checked.checks)
      || !sameJson(context.report.violations, checked.violations)
      || context.report.status !== expectedStatus
      || context.report.failureStage !== (firstFailed?.name ?? null)
      || context.expectedExitCode !== (expectedStatus === 'passed' ? 0 : 1)) {
      return {valid: false};
    }
    const job = context.checkerContext.job;
    if (!exactKeys(context.report.jobBinding, ['path', 'fileSha256'])
      || context.report.jobBinding.path !== job.initialSnapshot.path
      || context.report.jobBinding.fileSha256 !== job.initialSnapshot.fileSha256
      || !exactKeys(context.report.candidatePackage, [
        'packageId',
        'formalOutputPath',
        'manifestFileSha256',
        'validationReportFileSha256',
        'contentSetCanonicalSha256',
      ])
      || context.report.candidatePackage.packageId !== job.value.publication.packageId
      || context.report.candidatePackage.formalOutputPath
        !== job.value.publication.formalOutputPath
      || !isDenseArray(context.report.publicationFailures)
      || !isPlainObject(context.report.scope)) {
      return {valid: false};
    }
    if (context.checkerContext.productionMode === 'read-only-preflight') {
      if (context.report.publicationObservation !== null
        || context.report.publicationFailures.length !== 0
        || !exactKeys(context.report.readOnlyObservation, [
          'status',
          'beforeCanonicalSha256',
          'afterCanonicalSha256',
          'unchanged',
        ])) return {valid: false};
    } else if (context.report.readOnlyObservation !== null
      || !isPlainObject(context.report.publicationObservation)) {
      return {valid: false};
    }
    const expected = expectedRunReport(context.checkerContext, checked);
    if (!sameJson(context.report, expected)) return {valid: false};
    return {valid: true};
  } catch {
    return {valid: false};
  }
}

import {
  PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001,
  assertPresentationCaptionB1StrictValueV001,
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const JOB_SCHEMA = 'presentation-caption-semantic-output-check-job-v001';
const REPORT_SCHEMA = 'presentation-caption-semantic-output-validation-report-v001';
const COMPILER_SCHEMA = 'presentation-caption-semantic-compiler-input-v001';
const EVIDENCE_SCHEMA = 'presentation-segmenter-boundary-evidence-v001';
const SOURCE_INPUT_SCHEMA = 'presentation-caption-semantic-source-input-v001';
const EXPANSION_MAP_SCHEMA = 'presentation-caption-semantic-expansion-map-v001';
const LEAKAGE_REPORT_SCHEMA = 'presentation-caption-source-only-leakage-report-v001';
const PACKAGE_MANIFEST_SCHEMA =
  'presentation-caption-semantic-source-package-manifest-v001';
const PACKAGE_REPORT_SCHEMA =
  'presentation-caption-semantic-source-package-validation-report-v001';
const GATE_A_REPORT_SCHEMA =
  'presentation-segmenter-boundary-preflight-report-v001';
const GATE_A_CHECK_REPORT_SCHEMA =
  'presentation-segmenter-boundary-check-report-v001';

const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/';
const PACKAGE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/';
const RAW_OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/';
const WATCHED_ROOT = 'evals/clip_composition/outputs/presentation';

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
const EXTERNAL_INPUT_ROLES = Object.freeze([
  'sourceAtoms',
  'sourceGenerationManifest',
  'sourceValidationReport',
  'presetRegistry',
  'presetValidationIndex',
  'materialValidationIndex',
  'registryBinding',
  'rendererTrust',
  'textLayoutImplementation',
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
const LEAKAGE_CHECK_NAMES = Object.freeze([
  'schemaAllowlist',
  'taskDescriptionBinding',
  'sourceProjection',
  'widthPolicyBinding',
  'forbiddenProvenanceAbsence',
]);
const GATE_A_CHECK_NAMES = Object.freeze([
  'jobBinding',
  'implementationBinding',
  'inputBinding',
  'runtimeBinding',
  'sourceContract',
  'segmentation',
  'coverage',
  'expectedProjection',
  'determinism',
  'readOnlyPreflight',
]);
const GATE_A_INPUT_ROLES = Object.freeze([
  'sourceAtoms',
  'sourceGenerationManifest',
  'sourceValidationReport',
]);
const TASK_DESCRIPTION =
  '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。';
const DIRECT_ROLES = Object.freeze(['packageCore', 'semanticCore', 'semanticRunner']);
const DIRECT_PATHS = Object.freeze([
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
  'evals/clip_composition/presentation_caption_semantic_output_v001.mjs',
  'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs',
]);
const DEPENDENCY_ROLES = Object.freeze([
  'textLayoutImplementation',
  'gateACore',
  'gateARetainedSourceAtomsCore',
  'gateARunner',
]);
const DEPENDENCY_PATHS = Object.freeze([
  'evals/clip_composition/presentation_renderer_text_layout_v001.mjs',
  'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
  'evals/clip_composition/presentation_retained_source_atoms_v001.mjs',
  'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
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

const CODE_INDEX = new Map(
  PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001.map((code, index) => [code, index]),
);
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/).+$/;
const CONTAINER_ID = /^segmenter-container-[0-9]{6,}$/;
const CANDIDATE_ID = /^segmenter-boundary-[0-9]{6,}$/;

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value);
const isString = (value) => typeof value === 'string';
const isNonEmptyString = (value) => isString(value) && value.length > 0;
const isSafeInteger = (value) => Number.isSafeInteger(value);
const isCount = (value) => isSafeInteger(value) && value >= 0;
const isOrdinal = (value) => isSafeInteger(value) && value >= 1;
const exactKeys = (value, keys) => isObject(value)
  && Object.keys(value).length === keys.length
  && Object.keys(value).every((key, index) => key === keys[index]);
const sameArray = (left, right) => Array.isArray(left)
  && Array.isArray(right)
  && left.length === right.length
  && left.every((value, index) => value === right[index]);
const compareUtf16 = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
const exactCanonicalKeys = (value, keys) =>
  exactKeys(value, [...keys].sort(compareUtf16));
const safePath = (value) => isNonEmptyString(value)
  && SAFE_PATH.test(value)
  && !value.startsWith('./')
  && !value.includes('\0');
const directChild = (value, root, suffix = '') => safePath(value)
  && value.startsWith(root)
  && value.slice(root.length).length > 0
  && !value.slice(root.length).includes('/')
  && (suffix.length === 0 || value.endsWith(suffix));
const strictValue = (value) =>
  assertPresentationCaptionB1StrictValueV001(value)?.status === 'valid';
const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  return result?.status === 'serialized' && Buffer.isBuffer(result.bytes)
    ? result.bytes
    : null;
};
const canonicalBytes = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  return result?.status === 'canonicalized' && Buffer.isBuffer(result.bytes)
    ? result.bytes
    : null;
};
const shaBytes = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  return result?.status === 'hashed' ? result.sha256 : null;
};
const canonicalSha = (value) => {
  const bytes = canonicalBytes(value);
  return bytes ? shaBytes(bytes) : null;
};
const sameJson = (left, right) => {
  const leftBytes = canonicalBytes(left);
  const rightBytes = canonicalBytes(right);
  return Buffer.isBuffer(leftBytes)
    && Buffer.isBuffer(rightBytes)
    && leftBytes.equals(rightBytes);
};

const stableSnapshotSafe = (snapshot, expectedPath) => {
  if (!isObject(snapshot)
    || snapshot.path !== expectedPath
    || !Buffer.isBuffer(snapshot.bytes)
    || snapshot.fileSha256 !== shaBytes(snapshot.bytes)
    || !isObject(snapshot.pathLstatBeforeOpen)
    || !isObject(snapshot.fdStatAfterOpen)
    || !isObject(snapshot.fdStatAfterRead)
    || !sameJson(snapshot.pathLstatBeforeOpen, snapshot.fdStatAfterOpen)
    || !sameJson(snapshot.pathLstatBeforeOpen, snapshot.fdStatAfterRead)
    || snapshot.pathLstatBeforeOpen.kind !== 'regular-file'
    || snapshot.pathLstatBeforeOpen.nlink !== '1'
    || !isObject(snapshot.pathResolutionObservation)
    || snapshot.pathResolutionObservation.lexicalWorkspaceRelativePath !== expectedPath
    || !Array.isArray(snapshot.pathResolutionObservation.ancestors)
    || snapshot.pathResolutionObservation.ancestors.some((ancestor) =>
      !isObject(ancestor)
      || ancestor.lstatKind !== 'directory'
      || !isString(ancestor.workspaceRelativePath)
      || !isNonEmptyString(ancestor.realPath))) {
    return false;
  }
  const root = snapshot.pathResolutionObservation.workspaceRootRealPath;
  const target = snapshot.pathResolutionObservation.targetRealPath;
  return isNonEmptyString(root)
    && isNonEmptyString(target)
    && target === `${root}/${expectedPath}`;
};

const observationSafe = (observation, binding) =>
  observation?.role === binding.role
  && observation.path === binding.path
  && observation.status === 'read'
  && stableSnapshotSafe(observation.snapshot, binding.path)
  && observation.snapshot.fileSha256 === binding.fileSha256;

const externalSnapshotSafe = (input) => {
  const snapshot = input?.snapshot;
  if (input?.role !== 'nodeBinary'
    || input.status !== 'read'
    || !isObject(snapshot)
    || !Buffer.isBuffer(snapshot.bytes)
    || snapshot.fileSha256 !== shaBytes(snapshot.bytes)
    || !sameJson(snapshot.pathLstatBeforeOpen, snapshot.fdStatAfterOpen)
    || !sameJson(snapshot.pathLstatBeforeOpen, snapshot.fdStatAfterRead)
    || snapshot.pathLstatBeforeOpen?.kind !== 'regular-file'
    || snapshot.pathLstatBeforeOpen?.nlink !== '1'
    || !isObject(snapshot.externalPathResolutionObservation)
    || snapshot.externalPathResolutionObservation.targetRealPath !== snapshot.path
    || !Array.isArray(snapshot.externalPathResolutionObservation.ancestors)
    || snapshot.externalPathResolutionObservation.ancestors.some((ancestor) =>
      !isObject(ancestor)
      || ancestor.lstatKind !== 'directory'
      || !isNonEmptyString(ancestor.absolutePath)
      || !isNonEmptyString(ancestor.realPath))) {
    return false;
  }
  return isNonEmptyString(
    snapshot.externalPathResolutionObservation.inputAbsolutePath,
  );
};

const IMPORT_SPECIFIER_PATTERN =
  /(?:^|\n)\s*import(?:\s+[\s\S]*?\s+from\s+|\s*)['"]([^'"]+)['"]\s*;?/g;
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
const executableJavaScriptTokens = (source) => {
  const tokens = [];
  const modes = [{type: 'code', templateExpression: false, braceDepth: 0}];
  let line = 1;
  const advanceLine = (character) => {
    if (character === '\n') line += 1;
  };
  for (let index = 0; index < source.length;) {
    const mode = modes[modes.length - 1];
    const character = source[index];
    const next = source[index + 1];
    if (mode.type === 'template') {
      if (character === '\\') {
        advanceLine(character);
        if (index + 1 < source.length) advanceLine(source[index + 1]);
        index += 2;
        continue;
      }
      if (character === '`') {
        modes.pop();
        index += 1;
        continue;
      }
      if (character === '$' && next === '{') {
        modes.push({type: 'code', templateExpression: true, braceDepth: 0});
        index += 2;
        continue;
      }
      advanceLine(character);
      index += 1;
      continue;
    }
    if (mode.templateExpression && character === '}' && mode.braceDepth === 0) {
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
      while (index < source.length) {
        if (source[index] === '*' && source[index + 1] === '/') {
          index += 2;
          break;
        }
        advanceLine(source[index]);
        index += 1;
      }
      continue;
    }
    if (character === '\'' || character === '"') {
      const quote = character;
      index += 1;
      while (index < source.length) {
        const quoted = source[index];
        if (quoted === '\\') {
          advanceLine(quoted);
          if (index + 1 < source.length) advanceLine(source[index + 1]);
          index += 2;
          continue;
        }
        advanceLine(quoted);
        index += 1;
        if (quoted === quote) break;
      }
      continue;
    }
    if (character === '`') {
      modes.push({type: 'template'});
      index += 1;
      continue;
    }
    if (/[A-Za-z_$]/u.test(character)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_$]/u.test(source[end])) end += 1;
      tokens.push({value: source.slice(index, end), line});
      index = end;
      continue;
    }
    if (character === '=' && next === '>') {
      tokens.push({value: '=>', line});
      index += 2;
      continue;
    }
    tokens.push({value: character, line});
    if (mode.templateExpression) {
      if (character === '{') mode.braceDepth += 1;
      if (character === '}') mode.braceDepth = Math.max(0, mode.braceDepth - 1);
    }
    index += 1;
  }
  return tokens;
};
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
const hasTopLevelFileIoCall = (bytes) => {
  const source = bytes.toString('utf8');
  const tokens = executableJavaScriptTokens(source);
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
const importSpecifiers = (bytes) => {
  const source = bytes.toString('utf8');
  const values = [];
  let match;
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(source)) !== null) values.push(match[1]);
  return {
    values,
    hasDynamicImport: /\bimport\s*\(/u.test(source),
    hasRequire: /\brequire\s*\(/u.test(source),
    hasModuleLoadFileIo: hasTopLevelFileIoCall(bytes),
  };
};

const validateSemanticImportGraph = (implementationInputs) => {
  if (!Array.isArray(implementationInputs) || implementationInputs.length !== 7) return false;
  const roles = [...DIRECT_ROLES, ...DEPENDENCY_ROLES];
  const observations = new Map(
    implementationInputs.map((observation) => [observation.role, observation]),
  );
  const allowedBuiltins = new Map([
    ['packageCore', new Set(['node:crypto'])],
    ['semanticCore', new Set()],
    ['semanticRunner', new Set([
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
      'node:process',
    ])],
    ['textLayoutImplementation', new Set()],
    ['gateACore', new Set(['node:crypto', 'node:path', 'node:url'])],
    ['gateARetainedSourceAtomsCore', new Set(['node:crypto'])],
    ['gateARunner', new Set([
      'node:crypto',
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:url',
    ])],
  ]);
  const allowedLocal = new Map([
    ['packageCore', new Set([
      './presentation_renderer_text_layout_v001.mjs',
      './presentation_segmenter_boundary_evidence_v001.mjs',
      './run_presentation_segmenter_boundary_preflight_v001.mjs',
    ])],
    ['semanticCore', new Set(['./presentation_caption_semantic_source_package_v001.mjs'])],
    ['semanticRunner', new Set([
      './presentation_caption_semantic_source_package_v001.mjs',
      './presentation_caption_semantic_output_v001.mjs',
    ])],
    ['textLayoutImplementation', new Set()],
    ['gateACore', new Set(['./presentation_retained_source_atoms_v001.mjs'])],
    ['gateARetainedSourceAtomsCore', new Set()],
    ['gateARunner', new Set(['./presentation_segmenter_boundary_evidence_v001.mjs'])],
  ]);
  for (const role of roles) {
    const observation = observations.get(role);
    if (observation?.status !== 'read' || !Buffer.isBuffer(observation.snapshot?.bytes)) {
      return false;
    }
    const imports = importSpecifiers(observation.snapshot.bytes);
    if (imports.hasDynamicImport || imports.hasRequire || imports.hasModuleLoadFileIo) {
      return false;
    }
    const builtins = imports.values.filter((specifier) => specifier.startsWith('node:'));
    const locals = imports.values.filter((specifier) => !specifier.startsWith('node:'));
    if (builtins.some((specifier) => !allowedBuiltins.get(role).has(specifier))) return false;
    if (locals.some((specifier) => !allowedLocal.get(role).has(specifier))) return false;
    if (new Set(builtins).size !== builtins.length
      || new Set(locals).size !== locals.length
      || builtins.length !== allowedBuiltins.get(role).size
      || locals.length !== allowedLocal.get(role).size) {
      return false;
    }
  }
  return true;
};

const makeViolation = (code, path) => ({code, path, details: {}});
const addViolation = (state, code, path) => {
  if (!CODE_INDEX.has(code)) throw new TypeError('unknown B1 violation code');
  const key = `${code}\0${path}`;
  if (state.keys.has(key)) return;
  state.keys.add(key);
  state.violations.push(makeViolation(code, path));
};
const sortedViolations = (violations) => [...violations].sort((left, right) => {
  const codeDelta = CODE_INDEX.get(left.code) - CODE_INDEX.get(right.code);
  return codeDelta || compareUtf16(left.path, right.path);
});

const orderedPaths = (paths) => [...new Set(paths)].sort(compareUtf16);
const note = (paths, path) => paths.push(path);
const validateBindingFile = (value, path, paths, expectedRole, expectedPath = null) => {
  if (!exactKeys(value, ['role', 'path', 'fileSha256'])) {
    note(paths, path);
    return;
  }
  if (value.role !== expectedRole) note(paths, `${path}.role`);
  if (!safePath(value.path) || (expectedPath !== null && value.path !== expectedPath)) {
    note(paths, `${path}.path`);
  }
  if (!SHA256.test(value.fileSha256 ?? '')) note(paths, `${path}.fileSha256`);
};
const validateHashBinding = (value, path, paths) => {
  if (!exactKeys(value, ['path', 'fileSha256', 'canonicalSha256'])) {
    note(paths, path);
    return;
  }
  if (!safePath(value.path)) note(paths, `${path}.path`);
  if (!SHA256.test(value.fileSha256 ?? '')) note(paths, `${path}.fileSha256`);
  if (!SHA256.test(value.canonicalSha256 ?? '')) note(paths, `${path}.canonicalSha256`);
};
const validateExpectedRuntime = (value, path, paths) => {
  if (!exactKeys(value, [
    'nodeBinarySha256',
    'nodeVersion',
    'icuVersion',
    'resolvedLocale',
    'resolvedGranularity',
  ])) {
    note(paths, path);
    return;
  }
  if (!SHA256.test(value.nodeBinarySha256 ?? '')) note(paths, `${path}.nodeBinarySha256`);
  if (!isNonEmptyString(value.nodeVersion)) note(paths, `${path}.nodeVersion`);
  if (!isNonEmptyString(value.icuVersion)) note(paths, `${path}.icuVersion`);
  if (value.resolvedLocale !== 'ja') note(paths, `${path}.resolvedLocale`);
  if (value.resolvedGranularity !== 'word') note(paths, `${path}.resolvedGranularity`);
};

const validateSemanticOutputCheckJobInternal = (value) => {
  const paths = [];
  const rootKeys = [
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
  ];
  if (!isObject(value)) {
    return {status: 'invalid', paths: ['$']};
  }
  const actualRootKeys = Object.keys(value);
  const missingRootKeys = rootKeys.filter((key) => !hasOwn(value, key));
  const unknownRootKeys = actualRootKeys.filter((key) => !rootKeys.includes(key));
  missingRootKeys.forEach((key) => note(paths, `$.${key}`));
  unknownRootKeys.forEach((key) => note(paths, `$.${key}`));
  if (missingRootKeys.length === 0
    && unknownRootKeys.length === 0
    && !sameArray(actualRootKeys, rootKeys)) {
    note(paths, '$');
  }
  if (value.schemaVersion !== JOB_SCHEMA) note(paths, '$.schemaVersion');
  if (!ID.test(value.jobId ?? '')) note(paths, '$.jobId');
  if (!ID.test(value.artifactId ?? '')) note(paths, '$.artifactId');
  if (value.mode !== 'read-only-check') note(paths, '$.mode');

  const implementation = value.implementationBinding;
  if (!exactKeys(implementation, ['gitCommit', 'files', 'dependencyFiles'])) {
    note(paths, '$.implementationBinding');
  } else {
    if (!COMMIT.test(implementation.gitCommit ?? '')) {
      note(paths, '$.implementationBinding.gitCommit');
    }
    if (!Array.isArray(implementation.files)
      || implementation.files.length !== DIRECT_ROLES.length) {
      note(paths, '$.implementationBinding.files');
    } else {
      implementation.files.forEach((entry, index) => validateBindingFile(
        entry,
        `$.implementationBinding.files[${index}]`,
        paths,
        DIRECT_ROLES[index],
        DIRECT_PATHS[index],
      ));
    }
    if (!Array.isArray(implementation.dependencyFiles)
      || implementation.dependencyFiles.length !== DEPENDENCY_ROLES.length) {
      note(paths, '$.implementationBinding.dependencyFiles');
    } else {
      implementation.dependencyFiles.forEach((entry, index) => validateBindingFile(
        entry,
        `$.implementationBinding.dependencyFiles[${index}]`,
        paths,
        DEPENDENCY_ROLES[index],
        DEPENDENCY_PATHS[index],
      ));
    }
  }

  const source = value.sourcePackageBinding;
  if (!exactKeys(source, ['rootPath', 'manifest', 'validationReport'])) {
    note(paths, '$.sourcePackageBinding');
  } else {
    const rootOk = safePath(source.rootPath)
      && source.rootPath.startsWith(PACKAGE_ROOT)
      && source.rootPath.slice(PACKAGE_ROOT.length).length > 0
      && !source.rootPath.slice(PACKAGE_ROOT.length).includes('/');
    if (!rootOk) note(paths, '$.sourcePackageBinding.rootPath');
    validateHashBinding(source.manifest, '$.sourcePackageBinding.manifest', paths);
    validateHashBinding(
      source.validationReport,
      '$.sourcePackageBinding.validationReport',
      paths,
    );
    if (rootOk) {
      if (source.manifest?.path !== `${source.rootPath}/package-manifest.json`) {
        note(paths, '$.sourcePackageBinding.manifest.path');
      }
      if (source.validationReport?.path
        !== `${source.rootPath}/package-validation-report.json`) {
        note(paths, '$.sourcePackageBinding.validationReport.path');
      }
    }
  }

  if (!exactKeys(value.semanticOutputBinding, ['path', 'fileSha256'])) {
    note(paths, '$.semanticOutputBinding');
  } else {
    if (!directChild(value.semanticOutputBinding.path, RAW_OUTPUT_ROOT, '.json')) {
      note(paths, '$.semanticOutputBinding.path');
    }
    if (!SHA256.test(value.semanticOutputBinding.fileSha256 ?? '')) {
      note(paths, '$.semanticOutputBinding.fileSha256');
    }
  }
  validateExpectedRuntime(value.expectedRuntime, '$.expectedRuntime', paths);

  if (!exactKeys(value.expectedProjection, [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
  ])) {
    note(paths, '$.expectedProjection');
  } else {
    for (const key of Object.keys(value.expectedProjection)) {
      if (!isCount(value.expectedProjection[key])) note(paths, `$.expectedProjection.${key}`);
    }
  }

  if (!exactKeys(value.readOnlyGuard, [
    'watchedRoot',
    'excludedPaths',
    'expectedBeforeCanonicalSha256',
  ])) {
    note(paths, '$.readOnlyGuard');
  } else {
    if (value.readOnlyGuard.watchedRoot !== WATCHED_ROOT) {
      note(paths, '$.readOnlyGuard.watchedRoot');
    }
    if (!Array.isArray(value.readOnlyGuard.excludedPaths)
      || value.readOnlyGuard.excludedPaths.length !== 1
      || !directChild(value.readOnlyGuard.excludedPaths[0], JOB_ROOT, '.json')) {
      note(paths, '$.readOnlyGuard.excludedPaths');
    }
    if (!SHA256.test(value.readOnlyGuard.expectedBeforeCanonicalSha256 ?? '')) {
      note(paths, '$.readOnlyGuard.expectedBeforeCanonicalSha256');
    }
  }
  if (!strictValue(value)) note(paths, '$');
  return paths.length === 0
    ? {status: 'valid', value}
    : {status: 'invalid', paths: orderedPaths(paths)};
};

export function validatePresentationCaptionSemanticOutputCheckJobV001(value) {
  try {
    return validateSemanticOutputCheckJobInternal(value);
  } catch {
    return {status: 'invalid', paths: ['$']};
  }
}

const readArtifact = (observation, index) => {
  const read = observation?.artifactReads?.[index];
  if (read?.status !== 'read' || !Buffer.isBuffer(read.snapshot?.bytes)) return null;
  const decoded = decodePresentationCaptionB1StrictJsonV001(read.snapshot.bytes);
  if (decoded?.status !== 'decoded') return {read, decoded: null};
  return {read, decoded: decoded.value};
};
const packageValues = (observation) => PACKAGE_FILES.map((_, index) =>
  readArtifact(observation, index));

const validAnchor = (value, edge = null) => exactKeys(value, ['atomId', 'edge'])
  && isNonEmptyString(value.atomId)
  && (edge === null ? ['start', 'end'].includes(value.edge) : value.edge === edge);
const validRuntime = (value) => exactKeys(value, [
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'diagnostics',
])
  && SHA256.test(value.nodeBinarySha256 ?? '')
  && isNonEmptyString(value.nodeVersion)
  && isNonEmptyString(value.icuVersion)
  && value.resolvedLocale === 'ja'
  && value.resolvedGranularity === 'word'
  && exactKeys(value.diagnostics, [
    'nodeExecutableFileName',
    'platform',
    'arch',
    'v8Version',
    'unicodeVersion',
    'cldrVersion',
  ])
  && Object.values(value.diagnostics).every(isNonEmptyString);

const validGateARuntime = (value) => exactKeys(value, [
  'nodeBinarySha256',
  'nodeVersion',
  'icuVersion',
  'resolvedLocale',
  'resolvedGranularity',
  'diagnostics',
])
  && SHA256.test(value.nodeBinarySha256 ?? '')
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

const validPathHash = (value) => exactKeys(value, ['path', 'fileSha256'])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '');
const validPathDualHash = (value) => exactKeys(value, [
  'path',
  'fileSha256',
  'canonicalSha256',
])
  && safePath(value.path)
  && SHA256.test(value.fileSha256 ?? '')
  && SHA256.test(value.canonicalSha256 ?? '');
const validFileDualHash = (value) => exactKeys(value, [
  'fileName',
  'fileSha256',
  'canonicalSha256',
])
  && isNonEmptyString(value.fileName)
  && !value.fileName.includes('/')
  && SHA256.test(value.fileSha256 ?? '')
  && SHA256.test(value.canonicalSha256 ?? '');

const validateEvidenceShape = (value) => exactKeys(value, [
  'schemaVersion',
  'artifactId',
  'generatorVersion',
  'sourceBinding',
  'runtimeBinding',
  'segmentationPolicy',
  'boundaryCandidates',
  'boundaryCandidatesCanonicalSha256',
  'sourceAtomMembershipCanonicalSha256',
])
  && value.schemaVersion === EVIDENCE_SCHEMA
  && isNonEmptyString(value.artifactId)
  && value.generatorVersion === 'presentation-segmenter-boundary-evidence-generator-v001'
  && exactKeys(value.sourceBinding, [
    'sourceArtifactId',
    'sourceArtifactPath',
    'sourceArtifactFileSha256',
    'sourceArtifactCanonicalSha256',
    'sourceRef',
    'sourceProvenance',
    'atomGranularity',
    'rawSourceAtomsCanonicalSha256',
  ])
  && isNonEmptyString(value.sourceBinding.sourceArtifactId)
  && safePath(value.sourceBinding.sourceArtifactPath)
  && SHA256.test(value.sourceBinding.sourceArtifactFileSha256 ?? '')
  && SHA256.test(value.sourceBinding.sourceArtifactCanonicalSha256 ?? '')
  && isNonEmptyString(value.sourceBinding.sourceRef)
  && isNonEmptyString(value.sourceBinding.sourceProvenance)
  && value.sourceBinding.atomGranularity === 'character-timestamp'
  && SHA256.test(value.sourceBinding.rawSourceAtomsCanonicalSha256 ?? '')
  && validGateARuntime(value.runtimeBinding)
  && exactKeys(value.segmentationPolicy, [
    'policyVersion',
    'engine',
    'locale',
    'granularity',
    'indexUnit',
    'containerRule',
    'candidateIdRule',
    'unicodeNormalization',
  ])
  && value.segmentationPolicy.policyVersion
    === 'presentation-segmenter-boundary-policy-v001'
  && value.segmentationPolicy.engine === 'Intl.Segmenter'
  && value.segmentationPolicy.locale === 'ja'
  && value.segmentationPolicy.granularity === 'word'
  && value.segmentationPolicy.indexUnit === 'utf16-code-unit'
  && value.segmentationPolicy.containerRule
    === 'maximal-contiguous-run-by-timeline-segment-and-speech-v001'
  && value.segmentationPolicy.candidateIdRule === 'source-order-six-digit-v001'
  && value.segmentationPolicy.unicodeNormalization === 'none'
  && Array.isArray(value.boundaryCandidates)
  && value.boundaryCandidates.every((candidate) => exactKeys(candidate, [
    'boundaryCandidateId',
    'containerId',
    'timelineSegmentId',
    'speechId',
    'sourceAtomIds',
    'text',
    'startAnchor',
    'endAnchor',
    'segmenterIndexUtf16',
    'segmenterLengthUtf16',
    'isWordLike',
    'sourceAtomCount',
  ])
    && CANDIDATE_ID.test(candidate.boundaryCandidateId ?? '')
    && CONTAINER_ID.test(candidate.containerId ?? '')
    && isNonEmptyString(candidate.timelineSegmentId)
    && isOrdinal(candidate.speechId)
    && Array.isArray(candidate.sourceAtomIds)
    && candidate.sourceAtomIds.every(isNonEmptyString)
    && candidate.sourceAtomIds.length > 0
    && isString(candidate.text)
    && validAnchor(candidate.startAnchor, 'start')
    && validAnchor(candidate.endAnchor, 'end')
    && candidate.startAnchor.atomId === candidate.sourceAtomIds[0]
    && candidate.endAnchor.atomId === candidate.sourceAtomIds.at(-1)
    && isCount(candidate.segmenterIndexUtf16)
    && isCount(candidate.segmenterLengthUtf16)
    && typeof candidate.isWordLike === 'boolean'
    && candidate.sourceAtomCount === candidate.sourceAtomIds.length)
  && SHA256.test(value.boundaryCandidatesCanonicalSha256 ?? '')
  && SHA256.test(value.sourceAtomMembershipCanonicalSha256 ?? '');

const validateSourceInputShape = (value) => exactKeys(value, [
  'schemaVersion',
  'taskDescription',
  'displayConstraints',
  'containers',
])
  && value.schemaVersion === SOURCE_INPUT_SCHEMA
  && value.taskDescription === TASK_DESCRIPTION
  && exactKeys(value.displayConstraints, [
    'maxLogicalWidthPerLine',
    'maxLinesPerMeaningGroup',
  ])
  && value.displayConstraints.maxLogicalWidthPerLine === 36
  && value.displayConstraints.maxLinesPerMeaningGroup === 2
  && Array.isArray(value.containers)
  && value.containers.every((container) => exactKeys(container, [
    'containerId',
    'text',
    'boundaryCandidates',
  ])
    && CONTAINER_ID.test(container.containerId ?? '')
    && isString(container.text)
    && Array.isArray(container.boundaryCandidates)
    && container.boundaryCandidates.length > 0
    && container.boundaryCandidates.every((candidate) => exactKeys(candidate, [
      'boundaryCandidateId',
      'text',
      'logicalWidth',
    ])
      && CANDIDATE_ID.test(candidate.boundaryCandidateId ?? '')
      && isString(candidate.text)
      && isCount(candidate.logicalWidth)));

const validateExpansionMapShape = (value) => exactKeys(value, [
  'schemaVersion',
  'artifactId',
  'sourceBindings',
  'widthPolicyBinding',
  'modelInputBinding',
  'containers',
])
  && value.schemaVersion === EXPANSION_MAP_SCHEMA
  && isNonEmptyString(value.artifactId)
  && exactKeys(value.sourceBindings, ['sourceAtoms', 'boundaryEvidence'])
  && validPathDualHash(value.sourceBindings.sourceAtoms)
  && exactKeys(value.sourceBindings.boundaryEvidence, [
    'fileName',
    'fileSha256',
    'canonicalSha256',
    'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
  ])
  && value.sourceBindings.boundaryEvidence.fileName === PACKAGE_FILES[0]
  && [
    value.sourceBindings.boundaryEvidence.fileSha256,
    value.sourceBindings.boundaryEvidence.canonicalSha256,
    value.sourceBindings.boundaryEvidence.boundaryCandidatesCanonicalSha256,
    value.sourceBindings.boundaryEvidence.sourceAtomMembershipCanonicalSha256,
  ].every((hash) => SHA256.test(hash ?? ''))
  && exactKeys(value.widthPolicyBinding, [
    'presetRegistry',
    'presetValidationIndex',
    'materialValidationIndex',
    'registryBinding',
    'rendererTrust',
    'rendererTrustImplementation',
    'textLayoutImplementation',
    'presetId',
    'visualStateId',
    'maxLogicalWidthPerLine',
    'maxLinesPerMeaningGroup',
    'characterWidthRule',
  ])
  && [
    value.widthPolicyBinding.presetRegistry,
    value.widthPolicyBinding.presetValidationIndex,
    value.widthPolicyBinding.materialValidationIndex,
    value.widthPolicyBinding.registryBinding,
    value.widthPolicyBinding.rendererTrust,
  ].every(validPathDualHash)
  && validPathHash(value.widthPolicyBinding.rendererTrustImplementation)
  && validPathHash(value.widthPolicyBinding.textLayoutImplementation)
  && value.widthPolicyBinding.presetId === 'normal-landscape-readable-pop-v001'
  && value.widthPolicyBinding.visualStateId === 'caption-core-v001'
  && value.widthPolicyBinding.maxLogicalWidthPerLine === 36
  && value.widthPolicyBinding.maxLinesPerMeaningGroup === 2
  && value.widthPolicyBinding.characterWidthRule
    === 'U+0000..U+00FF=1; other Unicode code point=2'
  && exactKeys(value.modelInputBinding, ['fileName', 'fileSha256', 'canonicalSha256'])
  && value.modelInputBinding.fileName === PACKAGE_FILES[2]
  && SHA256.test(value.modelInputBinding.fileSha256 ?? '')
  && SHA256.test(value.modelInputBinding.canonicalSha256 ?? '')
  && Array.isArray(value.containers)
  && value.containers.every((container) => exactKeys(container, [
    'containerId',
    'timelineSegmentId',
    'speechId',
    'candidates',
  ])
    && CONTAINER_ID.test(container.containerId ?? '')
    && isNonEmptyString(container.timelineSegmentId)
    && isOrdinal(container.speechId)
    && Array.isArray(container.candidates)
    && container.candidates.length > 0
    && container.candidates.every((candidate) => exactKeys(candidate, [
      'boundaryCandidateId',
      'sourceAtomIds',
      'startAnchor',
      'endAnchor',
      'logicalWidth',
    ])
      && CANDIDATE_ID.test(candidate.boundaryCandidateId ?? '')
      && Array.isArray(candidate.sourceAtomIds)
      && candidate.sourceAtomIds.length > 0
      && candidate.sourceAtomIds.every(isNonEmptyString)
      && validAnchor(candidate.startAnchor, 'start')
      && validAnchor(candidate.endAnchor, 'end')
      && isCount(candidate.logicalWidth)));

const validateLeakageShape = (value) => exactKeys(value, [
  'schemaVersion',
  'status',
  'failureStage',
  'modelInputBinding',
  'sourceBindings',
  'checks',
  'violations',
])
  && value.schemaVersion === LEAKAGE_REPORT_SCHEMA
  && value.status === 'passed'
  && value.failureStage === null
  && exactKeys(value.modelInputBinding, [
    'packageFileName',
    'fileSha256',
    'canonicalSha256',
  ])
  && value.modelInputBinding.packageFileName === PACKAGE_FILES[2]
  && SHA256.test(value.modelInputBinding.fileSha256 ?? '')
  && SHA256.test(value.modelInputBinding.canonicalSha256 ?? '')
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
  && Object.values(value.sourceBindings).every((hash) => SHA256.test(hash ?? ''))
  && Array.isArray(value.checks)
  && value.checks.length === 5
  && value.checks.every((check, index) => exactKeys(
    check,
    ['name', 'status', 'violationCodes'],
  )
    && check.name === LEAKAGE_CHECK_NAMES[index]
    && check.status === 'passed'
    && Array.isArray(check.violationCodes)
    && check.violationCodes.length === 0)
  && Array.isArray(value.violations)
  && value.violations.length === 0;

const validateGateAProjectionShape = (value) => exactCanonicalKeys(value, [
  'sourceAtomCount',
  'containerCount',
  'boundaryCandidateCount',
  'wordLikeCandidateCount',
  'nonWordLikeCandidateCount',
  'timelineSegments',
  'containers',
  'mixedRawSpeakerCandidateCount',
  'rawSpeakerExactSetQueryResults',
  'sourcePositiveOverlapCount',
  'membership',
])
  && isOrdinal(value.sourceAtomCount)
  && isOrdinal(value.containerCount)
  && isOrdinal(value.boundaryCandidateCount)
  && isCount(value.wordLikeCandidateCount)
  && isCount(value.nonWordLikeCandidateCount)
  && Array.isArray(value.timelineSegments)
  && value.timelineSegments.every((entry) => exactCanonicalKeys(entry, [
    'timelineSegmentId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && isNonEmptyString(entry.timelineSegmentId)
    && isCount(entry.sourceAtomCount)
    && isCount(entry.boundaryCandidateCount))
  && Array.isArray(value.containers)
  && value.containers.every((entry) => exactCanonicalKeys(entry, [
    'containerId',
    'timelineSegmentId',
    'speechId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && isNonEmptyString(entry.containerId)
    && isNonEmptyString(entry.timelineSegmentId)
    && Number.isInteger(entry.speechId)
    && isCount(entry.sourceAtomCount)
    && isCount(entry.boundaryCandidateCount))
  && isCount(value.mixedRawSpeakerCandidateCount)
  && Array.isArray(value.rawSpeakerExactSetQueryResults)
  && value.rawSpeakerExactSetQueryResults.every((entry) => exactCanonicalKeys(entry, [
    'values',
    'boundaryCandidateCount',
  ])
    && Array.isArray(entry.values)
    && entry.values.length > 0
    && entry.values.every((speaker) => speaker === null || isNonEmptyString(speaker))
    && new Set(entry.values.map((speaker) => JSON.stringify(speaker))).size
      === entry.values.length
    && isCount(entry.boundaryCandidateCount))
  && new Set(value.rawSpeakerExactSetQueryResults.map((entry) =>
    entry.values.map((speaker) => JSON.stringify(speaker))
      .sort(compareUtf16)
      .join('\u0000'))).size === value.rawSpeakerExactSetQueryResults.length
  && isCount(value.sourcePositiveOverlapCount)
  && exactCanonicalKeys(value.membership, [
    'missingCount',
    'duplicatedCount',
    'orderReversedCount',
    'crossSegmentCount',
    'crossSpeechCount',
  ])
  && Object.values(value.membership).every(isCount);

const validateGateAGuardSnapshotShape = (value) => {
  if (!exactCanonicalKeys(value, [
    'formalPathState',
    'entryCount',
    'entriesCanonicalSha256',
  ]) || !['absent', 'present', 'inspection_failed'].includes(value.formalPathState)) {
    return false;
  }
  return value.formalPathState === 'inspection_failed'
    ? value.entryCount === null && value.entriesCanonicalSha256 === null
    : isCount(value.entryCount) && SHA256.test(value.entriesCanonicalSha256 ?? '');
};

const validateEmbeddedGateAReportShape = (value) => exactCanonicalKeys(value, [
  'schemaVersion',
  'status',
  'failureStage',
  'job',
  'inputs',
  'runtimeBinding',
  'observedProjection',
  'evidence',
  'readOnlyGuard',
  'checkReport',
])
  && value.schemaVersion === GATE_A_REPORT_SCHEMA
  && value.status === 'passed'
  && value.failureStage === null
  && exactCanonicalKeys(value.job, ['jobId', 'path', 'fileSha256'])
  && isNonEmptyString(value.job.jobId)
  && safePath(value.job.path)
  && SHA256.test(value.job.fileSha256 ?? '')
  && Array.isArray(value.inputs)
  && value.inputs.length === GATE_A_INPUT_ROLES.length
  && value.inputs.every((entry, index) => exactCanonicalKeys(entry, [
    'role',
    'path',
    'fileSha256',
  ])
    && entry.role === GATE_A_INPUT_ROLES[index]
    && safePath(entry.path)
    && SHA256.test(entry.fileSha256 ?? ''))
  && exactCanonicalKeys(value.runtimeBinding, [
    'nodeBinarySha256',
    'nodeVersion',
    'icuVersion',
    'resolvedLocale',
    'resolvedGranularity',
    'diagnostics',
  ])
  && SHA256.test(value.runtimeBinding.nodeBinarySha256 ?? '')
  && isNonEmptyString(value.runtimeBinding.nodeVersion)
  && isNonEmptyString(value.runtimeBinding.icuVersion)
  && value.runtimeBinding.resolvedLocale === 'ja'
  && value.runtimeBinding.resolvedGranularity === 'word'
  && exactCanonicalKeys(value.runtimeBinding.diagnostics, [
    'resolvedNodePath',
    'platform',
    'arch',
    'v8Version',
    'unicodeVersion',
    'cldrVersion',
  ])
  && isNonEmptyString(value.runtimeBinding.diagnostics.resolvedNodePath)
  && value.runtimeBinding.diagnostics.resolvedNodePath.startsWith('/')
  && [
    value.runtimeBinding.diagnostics.platform,
    value.runtimeBinding.diagnostics.arch,
    value.runtimeBinding.diagnostics.v8Version,
    value.runtimeBinding.diagnostics.unicodeVersion,
    value.runtimeBinding.diagnostics.cldrVersion,
  ].every(isNonEmptyString)
  && validateGateAProjectionShape(value.observedProjection)
  && exactCanonicalKeys(value.evidence, [
    'artifactId',
    'canonicalSha256',
    'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
  ])
  && isNonEmptyString(value.evidence.artifactId)
  && [
    value.evidence.canonicalSha256,
    value.evidence.boundaryCandidatesCanonicalSha256,
    value.evidence.sourceAtomMembershipCanonicalSha256,
  ].every((hash) => SHA256.test(hash ?? ''))
  && exactCanonicalKeys(value.readOnlyGuard, [
    'formalOutputPath',
    'watchedAncestorPath',
    'before',
    'after',
  ])
  && safePath(value.readOnlyGuard.formalOutputPath)
  && safePath(value.readOnlyGuard.watchedAncestorPath)
  && validateGateAGuardSnapshotShape(value.readOnlyGuard.before)
  && validateGateAGuardSnapshotShape(value.readOnlyGuard.after)
  && exactCanonicalKeys(value.checkReport, [
    'schemaVersion',
    'status',
    'artifactId',
    'checks',
    'observedProjection',
    'violations',
  ])
  && value.checkReport.schemaVersion === GATE_A_CHECK_REPORT_SCHEMA
  && value.checkReport.status === 'passed'
  && isNonEmptyString(value.checkReport.artifactId)
  && Array.isArray(value.checkReport.checks)
  && value.checkReport.checks.length === GATE_A_CHECK_NAMES.length
  && value.checkReport.checks.every((check, index) => exactCanonicalKeys(check, [
    'name',
    'status',
    'violationCodes',
  ])
    && check.name === GATE_A_CHECK_NAMES[index]
    && check.status === 'passed'
    && Array.isArray(check.violationCodes)
    && check.violationCodes.length === 0)
  && validateGateAProjectionShape(value.checkReport.observedProjection)
  && Array.isArray(value.checkReport.violations)
  && value.checkReport.violations.length === 0;

const validateManifestShape = (value) => exactKeys(value, [
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
  && value.schemaVersion === PACKAGE_MANIFEST_SCHEMA
  && isNonEmptyString(value.packageId)
  && isNonEmptyString(value.artifactId)
  && safePath(value.formalOutputPath)
  && validPathHash(value.packageJobBinding)
  && exactKeys(value.sourceGateBinding, [
    'gateAJob',
    'gateACompletionReport',
    'expectedEvidenceHashes',
    'gateAImplementationFiles',
    'embeddedReport',
  ])
  && validPathHash(value.sourceGateBinding.gateAJob)
  && validPathHash(value.sourceGateBinding.gateACompletionReport)
  && exactKeys(value.sourceGateBinding.expectedEvidenceHashes, [
    'boundaryCandidatesCanonicalSha256',
    'sourceAtomMembershipCanonicalSha256',
    'evidenceCanonicalSha256',
  ])
  && Object.values(value.sourceGateBinding.expectedEvidenceHashes)
    .every((hash) => SHA256.test(hash ?? ''))
  && Array.isArray(value.sourceGateBinding.gateAImplementationFiles)
  && value.sourceGateBinding.gateAImplementationFiles.length === 3
  && value.sourceGateBinding.gateAImplementationFiles.every((entry) =>
    exactKeys(entry, ['role', 'path', 'fileSha256'])
    && isNonEmptyString(entry.role)
    && safePath(entry.path)
    && SHA256.test(entry.fileSha256 ?? ''))
  && exactKeys(value.sourceGateBinding.embeddedReport, [
    'fileName',
    'fileSha256',
    'canonicalSha256',
  ])
  && value.sourceGateBinding.embeddedReport.fileName === PACKAGE_FILES[1]
  && SHA256.test(value.sourceGateBinding.embeddedReport.fileSha256 ?? '')
  && SHA256.test(value.sourceGateBinding.embeddedReport.canonicalSha256 ?? '')
  && exactKeys(value.implementationBinding, ['files', 'dependencyFiles'])
  && Array.isArray(value.implementationBinding.files)
  && value.implementationBinding.files.length === 3
  && value.implementationBinding.files.every((entry, index) =>
    exactKeys(entry, ['role', 'path', 'fileSha256'])
    && entry.role === ['packageCore', 'packageRunner', 'rendererTrustImplementation'][index]
    && safePath(entry.path)
    && SHA256.test(entry.fileSha256 ?? ''))
  && Array.isArray(value.implementationBinding.dependencyFiles)
  && value.implementationBinding.dependencyFiles.length === 0
  && validRuntime(value.runtimeBinding)
  && Array.isArray(value.externalInputBindings)
  && value.externalInputBindings.length === EXTERNAL_INPUT_ROLES.length
  && value.externalInputBindings.every((entry, index) => exactKeys(entry, [
    'role',
    'path',
    'fileSha256',
    'canonicalSha256',
  ])
    && entry.role === EXTERNAL_INPUT_ROLES[index]
    && safePath(entry.path)
    && SHA256.test(entry.fileSha256 ?? '')
    && (index === EXTERNAL_INPUT_ROLES.length - 1
      ? entry.canonicalSha256 === null
      : SHA256.test(entry.canonicalSha256 ?? '')))
  && Array.isArray(value.contentArtifacts)
  && value.contentArtifacts.length === 5
  && value.contentArtifacts.every((entry, index) => exactKeys(entry, [
    'role',
    'fileName',
    'fileSha256',
    'canonicalSha256',
  ])
    && entry.role === CONTENT_ROLES[index]
    && entry.fileName === PACKAGE_FILES[index]
    && SHA256.test(entry.fileSha256 ?? '')
    && SHA256.test(entry.canonicalSha256 ?? ''))
  && exactKeys(value.validationReportDeclaration, [
    'fileName',
    'schemaVersion',
    'selfHashPolicy',
  ])
  && value.validationReportDeclaration.fileName === PACKAGE_FILES[6]
  && value.validationReportDeclaration.schemaVersion === PACKAGE_REPORT_SCHEMA
  && value.validationReportDeclaration.selfHashPolicy
    === 'report-is-not-hashed-by-manifest-v001'
  && SHA256.test(value.contentSetCanonicalSha256 ?? '');

const validatePackageReportShape = (value) => exactKeys(value, [
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
  && value.schemaVersion === PACKAGE_REPORT_SCHEMA
  && value.status === 'passed'
  && value.failureStage === null
  && validPathHash(value.jobBinding)
  && exactKeys(value.package, ['packageId', 'artifactId', 'formalOutputPath'])
  && isNonEmptyString(value.package.packageId)
  && isNonEmptyString(value.package.artifactId)
  && safePath(value.package.formalOutputPath)
  && exactKeys(value.manifestBinding, ['fileName', 'fileSha256', 'canonicalSha256'])
  && value.manifestBinding.fileName === PACKAGE_FILES[5]
  && SHA256.test(value.manifestBinding.fileSha256 ?? '')
  && SHA256.test(value.manifestBinding.canonicalSha256 ?? '')
  && Array.isArray(value.checks)
  && value.checks.length === 15
  && value.checks.every((check, index) => exactKeys(
    check,
    ['name', 'status', 'violationCodes'],
  )
    && check.name === PACKAGE_CHECK_NAMES[index]
    && check.status === 'passed'
    && Array.isArray(check.violationCodes)
    && check.violationCodes.length === 0)
  && Array.isArray(value.violations)
  && value.violations.length === 0
  && Array.isArray(value.validatedContentArtifacts)
  && value.validatedContentArtifacts.length === 5
  && value.validatedContentArtifacts.every((entry, index) => exactKeys(entry, [
    'role',
    'fileName',
    'fileSha256',
    'canonicalSha256',
  ])
    && entry.role === CONTENT_ROLES[index]
    && entry.fileName === PACKAGE_FILES[index]
    && SHA256.test(entry.fileSha256 ?? '')
    && SHA256.test(entry.canonicalSha256 ?? ''))
  && exactKeys(value.observedProjection, [
    'sourceAtomCount',
    'containerCount',
    'boundaryCandidateCount',
    'containers',
    'maximumObservedCandidateLogicalWidth',
  ])
  && isCount(value.observedProjection.sourceAtomCount)
  && isCount(value.observedProjection.containerCount)
  && isCount(value.observedProjection.boundaryCandidateCount)
  && Array.isArray(value.observedProjection.containers)
  && value.observedProjection.containers.length === value.observedProjection.containerCount
  && value.observedProjection.containers.every((container) => exactKeys(container, [
    'containerId',
    'sourceAtomCount',
    'boundaryCandidateCount',
  ])
    && isNonEmptyString(container.containerId)
    && isCount(container.sourceAtomCount)
    && isCount(container.boundaryCandidateCount))
  && isCount(value.observedProjection.maximumObservedCandidateLogicalWidth)
  && exactKeys(value.scope, [
    'validatedState',
    'postPublishValidationRequired',
    'semanticQualityVerified',
    'naturalBreakQualityVerified',
    'nonCooperativePublicationRaceProtected',
  ])
  && value.scope.validatedState === 'source-package-only'
  && value.scope.postPublishValidationRequired === true
  && value.scope.semanticQualityVerified === false
  && value.scope.naturalBreakQualityVerified === false
  && value.scope.nonCooperativePublicationRaceProtected === false;

const observePackage = (context, state) => {
  const observation = context.sourcePackageObservation;
  const values = packageValues(observation);
  const expectedEntries = PACKAGE_FILES
    .map((name) => ({name, kind: 'file'}))
    .sort((left, right) => compareUtf16(left.name, right.name));
  if (!Array.isArray(observation?.directoryEntries)
    || !sameJson(observation.directoryEntries, expectedEntries)
    || !Array.isArray(observation?.artifactReads)
    || observation.artifactReads.length !== PACKAGE_FILES.length) {
    addViolation(state, 'PACKAGE_FILE_SET_INVALID', '$.sourcePackage.directoryEntries');
  }
  for (let index = 0; index < PACKAGE_FILES.length; index += 1) {
    const loaded = values[index];
    const expectedPath =
      `${context.job.value.sourcePackageBinding.rootPath}/${PACKAGE_FILES[index]}`;
    if (loaded === null) {
      addViolation(state, 'PACKAGE_FILE_SET_INVALID', `$.sourcePackage.files[${index}]`);
      continue;
    }
    if (loaded.read.fileName !== PACKAGE_FILES[index]
      || loaded.read.observedKind !== 'regular-file'
      || loaded.read.failurePoint !== null
      || !stableSnapshotSafe(loaded.read.snapshot, expectedPath)) {
      addViolation(state, 'PACKAGE_FILE_SET_INVALID', `$.sourcePackage.files[${index}]`);
    }
    if (loaded.decoded === null) {
      addViolation(
        state,
        'PACKAGE_STRICT_JSON_INVALID',
        `$.sourcePackage.files[${index}].readResult`,
      );
      continue;
    }
    const canonical = canonicalSha(loaded.decoded);
    const observedHash = shaBytes(loaded.read.snapshot.bytes);
    if (observedHash !== loaded.read.snapshot.fileSha256) {
      addViolation(state, 'PACKAGE_HASH_MISMATCH', `$.sourcePackage.files[${index}]`);
    }
    if (index !== 1) {
      const bytes = formalBytes(loaded.decoded);
      if (!bytes || !bytes.equals(loaded.read.snapshot.bytes)) {
        addViolation(
          state,
          'PACKAGE_STRICT_JSON_INVALID',
          `$.sourcePackage.files[${index}].readResult`,
        );
      }
    } else {
      const canonical = canonicalBytes(loaded.decoded);
      const embeddedBytes = canonical
        ? Buffer.concat([canonical, Buffer.from('\n', 'utf8')])
        : null;
      if (!embeddedBytes || !embeddedBytes.equals(loaded.read.snapshot.bytes)) {
        addViolation(
          state,
          'PACKAGE_STRICT_JSON_INVALID',
          `$.sourcePackage.files[${index}].readResult`,
        );
      }
    }
    if (!canonical) {
      addViolation(state, 'PACKAGE_STRICT_JSON_INVALID', `$.sourcePackage.files[${index}]`);
    }
  }
  const decoded = values.map((loaded) => loaded?.decoded ?? null);
  const shapeChecks = [
    validateEvidenceShape(decoded[0]),
    validateEmbeddedGateAReportShape(decoded[1]),
    validateSourceInputShape(decoded[2]),
    validateExpansionMapShape(decoded[3]),
    validateLeakageShape(decoded[4]),
    validateManifestShape(decoded[5]),
    validatePackageReportShape(decoded[6]),
  ];
  shapeChecks.forEach((passed, index) => {
    if (!passed) {
      addViolation(
        state,
        'PACKAGE_SCHEMA_INVALID',
        `$.sourcePackage.files[${index}].value`,
      );
    }
  });

  const manifest = decoded[5];
  const report = decoded[6];
  const job = context.job.value;
  const evidence = decoded[0];
  const embeddedGateAReport = decoded[1];
  const sourceInput = decoded[2];
  const expansionMap = decoded[3];
  const leakage = decoded[4];
  if (validateEvidenceShape(evidence)) {
    const membership = evidence.boundaryCandidates.map((candidate) => ({
      boundaryCandidateId: candidate.boundaryCandidateId,
      sourceAtomIds: [...candidate.sourceAtomIds],
    }));
    if (canonicalSha(evidence.boundaryCandidates)
      !== evidence.boundaryCandidatesCanonicalSha256
      || canonicalSha(membership) !== evidence.sourceAtomMembershipCanonicalSha256) {
      addViolation(state, 'PACKAGE_HASH_MISMATCH', '$.sourcePackage.files[0].value');
    }
  }
  if (validateEmbeddedGateAReportShape(embeddedGateAReport)
    && validateEvidenceShape(evidence)) {
    if (embeddedGateAReport.evidence.artifactId !== evidence.artifactId
      || embeddedGateAReport.checkReport.artifactId !== evidence.artifactId
      || !sameJson(
        embeddedGateAReport.observedProjection,
        embeddedGateAReport.checkReport.observedProjection,
      )
      || !sameJson(embeddedGateAReport.runtimeBinding, evidence.runtimeBinding)
      || !sameJson(
        embeddedGateAReport.readOnlyGuard.before,
        embeddedGateAReport.readOnlyGuard.after,
      )
      || embeddedGateAReport.observedProjection.sourceAtomCount
        !== new Set(evidence.boundaryCandidates
          .flatMap((candidate) => candidate.sourceAtomIds)).size
      || embeddedGateAReport.observedProjection.containerCount
        !== new Set(evidence.boundaryCandidates.map((candidate) => candidate.containerId)).size
      || embeddedGateAReport.observedProjection.boundaryCandidateCount
        !== evidence.boundaryCandidates.length) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[1].value',
      );
    }
    if (embeddedGateAReport.evidence.canonicalSha256 !== canonicalSha(evidence)
      || embeddedGateAReport.evidence.boundaryCandidatesCanonicalSha256
        !== evidence.boundaryCandidatesCanonicalSha256
      || embeddedGateAReport.evidence.sourceAtomMembershipCanonicalSha256
        !== evidence.sourceAtomMembershipCanonicalSha256) {
      addViolation(
        state,
        'PACKAGE_HASH_MISMATCH',
        '$.sourcePackage.files[1].value.evidence',
      );
    }
  }
  if (validateEvidenceShape(evidence)
    && validateSourceInputShape(sourceInput)
    && validateExpansionMapShape(expansionMap)) {
    const evidenceById = new Map(
      evidence.boundaryCandidates.map((candidate) => [candidate.boundaryCandidateId, candidate]),
    );
    const inputCandidateIds = [];
    let projectionMismatch = false;
    let mapMismatch = false;
    const evidenceContainerIds = [];
    for (const candidate of evidence.boundaryCandidates) {
      if (!evidenceContainerIds.includes(candidate.containerId)) {
        evidenceContainerIds.push(candidate.containerId);
      }
    }
    if (!sameArray(
      sourceInput.containers.map((container) => container.containerId),
      evidenceContainerIds,
    ) || !sameArray(
      expansionMap.containers.map((container) => container.containerId),
      evidenceContainerIds,
    )) {
      projectionMismatch = true;
      mapMismatch = true;
    }
    for (const [containerIndex, inputContainer] of sourceInput.containers.entries()) {
      const mapContainer = expansionMap.containers[containerIndex];
      const evidenceCandidates = evidence.boundaryCandidates.filter(
        (candidate) => candidate.containerId === inputContainer.containerId,
      );
      const expectedIds = evidenceCandidates.map((candidate) => candidate.boundaryCandidateId);
      const actualIds = inputContainer.boundaryCandidates
        .map((candidate) => candidate.boundaryCandidateId);
      inputCandidateIds.push(...actualIds);
      if (!sameArray(actualIds, expectedIds)
        || inputContainer.text !== evidenceCandidates.map((candidate) => candidate.text).join('')
        || inputContainer.boundaryCandidates.some((candidate, candidateIndex) => {
          const evidenceCandidate = evidenceCandidates[candidateIndex];
          return candidate.text !== evidenceCandidate?.text
            || candidate.logicalWidth !== logicalWidth(candidate.text);
        })) {
        projectionMismatch = true;
      }
      if (!mapContainer
        || !sameArray(
          mapContainer.candidates.map((candidate) => candidate.boundaryCandidateId),
          expectedIds,
        )
        || mapContainer.timelineSegmentId !== evidenceCandidates[0]?.timelineSegmentId
        || mapContainer.speechId !== evidenceCandidates[0]?.speechId
        || mapContainer.candidates.some((candidate) => {
          const source = evidenceById.get(candidate.boundaryCandidateId);
          return !source
            || !sameArray(candidate.sourceAtomIds, source.sourceAtomIds)
            || !sameJson(candidate.startAnchor, source.startAnchor)
            || !sameJson(candidate.endAnchor, source.endAnchor)
            || candidate.logicalWidth !== logicalWidth(source.text);
        })) {
        mapMismatch = true;
      }
    }
    if (projectionMismatch) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[2].value.containers',
      );
    }
    if (mapMismatch) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[3].value.containers',
      );
    }
    if (!sameArray(
      inputCandidateIds,
      evidence.boundaryCandidates.map((candidate) => candidate.boundaryCandidateId),
    )) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[2].value.containers',
      );
    }
    if (expansionMap.artifactId !== evidence.artifactId
      || expansionMap.modelInputBinding.fileName !== PACKAGE_FILES[2]
      || expansionMap.modelInputBinding.fileSha256 !== values[2]?.read?.snapshot?.fileSha256
      || expansionMap.modelInputBinding.canonicalSha256 !== canonicalSha(sourceInput)
      || expansionMap.sourceBindings.boundaryEvidence.fileSha256
        !== values[0]?.read?.snapshot?.fileSha256
      || expansionMap.sourceBindings.boundaryEvidence.canonicalSha256
        !== canonicalSha(evidence)
      || expansionMap.sourceBindings.boundaryEvidence.boundaryCandidatesCanonicalSha256
        !== evidence.boundaryCandidatesCanonicalSha256
      || expansionMap.sourceBindings.boundaryEvidence.sourceAtomMembershipCanonicalSha256
        !== evidence.sourceAtomMembershipCanonicalSha256
      || expansionMap.sourceBindings.sourceAtoms.path
        !== evidence.sourceBinding.sourceArtifactPath
      || expansionMap.sourceBindings.sourceAtoms.fileSha256
        !== evidence.sourceBinding.sourceArtifactFileSha256
      || expansionMap.sourceBindings.sourceAtoms.canonicalSha256
        !== evidence.sourceBinding.sourceArtifactCanonicalSha256) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[3].value',
      );
    }
  }
  if (validateLeakageShape(leakage)
    && validateSourceInputShape(sourceInput)
    && validateExpansionMapShape(expansionMap)
    && validateEvidenceShape(evidence)) {
    if (leakage.modelInputBinding.fileSha256 !== values[2]?.read?.snapshot?.fileSha256
      || leakage.modelInputBinding.canonicalSha256 !== canonicalSha(sourceInput)
      || leakage.sourceBindings.boundaryEvidenceCanonicalSha256 !== canonicalSha(evidence)
      || leakage.sourceBindings.expansionMapCanonicalSha256 !== canonicalSha(expansionMap)
      || leakage.sourceBindings.sourceAtomsCanonicalSha256
        !== expansionMap.sourceBindings.sourceAtoms.canonicalSha256
      || leakage.sourceBindings.presetRegistryCanonicalSha256
        !== expansionMap.widthPolicyBinding.presetRegistry.canonicalSha256
      || leakage.sourceBindings.presetValidationIndexCanonicalSha256
        !== expansionMap.widthPolicyBinding.presetValidationIndex.canonicalSha256
      || leakage.sourceBindings.materialValidationIndexCanonicalSha256
        !== expansionMap.widthPolicyBinding.materialValidationIndex.canonicalSha256
      || leakage.sourceBindings.registryBindingCanonicalSha256
        !== expansionMap.widthPolicyBinding.registryBinding.canonicalSha256
      || leakage.sourceBindings.rendererTrustCanonicalSha256
        !== expansionMap.widthPolicyBinding.rendererTrust.canonicalSha256
      || leakage.sourceBindings.rendererTrustImplementationFileSha256
        !== expansionMap.widthPolicyBinding.rendererTrustImplementation.fileSha256
      || leakage.sourceBindings.textLayoutImplementationFileSha256
        !== expansionMap.widthPolicyBinding.textLayoutImplementation.fileSha256) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[4].value',
      );
    }
  }
  if (validateManifestShape(manifest) && validatePackageReportShape(report)) {
    if (manifest.artifactId !== job.artifactId
      || (validateEvidenceShape(evidence) && manifest.artifactId !== evidence.artifactId)
      || report.package.artifactId !== job.artifactId
      || manifest.artifactId !== report.package.artifactId
      || manifest.formalOutputPath !== job.sourcePackageBinding.rootPath
      || report.package.formalOutputPath !== job.sourcePackageBinding.rootPath
      || report.package.packageId !== manifest.packageId) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.artifactId',
      );
    }
    const expectedManifest = job.sourcePackageBinding.manifest;
    const expectedReport = job.sourcePackageBinding.validationReport;
    const manifestRead = values[5]?.read?.snapshot;
    const reportRead = values[6]?.read?.snapshot;
    if (manifestRead?.fileSha256 !== expectedManifest.fileSha256
      || canonicalSha(manifest) !== expectedManifest.canonicalSha256) {
      addViolation(state, 'PACKAGE_HASH_MISMATCH', '$.sourcePackage.files[5]');
    }
    if (reportRead?.fileSha256 !== expectedReport.fileSha256
      || canonicalSha(report) !== expectedReport.canonicalSha256) {
      addViolation(state, 'PACKAGE_HASH_MISMATCH', '$.sourcePackage.files[6]');
    }
    if (validateEmbeddedGateAReportShape(embeddedGateAReport)) {
      if (embeddedGateAReport.job.path !== manifest.sourceGateBinding.gateAJob.path
        || embeddedGateAReport.inputs.some((input, index) =>
          input.role !== manifest.externalInputBindings[index]?.role
          || input.path !== manifest.externalInputBindings[index]?.path)) {
        addViolation(
          state,
          'PACKAGE_BINDING_MISMATCH',
          '$.sourcePackage.files[1].value',
        );
      }
      if (embeddedGateAReport.job.fileSha256
          !== manifest.sourceGateBinding.gateAJob.fileSha256
        || embeddedGateAReport.inputs.some((input, index) =>
          input.fileSha256 !== manifest.externalInputBindings[index]?.fileSha256)
        || manifest.sourceGateBinding.embeddedReport.fileSha256
          !== values[1]?.read?.snapshot?.fileSha256
        || manifest.sourceGateBinding.embeddedReport.canonicalSha256
          !== canonicalSha(embeddedGateAReport)
        || manifest.sourceGateBinding.expectedEvidenceHashes.evidenceCanonicalSha256
          !== canonicalSha(evidence)
        || manifest.sourceGateBinding.expectedEvidenceHashes.boundaryCandidatesCanonicalSha256
          !== evidence?.boundaryCandidatesCanonicalSha256
        || manifest.sourceGateBinding.expectedEvidenceHashes.sourceAtomMembershipCanonicalSha256
          !== evidence?.sourceAtomMembershipCanonicalSha256) {
        addViolation(
          state,
          'PACKAGE_HASH_MISMATCH',
          '$.sourcePackage.files[5].value.sourceGateBinding',
        );
      }
    }
    if (report.manifestBinding?.fileName !== 'package-manifest.json'
      || report.manifestBinding?.fileSha256 !== manifestRead?.fileSha256
      || report.manifestBinding?.canonicalSha256 !== canonicalSha(manifest)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[6].value.manifestBinding',
      );
    }
    if (manifest.validationReportDeclaration?.fileName !== 'package-validation-report.json'
      || manifest.validationReportDeclaration?.schemaVersion !== PACKAGE_REPORT_SCHEMA
      || manifest.validationReportDeclaration?.selfHashPolicy
        !== 'report-is-not-hashed-by-manifest-v001') {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.validationReportDeclaration',
      );
    }
    const expectedContentNames = PACKAGE_FILES.slice(0, 5);
    if (manifest.contentArtifacts.length === 5) {
      manifest.contentArtifacts.forEach((binding, index) => {
        const snapshot = values[index]?.read?.snapshot;
        if (binding?.fileName !== expectedContentNames[index]
          || binding?.fileSha256 !== snapshot?.fileSha256
          || binding?.canonicalSha256 !== canonicalSha(decoded[index])) {
          addViolation(
            state,
            'PACKAGE_HASH_MISMATCH',
            `$.sourcePackage.files[5].value.contentArtifacts[${index}]`,
          );
        }
      });
    }
    if (!sameJson(report.validatedContentArtifacts, manifest.contentArtifacts)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[6].value.validatedContentArtifacts',
      );
    }
    if (!sameJson(report.jobBinding, manifest.packageJobBinding)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[6].value.jobBinding',
      );
    }
    const contentSet = manifest.contentArtifacts.map((entry) => ({
      role: entry.role,
      fileName: entry.fileName,
      fileSha256: entry.fileSha256,
      canonicalSha256: entry.canonicalSha256,
    }));
    if (manifest.contentSetCanonicalSha256 !== canonicalSha(contentSet)) {
      addViolation(
        state,
        'PACKAGE_HASH_MISMATCH',
        '$.sourcePackage.files[5].value.contentSetCanonicalSha256',
      );
    }
    const projection = report.observedProjection;
    const candidateCount = validateEvidenceShape(evidence)
      ? evidence.boundaryCandidates.length
      : null;
    const sourceAtomIds = validateEvidenceShape(evidence)
      ? evidence.boundaryCandidates.flatMap((candidate) => candidate.sourceAtomIds)
      : [];
    const containerIds = validateEvidenceShape(evidence)
      ? [...new Set(evidence.boundaryCandidates.map((candidate) => candidate.containerId))]
      : [];
    const expectedContainerProjection = candidateCount === null
      ? []
      : containerIds.map((containerId) => {
        const candidates = evidence.boundaryCandidates.filter(
          (candidate) => candidate.containerId === containerId,
        );
        return {
          containerId,
          sourceAtomCount: candidates.reduce(
            (sum, candidate) => sum + candidate.sourceAtomIds.length,
            0,
          ),
          boundaryCandidateCount: candidates.length,
        };
      });
    const expectedMaximumObservedCandidateLogicalWidth =
      validateSourceInputShape(sourceInput)
        ? Math.max(
          ...sourceInput.containers.flatMap((container) =>
            container.boundaryCandidates.map((candidate) => candidate.logicalWidth)),
        )
        : null;
    if (candidateCount !== null
      && (projection.sourceAtomCount !== sourceAtomIds.length
        || projection.containerCount !== containerIds.length
        || projection.boundaryCandidateCount !== candidateCount
        || !sameJson(projection.containers, expectedContainerProjection)
        || (expectedMaximumObservedCandidateLogicalWidth !== null
          && projection.maximumObservedCandidateLogicalWidth
            !== expectedMaximumObservedCandidateLogicalWidth)
        || job.expectedProjection.sourceAtomCount !== sourceAtomIds.length
        || job.expectedProjection.containerCount !== containerIds.length
        || job.expectedProjection.boundaryCandidateCount !== candidateCount)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[6].value.observedProjection',
      );
    }
    const gateDependencies = manifest.sourceGateBinding.gateAImplementationFiles;
    const semanticDependencies = job.implementationBinding.dependencyFiles.slice(1);
    if (gateDependencies.length !== semanticDependencies.length
      || gateDependencies.some((binding, index) =>
        binding.path !== semanticDependencies[index]?.path
        || binding.fileSha256 !== semanticDependencies[index]?.fileSha256)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.sourceGateBinding.gateAImplementationFiles',
      );
    }
    const semanticPackageCore = job.implementationBinding.files[0];
    const semanticTextLayout = job.implementationBinding.dependencyFiles[0];
    const manifestPackageCore = manifest.implementationBinding.files[0];
    const manifestRendererTrustImplementation = manifest.implementationBinding.files[2];
    if (manifestPackageCore.role !== semanticPackageCore.role
      || manifestPackageCore.path !== semanticPackageCore.path
      || manifestPackageCore.fileSha256 !== semanticPackageCore.fileSha256) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.implementationBinding.files',
      );
    }
    if (validateExpansionMapShape(expansionMap)
      && (manifestRendererTrustImplementation.path
          !== expansionMap.widthPolicyBinding.rendererTrustImplementation.path
        || manifestRendererTrustImplementation.fileSha256
          !== expansionMap.widthPolicyBinding.rendererTrustImplementation.fileSha256
        || semanticTextLayout.path
          !== expansionMap.widthPolicyBinding.textLayoutImplementation.path
        || semanticTextLayout.fileSha256
          !== expansionMap.widthPolicyBinding.textLayoutImplementation.fileSha256)) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.implementationBinding.files',
      );
    }
    const runtimeExpected = {
      nodeBinarySha256: job.expectedRuntime.nodeBinarySha256,
      nodeVersion: job.expectedRuntime.nodeVersion,
      icuVersion: job.expectedRuntime.icuVersion,
      resolvedLocale: job.expectedRuntime.resolvedLocale,
      resolvedGranularity: job.expectedRuntime.resolvedGranularity,
    };
    const manifestRuntime = {
      nodeBinarySha256: manifest.runtimeBinding.nodeBinarySha256,
      nodeVersion: manifest.runtimeBinding.nodeVersion,
      icuVersion: manifest.runtimeBinding.icuVersion,
      resolvedLocale: manifest.runtimeBinding.resolvedLocale,
      resolvedGranularity: manifest.runtimeBinding.resolvedGranularity,
    };
    const evidenceRuntime = validateEvidenceShape(evidence)
      ? {
        nodeBinarySha256: evidence.runtimeBinding.nodeBinarySha256,
        nodeVersion: evidence.runtimeBinding.nodeVersion,
        icuVersion: evidence.runtimeBinding.icuVersion,
        resolvedLocale: evidence.runtimeBinding.resolvedLocale,
        resolvedGranularity: evidence.runtimeBinding.resolvedGranularity,
      }
      : null;
    const embeddedRuntime = validateEmbeddedGateAReportShape(embeddedGateAReport)
      ? {
        nodeBinarySha256: embeddedGateAReport.runtimeBinding.nodeBinarySha256,
        nodeVersion: embeddedGateAReport.runtimeBinding.nodeVersion,
        icuVersion: embeddedGateAReport.runtimeBinding.icuVersion,
        resolvedLocale: embeddedGateAReport.runtimeBinding.resolvedLocale,
        resolvedGranularity: embeddedGateAReport.runtimeBinding.resolvedGranularity,
      }
      : null;
    if (!sameJson(runtimeExpected, manifestRuntime)
      || (evidenceRuntime !== null && !sameJson(manifestRuntime, evidenceRuntime))
      || (embeddedRuntime !== null && !sameJson(manifestRuntime, embeddedRuntime))) {
      addViolation(
        state,
        'PACKAGE_BINDING_MISMATCH',
        '$.sourcePackage.files[5].value.runtimeBinding',
      );
    }
    if (validateExpansionMapShape(expansionMap)
      && validateEmbeddedGateAReportShape(embeddedGateAReport)) {
      const width = expansionMap.widthPolicyBinding;
      const expectedExternalBindings = [
        {
          role: 'sourceAtoms',
          ...expansionMap.sourceBindings.sourceAtoms,
        },
        {
          role: 'sourceGenerationManifest',
          path: embeddedGateAReport.inputs[1].path,
          fileSha256: embeddedGateAReport.inputs[1].fileSha256,
          canonicalSha256: manifest.externalInputBindings[1].canonicalSha256,
        },
        {
          role: 'sourceValidationReport',
          path: embeddedGateAReport.inputs[2].path,
          fileSha256: embeddedGateAReport.inputs[2].fileSha256,
          canonicalSha256: manifest.externalInputBindings[2].canonicalSha256,
        },
        ...[
          ['presetRegistry', width.presetRegistry],
          ['presetValidationIndex', width.presetValidationIndex],
          ['materialValidationIndex', width.materialValidationIndex],
          ['registryBinding', width.registryBinding],
          ['rendererTrust', width.rendererTrust],
        ].map(([role, binding]) => ({role, ...binding})),
        {
          role: 'textLayoutImplementation',
          path: width.textLayoutImplementation.path,
          fileSha256: width.textLayoutImplementation.fileSha256,
          canonicalSha256: null,
        },
      ];
      if (!sameJson(manifest.externalInputBindings, expectedExternalBindings)) {
        addViolation(
          state,
          'PACKAGE_BINDING_MISMATCH',
          '$.sourcePackage.files[5].value.externalInputBindings',
        );
      }
    }
  }
  return {
    values: decoded,
    valid: !state.violations.some((item) => [
      'PACKAGE_FILE_SET_INVALID',
      'PACKAGE_SCHEMA_INVALID',
      'PACKAGE_STRICT_JSON_INVALID',
      'PACKAGE_BINDING_MISMATCH',
      'PACKAGE_HASH_MISMATCH',
    ].includes(item.code)),
  };
};

const logicalWidth = (text) => {
  let width = 0;
  for (const character of text) width += character.codePointAt(0) <= 0xff ? 1 : 2;
  return width;
};

const evaluateRawSemantic = (context, packageData, state) => {
  const observation = context.rawSemanticOutputInput;
  if (observation?.status !== 'read' || !Buffer.isBuffer(observation.snapshot?.bytes)) {
    if (observation?.status === 'missing') {
      addViolation(state, 'INPUT_HASH_MISMATCH', '$.inputBindings[1].fileSha256');
    } else {
      addViolation(state, 'INPUT_PATH_UNSAFE', '$.inputBindings[1].path');
    }
    return {kind: 'invalid', value: null};
  }
  if (!stableSnapshotSafe(observation.snapshot, context.job.value.semanticOutputBinding.path)) {
    addViolation(state, 'INPUT_PATH_UNSAFE', '$.inputBindings[1].path');
    return {kind: 'invalid', value: null};
  }
  if (shaBytes(observation.snapshot.bytes) !== context.job.value.semanticOutputBinding.fileSha256) {
    addViolation(state, 'INPUT_HASH_MISMATCH', '$.inputBindings[1].fileSha256');
  }
  const decoded = decodePresentationCaptionB1StrictJsonV001(observation.snapshot.bytes);
  if (decoded?.status !== 'decoded') {
    addViolation(state, 'SEMANTIC_OUTPUT_BYTES_INVALID', '$.rawSemanticOutput');
    return {kind: 'invalid', value: null};
  }
  const value = decoded.value;
  if (!isObject(value)) {
    addViolation(state, 'SEMANTIC_OUTPUT_SCHEMA_INVALID', '$.rawSemanticOutput.value');
    return {kind: 'invalid', value};
  }
  const allowedRoot = new Set(['status', 'containers']);
  const rootUnknown = Object.keys(value).filter((key) => !allowedRoot.has(key)).sort(compareUtf16);
  const rootKnownKeys = Object.keys(value).filter((key) => allowedRoot.has(key));
  rootUnknown.forEach((key) =>
    addViolation(state, 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD', `$.rawSemanticOutput.value.${key}`));
  if (value.status === 'abstained') {
    if (!sameArray(rootKnownKeys, ['status'])) {
      addViolation(state, 'SEMANTIC_OUTPUT_SCHEMA_INVALID', '$.rawSemanticOutput.value');
      return {kind: 'invalid', value};
    }
    return {kind: 'abstained', value};
  }
  if (value.status !== 'complete'
    || !sameArray(rootKnownKeys, ['status', 'containers'])
    || !Array.isArray(value.containers)) {
    addViolation(state, 'SEMANTIC_OUTPUT_SCHEMA_INVALID', '$.rawSemanticOutput.value');
    return {kind: 'invalid', value};
  }

  let scaffold = true;
  value.containers.forEach((container, index) => {
    const path = `$.rawSemanticOutput.value.containers[${index}]`;
    if (!isObject(container)) {
      addViolation(state, 'SEMANTIC_OUTPUT_SCHEMA_INVALID', path);
      scaffold = false;
      return;
    }
    const unknown = Object.keys(container)
      .filter((key) => !['containerId', 'meaningGroups'].includes(key))
      .sort(compareUtf16);
    const knownKeys = Object.keys(container)
      .filter((key) => ['containerId', 'meaningGroups'].includes(key));
    unknown.forEach((key) =>
      addViolation(state, 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD', `${path}.${key}`));
    if (!sameArray(knownKeys, ['containerId', 'meaningGroups'])
      || !isString(container.containerId)
      || !Array.isArray(container.meaningGroups)) {
      addViolation(state, 'SEMANTIC_OUTPUT_SCHEMA_INVALID', path);
      scaffold = false;
    }
  });
  if (!scaffold) return {kind: 'invalid', value};

  const sourceInput = packageData.values[2];
  const expectedContainers = sourceInput.containers;
  const actualIds = value.containers.map((container) => container.containerId);
  const expectedIds = expectedContainers.map((container) => container.containerId);
  const actualSet = new Set(actualIds);
  if (actualSet.size !== actualIds.length
    || actualIds.length !== expectedIds.length
    || expectedIds.some((id) => !actualSet.has(id))) {
    addViolation(
      state,
      'SEMANTIC_CONTAINER_SET_INVALID',
      '$.rawSemanticOutput.value.containers',
    );
  } else if (!sameArray(actualIds, expectedIds)) {
    const mismatch = actualIds.findIndex((id, index) => id !== expectedIds[index]);
    addViolation(
      state,
      'SEMANTIC_CONTAINER_ORDER_INVALID',
      `$.rawSemanticOutput.value.containers[${mismatch}].containerId`,
    );
  }

  const expectedContainerById = new Map(
    expectedContainers.map((container) => [container.containerId, container]),
  );
  const allCandidates = new Map();
  expectedContainers.forEach((container) => {
    container.boundaryCandidates.forEach((candidate, candidateIndex) => {
      allCandidates.set(candidate.boundaryCandidateId, {
        containerId: container.containerId,
        candidateIndex,
        candidate,
      });
    });
  });
  value.containers.forEach((container, containerIndex) => {
    const groups = container.meaningGroups;
    const containerPath = `$.rawSemanticOutput.value.containers[${containerIndex}]`;
    if (groups.length === 0) {
      addViolation(state, 'SEMANTIC_GROUP_INVALID', `${containerPath}.meaningGroups`);
      return;
    }
    const expectedContainer = expectedContainerById.get(container.containerId);
    if (!expectedContainer) return;
    const seen = new Set();
    let priorPosition = -1;
    let lastId = null;
    groups.forEach((group, groupIndex) => {
      const groupPath = `${containerPath}.meaningGroups[${groupIndex}]`;
      if (!isObject(group)) {
        addViolation(state, 'SEMANTIC_GROUP_INVALID', groupPath);
        return;
      }
      const unknown = Object.keys(group)
        .filter((key) => key !== 'lineEndBoundaryCandidateIds')
        .sort(compareUtf16);
      const knownKeys = Object.keys(group)
        .filter((key) => key === 'lineEndBoundaryCandidateIds');
      unknown.forEach((key) =>
        addViolation(state, 'SEMANTIC_OUTPUT_FORBIDDEN_FIELD', `${groupPath}.${key}`));
      if (!sameArray(knownKeys, ['lineEndBoundaryCandidateIds'])
        || !Array.isArray(group.lineEndBoundaryCandidateIds)) {
        addViolation(state, 'SEMANTIC_GROUP_INVALID', groupPath);
        return;
      }
      const ids = group.lineEndBoundaryCandidateIds;
      if (ids.length < 1 || ids.length > 2) {
        addViolation(
          state,
          'SEMANTIC_LINE_COUNT_INVALID',
          `${groupPath}.lineEndBoundaryCandidateIds`,
        );
      }
      ids.forEach((candidateId, lineIndex) => {
        const idPath = `${groupPath}.lineEndBoundaryCandidateIds[${lineIndex}]`;
        if (!isString(candidateId) || !allCandidates.has(candidateId)) {
          addViolation(state, 'SEMANTIC_BOUNDARY_ID_UNKNOWN', idPath);
          return;
        }
        const located = allCandidates.get(candidateId);
        if (located.containerId !== container.containerId) {
          addViolation(state, 'SEMANTIC_BOUNDARY_ID_CROSS_CONTAINER', idPath);
          return;
        }
        if (seen.has(candidateId)) addViolation(state, 'SEMANTIC_BOUNDARY_ID_DUPLICATE', idPath);
        seen.add(candidateId);
        if (located.candidateIndex <= priorPosition) {
          addViolation(state, 'SEMANTIC_BOUNDARY_ORDER_INVALID', idPath);
        }
        if (located.candidateIndex > priorPosition) {
          const lineCandidates = expectedContainer.boundaryCandidates
            .slice(priorPosition + 1, located.candidateIndex + 1);
          const width = lineCandidates.reduce((sum, candidate) => sum + candidate.logicalWidth, 0);
          const textWidth = logicalWidth(lineCandidates.map((candidate) => candidate.text).join(''));
          if (width > 36 || textWidth > 36 || width !== textWidth) {
            addViolation(state, 'SEMANTIC_LINE_WIDTH_EXCEEDED', idPath);
          }
        }
        priorPosition = located.candidateIndex;
        lastId = candidateId;
      });
    });
    const expectedLast = expectedContainer.boundaryCandidates.at(-1)
      ?.boundaryCandidateId;
    if (lastId !== expectedLast) {
      addViolation(state, 'SEMANTIC_CONTAINER_END_MISSING', `${containerPath}.meaningGroups`);
    }
  });
  const rawViolations = state.violations.filter((entry) =>
    CODE_INDEX.get(entry.code) >= CODE_INDEX.get('SEMANTIC_OUTPUT_BYTES_INVALID')
    && CODE_INDEX.get(entry.code) <= CODE_INDEX.get('SEMANTIC_LINE_WIDTH_EXCEEDED'));
  return {kind: rawViolations.length === 0 ? 'complete' : 'invalid', value};
};

const sourceSnapshotsForBuilder = (context) => context.sourcePackageObservation.artifactReads
  .map((entry) => entry.snapshot);

export function buildPresentationCaptionSemanticCompilerInputV001(context) {
  if (!exactKeys(context, ['sourcePackageSnapshots', 'rawSemanticOutputSnapshot'])
    || !Array.isArray(context.sourcePackageSnapshots)
    || context.sourcePackageSnapshots.length !== PACKAGE_FILES.length
    || !context.sourcePackageSnapshots.every((snapshot) =>
      isObject(snapshot) && Buffer.isBuffer(snapshot.bytes))
    || !isObject(context.rawSemanticOutputSnapshot)
    || !Buffer.isBuffer(context.rawSemanticOutputSnapshot.bytes)) {
    throw new TypeError('invalid compiler input context');
  }
  const decoded = context.sourcePackageSnapshots.map((snapshot) => {
    const result = decodePresentationCaptionB1StrictJsonV001(snapshot.bytes);
    if (result?.status !== 'decoded') throw new TypeError('invalid source package');
    return result.value;
  });
  const rawResult = decodePresentationCaptionB1StrictJsonV001(
    context.rawSemanticOutputSnapshot.bytes,
  );
  if (rawResult?.status !== 'decoded'
    || rawResult.value?.status !== 'complete') {
    throw new TypeError('complete semantic output required');
  }
  const [evidence, , sourceInput, expansionMap, , manifest, packageReport] = decoded;
  if (!validateEvidenceShape(evidence)
    || !validateSourceInputShape(sourceInput)
    || !validateExpansionMapShape(expansionMap)
    || !validateManifestShape(manifest)
    || !validatePackageReportShape(packageReport)) {
    throw new TypeError('invalid source package');
  }

  const evidenceById = new Map(
    evidence.boundaryCandidates.map((candidate) => [candidate.boundaryCandidateId, candidate]),
  );
  const sourceInputByContainer = new Map(
    sourceInput.containers.map((container) => [container.containerId, container]),
  );
  const containers = rawResult.value.containers.map((semanticContainer) => {
    const mapContainer = expansionMap.containers.find(
      (container) => container.containerId === semanticContainer.containerId,
    );
    const inputContainer = sourceInputByContainer.get(semanticContainer.containerId);
    if (!mapContainer || !inputContainer) throw new TypeError('unknown semantic container');
    const mapIndex = new Map(
      mapContainer.candidates.map((candidate, index) => [candidate.boundaryCandidateId, index]),
    );
    let prior = -1;
    return {
      containerId: mapContainer.containerId,
      timelineSegmentId: mapContainer.timelineSegmentId,
      speechId: mapContainer.speechId,
      meaningGroups: semanticContainer.meaningGroups.map((group, groupIndex) => ({
        meaningGroupOrdinal: groupIndex + 1,
        lines: group.lineEndBoundaryCandidateIds.map((endId, lineIndex) => {
          const endIndex = mapIndex.get(endId);
          if (!Number.isSafeInteger(endIndex) || endIndex <= prior) {
            throw new TypeError('semantic boundary order invalid');
          }
          const candidates = mapContainer.candidates.slice(prior + 1, endIndex + 1);
          const evidenceCandidates = candidates.map((candidate) => {
            const value = evidenceById.get(candidate.boundaryCandidateId);
            if (!value) throw new TypeError('missing evidence candidate');
            return value;
          });
          const line = {
            lineOrdinal: lineIndex + 1,
            startBoundaryCandidateId: candidates[0].boundaryCandidateId,
            endBoundaryCandidateId: candidates.at(-1).boundaryCandidateId,
            boundaryCandidateIds: candidates.map((candidate) => candidate.boundaryCandidateId),
            sourceAtomIds: candidates.flatMap((candidate) => candidate.sourceAtomIds),
            text: evidenceCandidates.map((candidate) => candidate.text).join(''),
            startAnchor: cloneJson(candidates[0].startAnchor),
            endAnchor: cloneJson(candidates.at(-1).endAnchor),
            logicalWidth: candidates.reduce((sum, candidate) => sum + candidate.logicalWidth, 0),
          };
          prior = endIndex;
          return line;
        }),
      })),
    };
  });

  const snapshotByFile = new Map(PACKAGE_FILES.map((fileName, index) => [
    fileName,
    context.sourcePackageSnapshots[index],
  ]));
  const binding = (fileName) => {
    const snapshot = snapshotByFile.get(fileName);
    const value = decoded[PACKAGE_FILES.indexOf(fileName)];
    return {
      path: snapshot.path,
      fileSha256: snapshot.fileSha256,
      canonicalSha256: canonicalSha(value),
    };
  };
  return {
    schemaVersion: COMPILER_SCHEMA,
    artifactId: manifest.artifactId,
    sourcePackageBinding: {
      manifest: binding('package-manifest.json'),
      validationReport: binding('package-validation-report.json'),
      semanticSourceInput: binding('semantic-source-input.json'),
      deterministicExpansionMap: binding('deterministic-expansion-map.json'),
    },
    semanticOutputBinding: {
      path: context.rawSemanticOutputSnapshot.path,
      fileSha256: context.rawSemanticOutputSnapshot.fileSha256,
      canonicalSha256: canonicalSha(rawResult.value),
    },
    containers,
  };
}

const validCompilerInputShape = (value) => exactKeys(value, [
  'schemaVersion',
  'artifactId',
  'sourcePackageBinding',
  'semanticOutputBinding',
  'containers',
])
  && value.schemaVersion === COMPILER_SCHEMA
  && isNonEmptyString(value.artifactId)
  && exactKeys(value.sourcePackageBinding, [
    'manifest',
    'validationReport',
    'semanticSourceInput',
    'deterministicExpansionMap',
  ])
  && Object.values(value.sourcePackageBinding).every((binding) =>
    exactKeys(binding, ['path', 'fileSha256', 'canonicalSha256'])
    && safePath(binding.path)
    && SHA256.test(binding.fileSha256 ?? '')
    && SHA256.test(binding.canonicalSha256 ?? ''))
  && exactKeys(value.semanticOutputBinding, ['path', 'fileSha256', 'canonicalSha256'])
  && safePath(value.semanticOutputBinding.path)
  && SHA256.test(value.semanticOutputBinding.fileSha256 ?? '')
  && SHA256.test(value.semanticOutputBinding.canonicalSha256 ?? '')
  && Array.isArray(value.containers)
  && value.containers.every((container) => exactKeys(container, [
    'containerId',
    'timelineSegmentId',
    'speechId',
    'meaningGroups',
  ])
    && isString(container.containerId)
    && isNonEmptyString(container.timelineSegmentId)
    && isOrdinal(container.speechId)
    && Array.isArray(container.meaningGroups)
    && container.meaningGroups.every((group, groupIndex) => exactKeys(group, [
      'meaningGroupOrdinal',
      'lines',
    ])
      && group.meaningGroupOrdinal === groupIndex + 1
      && Array.isArray(group.lines)
      && group.lines.length >= 1
      && group.lines.length <= 2
      && group.lines.every((line, lineIndex) => exactKeys(line, [
        'lineOrdinal',
        'startBoundaryCandidateId',
        'endBoundaryCandidateId',
        'boundaryCandidateIds',
        'sourceAtomIds',
        'text',
        'startAnchor',
        'endAnchor',
        'logicalWidth',
      ])
        && line.lineOrdinal === lineIndex + 1
        && isString(line.startBoundaryCandidateId)
        && isString(line.endBoundaryCandidateId)
        && Array.isArray(line.boundaryCandidateIds)
        && line.boundaryCandidateIds.length > 0
        && line.boundaryCandidateIds.every(isString)
        && Array.isArray(line.sourceAtomIds)
        && line.sourceAtomIds.length > 0
        && line.sourceAtomIds.every(isNonEmptyString)
        && isString(line.text)
        && validAnchor(line.startAnchor, 'start')
        && validAnchor(line.endAnchor, 'end')
        && isCount(line.logicalWidth))));

const flattenCompiler = (compiler) => {
  const lines = [];
  for (const [containerIndex, container] of compiler.containers.entries()) {
    for (const [groupIndex, group] of container.meaningGroups.entries()) {
      for (const [lineIndex, line] of group.lines.entries()) {
        lines.push({containerIndex, groupIndex, lineIndex, container, group, line});
      }
    }
  }
  return lines;
};

const firstDuplicateIndex = (values) => {
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    if (seen.has(values[index])) return index;
    seen.add(values[index]);
  }
  return -1;
};

const firstOrderReversal = (actual, expectedPositions) => {
  let previous = -1;
  for (let index = 0; index < actual.length; index += 1) {
    const position = expectedPositions.get(actual[index]);
    if (position === undefined) continue;
    if (position <= previous) return index;
    previous = position;
  }
  return -1;
};

const addExpansionViolations = (state, compiler, expected) => {
  const actualLines = flattenCompiler(compiler);
  const expectedLines = flattenCompiler(expected);
  const actualCandidates = actualLines.flatMap(({line}) => line.boundaryCandidateIds);
  const expectedCandidates = expectedLines.flatMap(({line}) => line.boundaryCandidateIds);
  const actualAtoms = actualLines.flatMap(({line}) => line.sourceAtomIds);
  const expectedAtoms = expectedLines.flatMap(({line}) => line.sourceAtomIds);
  const expectedCandidateSet = new Set(expectedCandidates);
  const expectedAtomSet = new Set(expectedAtoms);

  if (expectedCandidates.some((value) => !actualCandidates.includes(value))) {
    addViolation(state, 'EXPANSION_CANDIDATE_MISSING', '$.expanded.candidateIds');
  }
  const duplicateCandidate = firstDuplicateIndex(actualCandidates);
  if (duplicateCandidate >= 0) {
    addViolation(
      state,
      'EXPANSION_CANDIDATE_DUPLICATED',
      `$.expanded.candidateIds[${duplicateCandidate}]`,
    );
  }
  const candidatePositions = new Map(
    expectedCandidates.map((value, index) => [value, index]),
  );
  const reversedCandidate = firstOrderReversal(actualCandidates, candidatePositions);
  if (reversedCandidate >= 0) {
    addViolation(
      state,
      'EXPANSION_CANDIDATE_ORDER_REVERSED',
      `$.expanded.candidateIds[${reversedCandidate}]`,
    );
  }

  if (expectedAtoms.some((value) => !actualAtoms.includes(value))) {
    addViolation(state, 'EXPANSION_SOURCE_ATOM_MISSING', '$.expanded.sourceAtomIds');
  }
  const duplicateAtom = firstDuplicateIndex(actualAtoms);
  if (duplicateAtom >= 0) {
    addViolation(
      state,
      'EXPANSION_SOURCE_ATOM_DUPLICATED',
      `$.expanded.sourceAtomIds[${duplicateAtom}]`,
    );
  }
  const atomPositions = new Map(expectedAtoms.map((value, index) => [value, index]));
  const reversedAtom = firstOrderReversal(actualAtoms, atomPositions);
  if (reversedAtom >= 0) {
    addViolation(
      state,
      'EXPANSION_SOURCE_ATOM_ORDER_REVERSED',
      `$.expanded.sourceAtomIds[${reversedAtom}]`,
    );
  }

  const candidateOwner = new Map();
  const atomOwner = new Map();
  for (const [containerIndex, container] of expected.containers.entries()) {
    for (const group of container.meaningGroups) {
      for (const line of group.lines) {
        for (const candidateId of line.boundaryCandidateIds) {
          candidateOwner.set(candidateId, containerIndex);
        }
        for (const atomId of line.sourceAtomIds) atomOwner.set(atomId, containerIndex);
      }
    }
  }
  for (const {containerIndex, groupIndex, lineIndex, line} of actualLines) {
    const actualContainer = compiler.containers[containerIndex];
    const expectedContainer = expected.containers[containerIndex];
    const crossed = line.boundaryCandidateIds.some((candidateId) =>
      expectedCandidateSet.has(candidateId)
      && candidateOwner.get(candidateId) !== containerIndex)
      || line.sourceAtomIds.some((atomId) =>
        expectedAtomSet.has(atomId) && atomOwner.get(atomId) !== containerIndex)
      || actualContainer?.containerId !== expectedContainer?.containerId
      || actualContainer?.timelineSegmentId !== expectedContainer?.timelineSegmentId
      || actualContainer?.speechId !== expectedContainer?.speechId;
    if (crossed) {
      addViolation(
        state,
        'EXPANSION_CONTAINER_CROSSED',
        `$.compilerInput.containers[${containerIndex}].meaningGroups[${groupIndex}]`,
      );
    }
    const expectedLine = expectedLines.find((entry) =>
      entry.containerIndex === containerIndex
      && entry.groupIndex === groupIndex
      && entry.lineIndex === lineIndex)?.line;
    if (!expectedLine) continue;
    if (line.text !== expectedLine.text) {
      addViolation(
        state,
        'EXPANSION_TEXT_MISMATCH',
        `$.compilerInput.containers[${containerIndex}].meaningGroups[${groupIndex}].lines[${lineIndex}].text`,
      );
    }
    if (!sameJson(line.startAnchor, expectedLine.startAnchor)) {
      addViolation(
        state,
        'EXPANSION_ANCHOR_MISMATCH',
        `$.compilerInput.containers[${containerIndex}].meaningGroups[${groupIndex}].lines[${lineIndex}].startAnchor`,
      );
    }
    if (!sameJson(line.endAnchor, expectedLine.endAnchor)) {
      addViolation(
        state,
        'EXPANSION_ANCHOR_MISMATCH',
        `$.compilerInput.containers[${containerIndex}].meaningGroups[${groupIndex}].lines[${lineIndex}].endAnchor`,
      );
    }
  }
};

const observationEquivalent = (left, right) => {
  if (!isObject(left) || !isObject(right) || left.status !== right.status) return false;
  if (left.role !== right.role || left.path !== right.path) return false;
  if (left.status !== 'read') return sameJson(left, right);
  const resolutionEqual = left.role === 'nodeBinary'
    ? sameJson(
      left.snapshot?.externalPathResolutionObservation,
      right.snapshot?.externalPathResolutionObservation,
    )
    : sameJson(
      left.snapshot?.pathResolutionObservation,
      right.snapshot?.pathResolutionObservation,
    );
  return left.snapshot?.fileSha256 === right.snapshot?.fileSha256
    && sameJson(left.snapshot?.pathLstatBeforeOpen, right.snapshot?.pathLstatBeforeOpen)
    && sameJson(left.snapshot?.fdStatAfterOpen, right.snapshot?.fdStatAfterOpen)
    && sameJson(left.snapshot?.fdStatAfterRead, right.snapshot?.fdStatAfterRead)
    && resolutionEqual;
};

const contextShape = (context) => exactKeys(context, [
  'contextPhase',
  'job',
  'implementationInputs',
  'sourcePackageObservation',
  'rawSemanticOutputInput',
  'runtimeObservation',
  'compilerBuildPasses',
  'buildFailure',
  'readOnlyProcessObservation',
])
  && ['semantic-output-gate', 'final-report'].includes(context.contextPhase)
  && exactKeys(context.job, ['value', 'initialSnapshot', 'preReportInput'])
  && Array.isArray(context.implementationInputs)
  && exactKeys(context.sourcePackageObservation, ['directoryEntries', 'artifactReads'])
  && Array.isArray(context.sourcePackageObservation.directoryEntries)
  && Array.isArray(context.sourcePackageObservation.artifactReads)
  && Array.isArray(context.compilerBuildPasses)
  && isObject(context.readOnlyProcessObservation);

const checkSemanticOutputInternal = (context) => {
  if (!contextShape(context)) return {status: 'context-invalid'};
  const state = {keys: new Set(), violations: []};
  const statuses = new Map();
  const jobResult = validatePresentationCaptionSemanticOutputCheckJobV001(context.job.value);
  if (jobResult.status !== 'valid') {
    addViolation(state, 'CAPTION_B1_JOB_INVALID', '$.job.value');
    statuses.set('jobBinding', 'failed');
  } else {
    statuses.set('jobBinding', 'passed');
  }

  const job = context.job.value;
  const implementationOk = jobResult.status === 'valid'
    && context.implementationInputs.length === 7
    && context.implementationInputs.every((observation, index) => {
      const binding = index < 3
        ? job.implementationBinding.files[index]
        : job.implementationBinding.dependencyFiles[index - 3];
      return observationSafe(observation, binding);
    })
    && validateSemanticImportGraph(context.implementationInputs);
  if (jobResult.status !== 'valid') {
    statuses.set('implementationBinding', 'not_run_with_upstream_failure');
  } else {
    if (!implementationOk) {
      addViolation(state, 'IMPLEMENTATION_MISMATCH', '$.implementationBindings[0]');
    }
    statuses.set('implementationBinding', implementationOk ? 'passed' : 'failed');
  }

  let rawPathOk = false;
  if (jobResult.status === 'valid') {
    const raw = context.rawSemanticOutputInput;
    rawPathOk = raw?.role === 'rawSemanticOutput'
      && raw.path === job.semanticOutputBinding.path
      && ['read', 'missing', 'observed-unsafe', 'lexically-rejected'].includes(raw.status)
      && (raw.status !== 'read'
        || stableSnapshotSafe(raw.snapshot, job.semanticOutputBinding.path));
    if (!rawPathOk || ['observed-unsafe', 'lexically-rejected'].includes(raw?.status)) {
      addViolation(state, 'INPUT_PATH_UNSAFE', '$.inputBindings[1].path');
    } else if (raw.status === 'missing') {
      addViolation(state, 'INPUT_HASH_MISMATCH', '$.inputBindings[1].fileSha256');
    } else if (raw.snapshot.fileSha256 !== job.semanticOutputBinding.fileSha256
      || shaBytes(raw.snapshot.bytes) !== job.semanticOutputBinding.fileSha256) {
      addViolation(state, 'INPUT_HASH_MISMATCH', '$.inputBindings[1].fileSha256');
    }
    statuses.set(
      'inputBinding',
      state.violations.some((entry) => ['INPUT_PATH_UNSAFE', 'INPUT_HASH_MISMATCH'].includes(entry.code))
        ? 'failed'
        : 'passed',
    );
  } else {
    statuses.set('inputBinding', 'not_run_with_upstream_failure');
  }

  const runtime = context.runtimeObservation;
  const runtimeOk = jobResult.status === 'valid'
    && isObject(runtime)
    && externalSnapshotSafe(runtime.nodeBinaryInput)
    && runtime.nodeBinaryInput.snapshot?.fileSha256 === job.expectedRuntime.nodeBinarySha256
    && runtime.nodeVersion === job.expectedRuntime.nodeVersion
    && runtime.icuVersion === job.expectedRuntime.icuVersion
    && runtime.resolvedLocale === job.expectedRuntime.resolvedLocale
    && runtime.resolvedGranularity === job.expectedRuntime.resolvedGranularity;
  if (jobResult.status !== 'valid') {
    statuses.set('runtimeBinding', 'not_run_with_upstream_failure');
  } else {
    if (!runtimeOk) addViolation(state, 'RUNTIME_MISMATCH', '$.runtime');
    statuses.set('runtimeBinding', runtimeOk ? 'passed' : 'failed');
  }

  let packageData = {values: [], valid: false};
  if (jobResult.status === 'valid') {
    packageData = observePackage(context, state);
    statuses.set('packageShape', packageData.valid ? 'passed' : 'failed');
  } else {
    statuses.set('packageShape', 'not_run_with_upstream_failure');
  }

  let semantic = {kind: 'invalid', value: null};
  if (jobResult.status === 'valid'
    && packageData.valid
    && statuses.get('inputBinding') === 'passed') {
    const before = state.violations.length;
    semantic = evaluateRawSemantic(context, packageData, state);
    statuses.set('semanticOutput', state.violations.length === before ? 'passed' : 'failed');
  } else {
    statuses.set('semanticOutput', 'not_run_with_upstream_failure');
  }

  const intermediate = context.contextPhase === 'semantic-output-gate';
  if (intermediate) {
    if (context.compilerBuildPasses.length !== 0
      || context.buildFailure !== null
      || context.readOnlyProcessObservation.mode !== 'not-attempted'
      || context.job.preReportInput !== null) {
      return {status: 'context-invalid'};
    }
    for (const name of CHECK_NAMES.slice(6)) statuses.set(name, 'not_evaluated_in_phase');
  } else {
    const abstained = semantic.kind === 'abstained'
      && statuses.get('semanticOutput') === 'passed';
    const complete = semantic.kind === 'complete'
      && statuses.get('semanticOutput') === 'passed';
    if (abstained) {
      for (const name of CHECK_NAMES.slice(6, 10)) {
        statuses.set(name, 'not_applicable_by_abstention');
      }
    } else if (!complete) {
      for (const name of CHECK_NAMES.slice(6, 10)) {
        statuses.set(name, 'not_run_with_upstream_failure');
      }
    } else {
      const passes = context.compilerBuildPasses;
      const failure = context.buildFailure;
      const validCopyRecord = (record) => exactKeys(record, [
        'path',
        'beforeSha256',
        'afterSha256',
        'unchanged',
      ])
        && isNonEmptyString(record.path)
        && SHA256.test(record.beforeSha256 ?? '')
        && SHA256.test(record.afterSha256 ?? '')
        && record.unchanged === (record.beforeSha256 === record.afterSha256)
        && record.unchanged === true;
      const validPass = (pass) => {
        if (!exactKeys(pass, [
          'value',
          'bytes',
          'fileSha256',
          'canonicalSha256',
          'inputByteCopies',
        ])
          || !isObject(pass.value)
          || !Buffer.isBuffer(pass.bytes)
          || !Array.isArray(pass.inputByteCopies)
          || !pass.inputByteCopies.every(validCopyRecord)) {
          return false;
        }
        const expectedBytes = formalBytes(pass.value);
        return Buffer.isBuffer(expectedBytes)
          && expectedBytes.equals(pass.bytes)
          && pass.fileSha256 === shaBytes(pass.bytes)
          && pass.canonicalSha256 === canonicalSha(pass.value);
      };
      const buildOk = Array.isArray(passes)
        && passes.length === 2
        && passes.every(validPass)
        && failure === null;
      if (!buildOk) {
        addViolation(state, 'BUILD_FAILED', '$.builds.buildFailure');
        statuses.set('compilerBuild', 'failed');
        statuses.set('compilerInput', 'not_run_with_upstream_failure');
        statuses.set('deterministicExpansion', 'not_run_with_upstream_failure');
        statuses.set('determinism', 'not_run_with_upstream_failure');
      } else {
        statuses.set('compilerBuild', 'passed');
        const compiler = passes[0].value;
        const schemaOk = validCompilerInputShape(compiler);
        if (!schemaOk) {
          addViolation(state, 'COMPILER_INPUT_SCHEMA_INVALID', '$.compilerInput');
          statuses.set('compilerInput', 'failed');
          statuses.set('deterministicExpansion', 'not_run_with_upstream_failure');
          statuses.set('determinism', 'not_run_with_upstream_failure');
        } else {
          const expectedContext = {
            sourcePackageSnapshots: sourceSnapshotsForBuilder(context),
            rawSemanticOutputSnapshot: context.rawSemanticOutputInput.snapshot,
          };
          let expected = null;
          try {
            expected = buildPresentationCaptionSemanticCompilerInputV001(expectedContext);
          } catch {
            expected = null;
          }
          const bindingOk = expected !== null
            && sameJson(compiler.sourcePackageBinding, expected.sourcePackageBinding)
            && sameJson(compiler.semanticOutputBinding, expected.semanticOutputBinding)
            && compiler.artifactId === expected.artifactId;
          if (!bindingOk) {
            addViolation(
              state,
              'COMPILER_INPUT_BINDING_MISMATCH',
              '$.compilerInput.sourcePackageBinding',
            );
            statuses.set('compilerInput', 'failed');
            statuses.set('deterministicExpansion', 'not_run_with_upstream_failure');
            statuses.set('determinism', 'not_run_with_upstream_failure');
          } else {
            statuses.set('compilerInput', 'passed');
            const beforeExpansion = state.violations.length;
            addExpansionViolations(state, compiler, expected);
            const expansionOk = state.violations.length === beforeExpansion;
            statuses.set('deterministicExpansion', expansionOk ? 'passed' : 'failed');
            const deterministic = passes[0].bytes.equals(passes[1].bytes)
              && passes[0].fileSha256 === passes[1].fileSha256
              && passes[0].canonicalSha256 === passes[1].canonicalSha256;
            if (!deterministic) {
              addViolation(state, 'NONDETERMINISTIC', '$.builds.compilerBuildPasses');
            }
            statuses.set('determinism', deterministic ? 'passed' : 'failed');
          }
        }
      }
    }

    const readOnly = context.readOnlyProcessObservation;
    if (readOnly?.mode !== 'observed') {
      statuses.set('readOnlyCheck', 'not_run_with_upstream_failure');
    } else {
      const expectedBefore = jobResult.status === 'valid'
        ? job.readOnlyGuard.expectedBeforeCanonicalSha256
        : null;
      const beforeSha = canonicalSha(readOnly.beforeEntries);
      const afterSha = canonicalSha(readOnly.afterEntries);
      let inputSame = true;
      if (readOnly.inputReread?.status === 'completed') {
        const initial = readOnly.inputReread.initialInputs;
        const final = readOnly.inputReread.finalInputs;
        inputSame = Array.isArray(initial)
          && Array.isArray(final)
          && initial.length === final.length
          && initial.every((entry, index) =>
            entry.role === final[index]?.role
            && observationEquivalent(entry.observation, final[index]?.observation));
      } else {
        inputSame = false;
      }
      const unchanged = beforeSha !== null
        && beforeSha === expectedBefore
        && beforeSha === afterSha
        && inputSame
        && Array.isArray(readOnly.attemptedWriteCalls)
        && readOnly.attemptedWriteCalls.length === 0;
      if (!unchanged) addViolation(state, 'READ_ONLY_CONTRACT_VIOLATED', '$.readOnly');
      statuses.set('readOnlyCheck', unchanged ? 'passed' : 'failed');
    }

    const preReport = context.job.preReportInput;
    const stable = preReport?.status === 'read'
      && context.job.initialSnapshot?.fileSha256 === preReport.snapshot?.fileSha256
      && sameJson(
        context.job.initialSnapshot?.pathLstatBeforeOpen,
        preReport.snapshot?.pathLstatBeforeOpen,
      )
      && sameJson(
        context.job.initialSnapshot?.fdStatAfterOpen,
        preReport.snapshot?.fdStatAfterOpen,
      )
      && sameJson(
        context.job.initialSnapshot?.fdStatAfterRead,
        preReport.snapshot?.fdStatAfterRead,
      );
    if (!stable) addViolation(state, 'JOB_FILE_MISMATCH', '$.job.preReportInput');
    statuses.set('jobStability', stable ? 'passed' : 'failed');
  }

  const violations = sortedViolations(state.violations);
  const checks = CHECK_NAMES.map((name) => {
    const assigned = violations
      .filter((entry) => {
        if (entry.code === 'JOB_FILE_MISMATCH') return name === 'jobStability';
        if (entry.code === 'IMPLEMENTATION_MISMATCH') return name === 'implementationBinding';
        if (['INPUT_PATH_UNSAFE', 'INPUT_HASH_MISMATCH', 'INPUT_SCHEMA_UNSUPPORTED']
          .includes(entry.code)) return name === 'inputBinding';
        if (entry.code === 'RUNTIME_MISMATCH') return name === 'runtimeBinding';
        if (entry.code.startsWith('PACKAGE_')) return name === 'packageShape';
        if (entry.code.startsWith('SEMANTIC_')) return name === 'semanticOutput';
        if (entry.code === 'BUILD_FAILED') return name === 'compilerBuild';
        if (entry.code.startsWith('COMPILER_')) return name === 'compilerInput';
        if (entry.code.startsWith('EXPANSION_')) return name === 'deterministicExpansion';
        if (entry.code === 'NONDETERMINISTIC') return name === 'determinism';
        if (entry.code === 'READ_ONLY_CONTRACT_VIOLATED') return name === 'readOnlyCheck';
        if (entry.code === 'CAPTION_B1_JOB_INVALID') return name === 'jobBinding';
        return false;
      })
      .map((entry) => entry.code);
    return {
      name,
      status: statuses.get(name),
      violationCodes: [...new Set(assigned)].sort(
        (left, right) => CODE_INDEX.get(left) - CODE_INDEX.get(right),
      ),
    };
  });
  return {status: 'checked', checks, violations};
};

export function checkPresentationCaptionSemanticOutputV001(context) {
  try {
    return checkSemanticOutputInternal(context);
  } catch {
    return {status: 'context-invalid'};
  }
}

const validateCheckArray = (checks) => Array.isArray(checks)
  && checks.length === CHECK_NAMES.length
  && checks.every((check, index) => exactKeys(check, ['name', 'status', 'violationCodes'])
    && check.name === CHECK_NAMES[index]
    && ['passed', 'failed', 'not_run_with_upstream_failure',
      'not_applicable_by_abstention'].includes(check.status)
    && Array.isArray(check.violationCodes));

const validateReportShape = (report) => exactKeys(report, [
  'schemaVersion',
  'status',
  'failureStage',
  'jobBinding',
  'implementationBinding',
  'runtimeBinding',
  'inputBindings',
  'checks',
  'violations',
  'observedProjection',
  'compilerInput',
  'readOnlyObservation',
  'scope',
])
  && report.schemaVersion === REPORT_SCHEMA
  && ['passed', 'abstained', 'failed'].includes(report.status)
  && (report.failureStage === null || CHECK_NAMES.includes(report.failureStage))
  && exactKeys(report.jobBinding, ['path', 'fileSha256'])
  && exactKeys(report.implementationBinding, ['gitCommit', 'files', 'dependencyFiles'])
  && isObject(report.runtimeBinding)
  && exactKeys(report.inputBindings, [
    'sourcePackageManifest',
    'sourcePackageValidationReport',
    'rawSemanticOutput',
  ])
  && validateCheckArray(report.checks)
  && Array.isArray(report.violations)
  && exactKeys(report.observedProjection, [
    'containerCount',
    'meaningGroupCount',
    'lineCount',
    'boundaryCandidateCount',
    'sourceAtomCount',
    'maximumObservedLineLogicalWidth',
  ])
  && exactKeys(report.compilerInput, [
    'status',
    'canonicalSha256',
    'observedByteSha256',
  ])
  && exactKeys(report.readOnlyObservation, [
    'status',
    'beforeCanonicalSha256',
    'afterCanonicalSha256',
    'unchanged',
  ])
  && exactKeys(report.scope, [
    'validatedState',
    'semanticQualityVerified',
    'naturalBreakQualityVerified',
    'renderReadabilityVerified',
  ])
  && report.scope.validatedState === 'semantic-boundary-selection-only'
  && report.scope.semanticQualityVerified === false
  && report.scope.naturalBreakQualityVerified === false
  && report.scope.renderReadabilityVerified === false;

const safeRuntimeBinding = (runtime) => ({
  nodeBinarySha256: runtime.nodeBinaryInput.snapshot.fileSha256,
  nodeVersion: runtime.nodeVersion,
  icuVersion: runtime.icuVersion,
  resolvedLocale: runtime.resolvedLocale,
  resolvedGranularity: runtime.resolvedGranularity,
  diagnostics: {
    nodeExecutableFileName: runtime.diagnostics.resolvedNodePath
      .split('/')
      .filter(Boolean)
      .at(-1),
    platform: runtime.diagnostics.platform,
    arch: runtime.diagnostics.arch,
    v8Version: runtime.diagnostics.v8Version,
    unicodeVersion: runtime.diagnostics.unicodeVersion,
    cldrVersion: runtime.diagnostics.cldrVersion,
  },
});

const deriveExpectedSemanticReport = (checkerContext, checked) => {
  const job = checkerContext.job.value;
  const failed = checked.checks.find((check) => check.status === 'failed');
  const rawDecoded = checkerContext.rawSemanticOutputInput.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(
      checkerContext.rawSemanticOutputInput.snapshot.bytes,
    )
    : null;
  const abstained = !failed
    && rawDecoded?.status === 'decoded'
    && rawDecoded.value?.status === 'abstained';
  const status = failed ? 'failed' : abstained ? 'abstained' : 'passed';
  const artifacts = checkerContext.sourcePackageObservation.artifactReads;
  const manifestDecoded = artifacts[5]?.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(artifacts[5].snapshot.bytes)
    : null;
  const packageReportDecoded = artifacts[6]?.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(artifacts[6].snapshot.bytes)
    : null;
  const compiler = status === 'passed'
    ? checkerContext.compilerBuildPasses[0]
    : null;
  const lines = compiler
    ? flattenCompiler(compiler.value).map((entry) => entry.line)
    : [];
  const readOnly = checkerContext.readOnlyProcessObservation;
  const beforeSha256 = readOnly.mode === 'observed'
    ? canonicalSha(readOnly.beforeEntries)
    : null;
  const afterSha256 = readOnly.mode === 'observed'
    ? canonicalSha(readOnly.afterEntries)
    : null;
  const readOnlyCheck = checked.checks.find((check) => check.name === 'readOnlyCheck');
  return {
    schemaVersion: REPORT_SCHEMA,
    status,
    failureStage: failed?.name ?? null,
    jobBinding: {
      path: checkerContext.job.initialSnapshot.path,
      fileSha256: checkerContext.job.initialSnapshot.fileSha256,
    },
    implementationBinding: {
      gitCommit: job.implementationBinding.gitCommit,
      files: job.implementationBinding.files.map((entry) => ({...entry})),
      dependencyFiles: job.implementationBinding.dependencyFiles.map((entry) => ({...entry})),
    },
    runtimeBinding: safeRuntimeBinding(checkerContext.runtimeObservation),
    inputBindings: {
      sourcePackageManifest: {
        path: job.sourcePackageBinding.manifest.path,
        fileSha256: artifacts[5]?.snapshot?.fileSha256 ?? null,
        canonicalSha256: manifestDecoded?.status === 'decoded'
          ? canonicalSha(manifestDecoded.value)
          : null,
      },
      sourcePackageValidationReport: {
        path: job.sourcePackageBinding.validationReport.path,
        fileSha256: artifacts[6]?.snapshot?.fileSha256 ?? null,
        canonicalSha256: packageReportDecoded?.status === 'decoded'
          ? canonicalSha(packageReportDecoded.value)
          : null,
      },
      rawSemanticOutput: {
        path: job.semanticOutputBinding.path,
        observationStatus: checkerContext.rawSemanticOutputInput.status,
        fileSha256: checkerContext.rawSemanticOutputInput.snapshot?.fileSha256 ?? null,
        canonicalSha256: rawDecoded?.status === 'decoded'
          ? canonicalSha(rawDecoded.value)
          : null,
      },
    },
    checks: checked.checks.map((check) => ({
      name: check.name,
      status: check.status,
      violationCodes: [...check.violationCodes],
    })),
    violations: checked.violations.map((violation) => ({
      code: violation.code,
      path: violation.path,
      details: {},
    })),
    observedProjection: status === 'passed'
      ? {
        containerCount: compiler.value.containers.length,
        meaningGroupCount: compiler.value.containers.reduce(
          (sum, container) => sum + container.meaningGroups.length,
          0,
        ),
        lineCount: lines.length,
        boundaryCandidateCount: lines.reduce(
          (sum, line) => sum + line.boundaryCandidateIds.length,
          0,
        ),
        sourceAtomCount: lines.reduce((sum, line) => sum + line.sourceAtomIds.length, 0),
        maximumObservedLineLogicalWidth: Math.max(
          ...lines.map((line) => line.logicalWidth),
        ),
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
        canonicalSha256: compiler.canonicalSha256,
        observedByteSha256: compiler.fileSha256,
      }
      : {
        status: 'not_generated',
        canonicalSha256: null,
        observedByteSha256: null,
      },
    readOnlyObservation: {
      status: readOnly.inputReread?.status === 'completed'
        ? 'verified'
        : 'not-run-with-upstream-failure',
      beforeCanonicalSha256: beforeSha256,
      afterCanonicalSha256: afterSha256,
      unchanged: readOnly.inputReread?.status === 'completed'
        ? readOnlyCheck?.status === 'passed'
        : null,
    },
    scope: {
      validatedState: 'semantic-boundary-selection-only',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      renderReadabilityVerified: false,
    },
  };
};

const validateSemanticOutputReportInternal = (context) => {
  if (!exactKeys(context, ['report', 'reportBytes', 'expectedExitCode', 'checkerContext'])
    || !Buffer.isBuffer(context.reportBytes)
    || ![0, 1].includes(context.expectedExitCode)
    || context.checkerContext?.contextPhase !== 'final-report'
    || !validateReportShape(context.report)) {
    return {valid: false};
  }
  const decoded = decodePresentationCaptionB1StrictJsonV001(context.reportBytes);
  const serialized = formalBytes(context.report);
  if (decoded?.status !== 'decoded'
    || !sameJson(decoded.value, context.report)
    || !serialized
    || !serialized.equals(context.reportBytes)) {
    return {valid: false};
  }
  const checked = checkPresentationCaptionSemanticOutputV001(context.checkerContext);
  if (checked.status !== 'checked'
    || !sameJson(checked.checks, context.report.checks)
    || !sameJson(checked.violations, context.report.violations)) {
    return {valid: false};
  }
  const failed = checked.checks.find((check) => check.status === 'failed');
  const semanticResult = context.checkerContext.rawSemanticOutputInput?.status === 'read'
    ? decodePresentationCaptionB1StrictJsonV001(
      context.checkerContext.rawSemanticOutputInput.snapshot.bytes,
    )
    : null;
  const expectedStatus = failed
    ? 'failed'
    : semanticResult?.status === 'decoded' && semanticResult.value?.status === 'abstained'
      ? 'abstained'
      : 'passed';
  const expectedExit = expectedStatus === 'passed' ? 0 : 1;
  if (context.report.status !== expectedStatus
    || context.report.failureStage !== (failed?.name ?? null)
    || context.expectedExitCode !== expectedExit) {
    return {valid: false};
  }
  let expectedReport;
  try {
    expectedReport = deriveExpectedSemanticReport(context.checkerContext, checked);
  } catch {
    return {valid: false};
  }
  if (!sameJson(context.report, expectedReport)) return {valid: false};
  return {valid: true};
};

export function validatePresentationCaptionSemanticOutputValidationReportV001(context) {
  try {
    return validateSemanticOutputReportInternal(context);
  } catch {
    return {valid: false};
  }
}

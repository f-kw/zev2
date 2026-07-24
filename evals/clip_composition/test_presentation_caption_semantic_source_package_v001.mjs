import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';

import * as packageCore from './presentation_caption_semantic_source_package_v001.mjs';
import * as packageRunner from './run_presentation_caption_semantic_source_package_job_v001.mjs';
import {
  buildPresentationSegmenterBoundaryEvidenceV001,
  checkPresentationSegmenterBoundaryPreflightV001,
} from './presentation_segmenter_boundary_evidence_v001.mjs';
import {
  verifyPresentationFirstRealDataFileReferenceV001,
} from './presentation_first_real_data_gate_v001.mjs';

const EXPECTED_CORE_EXPORTS = Object.freeze([
  'PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001',
  'assertPresentationCaptionB1StrictValueV001',
  'buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001',
  'buildPresentationCaptionSemanticSourcePackageV001',
  'canonicalizePresentationCaptionB1JsonV001',
  'checkPresentationCaptionSemanticSourcePackageV001',
  'decodePresentationCaptionB1StrictJsonV001',
  'derivePresentationCaptionEmbeddedGateAReportContextV001',
  'serializePresentationCaptionB1FormalJsonV001',
  'sha256PresentationCaptionB1BytesV001',
  'validatePresentationCaptionSemanticSourcePackageJobV001',
  'validatePresentationCaptionSemanticSourcePackageRunReportV001',
]);

const EXPECTED_RUNNER_EXPORTS = Object.freeze([
  'createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001',
  'inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001',
  'runPresentationCaptionSemanticSourcePackageCliV001',
  'runPresentationCaptionSemanticSourcePackageV001',
]);

const EXPECTED_VIOLATION_CODES = Object.freeze([
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

const bytes = (text) => Buffer.from(text, 'utf8');

test('package coreの公開入口と違反コードは承認済み集合だけである', () => {
  assert.deepEqual(Object.keys(packageCore).sort(), [...EXPECTED_CORE_EXPORTS].sort());
  assert.equal(Object.isFrozen(packageCore.PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001), true);
  assert.deepEqual(
    packageCore.PRESENTATION_CAPTION_B1_VIOLATION_CODES_V001,
    EXPECTED_VIOLATION_CODES,
  );
});

test('package runnerの公開入口は承認済み4件だけである', () => {
  assert.deepEqual(Object.keys(packageRunner).sort(), [...EXPECTED_RUNNER_EXPORTS].sort());
  const adapter =
    packageRunner.createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001();
  assert.equal(Object.isFrozen(adapter), true);
  assert.deepEqual(Object.keys(adapter), [
    'openReadOnly',
    'openWriteExclusive',
    'openDirectoryReadOnly',
    'lstatBigInt',
    'realpath',
    'readdirWithTypes',
    'readlink',
    'mkdirExclusive',
    'mkdir',
    'rename',
    'removeEmptyDirectory',
  ]);
  Object.values(adapter).forEach((entry) => assert.equal(typeof entry, 'function'));
});

test('package production読取handleは固定3入口・同期one-use・AsyncIterableで同一内容を返す', async () => {
  const adapter =
    packageRunner.createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001();
  const absolutePath = resolve(WORKSPACE_ROOT, PACKAGE_RUNNER_REPOSITORY_PATH);
  const expectedBytes = readFileSync(absolutePath);
  const handle = await adapter.openReadOnly(absolutePath);
  assert.equal(Object.isFrozen(handle), true);
  assert.deepEqual(Object.keys(handle), [
    'statBigInt',
    'readChunksV001',
    'close',
  ]);
  const before = await handle.statBigInt();
  const chunks = handle.readChunksV001();
  assert.equal(Buffer.isBuffer(chunks), false);
  assert.equal(Array.isArray(chunks), false);
  assert.equal(typeof chunks.then, 'undefined');
  assert.equal(typeof chunks[Symbol.asyncIterator], 'function');
  assert.throws(
    () => handle.readChunksV001(),
    /readChunksV001 may only be called once/u,
  );
  const iterator = chunks[Symbol.asyncIterator]();
  assert.throws(
    () => chunks[Symbol.asyncIterator](),
    /chunk AsyncIterable may only be iterated once/u,
  );
  const observed = [];
  for (;;) {
    const item = await iterator.next();
    if (item.done) break;
    observed.push(Buffer.from(item.value));
  }
  const after = await handle.statBigInt();
  await handle.close();
  assert.equal(Buffer.concat(observed).equals(expectedBytes), true);
  assert.equal(before.size, BigInt(expectedBytes.length));
  assert.equal(after.size, before.size);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
});

test('R3:3.38GB実fileのchunk hash/countは独立helperと完全一致し全byteを保持しない', async () => {
  const reference = Object.freeze({
    path:
      'evals/clip_composition/outputs/presentation/base-media/'
      + '.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le',
    fileSha256: '219cd4af6e6560a0819bbca67fe36433cdb5e3f4b3260b42a5285093e9030209',
  });
  const expectedSize = 3_384_584_064n;
  assert.deepEqual(
    await verifyPresentationFirstRealDataFileReferenceV001(reference),
    reference,
  );
  const adapter =
    packageRunner.createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001();
  const handle = await adapter.openReadOnly(resolve(WORKSPACE_ROOT, reference.path));
  const before = await handle.statBigInt();
  const hash = createHash('sha256');
  let byteCount = 0n;
  for await (const chunk of handle.readChunksV001()) {
    assert.equal(Buffer.isBuffer(chunk), true);
    assert.equal(chunk.length > 0, true);
    hash.update(chunk);
    byteCount += BigInt(chunk.length);
  }
  const after = await handle.statBigInt();
  await handle.close();
  assert.equal(byteCount, expectedSize);
  assert.equal(hash.digest('hex'), reference.fileSha256);
  assert.equal(before.size, expectedSize);
  assert.equal(after.size, expectedSize);
  assert.equal(after.dev, before.dev);
  assert.equal(after.ino, before.ino);
  assert.equal(after.mtimeNs, before.mtimeNs);
});

test('strict JSONは適法なescapeと補助平面文字を無変更で往復する', () => {
  const original = {
    quote: '"',
    slash: '\\',
    newline: '\n',
    supplementary: '😀',
  };
  const formal = packageCore.serializePresentationCaptionB1FormalJsonV001(original);
  assert.equal(formal.status, 'serialized');
  const decoded = packageCore.decodePresentationCaptionB1StrictJsonV001(formal.bytes);
  assert.equal(decoded.status, 'decoded');
  assert.equal(Object.getPrototypeOf(decoded.value), null);
  assert.deepEqual({...decoded.value}, original);
});

for (const [name, input, reason] of [
  ['不正UTF-8', Buffer.from([0xc3, 0x28]), 'invalid-utf8'],
  ['BOM', Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]), 'bom-present'],
  ['構文不成立', bytes('{"x":}'), 'syntax-invalid'],
  ['後続文字', bytes('{} trailing'), 'trailing-content'],
  ['複数JSON値', bytes('{} {}'), 'trailing-content'],
  ['重複key', bytes('{"x":1,"x":2}'), 'duplicate-key'],
  ['小数token', bytes('{"x":1.0}'), 'number-invalid'],
  ['指数token', bytes('{"x":1e2}'), 'number-invalid'],
  ['巨大指数', bytes('{"x":1e9999}'), 'number-invalid'],
  ['負のゼロ', bytes('{"x":-0}'), 'number-invalid'],
  ['孤立surrogate', bytes('{"x":"\\ud800"}'), 'surrogate-invalid'],
  ['code fence', bytes('```json\n{}\n```'), 'code-fence'],
]) {
  test(`strict JSONは${name}を拒否する`, () => {
    assert.deepEqual(
      packageCore.decodePresentationCaptionB1StrictJsonV001(input),
      {status: 'invalid', reason},
    );
  });
}

test('strict decodeはBuffer以外を不正引数としてthrowせず拒否する', () => {
  assert.equal(packageCore.decodePresentationCaptionB1StrictJsonV001('{}').status, 'invalid');
});

test('strict in-memory検査はJSON正式値だけを受理する', () => {
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001({
      empty: [],
      text: '保持',
      integer: 1,
      boolean: false,
      nothing: null,
    }),
    {status: 'valid'},
  );
});

const invalidMemoryCases = [
  ['undefined', undefined, 'unsupported-value'],
  ['function', () => {}, 'unsupported-value'],
  ['symbol', Symbol('x'), 'unsupported-value'],
  ['BigInt', 1n, 'unsupported-value'],
  ['NaN', Number.NaN, 'number-invalid'],
  ['Infinity', Number.POSITIVE_INFINITY, 'number-invalid'],
  ['小数', 0.04, 'number-invalid'],
  ['負のゼロ', -0, 'number-invalid'],
  ['safe integer外', Number.MAX_SAFE_INTEGER + 1, 'number-invalid'],
  ['Date', new Date(0), 'non-plain-object'],
  ['Map', new Map(), 'non-plain-object'],
  ['孤立surrogate', '\ud800', 'surrogate-invalid'],
];

for (const [name, value, reason] of invalidMemoryCases) {
  test(`strict in-memory検査は${name}を拒否する`, () => {
    assert.deepEqual(
      packageCore.assertPresentationCaptionB1StrictValueV001(value),
      {status: 'invalid', reason},
    );
  });
}

test('strict in-memory検査は疎な配列と追加propertyを区別して拒否する', () => {
  const sparse = [];
  sparse.length = 1;
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(sparse),
    {status: 'invalid', reason: 'sparse-array'},
  );

  const extended = [];
  extended.extra = true;
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(extended),
    {status: 'invalid', reason: 'extra-array-property'},
  );
});

test('strict in-memory検査はaccessor・toJSON・symbol key・非列挙fieldを拒否する', () => {
  const accessor = {};
  Object.defineProperty(accessor, 'x', {enumerable: true, get: () => 1});
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(accessor),
    {status: 'invalid', reason: 'accessor'},
  );

  const toJson = {toJSON() { return {}; }};
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(toJson),
    {status: 'invalid', reason: 'to-json'},
  );

  const symbolKey = {[Symbol('x')]: 1};
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(symbolKey),
    {status: 'invalid', reason: 'symbol-key'},
  );

  const hidden = {};
  Object.defineProperty(hidden, 'x', {enumerable: false, value: 1});
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(hidden),
    {status: 'invalid', reason: 'non-enumerable-property'},
  );
});

test('strict decodeはrootと入れ子をnull prototypeのown data propertyとして復号する', () => {
  const decoded = packageCore.decodePresentationCaptionB1StrictJsonV001(bytes(
    '{"z":{"nested":{"value":1}},"array":[{"inside":2}],'
      + '"__proto__":"safe","constructor":"plain","prototype":"plain"}',
  ));
  assert.equal(decoded.status, 'decoded');

  const assertNullPrototypeObject = (value) => {
    assert.equal(Object.getPrototypeOf(value), null);
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      assert.deepEqual(
        {
          enumerable: descriptor?.enumerable,
          writable: descriptor?.writable,
          configurable: descriptor?.configurable,
          accessor: descriptor !== undefined
            && (Object.hasOwn(descriptor, 'get') || Object.hasOwn(descriptor, 'set')),
        },
        {
          enumerable: true,
          writable: true,
          configurable: true,
          accessor: false,
        },
      );
    }
  };

  assertNullPrototypeObject(decoded.value);
  assertNullPrototypeObject(decoded.value.z);
  assertNullPrototypeObject(decoded.value.z.nested);
  assert.equal(Array.isArray(decoded.value.array), true);
  assert.equal(Object.getPrototypeOf(decoded.value.array), Array.prototype);
  assertNullPrototypeObject(decoded.value.array[0]);
  assert.equal(Object.hasOwn(decoded.value, '__proto__'), true);
  assert.equal(decoded.value.__proto__, 'safe');
  assert.equal(decoded.value.constructor, 'plain');
  assert.equal(decoded.value.prototype, 'plain');
  assert.equal(Object.prototype.safe, undefined);
});

test('strict decodeの一般objectは整数風keyを保持しcanonical化だけがUTF-16順へ並べる', () => {
  const decoded = packageCore.decodePresentationCaptionB1StrictJsonV001(bytes(
    '{"10":"ten","2":"two","a":{"10":10,"2":2},"__proto__":"safe"}',
  ));
  assert.equal(decoded.status, 'decoded');
  assert.equal(Object.getPrototypeOf(decoded.value), null);
  assert.deepEqual(Object.keys(decoded.value), ['2', '10', 'a', '__proto__']);
  assert.deepEqual(Object.keys(decoded.value.a), ['2', '10']);
  assert.equal(decoded.value['10'], 'ten');
  assert.equal(decoded.value['2'], 'two');

  const canonical =
    packageCore.canonicalizePresentationCaptionB1JsonV001(decoded.value);
  assert.equal(canonical.status, 'canonicalized');
  assert.equal(
    canonical.bytes.toString('utf8'),
    '{"10":"ten","2":"two","__proto__":"safe","a":{"10":10,"2":2}}',
  );
});

test('strict in-memory検査は通常objectとnull prototype objectの双方を受理する', () => {
  const nullPrototype = Object.create(null);
  nullPrototype.integer = 1;
  nullPrototype.nested = Object.create(null);
  nullPrototype.nested.text = '保持';
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001(nullPrototype),
    {status: 'valid'},
  );
  assert.deepEqual(
    packageCore.assertPresentationCaptionB1StrictValueV001({
      integer: 1,
      nested: {text: '保持'},
    }),
    {status: 'valid'},
  );
});

test('B1所有値と時刻・frame・sampleは小数をbyteでもメモリでも正式化でも拒否する', () => {
  for (const field of ['startMs', 'endMs', 'frame', 'sample']) {
    assert.deepEqual(
      packageCore.decodePresentationCaptionB1StrictJsonV001(
        bytes(`{"${field}":1.5}`),
      ),
      {status: 'invalid', reason: 'number-invalid'},
    );
    assert.deepEqual(
      packageCore.assertPresentationCaptionB1StrictValueV001({[field]: 1.5}),
      {status: 'invalid', reason: 'number-invalid'},
    );
  }
  assert.deepEqual(
    packageCore.serializePresentationCaptionB1FormalJsonV001({ratio: 0.04}),
    {status: 'invalid', reason: 'number-invalid'},
  );
  assert.deepEqual(
    packageCore.canonicalizePresentationCaptionB1JsonV001({ratio: 0.04}),
    {status: 'invalid', reason: 'number-invalid'},
  );
});

test('正式JSONとcanonical JSONは目的どおり異なるbyteを作りhashできる', () => {
  const value = {z: 1, a: {b: 2, a: 1}};
  const formal = packageCore.serializePresentationCaptionB1FormalJsonV001(value);
  const canonical = packageCore.canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(formal.status, 'serialized');
  assert.equal(canonical.status, 'canonicalized');
  assert.notEqual(formal.bytes.toString('utf8'), canonical.bytes.toString('utf8'));
  assert.equal(formal.bytes.toString('utf8').endsWith('\n'), true);
  assert.equal(canonical.bytes.toString('utf8'), '{"a":{"a":1,"b":2},"z":1}');

  const first = packageCore.sha256PresentationCaptionB1BytesV001(canonical.bytes);
  const second = packageCore.sha256PresentationCaptionB1BytesV001(Buffer.from(canonical.bytes));
  assert.equal(first.status, 'hashed');
  assert.deepEqual(first, second);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    packageCore.sha256PresentationCaptionB1BytesV001('not-a-buffer'),
    {status: 'invalid-argument'},
  );
});

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(TEST_DIRECTORY, '../..');
const PACKAGE_RUNNER_REPOSITORY_PATH =
  'evals/clip_composition/run_presentation_caption_semantic_source_package_job_v001.mjs';
const PACKAGE_CORE_REPOSITORY_PATH =
  'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs';
const GATE_A_JOB_PATH =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-preflight-jobs/DmWu0jVQfTE-candidate-13-v001.json';
const GATE_A_COMPLETION_REPORT_PATH =
  'evals/clip_composition/reports/presentation/presentation-gate-a-implementation-completion-report-20260723-v001.md';
const PACKAGE_JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs/synthetic-caption-b1-v001.json';
const PACKAGE_PREFLIGHT_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-preflight-jobs';
const PACKAGE_FORMAL_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs';
const PRESENTATION_WATCHED_ROOT =
  'evals/clip_composition/outputs/presentation';
const RENDERER_TRUST_IMPLEMENTATION_PATH =
  'evals/clip_composition/presentation_renderer_plan_v002.mjs';
const WIDTH_POLICY_PATHS = Object.freeze([
  [
    'presetRegistry',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json',
  ],
  [
    'presetValidationIndex',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-validation-index.json',
  ],
  [
    'materialValidationIndex',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/material-validation-index.json',
  ],
  [
    'registryBinding',
    'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/trusted-registry-bindings.json',
  ],
  [
    'rendererTrust',
    'evals/clip_composition/registries/presentation/presentation-renderer-trust-v001/trust.json',
  ],
  [
    'textLayoutImplementation',
    'evals/clip_composition/presentation_renderer_text_layout_v001.mjs',
  ],
]);
const APPROVED_EXTERNAL_DISPLAY_HASHES = Object.freeze([
  Object.freeze({
    role: 'presetRegistry',
    fileSha256: '8e9b0a039c8a4c9edf2c66b1df343c1d892d4688ebc4886a9af322bd44a6e5a8',
    canonicalSha256: '5915d6aae47681c43ea202a20eee16cbf669abfe24fdc832f75fb127ad46dca4',
  }),
  Object.freeze({
    role: 'presetValidationIndex',
    fileSha256: 'd2665c7947564a56955bbc47de7d95d038c64487ea71b6cbc1a2cc61667c05a1',
    canonicalSha256: '40609dbc63b7c2d1f4c2cd92ee22c493c08382c0d63c27ea06087535f5882067',
  }),
  Object.freeze({
    role: 'materialValidationIndex',
    fileSha256: '98213035bc6e395b090d7cff2639d4bf707fb838b7df50cb51bc60ab95d4758e',
    canonicalSha256: '3958ad2d21233342e49aedd29cbd337785a228e1063d1802b64e92dc1793d1fc',
  }),
  Object.freeze({
    role: 'registryBinding',
    fileSha256: 'b26db5c57aac5dd290e084d953350778b527c6eb21f66f62dc7431bf24482fff',
    canonicalSha256: 'bfbbcb5c611313d368305e6e8d552ddcdaf41949ed8d8f074485c8ed0aa2d43e',
  }),
  Object.freeze({
    role: 'rendererTrust',
    fileSha256: '04ec4971d078413b68c19869b0285130ec553f14601f45d27125738a7498eddc',
    canonicalSha256: '9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2',
  }),
]);
const APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE = Object.freeze(
  Object.fromEntries(
    APPROVED_EXTERNAL_DISPLAY_HASHES.map((entry) => [entry.role, entry]),
  ),
);
const APPROVED_RENDERER_LAYOUT_DECIMALS = Object.freeze({
  textSafePaddingRatio: 0.04,
  horizontalSafeMarginRatio: 0.04,
  verticalSafeMarginRatio: 0.02,
  fallbackTextAreaRatio: 0.98,
});
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
const PACKAGE_OWNED_CODES = Object.freeze([
  ...EXPECTED_VIOLATION_CODES.slice(0, 23),
  ...EXPECTED_VIOLATION_CODES.slice(47),
]);
const PACKAGE_CHECK_BY_CODE = Object.freeze({
  CAPTION_B1_JOB_INVALID: ['jobBinding'],
  JOB_FILE_MISMATCH: ['jobPrePublication', 'jobStability'],
  IMPLEMENTATION_MISMATCH: ['implementationBinding'],
  INPUT_PATH_UNSAFE: ['inputBinding'],
  INPUT_HASH_MISMATCH: ['inputBinding'],
  INPUT_SCHEMA_UNSUPPORTED: ['inputBinding'],
  RUNTIME_MISMATCH: ['runtimeBinding'],
  GATE_A_CONTEXT_INVALID: ['gateAContext'],
  GATE_A_REPORT_INVALID: ['gateAReport'],
  GATE_A_NOT_PASSED: ['gateAReport'],
  EVIDENCE_NONDETERMINISTIC: ['evidenceDeterminism'],
  EVIDENCE_EXPECTED_HASH_MISMATCH: ['evidenceDeterminism'],
  PACKAGE_FILE_SET_INVALID: ['packageShape'],
  PACKAGE_SCHEMA_INVALID: ['packageShape'],
  PACKAGE_STRICT_JSON_INVALID: ['packageShape'],
  PACKAGE_BINDING_MISMATCH: ['packageShape'],
  PACKAGE_HASH_MISMATCH: ['packageShape'],
  MODEL_INPUT_SCHEMA_INVALID: ['modelInput'],
  MODEL_INPUT_PROJECTION_MISMATCH: ['modelInput'],
  MODEL_INPUT_FORBIDDEN_FIELD: ['modelInput'],
  MODEL_INPUT_LEAKAGE_DETECTED: ['sourceOnlyLeakage'],
  MAPPING_SCHEMA_INVALID: ['expansionMap'],
  MAPPING_COVERAGE_INVALID: ['expansionMap'],
  BUILD_FAILED: ['evidenceBuild', 'embeddedReportBuild', 'packageBuild'],
  NONDETERMINISTIC: ['gateAReport', 'determinism'],
  READ_ONLY_CONTRACT_VIOLATED: ['readOnlyPreflight'],
  OUTPUT_ROOT_ALREADY_EXISTS: ['publication'],
  PUBLICATION_LOCK_UNAVAILABLE: ['publication'],
  PUBLICATION_STAGING_INVALID: ['publication'],
  PUBLICATION_INPUT_CHANGED: ['publication'],
  PUBLICATION_FAILED: ['publication'],
  PUBLISHED_PACKAGE_INVALID: ['publishedPackage'],
  PUBLICATION_PRE_RENAME_INVALID: ['publication'],
});
const PACKAGE_CORE_SOURCE = readFileSync(
  resolve(WORKSPACE_ROOT, PACKAGE_CORE_REPOSITORY_PATH),
  'utf8',
);
const PACKAGE_RUNNER_BYTES = readFileSync(
  resolve(WORKSPACE_ROOT, PACKAGE_RUNNER_REPOSITORY_PATH),
);
const PACKAGE_RUNNER_SOURCE = PACKAGE_RUNNER_BYTES.toString('utf8');
const PACKAGE_RUNNER_BASELINE_SHA256 =
  '1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalBytes = (value) => {
  const result = packageCore.canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return result.bytes;
};
const canonicalSha256 = (value) => sha256(canonicalBytes(value));
const formalBytes = (value) => {
  const result = packageCore.serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const externalDisplayJsonBytes = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const clone = (value) => {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }
  return value;
};
const fakeStat = (bytes, discriminator = 1) => ({
  kind: 'regular-file',
  dev: '1',
  ino: String(discriminator),
  size: String(bytes.length),
  mtimeNs: '1',
  nlink: '1',
});
const stableSnapshotFromBytes = (repositoryPath, inputBytes, discriminator = 1) => {
  const snapshotBytes = Buffer.from(inputBytes);
  const stat = fakeStat(snapshotBytes, discriminator);
  return {
    path: repositoryPath,
    bytes: snapshotBytes,
    fileSha256: sha256(snapshotBytes),
    pathLstatBeforeOpen: stat,
    fdStatAfterOpen: clone(stat),
    fdStatAfterRead: clone(stat),
    pathResolutionObservation: {
      workspaceRootRealPath: WORKSPACE_ROOT,
      lexicalWorkspaceRelativePath: repositoryPath,
      targetRealPath: resolve(WORKSPACE_ROOT, repositoryPath),
      ancestors: [{
        workspaceRelativePath: '',
        lstatKind: 'directory',
        realPath: WORKSPACE_ROOT,
      }],
    },
  };
};
const stableSnapshot = (repositoryPath, discriminator = 1) =>
  stableSnapshotFromBytes(
    repositoryPath,
    readFileSync(resolve(WORKSPACE_ROOT, repositoryPath)),
    discriminator,
  );
const readObservation = (role, snapshot) => ({
  role,
  path: snapshot.path,
  status: 'read',
  snapshot,
});
const buildSuccess = (value, {embeddedCanonical = false} = {}) => {
  const outputBytes = embeddedCanonical
    ? Buffer.concat([canonicalBytes(value), Buffer.from('\n', 'utf8')])
    : formalBytes(value);
  return {
    value,
    bytes: outputBytes,
    fileSha256: sha256(outputBytes),
    canonicalSha256: canonicalSha256(value),
    inputByteCopies: [],
  };
};
const packagePass = (value) => ({
  artifacts: value.artifacts,
  inputByteCopies: [],
});
const decodeFile = (repositoryPath) => JSON.parse(
  readFileSync(resolve(WORKSPACE_ROOT, repositoryPath), 'utf8'),
);
const refreshJobSnapshot = (context) => {
  context.job.initialSnapshot = stableSnapshotFromBytes(
    context.job.initialSnapshot.path,
    formalBytes(context.job.value),
    900,
  );
  context.job.preReportInput = readObservation('job', clone(context.job.initialSnapshot));
  if (context.productionMode === 'formal-generation') {
    context.job.prePublicationInput = readObservation('job', clone(context.job.initialSnapshot));
  }
};
const replaceWidthPolicyJson = (
  context,
  index,
  valueOrBytes,
  {
    updateFileBinding = true,
    canonicalSha256Value = context.job.value.widthPolicyBindings[index].canonicalSha256,
    discriminator = 660 + index,
  } = {},
) => {
  const inputBytes = Buffer.isBuffer(valueOrBytes)
    ? Buffer.from(valueOrBytes)
    : externalDisplayJsonBytes(valueOrBytes);
  const observation = context.widthPolicyInputs[index];
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    inputBytes,
    discriminator,
  );
  if (updateFileBinding) {
    context.job.value.widthPolicyBindings[index].fileSha256 =
      observation.snapshot.fileSha256;
  }
  context.job.value.widthPolicyBindings[index].canonicalSha256 =
    canonicalSha256Value;
  refreshJobSnapshot(context);
};
const rebuildPackagePasses = (context) => {
  const builderContext = {
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
    implementationSnapshots: context.implementationInputs.map((entry) => entry.snapshot),
    sourceSnapshots: context.gateA.sourceInputs.map((entry) => entry.snapshot),
    widthPolicySnapshots: context.widthPolicyInputs.map((entry) => entry.snapshot),
    runtimeObservation: context.runtimeObservation,
  };
  context.packageBuildPasses = [builderContext, clone(builderContext)].map((entry) =>
    packagePass(
      packageCore.buildPresentationCaptionSemanticSourcePackageV001(entry),
    ));
  context.builderInvocationProvenance.passes.forEach((pass) => {
    pass.providedEntries[0].path = context.job.initialSnapshot.path;
    pass.accessedEntries[0].path = context.job.initialSnapshot.path;
  });
};
const rehashArtifact = (artifact, {embeddedCanonical = false} = {}) => {
  artifact.bytes = embeddedCanonical
    ? Buffer.concat([canonicalBytes(artifact.value), Buffer.from('\n', 'utf8')])
    : formalBytes(artifact.value);
  artifact.fileSha256 = sha256(artifact.bytes);
  artifact.canonicalSha256 = canonicalSha256(artifact.value);
};
const synchronizePackageMetadataFromContent = (pass) => {
  const roles = [
    'boundaryEvidence',
    'embeddedGateAReport',
    'semanticSourceInput',
    'deterministicExpansionMap',
    'sourceOnlyLeakageReport',
  ];
  const contentProjection = pass.artifacts.slice(0, 5).map((artifact, index) => ({
    role: roles[index],
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  }));
  const manifest = pass.artifacts[5];
  manifest.value.contentArtifacts = contentProjection;
  manifest.value.contentSetCanonicalSha256 = canonicalSha256(contentProjection);
  rehashArtifact(manifest);
  const report = pass.artifacts[6];
  report.value.manifestBinding = {
    fileName: manifest.fileName,
    fileSha256: manifest.fileSha256,
    canonicalSha256: manifest.canonicalSha256,
  };
  report.value.validatedContentArtifacts = clone(contentProjection);
  rehashArtifact(report);
};
const wrapGateAEvidence = (value) => buildSuccess(value);

let cachedValidFixture = null;
const makeValidFixture = () => {
  if (cachedValidFixture !== null) return clone(cachedValidFixture);

  const gateAJobValue = decodeFile(GATE_A_JOB_PATH);
  const gateAJobSnapshot = stableSnapshot(GATE_A_JOB_PATH, 10);
  const gateAJobInput = readObservation('gateAJob', gateAJobSnapshot);
  const gateAImplementationInputs = gateAJobValue.implementationBinding.files.map(
    (binding, index) => readObservation(
      binding.role,
      stableSnapshot(binding.path, 20 + index),
    ),
  );
  const gateASourceInputs = gateAJobValue.inputs.map(
    (binding, index) => readObservation(
      binding.role,
      stableSnapshot(binding.path, 30 + index),
    ),
  );
  const completionSnapshot = stableSnapshot(GATE_A_COMPLETION_REPORT_PATH, 40);
  const completionReportInput =
    readObservation('gateACompletionReport', completionSnapshot);

  const nodeBytes = readFileSync(process.execPath);
  const nodeFileSha256 = sha256(nodeBytes);
  const segmenter = new Intl.Segmenter('ja', {granularity: 'word'}).resolvedOptions();
  const runtimeObservation = {
    nodeBinaryInput: {
      role: 'nodeBinary',
      status: 'read',
      snapshot: {
        bytes: Buffer.from(nodeBytes),
        fileSha256: nodeFileSha256,
      },
    },
    nodeVersion: process.version,
    icuVersion: process.versions.icu,
    resolvedLocale: segmenter.locale,
    resolvedGranularity: segmenter.granularity,
    diagnostics: {
      resolvedNodePath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      v8Version: process.versions.v8,
      unicodeVersion: process.versions.unicode,
      cldrVersion: process.versions.cldr,
    },
  };
  const runtimeBinding = {
    nodeBinarySha256: nodeFileSha256,
    nodeVersion: runtimeObservation.nodeVersion,
    icuVersion: runtimeObservation.icuVersion,
    resolvedLocale: runtimeObservation.resolvedLocale,
    resolvedGranularity: runtimeObservation.resolvedGranularity,
    diagnostics: clone(runtimeObservation.diagnostics),
  };
  const sourceArtifact = JSON.parse(gateASourceInputs[0].snapshot.bytes.toString('utf8'));
  const evidence = buildPresentationSegmenterBoundaryEvidenceV001({
    artifactId: gateAJobValue.artifactId,
    sourceArtifact,
    sourceArtifactSnapshot: {
      path: gateASourceInputs[0].path,
      fileSha256: gateASourceInputs[0].snapshot.fileSha256,
    },
    runtimeBinding,
  });
  const evidencePasses = [
    wrapGateAEvidence(clone(evidence)),
    wrapGateAEvidence(clone(evidence)),
  ];
  const legacyReadOnlyObservation = {
    formalOutputPath: gateAJobValue.readOnlyGuard.formalOutputPath,
    watchedAncestorPath:
      'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence',
    beforeFormalPathState: 'absent',
    afterFormalPathState: 'absent',
    beforeEntries: [],
    afterEntries: [],
  };
  const legacyRecheck = {
    jobInput: clone(gateAJobInput),
    implementationInputs: clone(gateAImplementationInputs),
    sourceInputs: clone(gateASourceInputs),
  };
  const derived = packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001({
    gateA: {
      jobValue: gateAJobValue,
      jobInput: gateAJobInput,
      implementationInputs: gateAImplementationInputs,
      sourceInputs: gateASourceInputs,
      legacyRecheck,
      legacyReadOnlyObservation,
      evidencePasses,
    },
    runtimeObservation,
  });
  assert.equal(derived.status, 'derived');
  const directLegacyReport = checkPresentationSegmenterBoundaryPreflightV001({
    jobValue: derived.value.jobValue,
    jobSnapshot: derived.value.jobSnapshot,
    observedImplementationBinding: {
      files: gateAJobValue.implementationBinding.files.map((binding, index) => ({
        role: binding.role,
        path: binding.path,
        firstFileSha256: gateAImplementationInputs[index].snapshot.fileSha256,
        secondFileSha256: gateAImplementationInputs[index].snapshot.fileSha256,
        loadedModuleUrl: [
          new URL('./presentation_segmenter_boundary_evidence_v001.mjs', import.meta.url).href,
          new URL('./presentation_retained_source_atoms_v001.mjs', import.meta.url).href,
          new URL('./run_presentation_segmenter_boundary_preflight_v001.mjs', import.meta.url).href,
        ][index],
        issues: [],
      })),
    },
    inputSnapshots: derived.value.inputSnapshots,
    runtimeBinding: derived.value.runtimeBinding,
    evidencePasses: derived.value.evidencePasses,
    buildFailure: null,
    readOnlyGuard: derived.value.readOnlyGuard,
    productionMode: true,
  });
  assert.deepEqual(derived.value.checkReport, directLegacyReport);
  const embeddedReportValue =
    packageCore.buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(
      derived.value,
    );
  const embeddedReportPasses = [
    buildSuccess(clone(embeddedReportValue), {embeddedCanonical: true}),
    buildSuccess(clone(embeddedReportValue), {embeddedCanonical: true}),
  ];

  const implementationFiles = [
    ['packageCore', PACKAGE_CORE_REPOSITORY_PATH],
    ['packageRunner', PACKAGE_RUNNER_REPOSITORY_PATH],
    ['rendererTrustImplementation', RENDERER_TRUST_IMPLEMENTATION_PATH],
  ].map(([role, repositoryPath], index) => ({
    role,
    path: repositoryPath,
    snapshot: stableSnapshot(repositoryPath, 50 + index),
  }));
  const widthInputs = WIDTH_POLICY_PATHS.map(([role, repositoryPath], index) => ({
    role,
    path: repositoryPath,
    snapshot: stableSnapshot(repositoryPath, 60 + index),
  }));
  const byContainer = new Map();
  for (const candidate of evidence.boundaryCandidates) {
    if (!byContainer.has(candidate.containerId)) {
      byContainer.set(candidate.containerId, {
        containerId: candidate.containerId,
        sourceAtomIds: [],
        boundaryCandidateCount: 0,
      });
    }
    const entry = byContainer.get(candidate.containerId);
    entry.boundaryCandidateCount += 1;
    for (const atomId of candidate.sourceAtomIds) {
      if (!entry.sourceAtomIds.includes(atomId)) entry.sourceAtomIds.push(atomId);
    }
  }
  const projectionContainers = [...byContainer.values()].map((entry) => ({
    containerId: entry.containerId,
    sourceAtomCount: entry.sourceAtomIds.length,
    boundaryCandidateCount: entry.boundaryCandidateCount,
  }));
  const implementationBindings = implementationFiles.map((entry) => ({
    role: entry.role,
    path: entry.path,
    fileSha256: entry.snapshot.fileSha256,
  }));
  const widthBindings = widthInputs.map((entry, index) => ({
    role: entry.role,
    path: entry.path,
    fileSha256: entry.snapshot.fileSha256,
    canonicalSha256: index === 5
      ? null
      : APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE[entry.role].canonicalSha256,
  }));
  const jobValue = {
    schemaVersion: 'presentation-caption-semantic-source-package-job-v001',
    jobId: 'synthetic-caption-b1-job-v001',
    artifactId: gateAJobValue.artifactId,
    mode: 'read-only-preflight',
    gateA: {
      job: {
        path: gateAJobSnapshot.path,
        fileSha256: gateAJobSnapshot.fileSha256,
      },
      completionReport: {
        path: completionSnapshot.path,
        fileSha256: completionSnapshot.fileSha256,
      },
      expectedEvidenceHashes: {
        boundaryCandidatesCanonicalSha256:
          evidence.boundaryCandidatesCanonicalSha256,
        sourceAtomMembershipCanonicalSha256:
          evidence.sourceAtomMembershipCanonicalSha256,
        evidenceCanonicalSha256: canonicalSha256(evidence),
      },
    },
    implementationBinding: {
      gitCommit: 'a'.repeat(40),
      files: implementationBindings,
      dependencyFiles: [],
    },
    widthPolicyBindings: widthBindings,
    expectedRuntime: {
      nodeBinarySha256: nodeFileSha256,
      nodeVersion: runtimeObservation.nodeVersion,
      icuVersion: runtimeObservation.icuVersion,
      resolvedLocale: runtimeObservation.resolvedLocale,
      resolvedGranularity: runtimeObservation.resolvedGranularity,
    },
    expectedProjection: {
      sourceAtomCount: sourceArtifact.rawSourceAtoms.length,
      containerCount: projectionContainers.length,
      boundaryCandidateCount: evidence.boundaryCandidates.length,
      containers: projectionContainers,
    },
    publication: {
      packageId: 'synthetic-caption-b1-package-v001',
      formalOutputPath: gateAJobValue.readOnlyGuard.formalOutputPath,
      expectedState: 'absent',
    },
    readOnlyGuard: {
      watchedRoot: 'evals/clip_composition/outputs/presentation',
      excludedPaths: [PACKAGE_JOB_PATH],
      expectedBeforeCanonicalSha256: canonicalSha256([]),
    },
  };
  const jobSnapshot = stableSnapshotFromBytes(PACKAGE_JOB_PATH, formalBytes(jobValue), 900);
  const packageBuilderContext = {
    job: {value: jobValue, snapshot: jobSnapshot},
    gateA: {
      jobValue: gateAJobValue,
      jobSnapshot: gateAJobSnapshot,
      completionReportSnapshot: completionSnapshot,
      evidenceValue: evidencePasses[0].value,
      evidenceBytes: evidencePasses[0].bytes,
      embeddedReportValue: embeddedReportPasses[0].value,
      embeddedReportBytes: embeddedReportPasses[0].bytes,
    },
    implementationSnapshots: implementationFiles.map((entry) => entry.snapshot),
    sourceSnapshots: gateASourceInputs.map((entry) => entry.snapshot),
    widthPolicySnapshots: widthInputs.map((entry) => entry.snapshot),
    runtimeObservation,
  };
  const packageValue =
    packageCore.buildPresentationCaptionSemanticSourcePackageV001(packageBuilderContext);
  const packageBuildPasses = [
    packagePass(packageValue),
    packagePass(packageCore.buildPresentationCaptionSemanticSourcePackageV001(
      clone(packageBuilderContext),
    )),
  ];
  const providedEntries = [
    {role: 'job', path: jobSnapshot.path},
    {role: 'gateA.job', path: gateAJobInput.path},
    {role: 'gateA.completionReport', path: completionReportInput.path},
    {role: 'gateA.evidence', path: null},
    {role: 'gateA.embeddedReport', path: null},
    ...implementationFiles.map((entry) => ({
      role: `implementation.${entry.role}`,
      path: entry.path,
    })),
    ...gateASourceInputs.map((entry) => ({
      role: `source.${entry.role}`,
      path: entry.path,
    })),
    ...widthInputs.map((entry) => ({
      role: `width.${entry.role}`,
      path: entry.path,
    })),
    {role: 'runtimeObservation', path: null},
    {role: 'runtimeObservation.nodeBinary', path: null},
  ];
  const fixture = {
    contextPhase: 'final-report',
    job: {
      value: jobValue,
      initialSnapshot: jobSnapshot,
      prePublicationInput: null,
      preReportInput: readObservation('job', clone(jobSnapshot)),
    },
    gateA: {
      jobValue: gateAJobValue,
      jobInput: gateAJobInput,
      completionReportInput,
      implementationInputs: gateAImplementationInputs,
      sourceInputs: gateASourceInputs,
      legacyRecheck,
      legacyReadOnlyObservation,
      evidencePasses,
      embeddedReportPasses,
    },
    implementationInputs: implementationFiles.map((entry) =>
      readObservation(entry.role, entry.snapshot)),
    widthPolicyInputs: widthInputs.map((entry) =>
      readObservation(entry.role, entry.snapshot)),
    builderInvocationProvenance: {
      passes: [1, 2].map((passOrdinal) => ({
        passOrdinal,
        providedEntries: clone(providedEntries),
        accessedEntries: clone(providedEntries),
      })),
    },
    runtimeObservation,
    packageBuildPasses,
    buildFailure: null,
    readOnlyProcessObservation: {
      mode: 'observed',
      beforeEntries: [],
      afterEntries: [],
      inputReread: {
        status: 'completed',
        initialInputs: [],
        finalInputs: [],
      },
      attemptedWriteCalls: [],
    },
    publicationProcessObservation: {mode: 'not-requested'},
    productionMode: 'read-only-preflight',
  };
  cachedValidFixture = fixture;
  return clone(fixture);
};

const checkByName = (report, name) =>
  report.checks.find((entry) => entry.name === name);
const collectCodes = (report) => report.violations.map((entry) => entry.code);
const assertCheckedReportInvariants = (report, names) => {
  assert.equal(report.status, 'checked');
  assert.deepEqual(report.checks.map((entry) => entry.name), names);
  assert.deepEqual(
    report.violations,
    [...report.violations].sort((left, right) => {
      const codeOrder = EXPECTED_VIOLATION_CODES.indexOf(left.code)
        - EXPECTED_VIOLATION_CODES.indexOf(right.code);
      return codeOrder || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    }),
  );
  report.violations.forEach((entry) => {
    assert.deepEqual(Object.keys(entry), ['code', 'path', 'details']);
    assert.deepEqual(entry.details, {});
  });
  report.checks.forEach((entry) => {
    const expected = report.violations
      .filter((violation) =>
        (PACKAGE_CHECK_BY_CODE[violation.code] ?? []).includes(entry.name))
      .map((violation) => violation.code)
      .filter((code, index, values) => values.indexOf(code) === index)
      .sort((left, right) =>
        EXPECTED_VIOLATION_CODES.indexOf(left) - EXPECTED_VIOLATION_CODES.indexOf(right));
    assert.deepEqual(entry.violationCodes, expected);
  });
};
const observedPackageCodeChecks = new Set();
const assertTargetCode = (context, code, checkName) => {
  const report = packageCore.checkPresentationCaptionSemanticSourcePackageV001(context);
  const names = context.productionMode === 'formal-generation'
    ? FORMAL_CHECK_NAMES
    : PREFLIGHT_CHECK_NAMES;
  assertCheckedReportInvariants(report, names);
  assert.equal(collectCodes(report).includes(code), true, `${code} was not emitted`);
  assert.equal(checkByName(report, checkName).violationCodes.includes(code), true);
  assert.equal(checkByName(report, checkName).status, 'failed');
  observedPackageCodeChecks.add(`${code}\u0000${checkName}`);
  return report;
};
const makeBuildFailureCopyResults = (fixture, kind) => {
  const originals = [
    ['$.gateA.evidenceBytes', fixture.gateA.evidencePasses[0].bytes],
    ['$.gateA.embeddedReportBytes', fixture.gateA.embeddedReportPasses[0].bytes],
  ];
  return originals.map(([path, inputBytes], index) => {
    const beforeSha256 = sha256(inputBytes);
    return {
      path,
      beforeSha256,
      afterSha256: kind === 'input-mutated' && index === 0
        ? 'f'.repeat(64)
        : beforeSha256,
      unchanged: !(kind === 'input-mutated' && index === 0),
    };
  });
};
const makeBuildFailureFixture = (stage, passOrdinal, kind) => {
  const fixture = makeValidFixture();
  const firstEvidence = clone(fixture.gateA.evidencePasses[0]);
  const firstEmbedded = clone(fixture.gateA.embeddedReportPasses[0]);
  const firstPackage = clone(fixture.packageBuildPasses[0]);
  if (stage === 'gate-a-evidence') {
    fixture.gateA.evidencePasses = passOrdinal === 1
      ? [null, null]
      : [firstEvidence, null];
    fixture.gateA.embeddedReportPasses = [];
    fixture.packageBuildPasses = [];
    fixture.builderInvocationProvenance.passes = [];
  } else if (stage === 'embedded-gate-a-report') {
    fixture.gateA.embeddedReportPasses = passOrdinal === 1
      ? [null, null]
      : [firstEmbedded, null];
    fixture.packageBuildPasses = [];
    fixture.builderInvocationProvenance.passes = [];
  } else {
    fixture.packageBuildPasses = passOrdinal === 1
      ? [null, null]
      : [firstPackage, null];
    fixture.builderInvocationProvenance.passes =
      fixture.builderInvocationProvenance.passes.slice(0, passOrdinal);
  }
  fixture.buildFailure = {
    stage,
    passOrdinal,
    kind,
    inputByteCopies: stage === 'package'
      ? makeBuildFailureCopyResults(fixture, kind)
      : [],
  };
  return fixture;
};

const compareUtf16 = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const makeEnoent = (pathValue) => {
  const error = new Error(`ENOENT: ${pathValue}`);
  error.code = 'ENOENT';
  return error;
};
const makeEexist = (pathValue) => {
  const error = new Error(`EEXIST: ${pathValue}`);
  error.code = 'EEXIST';
  return error;
};
const makeVirtualStats = (entry) => Object.freeze({
  dev: 91n,
  ino: BigInt(entry.ino),
  size: BigInt(entry.kind === 'file' ? entry.bytes.length : 0),
  mtimeNs: 1n,
  nlink: 1n,
  isFile: () => entry.kind === 'file',
  isDirectory: () => entry.kind === 'directory',
  isSymbolicLink: () => false,
});
const overrideBigIntStats = (value, overrides = {}) => Object.freeze({
  dev: overrides.dev ?? value.dev,
  ino: overrides.ino ?? value.ino,
  size: overrides.size ?? value.size,
  mtimeNs: overrides.mtimeNs ?? value.mtimeNs,
  nlink: overrides.nlink ?? value.nlink,
  isFile: () => value.isFile(),
  isDirectory: () => value.isDirectory(),
  isSymbolicLink: () => value.isSymbolicLink(),
});
const makeOneUseChunkIterable = (chunkValues, readFailure = null) => {
  let iteratorCreated = false;
  return Object.freeze({
    [Symbol.asyncIterator]() {
      if (iteratorCreated) {
        throw new TypeError('synthetic chunk AsyncIterable may only be iterated once');
      }
      iteratorCreated = true;
      return (async function* iterateSyntheticChunks() {
        for (let index = 0; index < chunkValues.length; index += 1) {
          if (readFailure?.atChunkIndex === index) throw readFailure.error;
          yield chunkValues[index];
        }
        if (readFailure?.atChunkIndex === chunkValues.length) {
          throw readFailure.error;
        }
      })();
    },
  });
};
const makeSyntheticChunkHandle = ({
  statAfterOpen,
  statAfterRead = statAfterOpen,
  chunks = [],
  readFailure = null,
  closeFailure = null,
}) => {
  let closed = false;
  let readCalled = false;
  let statCalls = 0;
  return Object.freeze({
    statBigInt: async () => {
      assert.equal(closed, false);
      statCalls += 1;
      const value = statCalls === 1 ? statAfterOpen : statAfterRead;
      if (value instanceof Error) throw value;
      return value;
    },
    readChunksV001: () => {
      assert.equal(closed, false);
      if (readCalled) {
        throw new TypeError('synthetic readChunksV001 may only be called once');
      }
      readCalled = true;
      return makeOneUseChunkIterable(chunks, readFailure);
    },
    close: async () => {
      assert.equal(closed, false);
      closed = true;
      if (closeFailure !== null) throw closeFailure;
    },
  });
};
const chunkBufferBySizes = (inputBytes, sizes) => {
  const chunks = [];
  let offset = 0;
  for (const size of sizes) {
    assert.equal(Number.isSafeInteger(size) && size > 0, true);
    const end = Math.min(offset + size, inputBytes.length);
    if (end > offset) chunks.push(Buffer.from(inputBytes.subarray(offset, end)));
    offset = end;
  }
  if (offset < inputBytes.length) chunks.push(Buffer.from(inputBytes.subarray(offset)));
  assert.equal(Buffer.concat(chunks).equals(inputBytes), true);
  return chunks;
};
const makeVirtualDirent = (name, kind) => Object.freeze({
  name,
  isFile: () => kind === 'file',
  isDirectory: () => kind === 'directory',
  isSymbolicLink: () => false,
});
const containsBuffer = (value, seen = new Set()) => {
  if (Buffer.isBuffer(value)) return true;
  if (value === null || typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  return Reflect.ownKeys(value).some((key) => containsBuffer(value[key], seen));
};
const captureRawBufferLeaves = (
  value,
  pathValue = '$',
  leaves = [],
  seen = new Set(),
) => {
  if (Buffer.isBuffer(value)) {
    leaves.push({
      path: pathValue,
      ref: value,
      initialSha256: sha256(value),
    });
    return leaves;
  }
  if (value === null || typeof value !== 'object' || seen.has(value)) return leaves;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue;
    captureRawBufferLeaves(
      value[key],
      Array.isArray(value) ? `${pathValue}[${key}]` : `${pathValue}.${key}`,
      leaves,
      seen,
    );
  }
  return leaves;
};

const makeRunnerJob = (mode, suffix) => {
  const value = clone(makeValidFixture().job.value);
  const root = mode === 'read-only-preflight'
    ? PACKAGE_PREFLIGHT_JOB_ROOT
    : PACKAGE_FORMAL_JOB_ROOT;
  const jobPath = `${root}/synthetic-runner-${suffix}-v001.json`;
  value.mode = mode;
  value.jobId = `synthetic-runner-${suffix}-v001`;
  value.publication.packageId = `synthetic-runner-${suffix}-package-v001`;
  value.publication.formalOutputPath =
    `${PRESENTATION_WATCHED_ROOT}/segmenter-boundary-evidence/`
      + `synthetic-runner-${suffix}-package-v001`;
  value.publication.expectedState = 'absent';
  value.readOnlyGuard.excludedPaths = [jobPath];
  value.readOnlyGuard.expectedBeforeCanonicalSha256 = canonicalSha256([]);
  return Object.freeze({
    jobPath,
    value,
    bytes: formalBytes(value),
    formalRoot: value.publication.formalOutputPath,
  });
};

const createHybridRunnerFilesystem = (
  runnerJob,
  {formalFailure = null, includeJob = true} = {},
) => {
  const base =
    packageRunner.createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001();
  const entries = new Map();
  const operations = [];
  let nextIno = 1000;
  let stagingScanned = false;
  let inputMutationDone = false;
  let inputMutationStat = null;
  let formalRootLstatCount = 0;
  const absoluteJobPath = resolve(WORKSPACE_ROOT, runnerJob.jobPath);
  const absoluteJobRoot = dirname(absoluteJobPath);
  const absoluteFormalRoot = resolve(WORKSPACE_ROOT, runnerJob.formalRoot);
  const absoluteLockPath = `${absoluteFormalRoot}.lock`;
  const absoluteWorkPath = `${absoluteFormalRoot}.work`;
  const absoluteGateAJobPath = resolve(WORKSPACE_ROOT, GATE_A_JOB_PATH);
  const absoluteWatchedRoot = resolve(WORKSPACE_ROOT, PRESENTATION_WATCHED_ROOT);
  const managedRoots = [
    absoluteJobRoot,
    absoluteFormalRoot,
    absoluteLockPath,
    absoluteWorkPath,
  ];

  const addEntry = (pathValue, kind, inputBytes = Buffer.alloc(0)) => {
    const entry = {
      kind,
      bytes: Buffer.from(inputBytes),
      ino: nextIno,
    };
    nextIno += 1;
    entries.set(pathValue, entry);
    return entry;
  };
  addEntry(absoluteJobRoot, 'directory');
  if (includeJob) addEntry(absoluteJobPath, 'file', runnerJob.bytes);

  const isManaged = (pathValue) => managedRoots.some(
    (root) => pathValue === root || pathValue.startsWith(`${root}/`),
  );
  const listVirtualDirectory = (pathValue) => {
    const prefix = `${pathValue}/`;
    const children = new Map();
    for (const [candidatePath, entry] of entries) {
      if (!candidatePath.startsWith(prefix)) continue;
      const remainder = candidatePath.slice(prefix.length);
      if (remainder.length === 0 || remainder.includes('/')) continue;
      children.set(remainder, entry.kind);
    }
    return [...children.entries()]
      .sort(([left], [right]) => compareUtf16(left, right))
      .map(([name, kind]) => makeVirtualDirent(name, kind));
  };
  const readVirtualHandle = (pathValue, entry) => makeSyntheticChunkHandle({
    statAfterOpen: makeVirtualStats(entry),
    chunks: entry.bytes.length === 0 ? [] : [Buffer.from(entry.bytes)],
  });

  const adapter = Object.freeze({
    openReadOnly: async (pathValue) => {
      operations.push({operation: 'openReadOnly', path: pathValue});
      const virtual = entries.get(pathValue);
      if (virtual !== undefined) {
        if (virtual.kind !== 'file') throw makeEnoent(pathValue);
        return readVirtualHandle(pathValue, virtual);
      }
      if (isManaged(pathValue)) throw makeEnoent(pathValue);
      if (formalFailure === 'input'
        && stagingScanned
        && inputMutationStat !== null
        && pathValue === absoluteGateAJobPath) {
        inputMutationDone = true;
        operations.push({operation: 'inputRecheckMutation', path: pathValue});
        const handle = await base.openReadOnly(pathValue);
        let readCalled = false;
        let closed = false;
        return Object.freeze({
          statBigInt: async () => {
            assert.equal(closed, false);
            return inputMutationStat;
          },
          readChunksV001: () => {
            assert.equal(closed, false);
            if (readCalled) {
              throw new TypeError('synthetic readChunksV001 may only be called once');
            }
            readCalled = true;
            let iteratorCreated = false;
            return Object.freeze({
              [Symbol.asyncIterator]() {
                if (iteratorCreated) {
                  throw new TypeError(
                    'synthetic chunk AsyncIterable may only be iterated once',
                  );
                }
                iteratorCreated = true;
                return (async function* mutateInputRead() {
                  for await (const chunk of handle.readChunksV001()) {
                    yield chunk;
                  }
                  yield Buffer.from(' ', 'utf8');
                })();
              },
            });
          },
          close: async () => {
            assert.equal(closed, false);
            closed = true;
            await handle.close();
          },
        });
      }
      return await base.openReadOnly(pathValue);
    },
    openWriteExclusive: async (pathValue) => {
      operations.push({operation: 'openWriteExclusive', path: pathValue});
      if (!pathValue.startsWith(`${absoluteWorkPath}/`) || entries.has(pathValue)) {
        throw makeEexist(pathValue);
      }
      const entry = addEntry(pathValue, 'file');
      let closed = false;
      return Object.freeze({
        writeAllBytes: async (inputBytes) => {
          assert.equal(closed, false);
          entry.bytes = Buffer.from(inputBytes);
        },
        sync: async () => {
          assert.equal(closed, false);
        },
        statBigInt: async () => {
          assert.equal(closed, false);
          return makeVirtualStats(entry);
        },
        close: async () => {
          assert.equal(closed, false);
          closed = true;
        },
      });
    },
    openDirectoryReadOnly: async (pathValue) => {
      operations.push({operation: 'openDirectoryReadOnly', path: pathValue});
      const virtual = entries.get(pathValue);
      if (virtual === undefined) return await base.openDirectoryReadOnly(pathValue);
      if (virtual.kind !== 'directory') throw makeEnoent(pathValue);
      let closed = false;
      return Object.freeze({
        sync: async () => {
          assert.equal(closed, false);
        },
        statBigInt: async () => {
          assert.equal(closed, false);
          return makeVirtualStats(virtual);
        },
        close: async () => {
          assert.equal(closed, false);
          closed = true;
        },
      });
    },
    lstatBigInt: async (pathValue) => {
      operations.push({operation: 'lstatBigInt', path: pathValue});
      const virtual = entries.get(pathValue);
      if (virtual !== undefined) return makeVirtualStats(virtual);
      if (formalFailure === 'input'
        && stagingScanned
        && pathValue === absoluteGateAJobPath) {
        if (inputMutationStat === null) {
          const before = await base.lstatBigInt(pathValue);
          inputMutationStat = overrideBigIntStats(before, {
            ino: before.ino + 1n,
            size: before.size + 1n,
          });
        }
        return inputMutationStat;
      }
      if (pathValue === absoluteFormalRoot) {
        formalRootLstatCount += 1;
        if (formalFailure === 'preRename' && formalRootLstatCount >= 2) {
          operations.push({operation: 'preRenameRootReveal', path: pathValue});
          return makeVirtualStats({
            kind: 'directory',
            bytes: Buffer.alloc(0),
            ino: 9999,
          });
        }
      }
      if (isManaged(pathValue)) throw makeEnoent(pathValue);
      return await base.lstatBigInt(pathValue);
    },
    realpath: async (pathValue) => {
      operations.push({operation: 'realpath', path: pathValue});
      if (entries.has(pathValue)) return pathValue;
      if (isManaged(pathValue)) throw makeEnoent(pathValue);
      return await base.realpath(pathValue);
    },
    readdirWithTypes: async (pathValue) => {
      operations.push({operation: 'readdirWithTypes', path: pathValue});
      if (pathValue === absoluteWatchedRoot) return [];
      if (pathValue === absoluteWorkPath) {
        stagingScanned = true;
        operations.push({operation: 'stagingObserved', path: pathValue});
        const values = listVirtualDirectory(pathValue);
        return formalFailure === 'staging' ? values.slice(1) : values;
      }
      if (entries.get(pathValue)?.kind === 'directory') {
        return listVirtualDirectory(pathValue);
      }
      if (isManaged(pathValue)) throw makeEnoent(pathValue);
      return await base.readdirWithTypes(pathValue);
    },
    readlink: async (pathValue) => {
      operations.push({operation: 'readlink', path: pathValue});
      if (isManaged(pathValue)) throw makeEnoent(pathValue);
      return await base.readlink(pathValue);
    },
    mkdirExclusive: async (pathValue) => {
      operations.push({operation: 'mkdirExclusive', path: pathValue});
      if (entries.has(pathValue)) throw makeEexist(pathValue);
      if (pathValue !== absoluteLockPath) throw makeEnoent(pathValue);
      addEntry(pathValue, 'directory');
    },
    mkdir: async (pathValue) => {
      operations.push({operation: 'mkdir', path: pathValue});
      if (entries.has(pathValue)) throw makeEexist(pathValue);
      if (pathValue !== absoluteWorkPath) throw makeEnoent(pathValue);
      addEntry(pathValue, 'directory');
    },
    rename: async (fromPath, toPath) => {
      operations.push({operation: 'rename', fromPath, toPath});
      if (fromPath !== absoluteWorkPath || toPath !== absoluteFormalRoot) {
        throw makeEnoent(fromPath);
      }
      const moved = [...entries.entries()]
        .filter(([pathValue]) =>
          pathValue === fromPath || pathValue.startsWith(`${fromPath}/`));
      for (const [pathValue] of moved) entries.delete(pathValue);
      for (const [pathValue, entry] of moved) {
        entries.set(`${toPath}${pathValue.slice(fromPath.length)}`, entry);
      }
    },
    removeEmptyDirectory: async (pathValue) => {
      operations.push({operation: 'removeEmptyDirectory', path: pathValue});
      const entry = entries.get(pathValue);
      if (entry?.kind !== 'directory'
        || [...entries.keys()].some((candidate) => candidate.startsWith(`${pathValue}/`))) {
        throw makeEnoent(pathValue);
      }
      entries.delete(pathValue);
    },
  });
  return Object.freeze({
    adapter,
    operations,
    entries,
    paths: Object.freeze({
      job: absoluteJobPath,
      formalRoot: absoluteFormalRoot,
      lock: absoluteLockPath,
      work: absoluteWorkPath,
    }),
  });
};

const withSyntheticReadFault = (
  baseAdapter,
  {
    matches,
    kind,
  },
) => {
  let matchedOpenCount = 0;
  const openReadOnly = async (pathValue) => {
    if (!matches(pathValue, matchedOpenCount)) {
      return await baseAdapter.openReadOnly(pathValue);
    }
    matchedOpenCount += 1;
    if (kind === 'open') throw new TypeError('synthetic open failure');
    const baseHandle = await baseAdapter.openReadOnly(pathValue);
    let readCalled = false;
    let readCompleted = false;
    let closed = false;
    let firstStat = null;
    return Object.freeze({
      statBigInt: async () => {
        assert.equal(closed, false);
        const value = await baseHandle.statBigInt();
        if (firstStat === null) firstStat = value;
        if (kind === 'post-read-stat-error' && readCompleted) {
          throw new TypeError('synthetic post-read fstat failure');
        }
        if (kind === 'post-read-stat' && readCompleted) {
          return overrideBigIntStats(value, {ino: value.ino + 1n});
        }
        return value;
      },
      readChunksV001: () => {
        assert.equal(closed, false);
        if (readCalled) {
          throw new TypeError('synthetic readChunksV001 may only be called once');
        }
        readCalled = true;
        if (kind === 'return-buffer') return Buffer.from('not-an-iterable', 'utf8');
        if (kind === 'return-array') return [];
        if (kind === 'return-promise') return Promise.resolve([]);
        let iteratorCreated = false;
        return Object.freeze({
          [Symbol.asyncIterator]() {
            if (iteratorCreated) {
              throw new TypeError(
                'synthetic chunk AsyncIterable may only be iterated once',
              );
            }
            iteratorCreated = true;
            return (async function* transformRead() {
              if (kind === 'read-throw') {
                throw new TypeError('synthetic chunk read failure');
              }
              let pending = null;
              for await (const sourceChunk of baseHandle.readChunksV001()) {
                if (kind === 'non-buffer') {
                  yield 'not-a-buffer';
                  readCompleted = true;
                  return;
                }
                if (kind === 'empty-chunk') {
                  yield Buffer.alloc(0);
                  readCompleted = true;
                  return;
                }
                if (kind === 'short') {
                  if (pending !== null) yield pending;
                  pending = Buffer.from(sourceChunk);
                } else {
                  yield sourceChunk;
                }
              }
              if (kind === 'short') {
                if (pending !== null && pending.length > 1) {
                  yield pending.subarray(0, pending.length - 1);
                }
              } else if (kind === 'over') {
                yield Buffer.from('x', 'utf8');
              }
              readCompleted = true;
            })();
          },
        });
      },
      close: async () => {
        assert.equal(closed, false);
        closed = true;
        await baseHandle.close();
        if (kind === 'close') throw new TypeError('synthetic close failure');
      },
    });
  };
  return Object.freeze({
    ...baseAdapter,
    openReadOnly,
  });
};

const Q1_SYNTHETIC_WATCHED_FILE_NAME = 'q1-nonempty-watched-file-v001.txt';
const Q1_SYNTHETIC_WATCHED_FILE_PATH =
  `${PRESENTATION_WATCHED_ROOT}/${Q1_SYNTHETIC_WATCHED_FILE_NAME}`;
const Q1_SYNTHETIC_WATCHED_FILE_ABSOLUTE_PATH =
  resolve(WORKSPACE_ROOT, Q1_SYNTHETIC_WATCHED_FILE_PATH);
const Q1_SYNTHETIC_WATCHED_FILE_BYTES =
  bytes('Q1 shared production projection fixture\n');
const createQ1WatchedTreeFilesystem = (
  runnerJob,
  {
    includeJob = true,
    watchedEntryKind = 'file',
    mutateDuringRead = false,
    watchedBytes = Q1_SYNTHETIC_WATCHED_FILE_BYTES,
    watchedChunkSizes = null,
    watchedChunks = null,
    readFailure = null,
    closeFailure = null,
    openFailure = null,
    statAfterRead = null,
  } = {},
) => {
  const filesystem = createHybridRunnerFilesystem(runnerJob, {includeJob});
  const base = filesystem.adapter;
  const watchedEntry = {
    kind: 'file',
    bytes: Buffer.from(watchedBytes),
    ino: 49001,
  };
  const watchedDirectoryEntry =
    makeVirtualDirent(Q1_SYNTHETIC_WATCHED_FILE_NAME, watchedEntryKind);
  const adapter = Object.freeze({
    openReadOnly: async (pathValue) => {
      if (pathValue !== Q1_SYNTHETIC_WATCHED_FILE_ABSOLUTE_PATH
        || watchedEntryKind !== 'file') return await base.openReadOnly(pathValue);
      if (openFailure !== null) throw openFailure;
      const beforeStat = makeVirtualStats(watchedEntry);
      if (mutateDuringRead) {
        const originalBytes = Buffer.from(watchedEntry.bytes);
        watchedEntry.bytes = Buffer.concat([
          watchedEntry.bytes,
          Buffer.from('changed-during-read', 'utf8'),
        ]);
        watchedEntry.ino += 1;
        filesystem.operations.push({
          operation: 'watchedReadMutation',
          path: pathValue,
        });
        return makeSyntheticChunkHandle({
          statAfterOpen: beforeStat,
          statAfterRead: makeVirtualStats(watchedEntry),
          chunks: originalBytes.length === 0 ? [] : [originalBytes],
        });
      }
      const chunks = watchedChunks !== null
        ? watchedChunks
        : watchedChunkSizes === null
          ? watchedEntry.bytes.length === 0 ? [] : [Buffer.from(watchedEntry.bytes)]
          : chunkBufferBySizes(watchedEntry.bytes, watchedChunkSizes);
      return makeSyntheticChunkHandle({
        statAfterOpen: beforeStat,
        statAfterRead: statAfterRead ?? beforeStat,
        chunks,
        readFailure,
        closeFailure,
      });
    },
    openWriteExclusive: base.openWriteExclusive,
    openDirectoryReadOnly: base.openDirectoryReadOnly,
    lstatBigInt: async (pathValue) => {
      if (pathValue === Q1_SYNTHETIC_WATCHED_FILE_ABSOLUTE_PATH
        && watchedEntryKind === 'file') return makeVirtualStats(watchedEntry);
      return await base.lstatBigInt(pathValue);
    },
    realpath: async (pathValue) => {
      if (pathValue === Q1_SYNTHETIC_WATCHED_FILE_ABSOLUTE_PATH
        && watchedEntryKind === 'file') return pathValue;
      return await base.realpath(pathValue);
    },
    readdirWithTypes: async (pathValue) => {
      if (pathValue === resolve(WORKSPACE_ROOT, PRESENTATION_WATCHED_ROOT)) {
        return [watchedDirectoryEntry];
      }
      return await base.readdirWithTypes(pathValue);
    },
    readlink: base.readlink,
    mkdirExclusive: base.mkdirExclusive,
    mkdir: base.mkdir,
    rename: base.rename,
    removeEmptyDirectory: base.removeEmptyDirectory,
  });
  return Object.freeze({
    ...filesystem,
    adapter,
  });
};

test('Q1:A監視投影入口は不存在preflight jobだけを除外しproductionと同じ読取経路を使う', async () => {
  const runnerJob = makeRunnerJob('read-only-preflight', 'projection-entrypoint');
  const filesystem = createHybridRunnerFilesystem(
    runnerJob,
    {includeJob: false},
  );
  const result =
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      runnerJob.jobPath,
      {filesystemAdapter: filesystem.adapter},
    );
  assert.deepEqual(result, {
    kind: 'trusted-projection',
    watchedRoot: PRESENTATION_WATCHED_ROOT,
    excludedPaths: [runnerJob.jobPath],
    expectedBeforeCanonicalSha256: canonicalSha256([]),
  });
  assert.equal(
    filesystem.operations.some((entry) => [
      'openWriteExclusive',
      'mkdirExclusive',
      'mkdir',
      'rename',
      'removeEmptyDirectory',
    ].includes(entry.operation)),
    false,
  );
  assert.equal(
    [...PACKAGE_RUNNER_SOURCE.matchAll(/buildWatchedTreeProjection\(/gu)].length,
    3,
  );
});

test('Q1:A監視投影入口は許可外path・既存target・追加optionをuntrustedで拒否する', async () => {
  const expected = {
    kind: 'untrusted',
    diagnostic: 'CAPTION_B1_PACKAGE_PREFLIGHT_PROJECTION_UNAVAILABLE',
  };
  const runnerJob = makeRunnerJob('read-only-preflight', 'projection-rejection');
  const existing = createHybridRunnerFilesystem(runnerJob);
  assert.deepEqual(
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      runnerJob.jobPath,
      {filesystemAdapter: existing.adapter},
    ),
    expected,
  );

  const missing = createHybridRunnerFilesystem(runnerJob, {includeJob: false});
  assert.deepEqual(
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      '../outside.json',
      {filesystemAdapter: missing.adapter},
    ),
    expected,
  );
  assert.deepEqual(
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      runnerJob.jobPath,
      {filesystemAdapter: missing.adapter, extra: true},
    ),
    expected,
  );
});

test('Q1:A監視投影入口はunsupported entryと読取中変化を固定diagnosticで拒否する', async () => {
  const expected = {
    kind: 'untrusted',
    diagnostic: 'CAPTION_B1_PACKAGE_PREFLIGHT_PROJECTION_UNAVAILABLE',
  };
  const unsupportedJob = makeRunnerJob(
    'read-only-preflight',
    'projection-unsupported-entry',
  );
  const unsupported = createQ1WatchedTreeFilesystem(
    unsupportedJob,
    {includeJob: false, watchedEntryKind: 'other'},
  );
  assert.deepEqual(
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      unsupportedJob.jobPath,
      {filesystemAdapter: unsupported.adapter},
    ),
    expected,
  );

  const changedJob = makeRunnerJob(
    'read-only-preflight',
    'projection-read-during-change',
  );
  const changed = createQ1WatchedTreeFilesystem(
    changedJob,
    {includeJob: false, mutateDuringRead: true},
  );
  assert.deepEqual(
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      changedJob.jobPath,
      {filesystemAdapter: changed.adapter},
    ),
    expected,
  );
  assert.deepEqual(
    changed.operations.filter((entry) => entry.operation === 'watchedReadMutation'),
    [{
      operation: 'watchedReadMutation',
      path: Q1_SYNTHETIC_WATCHED_FILE_ABSOLUTE_PATH,
    }],
  );
});

test('R3:監視投影は空fileを0 chunkで扱いone・multi・uneven chunkでも同じhashになる', async () => {
  const rows = [
    {
      suffix: 'empty',
      watchedBytes: Buffer.alloc(0),
      watchedChunkSizes: [],
    },
    {
      suffix: 'one',
      watchedBytes: Q1_SYNTHETIC_WATCHED_FILE_BYTES,
      watchedChunkSizes: [Q1_SYNTHETIC_WATCHED_FILE_BYTES.length],
    },
    {
      suffix: 'multi',
      watchedBytes: Q1_SYNTHETIC_WATCHED_FILE_BYTES,
      watchedChunkSizes: [8, 8, 8, 8],
    },
    {
      suffix: 'uneven',
      watchedBytes: Q1_SYNTHETIC_WATCHED_FILE_BYTES,
      watchedChunkSizes: [1, 7, 3, 11],
    },
  ];
  for (const row of rows) {
    const runnerJob = makeRunnerJob(
      'read-only-preflight',
      `r3-projection-${row.suffix}`,
    );
    const filesystem = createQ1WatchedTreeFilesystem(runnerJob, {
      includeJob: false,
      watchedBytes: row.watchedBytes,
      watchedChunkSizes: row.watchedChunkSizes,
    });
    const result =
      await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
        runnerJob.jobPath,
        {filesystemAdapter: filesystem.adapter},
      );
    assert.deepEqual(result, {
      kind: 'trusted-projection',
      watchedRoot: PRESENTATION_WATCHED_ROOT,
      excludedPaths: [runnerJob.jobPath],
      expectedBeforeCanonicalSha256: canonicalSha256([{
        path: Q1_SYNTHETIC_WATCHED_FILE_PATH,
        kind: 'file',
        contentSha256: sha256(row.watchedBytes),
      }]),
    }, row.suffix);
  }
});

test('R3:監視投影はopen・不正chunk・短過読・読取後変化・close失敗を同じuntrustedへ閉じる', async () => {
  const inputBytes = Buffer.from(Q1_SYNTHETIC_WATCHED_FILE_BYTES);
  const changedEntry = {
    kind: 'file',
    bytes: inputBytes,
    ino: 49002,
  };
  const rows = [
    ['open', {openFailure: new TypeError('synthetic open failure')}],
    ['non-buffer', {watchedChunks: ['not-a-buffer']}],
    ['empty-chunk', {watchedChunks: [Buffer.alloc(0)]}],
    ['read-throw', {
      watchedChunks: [],
      readFailure: {
        atChunkIndex: 0,
        error: new TypeError('synthetic chunk read failure'),
      },
    }],
    ['short-read', {watchedChunks: [inputBytes.subarray(0, inputBytes.length - 1)]}],
    ['over-read', {
      watchedChunks: [inputBytes, Buffer.from('x', 'utf8')],
    }],
    ['post-read-stat', {statAfterRead: makeVirtualStats(changedEntry)}],
    ['close', {closeFailure: new TypeError('synthetic close failure')}],
  ];
  for (const [suffix, options] of rows) {
    const runnerJob = makeRunnerJob(
      'read-only-preflight',
      `r3-projection-failure-${suffix}`,
    );
    const filesystem = createQ1WatchedTreeFilesystem(runnerJob, {
      includeJob: false,
      ...options,
    });
    assert.deepEqual(
      await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
        runnerJob.jobPath,
        {filesystemAdapter: filesystem.adapter},
      ),
      {
        kind: 'untrusted',
        diagnostic: 'CAPTION_B1_PACKAGE_PREFLIGHT_PROJECTION_UNAVAILABLE',
      },
      suffix,
    );
  }
});

const createRunnerSpyBuilder = ({
  failureStage = null,
  failurePass = null,
  failureKind = 'thrown',
} = {}) => {
  if (failureKind === 'input-mutated'
    && ['gate-a-evidence', 'embedded-gate-a-report'].includes(failureStage)) {
    throw new TypeError(
      'input-mutated is only a valid synthetic failure for the package stage',
    );
  }
  const calls = {
    gateA: [],
    embedded: [],
    package: [],
    rawBufferLeaves: {
      gateA: [],
      embedded: [],
      package: [],
    },
    inputMutations: [],
    embeddedBytes: [],
    packageResults: [],
  };
  const invoke = (stage, values, builder, context) => {
    const callKey = stage === 'gate-a-evidence'
      ? 'gateA'
      : stage === 'embedded-gate-a-report'
        ? 'embedded'
        : 'package';
    calls.rawBufferLeaves[callKey].push(captureRawBufferLeaves(context));
    values.push(clone(context));
    if (failureStage === stage && values.length === failurePass) {
      if (failureKind === 'invalid-return') return null;
      if (failureKind === 'input-mutated' && stage === 'package') {
        const targetRef = context.gateA.evidenceBytes;
        const beforeSha256 = sha256(targetRef);
        const retainedCopy = Buffer.from(targetRef);
        targetRef[0] ^= 0xff;
        calls.inputMutations.push({
          path: '$.gateA.evidenceBytes',
          ref: targetRef,
          beforeSha256,
          afterSha256: sha256(targetRef),
          retainedCopy,
          retainedCopySha256: sha256(retainedCopy),
        });
        return builder(context);
      }
      throw new TypeError(`synthetic ${stage} ${failureKind} failure`);
    }
    return builder(context);
  };
  const adapter = Object.freeze({
    buildGateAEvidence: (context) => invoke(
      'gate-a-evidence',
      calls.gateA,
      buildPresentationSegmenterBoundaryEvidenceV001,
      context,
    ),
    buildEmbeddedGateAReport: (context) => {
      const value = invoke(
        'embedded-gate-a-report',
        calls.embedded,
        packageCore.buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001,
        context,
      );
      const output = Buffer.concat([canonicalBytes(value), Buffer.from('\n', 'utf8')]);
      calls.embeddedBytes.push(output);
      return value;
    },
    buildPackage: (context) => {
      const value = invoke(
        'package',
        calls.package,
        packageCore.buildPresentationCaptionSemanticSourcePackageV001,
        context,
      );
      calls.packageResults.push(clone(value));
      return value;
    },
  });
  return {adapter, calls};
};

const assertTrustedReportResult = (result, expectedExitCode) => {
  assert.equal(result.kind, 'trusted-report');
  assert.equal(result.exitCode, expectedExitCode);
  assert.equal(Buffer.isBuffer(result.reportBytes), true);
  assert.equal(containsBuffer(result.report), false);
  assert.deepEqual(
    JSON.parse(result.reportBytes.toString('utf8')),
    result.report,
  );
};

test('Q1:A監視投影hashは同じ非空treeを読むproduction runner開始投影と完全一致する', async () => {
  const runnerJob = makeRunnerJob(
    'read-only-preflight',
    'projection-production-equality',
  );
  const preparationFilesystem = createQ1WatchedTreeFilesystem(
    runnerJob,
    {includeJob: false},
  );
  const preparation =
    await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
      runnerJob.jobPath,
      {filesystemAdapter: preparationFilesystem.adapter},
    );
  const expectedTreeProjection = [{
    path: Q1_SYNTHETIC_WATCHED_FILE_PATH,
    kind: 'file',
    contentSha256: sha256(Q1_SYNTHETIC_WATCHED_FILE_BYTES),
  }];
  assert.deepEqual(preparation, {
    kind: 'trusted-projection',
    watchedRoot: PRESENTATION_WATCHED_ROOT,
    excludedPaths: [runnerJob.jobPath],
    expectedBeforeCanonicalSha256: canonicalSha256(expectedTreeProjection),
  });

  runnerJob.value.readOnlyGuard.expectedBeforeCanonicalSha256 =
    preparation.expectedBeforeCanonicalSha256;
  const productionJob = Object.freeze({
    ...runnerJob,
    bytes: formalBytes(runnerJob.value),
  });
  const productionFilesystem = createQ1WatchedTreeFilesystem(productionJob);
  const builder = createRunnerSpyBuilder();
  const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
    productionJob.jobPath,
    {
      filesystemAdapter: productionFilesystem.adapter,
      builderAdapter: builder.adapter,
    },
  );
  assertTrustedReportResult(result, 0);
  assert.equal(result.report.status, 'passed');
  assert.equal(
    result.report.readOnlyObservation.beforeCanonicalSha256,
    preparation.expectedBeforeCanonicalSha256,
  );
  assert.equal(
    result.report.readOnlyObservation.afterCanonicalSha256,
    preparation.expectedBeforeCanonicalSha256,
  );
  assert.equal(result.report.readOnlyObservation.unchanged, true);
});

test('外部表示5 JSONは承認済みfile/canonical hash対を保ちrenderer trustの4係数だけが小数である', () => {
  const fixture = makeValidFixture();
  for (let index = 0; index < APPROVED_EXTERNAL_DISPLAY_HASHES.length; index += 1) {
    const expected = APPROVED_EXTERNAL_DISPLAY_HASHES[index];
    const [role, repositoryPath] = WIDTH_POLICY_PATHS[index];
    const fileBytes = readFileSync(resolve(WORKSPACE_ROOT, repositoryPath));
    assert.equal(role, expected.role);
    assert.equal(sha256(fileBytes), expected.fileSha256);
    assert.deepEqual(fixture.job.value.widthPolicyBindings[index], {
      role,
      path: repositoryPath,
      fileSha256: expected.fileSha256,
      canonicalSha256: expected.canonicalSha256,
    });
    assert.notEqual(expected.fileSha256, expected.canonicalSha256);
  }

  const trust = decodeFile(WIDTH_POLICY_PATHS[4][1]);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(APPROVED_RENDERER_LAYOUT_DECIMALS)
        .map((key) => [key, trust.layoutRules[key]]),
    ),
    APPROVED_RENDERER_LAYOUT_DECIMALS,
  );
  const observedNonIntegers = [];
  const visit = (value, pathValue = '$') => {
    if (typeof value === 'number') {
      if (!Number.isInteger(value)) observedNonIntegers.push([pathValue, value]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, `${pathValue}[${index}]`));
      return;
    }
    if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(([key, entry]) => visit(entry, `${pathValue}.${key}`));
    }
  };
  for (let index = 0; index < 5; index += 1) {
    visit(decodeFile(WIDTH_POLICY_PATHS[index][1]));
  }
  assert.deepEqual(observedNonIntegers, [
    ['$.layoutRules.textSafePaddingRatio', 0.04],
    ['$.layoutRules.horizontalSafeMarginRatio', 0.04],
    ['$.layoutRules.verticalSafeMarginRatio', 0.02],
    ['$.layoutRules.fallbackTextAreaRatio', 0.98],
  ]);
});

test('正式7成果物とGemini可視入力へ外部表示の小数係数を転記しない', () => {
  const fixture = makeValidFixture();
  const artifacts = fixture.packageBuildPasses[0].artifacts;
  const assertIntegerNumbers = (value) => {
    if (typeof value === 'number') {
      assert.equal(Number.isSafeInteger(value), true);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(assertIntegerNumbers);
      return;
    }
    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(assertIntegerNumbers);
    }
  };
  artifacts.forEach((artifact) => assertIntegerNumbers(artifact.value));
  const packageValueText = JSON.stringify(artifacts.map((artifact) => artifact.value));
  const modelInputText = artifacts
    .find((artifact) => artifact.fileName === 'semantic-source-input.json')
    .bytes
    .toString('utf8');
  for (const field of Object.keys(APPROVED_RENDERER_LAYOUT_DECIMALS)) {
    assert.equal(packageValueText.includes(field), false, `package:${field}`);
    assert.equal(modelInputText.includes(field), false, field);
  }
});

test('外部表示profileはrenderer trustの未承認小数・別値・小数時刻をschema不成立にする', () => {
  for (const mutate of [
    (trust) => {
      trust.layoutRules.textSafePaddingRatio = 0.05;
    },
    (trust) => {
      trust.layoutRules.fontWeight = 800.5;
    },
    (trust) => {
      trust.startMs = 1.5;
    },
  ]) {
    const fixture = makeValidFixture();
    const trust = decodeFile(WIDTH_POLICY_PATHS[4][1]);
    mutate(trust);
    replaceWidthPolicyJson(fixture, 4, trust);
    const report = assertTargetCode(
      fixture,
      'INPUT_SCHEMA_UNSUPPORTED',
      'inputBinding',
    );
    assert.equal(
      checkByName(report, 'inputBinding').violationCodes.includes('INPUT_HASH_MISMATCH'),
      false,
    );
  }
});

test('renderer trust以外の外部JSONでは小数を許可しない', () => {
  const fixture = makeValidFixture();
  const presetRegistry = decodeFile(WIDTH_POLICY_PATHS[0][1]);
  presetRegistry.canvas.fps = 30.5;
  replaceWidthPolicyJson(fixture, 0, presetRegistry);
  const report = assertTargetCode(
    fixture,
    'INPUT_SCHEMA_UNSUPPORTED',
    'inputBinding',
  );
  assert.equal(
    checkByName(report, 'inputBinding').violationCodes.includes('INPUT_HASH_MISMATCH'),
    false,
  );
});

test('renderer trustの全layout ruleは型と固定値のexact一致を要求する', () => {
  const pristineTrust = decodeFile(WIDTH_POLICY_PATHS[4][1]);
  for (const field of Object.keys(pristineTrust.layoutRules)) {
    const fixture = makeValidFixture();
    const trust = clone(pristineTrust);
    trust.layoutRules[field] = typeof trust.layoutRules[field] === 'number'
      ? trust.layoutRules[field] + (Number.isInteger(trust.layoutRules[field]) ? 1 : 0.01)
      : `${trust.layoutRules[field]}-changed`;
    replaceWidthPolicyJson(fixture, 4, trust, {discriminator: 700});
    const report = assertTargetCode(
      fixture,
      'INPUT_SCHEMA_UNSUPPORTED',
      'inputBinding',
    );
    assert.equal(
      checkByName(report, 'inputBinding').violationCodes.includes('INPUT_HASH_MISMATCH'),
      false,
      field,
    );
  }

  for (const mutate of [
    (trust) => {
      delete trust.layoutRules.layoutRuleVersion;
    },
    (trust) => {
      trust.layoutRules.unknown = 'not-approved';
    },
  ]) {
    const fixture = makeValidFixture();
    const trust = clone(pristineTrust);
    mutate(trust);
    replaceWidthPolicyJson(fixture, 4, trust, {discriminator: 701});
    assertTargetCode(fixture, 'INPUT_SCHEMA_UNSUPPORTED', 'inputBinding');
  }
});

test('外部JSONの別字句0.040は意味値が同じでもfile hash不一致を先に返す', () => {
  const fixture = makeValidFixture();
  const trustBytes = readFileSync(resolve(WORKSPACE_ROOT, WIDTH_POLICY_PATHS[4][1]));
  const changedBytes = Buffer.from(
    trustBytes.toString('utf8').replace(
      '"textSafePaddingRatio": 0.04',
      '"textSafePaddingRatio": 0.040',
    ),
    'utf8',
  );
  assert.notEqual(sha256(changedBytes), sha256(trustBytes));
  replaceWidthPolicyJson(fixture, 4, changedBytes, {updateFileBinding: false});
  const report = assertTargetCode(fixture, 'INPUT_HASH_MISMATCH', 'inputBinding');
  assert.equal(
    checkByName(report, 'inputBinding').violationCodes.includes('INPUT_SCHEMA_UNSUPPORTED'),
    false,
  );
});

test('検査indexのfile hashとcanonical hashを取り違えずbinding値をcanonicalとして照合する', () => {
  const binding = decodeFile(WIDTH_POLICY_PATHS[3][1]);
  assert.equal(
    binding.presetValidationIndexSha256,
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.presetValidationIndex.canonicalSha256,
  );
  assert.notEqual(
    binding.presetValidationIndexSha256,
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.presetValidationIndex.fileSha256,
  );
  assert.equal(
    binding.materialValidationIndexSha256,
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.materialValidationIndex.canonicalSha256,
  );
  assert.notEqual(
    binding.materialValidationIndexSha256,
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.materialValidationIndex.fileSha256,
  );

  for (const index of [1, 2]) {
    const fixture = makeValidFixture();
    fixture.job.value.widthPolicyBindings[index].canonicalSha256 =
      fixture.job.value.widthPolicyBindings[index].fileSha256;
    refreshJobSnapshot(fixture);
    assertTargetCode(fixture, 'INPUT_HASH_MISMATCH', 'inputBinding');
  }

  const chainFixture = makeValidFixture();
  const changedBinding = clone(binding);
  changedBinding.presetValidationIndexSha256 =
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.presetValidationIndex.fileSha256;
  changedBinding.materialValidationIndexSha256 =
    APPROVED_EXTERNAL_DISPLAY_HASH_BY_ROLE.materialValidationIndex.fileSha256;
  replaceWidthPolicyJson(chainFixture, 3, changedBinding, {
    canonicalSha256Value: canonicalSha256(changedBinding),
    discriminator: 703,
  });
  assertTargetCode(chainFixture, 'INPUT_HASH_MISMATCH', 'inputBinding');
});

test('preset validation indexのregistryVersionはpreset registry版と一致しなければならない', () => {
  const fixture = makeValidFixture();
  const index = decodeFile(WIDTH_POLICY_PATHS[1][1]);
  index.registryVersion = 'different-registry-v001';
  replaceWidthPolicyJson(fixture, 1, index, {
    canonicalSha256Value: canonicalSha256(index),
    discriminator: 704,
  });
  assertTargetCode(fixture, 'INPUT_HASH_MISMATCH', 'inputBinding');
});

test('job validatorは正本field順の正常jobを受理し最小leaf pathで不成立を返す', () => {
  const fixture = makeValidFixture();
  const valid = packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
    fixture.job.value,
  );
  assert.equal(valid.status, 'valid');
  assert.deepEqual(valid.value, fixture.job.value);

  const invalid = clone(fixture.job.value);
  invalid.expectedProjection.containers[0].sourceAtomCount = -1;
  const result =
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(invalid);
  assert.equal(result.status, 'invalid');
  assert.deepEqual(result.paths, ['$.expectedProjection.containers[0].sourceAtomCount']);
});

test('job投影は境界候補件数が不正な子を親集計へ部分利用しない', () => {
  const fixture = makeValidFixture();
  const invalidCandidateCount = clone(fixture.job.value);
  invalidCandidateCount.expectedProjection.containers[0].boundaryCandidateCount = -1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidCandidateCount,
    ).paths,
    ['$.expectedProjection.containers[0].boundaryCandidateCount'],
  );
});

test('job投影は両件数が不正な子について二つの子違反だけを返す', () => {
  const fixture = makeValidFixture();
  const invalidBoth = clone(fixture.job.value);
  invalidBoth.expectedProjection.containers[0].sourceAtomCount = -1;
  invalidBoth.expectedProjection.containers[0].boundaryCandidateCount = -1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(invalidBoth).paths,
    [
      '$.expectedProjection.containers[0].boundaryCandidateCount',
      '$.expectedProjection.containers[0].sourceAtomCount',
    ],
  );
});

test('job投影は片側の子不正があっても他方の独立した親不一致を検出する', () => {
  const fixture = makeValidFixture();
  const invalidSourceWithIndependentParentMismatch = clone(fixture.job.value);
  invalidSourceWithIndependentParentMismatch.expectedProjection
    .containers[0].sourceAtomCount = -1;
  invalidSourceWithIndependentParentMismatch.expectedProjection
    .boundaryCandidateCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidSourceWithIndependentParentMismatch,
    ).paths,
    [
      '$.expectedProjection.boundaryCandidateCount',
      '$.expectedProjection.containers[0].sourceAtomCount',
    ],
  );
});

test('job投影は境界候補の子不正があっても対応元の親不一致を検出する', () => {
  const fixture = makeValidFixture();
  const invalidCandidateWithIndependentParentMismatch = clone(fixture.job.value);
  invalidCandidateWithIndependentParentMismatch.expectedProjection
    .containers[0].boundaryCandidateCount = -1;
  invalidCandidateWithIndependentParentMismatch.expectedProjection.sourceAtomCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidCandidateWithIndependentParentMismatch,
    ).paths,
    [
      '$.expectedProjection.containers[0].boundaryCandidateCount',
      '$.expectedProjection.sourceAtomCount',
    ],
  );
});

test('job投影は未知fieldを持つ子を二種類の親集計から丸ごと除外する', () => {
  const fixture = makeValidFixture();
  const invalidShape = clone(fixture.job.value);
  invalidShape.expectedProjection.containers[0] = {
    ...invalidShape.expectedProjection.containers[0],
    unknown: true,
  };
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(invalidShape).paths,
    ['$.expectedProjection.containers[0]'],
  );
});

test('job投影はfield順違反の子を除外してもcontainer数の独立検査を維持する', () => {
  const fixture = makeValidFixture();
  const invalidShapeAndContainerCount = clone(fixture.job.value);
  const validEntry = invalidShapeAndContainerCount.expectedProjection.containers[0];
  invalidShapeAndContainerCount.expectedProjection.containers[0] = {
    sourceAtomCount: validEntry.sourceAtomCount,
    containerId: validEntry.containerId,
    boundaryCandidateCount: validEntry.boundaryCandidateCount,
  };
  invalidShapeAndContainerCount.expectedProjection.containerCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidShapeAndContainerCount,
    ).paths,
    [
      '$.expectedProjection.containerCount',
      '$.expectedProjection.containers[0]',
    ],
  );
});

test('job投影は件数fieldが欠けた子を親集計へ部分利用しない', () => {
  const fixture = makeValidFixture();
  const missingCount = clone(fixture.job.value);
  delete missingCount.expectedProjection.containers[0].sourceAtomCount;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(missingCount).paths,
    ['$.expectedProjection.containers[0]'],
  );
});

test('job投影はshape違反と数値不正が併存する子を子全体の違反に限定する', () => {
  const fixture = makeValidFixture();
  const invalidShapeAndNumber = clone(fixture.job.value);
  invalidShapeAndNumber.expectedProjection.containers[0].sourceAtomCount = -1;
  invalidShapeAndNumber.expectedProjection.containers[0].unknown = true;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidShapeAndNumber,
    ).paths,
    ['$.expectedProjection.containers[0]'],
  );
});

test('job投影は非objectの子を親集計へ部分利用しない', () => {
  const fixture = makeValidFixture();
  const nonObject = clone(fixture.job.value);
  nonObject.expectedProjection.containers[0] = null;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(nonObject).paths,
    ['$.expectedProjection.containers[0]'],
  );
});

test('job投影は全子が有効なとき対応元の親合計不一致を検出する', () => {
  const fixture = makeValidFixture();
  const invalidParentTotal = clone(fixture.job.value);
  invalidParentTotal.expectedProjection.sourceAtomCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidParentTotal,
    ).paths,
    ['$.expectedProjection.sourceAtomCount'],
  );
});

test('job投影は全子が有効なとき境界候補の親合計不一致を検出する', () => {
  const fixture = makeValidFixture();
  const invalidCandidateParentTotal = clone(fixture.job.value);
  invalidCandidateParentTotal.expectedProjection.boundaryCandidateCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidCandidateParentTotal,
    ).paths,
    ['$.expectedProjection.boundaryCandidateCount'],
  );
});

test('job投影はcontainer数と配列長の独立検査を維持する', () => {
  const fixture = makeValidFixture();
  const invalidContainerCount = clone(fixture.job.value);
  invalidContainerCount.expectedProjection.containerCount += 1;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageJobV001(
      invalidContainerCount,
    ).paths,
    ['$.expectedProjection.containerCount'],
  );
});

test('公開derive入口はGate A生観測を同一checker経路へ決定的に運び入力を変更しない', () => {
  const fixture = makeValidFixture();
  const context = {
    gateA: {
      jobValue: fixture.gateA.jobValue,
      jobInput: fixture.gateA.jobInput,
      implementationInputs: fixture.gateA.implementationInputs,
      sourceInputs: fixture.gateA.sourceInputs,
      legacyRecheck: fixture.gateA.legacyRecheck,
      legacyReadOnlyObservation: fixture.gateA.legacyReadOnlyObservation,
      evidencePasses: fixture.gateA.evidencePasses,
    },
    runtimeObservation: fixture.runtimeObservation,
  };
  const before = clone(context);
  const first =
    packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001(context);
  const second =
    packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001(clone(context));
  assert.equal(first.status, 'derived');
  assert.deepEqual(first, second);
  assert.deepEqual(context, before);
  assert.equal(first.value.checkReport.status, 'passed');

  for (const invalid of [
    {},
    {...clone(context), unknown: true},
    (() => {
      const value = clone(context);
      delete value.gateA.jobInput;
      return value;
    })(),
    (() => {
      const value = clone(context);
      value.gateA.evidencePasses.length = 3;
      return value;
    })(),
    {
      runtimeObservation: clone(context.runtimeObservation),
      gateA: clone(context.gateA),
    },
    (() => {
      const value = clone(context);
      value.gateA.evidencePasses = new Array(2);
      value.gateA.evidencePasses[1] = clone(context.gateA.evidencePasses[1]);
      return value;
    })(),
    (() => {
      const value = clone(context);
      value.gateA.evidencePasses[0].fileSha256 = '0'.repeat(64);
      return value;
    })(),
  ]) {
    assert.deepEqual(
      packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001(invalid),
      {status: 'context-invalid'},
    );
  }
});

test('package builderは同一snapshotから同一7成果物を作り入力を変更しない', () => {
  const fixture = makeValidFixture();
  const builderContext = {
    job: {
      value: fixture.job.value,
      snapshot: fixture.job.initialSnapshot,
    },
    gateA: {
      jobValue: fixture.gateA.jobValue,
      jobSnapshot: fixture.gateA.jobInput.snapshot,
      completionReportSnapshot: fixture.gateA.completionReportInput.snapshot,
      evidenceValue: fixture.gateA.evidencePasses[0].value,
      evidenceBytes: fixture.gateA.evidencePasses[0].bytes,
      embeddedReportValue: fixture.gateA.embeddedReportPasses[0].value,
      embeddedReportBytes: fixture.gateA.embeddedReportPasses[0].bytes,
    },
    implementationSnapshots: fixture.implementationInputs.map((entry) => entry.snapshot),
    sourceSnapshots: fixture.gateA.sourceInputs.map((entry) => entry.snapshot),
    widthPolicySnapshots: fixture.widthPolicyInputs.map((entry) => entry.snapshot),
    runtimeObservation: fixture.runtimeObservation,
  };
  const before = clone(builderContext);
  const first =
    packageCore.buildPresentationCaptionSemanticSourcePackageV001(builderContext);
  const second =
    packageCore.buildPresentationCaptionSemanticSourcePackageV001(clone(builderContext));
  assert.deepEqual(builderContext, before);
  assert.deepEqual(first, second);
  assert.deepEqual(first.artifacts.map((entry) => entry.fileName), [
    'segmenter-boundary-evidence.json',
    'embedded-gate-a-validation-report.json',
    'semantic-source-input.json',
    'deterministic-expansion-map.json',
    'source-only-leakage-report.json',
    'package-manifest.json',
    'package-validation-report.json',
  ]);
  assert.equal(
    first.artifacts[5].value.validationReportDeclaration.fileName,
    'package-validation-report.json',
  );
  assert.equal(
    Object.hasOwn(first.artifacts[5].value.validationReportDeclaration, 'fileSha256'),
    false,
  );
  assert.equal(
    Object.hasOwn(first.artifacts[6].value, 'selfFileSha256'),
    false,
  );
  const contentProjection = first.artifacts.slice(0, 5).map((artifact, index) => ({
    role: [
      'boundaryEvidence',
      'embeddedGateAReport',
      'semanticSourceInput',
      'deterministicExpansionMap',
      'sourceOnlyLeakageReport',
    ][index],
    fileName: artifact.fileName,
    fileSha256: artifact.fileSha256,
    canonicalSha256: artifact.canonicalSha256,
  }));
  assert.deepEqual(first.artifacts[5].value.contentArtifacts, contentProjection);
  assert.equal(
    first.artifacts[5].value.contentSetCanonicalSha256,
    canonicalSha256(contentProjection),
  );
  assert.deepEqual(first.artifacts[6].value.manifestBinding, {
    fileName: first.artifacts[5].fileName,
    fileSha256: first.artifacts[5].fileSha256,
    canonicalSha256: first.artifacts[5].canonicalSha256,
  });
  assert.deepEqual(
    first.artifacts[6].value.validatedContentArtifacts,
    contentProjection,
  );
  assert.equal(
    JSON.stringify(first.artifacts[5].value).includes(first.artifacts[6].fileSha256),
    false,
  );
});

test('正常なpure checkerと最終report validatorは読み取り専用preflightを合格にする', () => {
  const fixture = makeValidFixture();
  const report = packageCore.checkPresentationCaptionSemanticSourcePackageV001(fixture);
  assertCheckedReportInvariants(report, PREFLIGHT_CHECK_NAMES);
  assert.equal(report.violations.length, 0);
  assert.equal(report.checks.every((entry) => entry.status === 'passed'), true);
  assert.deepEqual(fixture.readOnlyProcessObservation.attemptedWriteCalls, []);
  assert.equal(
    checkByName(report, 'readOnlyPreflight').status,
    'passed',
  );

  const candidatePackage = fixture.packageBuildPasses[0].artifacts;
  const manifest = candidatePackage[5];
  const validation = candidatePackage[6];
  const runReport = {
    schemaVersion: 'presentation-caption-semantic-source-package-run-report-v001',
    mode: 'read-only-preflight',
    status: 'passed',
    failureStage: null,
    jobBinding: {
      path: fixture.job.initialSnapshot.path,
      fileSha256: fixture.job.initialSnapshot.fileSha256,
    },
    candidatePackage: {
      packageId: fixture.job.value.publication.packageId,
      formalOutputPath: fixture.job.value.publication.formalOutputPath,
      manifestFileSha256: manifest.fileSha256,
      validationReportFileSha256: validation.fileSha256,
      contentSetCanonicalSha256: manifest.value.contentSetCanonicalSha256,
    },
    checks: report.checks,
    violations: report.violations,
    readOnlyObservation: {
      status: 'verified',
      beforeCanonicalSha256: canonicalSha256([]),
      afterCanonicalSha256: canonicalSha256([]),
      unchanged: true,
    },
    publicationObservation: null,
    publicationFailures: [],
    scope: {
      validatedState: 'read-only-candidate-package',
      semanticQualityVerified: false,
      naturalBreakQualityVerified: false,
      nonCooperativePublicationRaceProtected: false,
    },
  };
  const reportBytes = formalBytes(runReport);
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageRunReportV001({
      report: runReport,
      reportBytes,
      expectedExitCode: 0,
      checkerContext: fixture,
    }),
    {valid: true},
  );
  const tampered = clone(runReport);
  tampered.scope.semanticQualityVerified = true;
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageRunReportV001({
      report: tampered,
      reportBytes: formalBytes(tampered),
      expectedExitCode: 0,
      checkerContext: fixture,
    }),
    {valid: false},
  );

  const failedFixture = makeValidFixture();
  failedFixture.readOnlyProcessObservation.afterEntries = [{
    path: 'evals/clip_composition/outputs/presentation/unexpected.json',
    kind: 'file',
    contentSha256: '1'.repeat(64),
  }];
  const failedChecked =
    packageCore.checkPresentationCaptionSemanticSourcePackageV001(failedFixture);
  const failedRunReport = {
    ...clone(runReport),
    status: 'failed',
    failureStage: 'readOnlyPreflight',
    checks: failedChecked.checks,
    violations: failedChecked.violations,
    readOnlyObservation: {
      status: 'verified',
      beforeCanonicalSha256: canonicalSha256([]),
      afterCanonicalSha256: canonicalSha256(
        failedFixture.readOnlyProcessObservation.afterEntries,
      ),
      unchanged: false,
    },
  };
  assert.deepEqual(
    packageCore.validatePresentationCaptionSemanticSourcePackageRunReportV001({
      report: failedRunReport,
      reportBytes: formalBytes(failedRunReport),
      expectedExitCode: 1,
      checkerContext: failedFixture,
    }),
    {valid: true},
  );
});

test('package前半の違反は正本checkerの担当checkから発火する', () => {
  const jobInvalid = makeValidFixture();
  jobInvalid.job.value.schemaVersion = 'invalid';
  assertTargetCode(jobInvalid, 'CAPTION_B1_JOB_INVALID', 'jobBinding');

  const implementation = makeValidFixture();
  implementation.implementationInputs[0] = {
    role: 'packageCore',
    path: PACKAGE_CORE_REPOSITORY_PATH,
    status: 'missing',
    snapshot: null,
  };
  assertTargetCode(implementation, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');

  for (const index of [0, 1, 2]) {
    const directImplementationHash = makeValidFixture();
    const observation = directImplementationHash.implementationInputs[index];
    observation.snapshot = stableSnapshotFromBytes(
      observation.path,
      bytes(`implementation-${index}-changed`),
      51 + index,
    );
    assertTargetCode(
      directImplementationHash,
      'IMPLEMENTATION_MISMATCH',
      'implementationBinding',
    );
  }

  for (const [index, suffix] of [
    [1, "\nimport './presentation_renderer_plan_v002.mjs';\n"],
    [1, "\nvoid import('./presentation_caption_semantic_source_package_v001.mjs');\n"],
    [1, "\nrequire('node:fs');\n"],
    [1, "\nimport 'node:os';\n"],
    [1, "\nconst forbiddenModuleLoadRead = readFileSync('outside.json');\n"],
    [0, "\nimport './package-core-forbidden-local-v001.mjs';\n"],
  ]) {
    const invalidImportGraph = makeValidFixture();
    const observation = invalidImportGraph.implementationInputs[index];
    observation.snapshot = stableSnapshotFromBytes(
      observation.path,
      Buffer.concat([observation.snapshot.bytes, bytes(suffix)]),
      151 + index,
    );
    invalidImportGraph.job.value.implementationBinding.files[index].fileSha256 =
      observation.snapshot.fileSha256;
    refreshJobSnapshot(invalidImportGraph);
    rebuildPackagePasses(invalidImportGraph);
    const importGraphReport = assertTargetCode(
      invalidImportGraph,
      'IMPLEMENTATION_MISMATCH',
      'implementationBinding',
    );
    assert.deepEqual(collectCodes(importGraphReport), ['IMPLEMENTATION_MISMATCH']);
    assert.deepEqual(
      importGraphReport.violations,
      [{
        code: 'IMPLEMENTATION_MISMATCH',
        path: `$.implementationBindings[${index}]`,
        details: {},
      }],
    );
  }

  const unsafe = makeValidFixture();
  unsafe.widthPolicyInputs[0] = {
    role: 'presetRegistry',
    path: '../outside.json',
    status: 'lexically-rejected',
    snapshot: null,
  };
  assertTargetCode(unsafe, 'INPUT_PATH_UNSAFE', 'inputBinding');

  const mismatched = makeValidFixture();
  mismatched.widthPolicyInputs[0].snapshot =
    stableSnapshotFromBytes(mismatched.widthPolicyInputs[0].path, bytes('{}'), 61);
  assertTargetCode(mismatched, 'INPUT_HASH_MISMATCH', 'inputBinding');

  for (const index of [4, 5]) {
    const policyHash = makeValidFixture();
    const observation = policyHash.widthPolicyInputs[index];
    observation.snapshot = stableSnapshotFromBytes(
      observation.path,
      bytes(`width-policy-${index}-changed`),
      65 + index,
    );
    assertTargetCode(policyHash, 'INPUT_HASH_MISMATCH', 'inputBinding');
  }

  const unsupported = makeValidFixture();
  unsupported.widthPolicyInputs[0].snapshot =
    stableSnapshotFromBytes(unsupported.widthPolicyInputs[0].path, formalBytes({}), 61);
  unsupported.job.value.widthPolicyBindings[0].fileSha256 =
    unsupported.widthPolicyInputs[0].snapshot.fileSha256;
  unsupported.job.value.widthPolicyBindings[0].canonicalSha256 = canonicalSha256({});
  refreshJobSnapshot(unsupported);
  assertTargetCode(unsupported, 'INPUT_SCHEMA_UNSUPPORTED', 'inputBinding');

  const runtime = makeValidFixture();
  runtime.runtimeObservation.nodeBinaryInput.snapshot.bytes = Buffer.from('different');
  runtime.runtimeObservation.nodeBinaryInput.snapshot.fileSha256 =
    sha256(runtime.runtimeObservation.nodeBinaryInput.snapshot.bytes);
  assertTargetCode(runtime, 'RUNTIME_MISMATCH', 'runtimeBinding');

  const gateA = makeValidFixture();
  gateA.gateA.legacyReadOnlyObservation.beforeFormalPathState = 'present';
  assert.deepEqual(
    packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001({
      gateA: {
        jobValue: gateA.gateA.jobValue,
        jobInput: gateA.gateA.jobInput,
        implementationInputs: gateA.gateA.implementationInputs,
        sourceInputs: gateA.gateA.sourceInputs,
        legacyRecheck: gateA.gateA.legacyRecheck,
        legacyReadOnlyObservation: gateA.gateA.legacyReadOnlyObservation,
        evidencePasses: gateA.gateA.evidencePasses,
      },
      runtimeObservation: gateA.runtimeObservation,
    }),
    {status: 'context-invalid'},
  );
  assertTargetCode(gateA, 'GATE_A_CONTEXT_INVALID', 'gateAContext');
});

test('package import graphは関数・block arrow・concise arrow内file I/Oをmodule-load扱いしない', () => {
  const context = makeValidFixture();
  const index = 1;
  const observation = context.implementationInputs[index];
  const deferredOnlySuffix = [
    '',
    'function scannerFixtureDeferredFunction() {',
    "  return readFileSync('/tmp/not-module-load');",
    '}',
    'const scannerFixtureDeferredBlockArrow = () => {',
    "  return filesystemAdapter.openReadOnly('/tmp/not-module-load');",
    '};',
    'const scannerFixtureDeferredConciseArrow = async (pathValue) =>',
    '  (await filesystemAdapter.readdirWithTypes(pathValue)).length;',
    'const scannerFixtureDeferredMethod = {',
    "  openReadOnly() { return readFileSync('/tmp/not-module-load'); },",
    '};',
    "const scannerFixtureQuoted = \"writeFileSync('/tmp/not-module-load', 'x')\";",
    "const scannerFixtureTemplate = `readFileSync('/tmp/not-module-load')`;",
    "// filesystemAdapter.openReadOnly('/tmp/not-module-load');",
    "/* writeFileSync('/tmp/not-module-load', 'x'); */",
    '',
  ].join('\n');
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    Buffer.concat([observation.snapshot.bytes, bytes(deferredOnlySuffix)]),
    171,
  );
  context.job.value.implementationBinding.files[index].fileSha256 =
    observation.snapshot.fileSha256;
  refreshJobSnapshot(context);
  rebuildPackagePasses(context);
  const report =
    packageCore.checkPresentationCaptionSemanticSourcePackageV001(context);
  assert.equal(
    report.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
    false,
  );
});

test('package import graphはtemplate式でmodule-load時に実行されるfile I/Oを拒否する', () => {
  const context = makeValidFixture();
  const index = 1;
  const observation = context.implementationInputs[index];
  const suffix = "\nconst scannerFixtureExecuted = `${readFileSync('/tmp/forbidden')}`;\n";
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    Buffer.concat([observation.snapshot.bytes, bytes(suffix)]),
    172,
  );
  context.job.value.implementationBinding.files[index].fileSha256 =
    observation.snapshot.fileSha256;
  refreshJobSnapshot(context);
  rebuildPackagePasses(context);
  assertTargetCode(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
});

test('package import graphはobject初期化で直接実行されるfile I/Oを拒否する', () => {
  const context = makeValidFixture();
  const index = 1;
  const observation = context.implementationInputs[index];
  const suffix = "\nconst scannerFixtureExecuted = {bytes: readFileSync('/tmp/forbidden')};\n";
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    Buffer.concat([observation.snapshot.bytes, bytes(suffix)]),
    173,
  );
  context.job.value.implementationBinding.files[index].fileSha256 =
    observation.snapshot.fileSha256;
  refreshJobSnapshot(context);
  rebuildPackagePasses(context);
  assertTargetCode(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
});

for (const [label, suffix, sequence] of [
  [
    'concise arrow IIFE',
    "\nconst scannerFixtureExecuted = (() => readFileSync('/tmp/forbidden'))();\n",
    174,
  ],
  [
    'block arrow IIFE',
    "\nconst scannerFixtureExecuted = (() => { return readFileSync('/tmp/forbidden'); })();\n",
    175,
  ],
  [
    'function IIFE',
    "\nconst scannerFixtureExecuted = (function () { return readFileSync('/tmp/forbidden'); })();\n",
    176,
  ],
]) {
  test(`package import graphはmodule-load時に実行される${label}を拒否する`, () => {
    const context = makeValidFixture();
    const index = 1;
    const observation = context.implementationInputs[index];
    observation.snapshot = stableSnapshotFromBytes(
      observation.path,
      Buffer.concat([observation.snapshot.bytes, bytes(suffix)]),
      sequence,
    );
    context.job.value.implementationBinding.files[index].fileSha256 =
      observation.snapshot.fileSha256;
    refreshJobSnapshot(context);
    rebuildPackagePasses(context);
    assertTargetCode(context, 'IMPLEMENTATION_MISMATCH', 'implementationBinding');
  });
}

const checkPackageImportGraphSuffix = (suffix, discriminator) => {
  const context = makeValidFixture();
  const index = 1;
  const observation = context.implementationInputs[index];
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    Buffer.concat([observation.snapshot.bytes, bytes(`\n${suffix}\n`)]),
    discriminator,
  );
  context.job.value.implementationBinding.files[index].fileSha256 =
    observation.snapshot.fileSha256;
  refreshJobSnapshot(context);
  rebuildPackagePasses(context);
  return packageCore.checkPresentationCaptionSemanticSourcePackageV001(context);
};

const checkPackageRunnerImportGraphBytes = (sourceBytes, discriminator) => {
  const context = makeValidFixture();
  const index = 1;
  const observation = context.implementationInputs[index];
  observation.snapshot = stableSnapshotFromBytes(
    observation.path,
    sourceBytes,
    discriminator,
  );
  context.job.value.implementationBinding.files[index].fileSha256 =
    observation.snapshot.fileSha256;
  refreshJobSnapshot(context);
  rebuildPackagePasses(context);
  return packageCore.checkPresentationCaptionSemanticSourcePackageV001(context);
};

const makeR1HashbangScannerCases = (bodyBytes) => {
  const body = Buffer.from(bodyBytes);
  const prefixed = (prefix) => Buffer.concat([Buffer.from(prefix, 'utf8'), body]);
  const accepted = [
    ['LF終端', prefixed('#!/usr/bin/env node\n')],
    ['CRLF終端', prefixed('#!/usr/bin/env node\r\n')],
    ['空payload', prefixed('#!\n')],
    ['payload許可下端tab', prefixed('#!\t\n')],
    ['payload許可上端0x7E', prefixed('#!~\n')],
    ['hashbang後の空行', prefixed('#!/usr/bin/env node\n\n')],
    [
      'payload内の禁止語形',
      prefixed('#! import( require( readFileSync(\n'),
    ],
    [
      '文字列・comment・template・regex内のhashbang',
      Buffer.concat([
        body,
        bytes([
          '',
          "const scannerHashbangString = '#!';",
          '/* #! */',
          'const scannerHashbangTemplate = `#!`;',
          'const scannerHashbangRegex = /#!/u;',
          '',
        ].join('\n')),
      ]),
    ],
  ];
  const rejected = [
    ['BOM後', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), prefixed('#!/usr/bin/env node\n')])],
    ['先行space', prefixed(' #!/usr/bin/env node\n')],
    ['先行tab', prefixed('\t#!/usr/bin/env node\n')],
    ['先行改行', prefixed('\n#!/usr/bin/env node\n')],
    ['分離hashbang', prefixed('# !/usr/bin/env node\n')],
    ['逆順hashbang', prefixed('!#/usr/bin/env node\n')],
    [
      'JavaScript token後',
      Buffer.concat([bytes('const scannerBeforeHashbang = 1;\n#!/usr/bin/env node\n'), body]),
    ],
    ['二行目のhashbang', prefixed('#!/usr/bin/env node\n#!/usr/bin/env node\n')],
    ['裸CR終端', prefixed('#!/usr/bin/env node\r')],
    ['U+2028終端', prefixed('#!/usr/bin/env node\u2028')],
    ['U+2029終端', prefixed('#!/usr/bin/env node\u2029')],
    ['行終端なしEOF', bytes('#!/usr/bin/env node')],
    [
      'payload内NUL',
      Buffer.concat([bytes('#!/usr/bin/'), Buffer.from([0x00]), bytes('env node\n'), body]),
    ],
    ['payload内非ASCII', prefixed('#!/usr/bin/env ノード\n')],
    [
      'payload内未許可制御文字',
      Buffer.concat([bytes('#!/usr/bin/'), Buffer.from([0x01]), bytes('env node\n'), body]),
    ],
    [
      'payload許可範囲直前0x1F',
      Buffer.concat([bytes('#!/usr/bin/'), Buffer.from([0x1f]), bytes('env node\n'), body]),
    ],
    [
      'payload許可範囲直後0x7F',
      Buffer.concat([bytes('#!/usr/bin/'), Buffer.from([0x7f]), bytes('env node\n'), body]),
    ],
  ];
  return {accepted, rejected};
};

const R1_SCANNER_ACCEPTED_SOURCES = Object.freeze([
  [
    '通常member・optional member後の除算',
    [
      'const scannerR1Member = value.property / divisor;',
      'const scannerR1OptionalProperty = value?.property / divisor;',
      'const scannerR1OptionalBracket = value?.[field] / divisor;',
    ].join('\n'),
  ],
  [
    'spread三形とspread直後のregex',
    [
      'const scannerR1SpreadCall = resolve(root, ...parts);',
      'const scannerR1SpreadObject = ({...entry});',
      'const scannerR1SpreadArray = [...entries];',
      'const scannerR1SpreadRegex = consume(.../import\\(/g);',
    ].join('\n'),
  ],
  [
    'regex・comment・string・template raw内の禁止語',
    [
      'const scannerR1Regex = /import\\s*\\(|require\\s*\\(|readFileSync\\(/gu;',
      "const scannerR1String = \"import('x') require('x') readFileSync('x')\";",
      "const scannerR1Template = `import('x') require('x') ${value}`;",
      "// import('x'); require('x'); readFileSync('x');",
      "/* import('x'); require('x'); readFileSync('x'); */",
      'const scannerR1CommentThenRegex = /* comment */ /require\\(/u.test(value);',
      "const scannerR1TemplateRegex = `${/import\\(/u.test(value)}`;",
    ].join('\n'),
  ],
  [
    '固定済み数値五形',
    'const scannerR1Numbers = [0, 57, 0.04, 1n, 0xff, 0o600];',
  ],
  [
    '制御条件内とstatement開始のregex',
    [
      'if (/require\\(/u.test(value)) consume(value);',
      'if (condition) /import\\(/u.test(value);',
    ].join('\n'),
  ],
]);

for (const [index, [label, suffix]] of R1_SCANNER_ACCEPTED_SOURCES.entries()) {
  test(`package R1 scannerは${label}を受理する`, () => {
    const report = checkPackageImportGraphSuffix(suffix, 180 + index);
    assert.equal(
      report.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
      false,
    );
  });
}

const R1_SCANNER_REJECTED_SOURCES = Object.freeze([
  ['通常member経由file I/O', "const scannerR1Invalid = value.readFileSync('/tmp/x');"],
  ['optional member経由file I/O', "const scannerR1Invalid = value?.readFileSync('/tmp/x');"],
  ['spread内file I/O', "const scannerR1Invalid = consume(...readFileSync('/tmp/x'));"],
  ['dynamic import', "const scannerR1Invalid = import('./x.mjs');"],
  [
    '関数内dynamic import',
    "function scannerR1Deferred() { return import('./x.mjs'); }",
  ],
  ['spread内dynamic import', "const scannerR1Invalid = consume(...import('./x.mjs'));"],
  ['template式内dynamic import', "const scannerR1Invalid = `${import('./x.mjs')}`;"],
  ['property名のdynamic import', 'const scannerR1Invalid = object.import();'],
  ['CommonJS require', "const scannerR1Invalid = require('node:fs');"],
  ['arrow内CommonJS require', "const scannerR1Deferred = () => require('node:fs');"],
  ['spread内CommonJS require', "const scannerR1Invalid = consume(...require('node:fs'));"],
  ['template式内CommonJS require', "const scannerR1Invalid = `${require('node:fs')}`;"],
  ['optional property名のrequire', 'const scannerR1Invalid = object?.require();'],
  ['member待機中のslash', 'const scannerR1Invalid = value./pattern/;'],
  ['二個のdot', 'const scannerR1Invalid = value..name;'],
  ['四個のdot', 'const scannerR1Invalid = value....name;'],
  ['未完のdot', 'const scannerR1Invalid = value.;'],
  ['未完のoptional dot', 'const scannerR1Invalid = value?.;'],
  ['未完のspread', 'const scannerR1Invalid = (...);'],
  ['先頭dot小数', 'const scannerR1Invalid = .5;'],
  ['末尾dot数値', 'const scannerR1Invalid = 1.;'],
  ['二個dot数値member', 'const scannerR1Invalid = 1..name;'],
  ['指数表記', 'const scannerR1Invalid = 1e2;'],
  ['二進数表記', 'const scannerR1Invalid = 0b10;'],
  ['separator付き数値', 'const scannerR1Invalid = 1_000;'],
  ['optional call', 'const scannerR1Invalid = value?.();'],
  ['optional private name', 'const scannerR1Invalid = value?.#name;'],
  ['optional tagged template', 'const scannerR1Invalid = value?.tag`x`;'],
  ['return直後spread', 'function scannerR1Deferred() { return ...value; }'],
  ['二項演算子直後spread', 'const scannerR1Invalid = left + ...right;'],
  ['未閉鎖regex', 'const scannerR1Invalid = /unterminated;'],
  ['未閉鎖regex class', 'const scannerR1Invalid = /[abc/;'],
  ['括弧不一致', 'const scannerR1Invalid = ([value);'],
  ['閉じbrace直後slash', 'const scannerR1Invalid = {} / divisor;'],
]);

for (const [index, [label, suffix]] of R1_SCANNER_REJECTED_SOURCES.entries()) {
  test(`package R1 scannerは${label}を拒否する`, () => {
    const report = checkPackageImportGraphSuffix(suffix, 200 + index);
    assert.equal(
      report.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
      true,
    );
  });
}

test('package R1 scannerは実package 2 sourceと限定hashbang表を契約どおり扱う', () => {
  assert.equal(sha256(PACKAGE_RUNNER_BYTES), PACKAGE_RUNNER_BASELINE_SHA256);
  const report = packageCore.checkPresentationCaptionSemanticSourcePackageV001(
    makeValidFixture(),
  );
  assert.equal(
    report.violations.some((entry) => entry.code === 'IMPLEMENTATION_MISMATCH'),
    false,
  );

  const hashbangPrefix = bytes('#!/usr/bin/env node\n');
  const runnerBodyWithLeadingBlankLine = PACKAGE_RUNNER_BYTES.subarray(
    hashbangPrefix.length,
  );
  const runnerBody = runnerBodyWithLeadingBlankLine.subarray(1);
  const scannerProbeBody = Buffer.concat([
    bytes('// hashbang scanner probe\n'),
    runnerBody,
  ]);
  const {accepted, rejected} = makeR1HashbangScannerCases(scannerProbeBody);
  const acceptedByLabel = new Map(accepted);
  const rejectedByLabel = new Map(rejected);
  const hashbangStem = bytes('#!/usr/bin/env node');
  const byteShapeFailures = [];
  const recordByteShape = (label, condition) => {
    if (!condition) byteShapeFailures.push(label);
  };
  recordByteShape(
    '実package runnerのhashbang',
    PACKAGE_RUNNER_BYTES.subarray(0, hashbangPrefix.length).equals(hashbangPrefix),
  );
  recordByteShape(
    '実package runner本文の既知先頭空行',
    runnerBodyWithLeadingBlankLine[0] === 0x0a,
  );
  recordByteShape('合成本文の先頭はLFでない', runnerBody[0] !== 0x0a);
  recordByteShape(
    'LF終端',
    acceptedByLabel.get('LF終端')
      .subarray(hashbangStem.length, hashbangStem.length + 1)
      .equals(Buffer.from([0x0a]))
      && acceptedByLabel.get('LF終端')[hashbangStem.length + 1]
        === scannerProbeBody[0],
  );
  recordByteShape(
    'CRLF終端',
    acceptedByLabel.get('CRLF終端')
      .subarray(hashbangStem.length, hashbangStem.length + 2)
      .equals(Buffer.from([0x0d, 0x0a]))
      && acceptedByLabel.get('CRLF終端')[hashbangStem.length + 2]
        === scannerProbeBody[0],
  );
  recordByteShape(
    '裸CR終端',
    rejectedByLabel.get('裸CR終端')
      .subarray(hashbangStem.length, hashbangStem.length + 1)
      .equals(Buffer.from([0x0d]))
      && rejectedByLabel.get('裸CR終端')[hashbangStem.length + 1] !== 0x0a
      && rejectedByLabel.get('裸CR終端')[hashbangStem.length + 1]
        === scannerProbeBody[0],
  );
  recordByteShape(
    'U+2028終端',
    rejectedByLabel.get('U+2028終端')
      .subarray(hashbangStem.length, hashbangStem.length + 3)
      .equals(Buffer.from([0xe2, 0x80, 0xa8])),
  );
  recordByteShape(
    'U+2029終端',
    rejectedByLabel.get('U+2029終端')
      .subarray(hashbangStem.length, hashbangStem.length + 3)
      .equals(Buffer.from([0xe2, 0x80, 0xa9])),
  );
  recordByteShape(
    '行終端なしEOF',
    rejectedByLabel.get('行終端なしEOF').equals(hashbangStem),
  );
  recordByteShape(
    'hashbang後の空行',
    acceptedByLabel.get('hashbang後の空行')
      .subarray(hashbangStem.length, hashbangStem.length + 2)
      .equals(Buffer.from([0x0a, 0x0a]))
      && acceptedByLabel.get('hashbang後の空行')[hashbangStem.length + 2]
        === scannerProbeBody[0],
  );
  accepted.unshift(['実package runner', Buffer.from(PACKAGE_RUNNER_BYTES)]);

  const acceptedFailures = accepted.map(([label, sourceBytes], index) => {
    try {
      const acceptedReport = checkPackageRunnerImportGraphBytes(
        sourceBytes,
        400 + index,
      );
      return acceptedReport.violations.some(
        (entry) => entry.code === 'IMPLEMENTATION_MISMATCH',
      )
        ? label
        : null;
    } catch (error) {
      return `${label}: ${error.name}: ${error.message}`;
    }
  }).filter((entry) => entry !== null);
  const rejectedFailures = rejected.map(([label, sourceBytes], index) => {
    try {
      const rejectedReport = checkPackageRunnerImportGraphBytes(
        sourceBytes,
        500 + index,
      );
      return rejectedReport.violations.some(
        (entry) => entry.code === 'IMPLEMENTATION_MISMATCH',
      )
        ? null
        : label;
    } catch (error) {
      return `${label}: ${error.name}: ${error.message}`;
    }
  }).filter((entry) => entry !== null);
  assert.deepEqual(acceptedFailures, []);
  assert.deepEqual(rejectedFailures, []);
  assert.deepEqual(byteShapeFailures, []);
});

test('Gate A build・決定性・reportの違反は段階ごとの担当checkから発火する', () => {
  const gateAPassed = makeValidFixture();
  const gateAPassedReport =
    packageCore.checkPresentationCaptionSemanticSourcePackageV001(gateAPassed);
  assertCheckedReportInvariants(gateAPassedReport, PREFLIGHT_CHECK_NAMES);
  assert.equal(checkByName(gateAPassedReport, 'gateAReport').status, 'passed');
  assert.equal(
    collectCodes(gateAPassedReport).some(
      (code) => code === 'GATE_A_REPORT_INVALID' || code === 'GATE_A_NOT_PASSED',
    ),
    false,
  );

  const evidenceBuild = makeValidFixture();
  evidenceBuild.gateA.evidencePasses = [null, null];
  evidenceBuild.gateA.embeddedReportPasses = [];
  evidenceBuild.packageBuildPasses = [];
  evidenceBuild.buildFailure = {
    stage: 'gate-a-evidence',
    passOrdinal: 1,
    kind: 'thrown',
    inputByteCopies: [],
  };
  assertTargetCode(evidenceBuild, 'BUILD_FAILED', 'evidenceBuild');

  const evidenceNondeterministic = makeValidFixture();
  evidenceNondeterministic.gateA.evidencePasses[1].value.artifactId = 'different-artifact';
  evidenceNondeterministic.gateA.evidencePasses[1] =
    buildSuccess(evidenceNondeterministic.gateA.evidencePasses[1].value);
  assertTargetCode(
    evidenceNondeterministic,
    'EVIDENCE_NONDETERMINISTIC',
    'evidenceDeterminism',
  );

  const evidenceExpected = makeValidFixture();
  evidenceExpected.job.value.gateA.expectedEvidenceHashes.evidenceCanonicalSha256 =
    'f'.repeat(64);
  refreshJobSnapshot(evidenceExpected);
  assertTargetCode(
    evidenceExpected,
    'EVIDENCE_EXPECTED_HASH_MISMATCH',
    'evidenceDeterminism',
  );

  const embeddedBuild = makeValidFixture();
  embeddedBuild.gateA.embeddedReportPasses = [null, null];
  embeddedBuild.packageBuildPasses = [];
  embeddedBuild.buildFailure = {
    stage: 'embedded-gate-a-report',
    passOrdinal: 2,
    kind: 'invalid-return',
    inputByteCopies: [],
  };
  assertTargetCode(embeddedBuild, 'BUILD_FAILED', 'embeddedReportBuild');

  const embeddedNondeterministic = makeValidFixture();
  embeddedNondeterministic.gateA.embeddedReportPasses[1].value.extra = true;
  embeddedNondeterministic.gateA.embeddedReportPasses[1] = buildSuccess(
    embeddedNondeterministic.gateA.embeddedReportPasses[1].value,
    {embeddedCanonical: true},
  );
  assertTargetCode(embeddedNondeterministic, 'NONDETERMINISTIC', 'gateAReport');

  const completion = makeValidFixture();
  completion.gateA.completionReportInput = {
    role: 'gateACompletionReport',
    path: completion.gateA.completionReportInput.path,
    status: 'missing',
    snapshot: null,
  };
  assertTargetCode(completion, 'GATE_A_REPORT_INVALID', 'gateAReport');

  const gateAInvalid = makeValidFixture();
  gateAInvalid.gateA.embeddedReportPasses = gateAInvalid.gateA.embeddedReportPasses.map(
    (pass) => {
      const value = clone(pass.value);
      value.schemaVersion = 'invalid-gate-a-report-v001';
      return buildSuccess(value, {embeddedCanonical: true});
    },
  );
  rebuildPackagePasses(gateAInvalid);
  const gateAInvalidReport = assertTargetCode(
    gateAInvalid,
    'GATE_A_REPORT_INVALID',
    'gateAReport',
  );
  assert.equal(collectCodes(gateAInvalidReport).includes('GATE_A_NOT_PASSED'), false);

  const gateAFailed = makeValidFixture();
  gateAFailed.runtimeObservation.nodeVersion = 'v0.0.0-synthetic';
  gateAFailed.job.value.expectedRuntime.nodeVersion = 'v0.0.0-synthetic';
  refreshJobSnapshot(gateAFailed);
  const failedDerived =
    packageCore.derivePresentationCaptionEmbeddedGateAReportContextV001({
      gateA: {
        jobValue: gateAFailed.gateA.jobValue,
        jobInput: gateAFailed.gateA.jobInput,
        implementationInputs: gateAFailed.gateA.implementationInputs,
        sourceInputs: gateAFailed.gateA.sourceInputs,
        legacyRecheck: gateAFailed.gateA.legacyRecheck,
        legacyReadOnlyObservation: gateAFailed.gateA.legacyReadOnlyObservation,
        evidencePasses: gateAFailed.gateA.evidencePasses,
      },
      runtimeObservation: gateAFailed.runtimeObservation,
    });
  assert.equal(failedDerived.status, 'derived');
  assert.equal(failedDerived.value.checkReport.status, 'failed');
  const failedEmbedded =
    packageCore.buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(
      failedDerived.value,
    );
  gateAFailed.gateA.embeddedReportPasses = [
    buildSuccess(clone(failedEmbedded), {embeddedCanonical: true}),
    buildSuccess(clone(failedEmbedded), {embeddedCanonical: true}),
  ];
  const gateAFailedReport = assertTargetCode(
    gateAFailed,
    'GATE_A_NOT_PASSED',
    'gateAReport',
  );
  assert.equal(
    collectCodes(gateAFailedReport).includes('GATE_A_REPORT_INVALID'),
    false,
  );

  const packageBuildFailure = makeValidFixture();
  packageBuildFailure.packageBuildPasses = [null, null];
  packageBuildFailure.buildFailure = {
    stage: 'package',
    passOrdinal: 1,
    kind: 'input-mutated',
    inputByteCopies: [{
      path: '$.gateA.evidenceBytes',
      beforeSha256: '1'.repeat(64),
      afterSha256: '2'.repeat(64),
      unchanged: false,
    }],
  };
  assertTargetCode(packageBuildFailure, 'BUILD_FAILED', 'packageBuild');
});

test('package側3 build stageはpass別の全失敗型を固定配列形と入力copy記録で拒否する', () => {
  const pristine = makeValidFixture();
  assert.notStrictEqual(
    pristine.gateA.evidencePasses[0].bytes,
    pristine.gateA.evidencePasses[1].bytes,
  );
  assert.equal(
    pristine.gateA.evidencePasses[0].bytes.equals(
      pristine.gateA.evidencePasses[1].bytes,
    ),
    true,
  );
  assert.notStrictEqual(
    pristine.gateA.embeddedReportPasses[0].bytes,
    pristine.gateA.embeddedReportPasses[1].bytes,
  );
  assert.equal(
    pristine.gateA.embeddedReportPasses[0].bytes.equals(
      pristine.gateA.embeddedReportPasses[1].bytes,
    ),
    true,
  );
  assert.notStrictEqual(
    pristine.packageBuildPasses[0].artifacts[0].bytes,
    pristine.packageBuildPasses[1].artifacts[0].bytes,
  );
  assert.equal(
    pristine.packageBuildPasses[0].artifacts[0].bytes.equals(
      pristine.packageBuildPasses[1].artifacts[0].bytes,
    ),
    true,
  );
  assert.notStrictEqual(
    pristine.packageBuildPasses[0].inputByteCopies,
    pristine.packageBuildPasses[1].inputByteCopies,
  );

  for (const stage of ['gate-a-evidence', 'embedded-gate-a-report']) {
    const checkName = stage === 'gate-a-evidence'
      ? 'evidenceBuild'
      : 'embeddedReportBuild';
    for (const kind of ['thrown', 'invalid-return']) {
      for (const passOrdinal of [1, 2]) {
        const fixture = makeBuildFailureFixture(stage, passOrdinal, kind);
        const failedPasses = stage === 'gate-a-evidence'
          ? fixture.gateA.evidencePasses
          : fixture.gateA.embeddedReportPasses;
        assert.deepEqual(
          failedPasses.map((entry) => entry === null),
          passOrdinal === 1 ? [true, true] : [false, true],
        );
        assert.deepEqual(fixture.buildFailure, {
          stage,
          passOrdinal,
          kind,
          inputByteCopies: [],
        });
        if (stage === 'gate-a-evidence') {
          assert.deepEqual(fixture.gateA.embeddedReportPasses, []);
        }
        assert.deepEqual(fixture.packageBuildPasses, []);
        assertTargetCode(fixture, 'BUILD_FAILED', checkName);
      }
    }
  }

  for (const kind of ['thrown', 'invalid-return', 'input-mutated']) {
    for (const passOrdinal of [1, 2]) {
      const fixture = makeBuildFailureFixture('package', passOrdinal, kind);
      assert.deepEqual(
        fixture.packageBuildPasses.map((entry) => entry === null),
        passOrdinal === 1 ? [true, true] : [false, true],
      );
      assert.equal(
        fixture.buildFailure.inputByteCopies.every((entry) =>
          entry.unchanged === (kind !== 'input-mutated'
            || entry.path !== '$.gateA.evidenceBytes')),
        true,
      );
      assert.equal(
        fixture.buildFailure.inputByteCopies
          .filter((entry) => !entry.unchanged).length,
        kind === 'input-mutated' ? 1 : 0,
      );
      assert.equal(
        fixture.builderInvocationProvenance.passes.length,
        passOrdinal,
      );
      assertTargetCode(fixture, 'BUILD_FAILED', 'packageBuild');
    }
  }

  assert.doesNotMatch(PACKAGE_RUNNER_SOURCE, /\bscenario\b/u);
  assert.deepEqual(makeValidFixture(), pristine);
});

test('package成果物とsource-only検査は改変を上流へ遡って自動修復しない', () => {
  const fileSet = makeValidFixture();
  fileSet.packageBuildPasses.forEach((pass) => pass.artifacts.pop());
  assertTargetCode(fileSet, 'PACKAGE_FILE_SET_INVALID', 'packageShape');

  for (const mutate of [
    (artifacts) => artifacts.push({
      ...clone(artifacts[0]),
      fileName: 'unexpected.json',
    }),
    (artifacts) => {
      artifacts[0].fileName = 'renamed-boundary-evidence.json';
    },
    (artifacts) => {
      [artifacts[0], artifacts[1]] = [artifacts[1], artifacts[0]];
    },
  ]) {
    const invalidFileSet = makeValidFixture();
    invalidFileSet.packageBuildPasses.forEach((pass) => mutate(pass.artifacts));
    assertTargetCode(invalidFileSet, 'PACKAGE_FILE_SET_INVALID', 'packageShape');
  }

  const schema = makeValidFixture();
  schema.packageBuildPasses.forEach((pass) => {
    pass.artifacts[5].value.schemaVersion = 'invalid';
    rehashArtifact(pass.artifacts[5]);
  });
  const schemaReport =
    assertTargetCode(schema, 'PACKAGE_SCHEMA_INVALID', 'packageShape');
  assert.deepEqual(collectCodes(schemaReport), ['PACKAGE_SCHEMA_INVALID']);

  for (const artifactIndex of [5, 6]) {
    const outerUnknown = makeValidFixture();
    outerUnknown.packageBuildPasses.forEach((pass) => {
      pass.artifacts[artifactIndex].value.unknownOuterField = true;
      rehashArtifact(pass.artifacts[artifactIndex]);
      if (artifactIndex === 5) {
        pass.artifacts[6].value.manifestBinding = {
          fileName: pass.artifacts[5].fileName,
          fileSha256: pass.artifacts[5].fileSha256,
          canonicalSha256: pass.artifacts[5].canonicalSha256,
        };
        rehashArtifact(pass.artifacts[6]);
      }
    });
    const outerUnknownReport =
      assertTargetCode(outerUnknown, 'PACKAGE_SCHEMA_INVALID', 'packageShape');
    assert.deepEqual(collectCodes(outerUnknownReport), ['PACKAGE_SCHEMA_INVALID']);
  }

  const knownBindingMismatch = makeValidFixture();
  knownBindingMismatch.packageBuildPasses.forEach((pass) => {
    pass.artifacts[5].value.contentArtifacts[0].fileSha256 = '0'.repeat(64);
    rehashArtifact(pass.artifacts[5]);
    pass.artifacts[6].value.manifestBinding = {
      fileName: pass.artifacts[5].fileName,
      fileSha256: pass.artifacts[5].fileSha256,
      canonicalSha256: pass.artifacts[5].canonicalSha256,
    };
    rehashArtifact(pass.artifacts[6]);
  });
  const knownBindingReport = assertTargetCode(
    knownBindingMismatch,
    'PACKAGE_BINDING_MISMATCH',
    'packageShape',
  );
  assert.deepEqual(collectCodes(knownBindingReport), ['PACKAGE_BINDING_MISMATCH']);

  const outerSelfHashMismatch = makeValidFixture();
  outerSelfHashMismatch.packageBuildPasses.forEach((pass) => {
    pass.artifacts[5].fileSha256 = '0'.repeat(64);
    pass.artifacts[6].value.manifestBinding.fileSha256 = '0'.repeat(64);
    rehashArtifact(pass.artifacts[6]);
  });
  const outerSelfHashReport = assertTargetCode(
    outerSelfHashMismatch,
    'PACKAGE_HASH_MISMATCH',
    'packageShape',
  );
  assert.deepEqual(collectCodes(outerSelfHashReport), ['PACKAGE_HASH_MISMATCH']);

  const outerSchemaAndSelfHash = makeValidFixture();
  outerSchemaAndSelfHash.packageBuildPasses.forEach((pass) => {
    pass.artifacts[5].value.unknownOuterField = true;
    rehashArtifact(pass.artifacts[5]);
    pass.artifacts[5].fileSha256 = '0'.repeat(64);
    pass.artifacts[6].value.manifestBinding = {
      fileName: pass.artifacts[5].fileName,
      fileSha256: pass.artifacts[5].fileSha256,
      canonicalSha256: pass.artifacts[5].canonicalSha256,
    };
    rehashArtifact(pass.artifacts[6]);
  });
  const outerSchemaAndSelfHashReport = assertTargetCode(
    outerSchemaAndSelfHash,
    'PACKAGE_SCHEMA_INVALID',
    'packageShape',
  );
  assert.deepEqual(
    collectCodes(outerSchemaAndSelfHashReport),
    ['PACKAGE_SCHEMA_INVALID', 'PACKAGE_HASH_MISMATCH'],
  );

  const strict = makeValidFixture();
  strict.packageBuildPasses.forEach((pass) => {
    pass.artifacts[0].bytes = bytes('{');
    pass.artifacts[0].fileSha256 = sha256(pass.artifacts[0].bytes);
  });
  assertTargetCode(strict, 'PACKAGE_STRICT_JSON_INVALID', 'packageShape');

  const binding = makeValidFixture();
  binding.packageBuildPasses.forEach((pass) => {
    pass.artifacts[0].value.artifactId = 'different';
    rehashArtifact(pass.artifacts[0]);
  });
  assertTargetCode(binding, 'PACKAGE_BINDING_MISMATCH', 'packageShape');

  const hashMismatch = makeValidFixture();
  hashMismatch.packageBuildPasses.forEach((pass) => {
    pass.artifacts[0].fileSha256 = '0'.repeat(64);
    pass.artifacts[0].canonicalSha256 = '1'.repeat(64);
  });
  assertTargetCode(hashMismatch, 'PACKAGE_HASH_MISMATCH', 'packageShape');

  const modelSchema = makeValidFixture();
  modelSchema.packageBuildPasses.forEach((pass) => {
    delete pass.artifacts[2].value.containers;
    rehashArtifact(pass.artifacts[2]);
    synchronizePackageMetadataFromContent(pass);
  });
  const modelSchemaReport =
    assertTargetCode(modelSchema, 'MODEL_INPUT_SCHEMA_INVALID', 'modelInput');
  assert.deepEqual(collectCodes(modelSchemaReport), ['MODEL_INPUT_SCHEMA_INVALID']);

  const modelProjection = makeValidFixture();
  modelProjection.packageBuildPasses.forEach((pass) => {
    pass.artifacts[2].value.containers[0].boundaryCandidates[0].text += '改';
    rehashArtifact(pass.artifacts[2]);
    synchronizePackageMetadataFromContent(pass);
  });
  const modelProjectionReport = assertTargetCode(
    modelProjection,
    'MODEL_INPUT_PROJECTION_MISMATCH',
    'modelInput',
  );
  assert.deepEqual(
    collectCodes(modelProjectionReport),
    ['MODEL_INPUT_PROJECTION_MISMATCH'],
  );

  for (const mutate of [
    (value) => {
      const candidates = value.containers.find(
        (container) => container.boundaryCandidates.length >= 2,
      ).boundaryCandidates;
      [candidates[0], candidates[1]] = [candidates[1], candidates[0]];
    },
    (value) => {
      value.containers[0].boundaryCandidates[0].logicalWidth += 1;
    },
  ]) {
    const projectionMismatch = makeValidFixture();
    projectionMismatch.packageBuildPasses.forEach((pass) => {
      mutate(pass.artifacts[2].value);
      rehashArtifact(pass.artifacts[2]);
      synchronizePackageMetadataFromContent(pass);
    });
    const report = assertTargetCode(
      projectionMismatch,
      'MODEL_INPUT_PROJECTION_MISMATCH',
      'modelInput',
    );
    assert.deepEqual(collectCodes(report), ['MODEL_INPUT_PROJECTION_MISMATCH']);
  }

  const modelForbidden = makeValidFixture();
  modelForbidden.packageBuildPasses.forEach((pass) => {
    pass.artifacts[2].value.reason = 'forbidden';
    rehashArtifact(pass.artifacts[2]);
    synchronizePackageMetadataFromContent(pass);
  });
  const forbiddenOnlyReport =
    assertTargetCode(modelForbidden, 'MODEL_INPUT_FORBIDDEN_FIELD', 'modelInput');
  assert.deepEqual(collectCodes(forbiddenOnlyReport), ['MODEL_INPUT_FORBIDDEN_FIELD']);

  const forbiddenAndInvalid = makeValidFixture();
  forbiddenAndInvalid.packageBuildPasses.forEach((pass) => {
    pass.artifacts[2].value.reason = 'forbidden';
    delete pass.artifacts[2].value.containers;
    rehashArtifact(pass.artifacts[2]);
    synchronizePackageMetadataFromContent(pass);
  });
  const forbiddenAndInvalidReport = assertTargetCode(
    forbiddenAndInvalid,
    'MODEL_INPUT_SCHEMA_INVALID',
    'modelInput',
  );
  assert.deepEqual(
    collectCodes(forbiddenAndInvalidReport),
    ['MODEL_INPUT_SCHEMA_INVALID', 'MODEL_INPUT_FORBIDDEN_FIELD'],
  );

  const mappingSchema = makeValidFixture();
  mappingSchema.packageBuildPasses.forEach((pass) => {
    delete pass.artifacts[3].value.containers;
    rehashArtifact(pass.artifacts[3]);
    synchronizePackageMetadataFromContent(pass);
  });
  const mappingSchemaReport =
    assertTargetCode(mappingSchema, 'MAPPING_SCHEMA_INVALID', 'expansionMap');
  assert.deepEqual(collectCodes(mappingSchemaReport), ['MAPPING_SCHEMA_INVALID']);

  const mappingCoverage = makeValidFixture();
  mappingCoverage.packageBuildPasses.forEach((pass) => {
    pass.artifacts[3].value.containers[0].candidates[0].sourceAtomIds[0] =
      'source-atom-outside-expected-projection';
    rehashArtifact(pass.artifacts[3]);
    synchronizePackageMetadataFromContent(pass);
  });
  const mappingCoverageReport =
    assertTargetCode(mappingCoverage, 'MAPPING_COVERAGE_INVALID', 'expansionMap');
  assert.deepEqual(collectCodes(mappingCoverageReport), ['MAPPING_COVERAGE_INVALID']);

  for (const mutate of [
    (value) => {
      value.containers.find((container) => container.candidates.length > 0)
        .candidates.shift();
    },
    (value) => {
      const candidates = value.containers.find(
        (container) => container.candidates.length > 0,
      ).candidates;
      candidates.push(clone(candidates[0]));
    },
    (value) => {
      const first = value.containers[0].candidates[0];
      const other = value.containers
        .slice(1)
        .flatMap((container) => container.candidates)
        .find((candidate) =>
          candidate.sourceAtomIds[0] !== first.sourceAtomIds[0]);
      first.sourceAtomIds[0] = other.sourceAtomIds[0];
    },
    (value) => {
      value.containers[0].candidates[0].startAnchor.atomId =
        'source-atom-anchor-outside-expected-projection';
    },
  ]) {
    const coverageMismatch = makeValidFixture();
    coverageMismatch.packageBuildPasses.forEach((pass) => {
      mutate(pass.artifacts[3].value);
      rehashArtifact(pass.artifacts[3]);
      synchronizePackageMetadataFromContent(pass);
    });
    const report = assertTargetCode(
      coverageMismatch,
      'MAPPING_COVERAGE_INVALID',
      'expansionMap',
    );
    assert.deepEqual(collectCodes(report), ['MAPPING_COVERAGE_INVALID']);
  }

  const leakage = makeValidFixture();
  leakage.builderInvocationProvenance.passes[0].accessedEntries.push({
    role: 'expectedCut',
    path: null,
  });
  const leakageReport =
    assertTargetCode(leakage, 'MODEL_INPUT_LEAKAGE_DETECTED', 'sourceOnlyLeakage');
  assert.deepEqual(collectCodes(leakageReport), ['MODEL_INPUT_LEAKAGE_DETECTED']);

  const packageNondeterministic = makeValidFixture();
  packageNondeterministic.packageBuildPasses[1].artifacts[6].bytes =
    Buffer.concat([
      packageNondeterministic.packageBuildPasses[1].artifacts[6].bytes,
      Buffer.from(' '),
    ]);
  assertTargetCode(packageNondeterministic, 'NONDETERMINISTIC', 'determinism');
});

const makeFormalFixture = () => {
  const fixture = makeValidFixture();
  fixture.productionMode = 'formal-generation';
  fixture.job.value.mode = 'formal-generation';
  fixture.job.value.readOnlyGuard.excludedPaths = [
    'evals/clip_composition/outputs/presentation/caption-semantic-source-package-jobs/synthetic-caption-b1-v001.json',
  ];
  fixture.job.initialSnapshot.path = fixture.job.value.readOnlyGuard.excludedPaths[0];
  refreshJobSnapshot(fixture);
  rebuildPackagePasses(fixture);
  fixture.readOnlyProcessObservation = {
    mode: 'not-requested',
    inputReread: {
      status: 'completed',
      initialInputs: [],
      finalInputs: [],
    },
  };
  fixture.publicationProcessObservation = {
    mode: 'formal',
    initialPaths: {status: 'observed', entries: []},
    lock: {state: 'not-attempted'},
    staging: {status: 'not-attempted'},
    inputRecheck: {status: 'not-attempted'},
    preRename: {state: 'not-attempted'},
    rename: {status: 'not-attempted'},
    parentDirectoryDurability: null,
    published: {status: 'not-attempted'},
  };
  return fixture;
};

test('job二時点差とpublication各段の違反は固有check・pathへ帰属する', () => {
  const jobPrePublication = makeFormalFixture();
  jobPrePublication.job.prePublicationInput.snapshot =
    stableSnapshotFromBytes(jobPrePublication.job.initialSnapshot.path, formalBytes({}), 900);
  assertTargetCode(jobPrePublication, 'JOB_FILE_MISMATCH', 'jobPrePublication');

  const jobStability = makeValidFixture();
  jobStability.job.preReportInput.snapshot =
    stableSnapshotFromBytes(jobStability.job.initialSnapshot.path, formalBytes({}), 900);
  assertTargetCode(jobStability, 'JOB_FILE_MISMATCH', 'jobStability');

  const readOnly = makeValidFixture();
  readOnly.readOnlyProcessObservation.afterEntries = [{
    path: 'evals/clip_composition/outputs/presentation/unexpected.json',
    kind: 'file',
    contentSha256: '1'.repeat(64),
  }];
  assertTargetCode(readOnly, 'READ_ONLY_CONTRACT_VIOLATED', 'readOnlyPreflight');

  const writeAttempt = makeValidFixture();
  writeAttempt.readOnlyProcessObservation.attemptedWriteCalls.push({
    operation: 'openWriteExclusive',
  });
  assertTargetCode(
    writeAttempt,
    'READ_ONLY_CONTRACT_VIOLATED',
    'readOnlyPreflight',
  );

  const rootExists = makeFormalFixture();
  rootExists.publicationProcessObservation.initialPaths.entries = [{
    role: 'formalRoot',
    state: 'present',
  }];
  assertTargetCode(rootExists, 'OUTPUT_ROOT_ALREADY_EXISTS', 'publication');

  const lock = makeFormalFixture();
  lock.publicationProcessObservation.lock = {state: 'create-exists'};
  assertTargetCode(lock, 'PUBLICATION_LOCK_UNAVAILABLE', 'publication');

  const staging = makeFormalFixture();
  staging.publicationProcessObservation.staging = {
    status: 'observed',
    directoryEntries: [],
    artifactReads: [],
  };
  assertTargetCode(staging, 'PUBLICATION_STAGING_INVALID', 'publication');

  const inputChanged = makeFormalFixture();
  inputChanged.publicationProcessObservation.inputRecheck = {
    status: 'observed',
    observations: [{role: 'unexpected', observation: {}}],
  };
  assertTargetCode(inputChanged, 'PUBLICATION_INPUT_CHANGED', 'publication');

  const ioFailure = makeFormalFixture();
  ioFailure.publicationProcessObservation.initialPaths = {
    status: 'io-error',
    failurePoint: 'lstat-formal-root',
  };
  assertTargetCode(ioFailure, 'PUBLICATION_FAILED', 'publication');

  const published = makeFormalFixture();
  published.publicationProcessObservation.published = {
    status: 'observed',
    directoryEntries: [],
    artifactReads: [],
  };
  assertTargetCode(published, 'PUBLISHED_PACKAGE_INVALID', 'publishedPackage');

  const preRename = makeFormalFixture();
  preRename.publicationProcessObservation.preRename = {state: 'root-observed'};
  assertTargetCode(preRename, 'PUBLICATION_PRE_RENAME_INVALID', 'publication');
});

test('runner spyはGate A二段へのinput-mutated指定を設定時に拒否する', () => {
  for (const failureStage of ['gate-a-evidence', 'embedded-gate-a-report']) {
    assert.throws(
      () => createRunnerSpyBuilder({
        failureStage,
        failurePass: 1,
        failureKind: 'input-mutated',
      }),
      {
        name: 'TypeError',
        message: 'input-mutated is only a valid synthetic failure for the package stage',
      },
    );
    for (const failureKind of ['thrown', 'invalid-return']) {
      const pureFixture = makeBuildFailureFixture(failureStage, 1, failureKind);
      assert.deepEqual(pureFixture.buildFailure.inputByteCopies, []);
    }
  }
  assert.doesNotThrow(() => createRunnerSpyBuilder({
    failureStage: 'package',
    failurePass: 1,
    failureKind: 'input-mutated',
  }));
});

test('公開runnerは読み取り専用preflightでderive結果を2回そのまま既存builderへ渡す', async () => {
  const runnerJob = makeRunnerJob('read-only-preflight', 'integration-preflight');
  const filesystem = createHybridRunnerFilesystem(runnerJob);
  const builder = createRunnerSpyBuilder();
  const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
    runnerJob.jobPath,
    {
      filesystemAdapter: filesystem.adapter,
      builderAdapter: builder.adapter,
    },
  );
  assertTrustedReportResult(result, 0);
  assert.equal(result.report.status, 'passed');
  assert.equal(result.report.failureStage, null);
  assert.deepEqual(builder.calls.gateA.length, 2);
  assert.deepEqual(builder.calls.embedded.length, 2);
  assert.deepEqual(builder.calls.package.length, 2);
  assert.deepEqual(builder.calls.embedded[0], builder.calls.embedded[1]);
  assert.equal(builder.calls.embedded[0].checkReport.status, 'passed');
  assert.equal(builder.calls.rawBufferLeaves.package.length, 2);
  const [firstPackageBufferLeaves, secondPackageBufferLeaves] =
    builder.calls.rawBufferLeaves.package;
  assert.equal(firstPackageBufferLeaves.length > 0, true);
  assert.deepEqual(
    firstPackageBufferLeaves.map((entry) => entry.path),
    secondPackageBufferLeaves.map((entry) => entry.path),
  );
  for (let index = 0; index < firstPackageBufferLeaves.length; index += 1) {
    const first = firstPackageBufferLeaves[index];
    const second = secondPackageBufferLeaves[index];
    assert.notStrictEqual(first.ref, second.ref);
    assert.equal(first.initialSha256, second.initialSha256);
    assert.equal(sha256(first.ref), first.initialSha256);
    assert.equal(sha256(second.ref), second.initialSha256);
    assert.equal(first.ref.equals(second.ref), true);
  }

  const expectedEmbeddedValue =
    packageCore.buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001(
      clone(builder.calls.embedded[0]),
    );
  const expectedEmbeddedBytes = Buffer.concat([
    canonicalBytes(expectedEmbeddedValue),
    Buffer.from('\n', 'utf8'),
  ]);
  assert.deepEqual(builder.calls.embeddedBytes, [
    expectedEmbeddedBytes,
    expectedEmbeddedBytes,
  ]);
  for (const packageResult of builder.calls.packageResults) {
    assert.deepEqual(packageResult.artifacts[1].bytes, expectedEmbeddedBytes);
    assert.deepEqual(packageResult.artifacts[1].value, expectedEmbeddedValue);
  }
  assert.deepEqual(
    filesystem.operations.filter((entry) => [
      'openWriteExclusive',
      'mkdirExclusive',
      'mkdir',
      'rename',
      'removeEmptyDirectory',
    ].includes(entry.operation)),
    [],
  );
});

test('公開runnerは各build stage・pass・失敗型を同じBUILD_FAILEDへ閉じ後段を呼ばない', async () => {
  const rows = [
    ['gate-a-evidence', 'evidenceBuild', 'gateA', ['thrown', 'invalid-return']],
    [
      'embedded-gate-a-report',
      'embeddedReportBuild',
      'embedded',
      ['thrown', 'invalid-return'],
    ],
    [
      'package',
      'packageBuild',
      'package',
      ['thrown', 'invalid-return', 'input-mutated'],
    ],
  ];
  for (const [stage, failedCheck, callKey, failureKinds] of rows) {
    for (const failureKind of failureKinds) {
      for (const passOrdinal of [1, 2]) {
        const runnerJob = makeRunnerJob(
          'read-only-preflight',
          `integration-${stage}-${failureKind}-${passOrdinal}`,
        );
        const filesystem = createHybridRunnerFilesystem(runnerJob);
        const heldJobRef = filesystem.entries.get(filesystem.paths.job).bytes;
        const heldJobSha256 = sha256(heldJobRef);
        const builder = createRunnerSpyBuilder({
          failureStage: stage,
          failurePass: passOrdinal,
          failureKind,
        });
        const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
          runnerJob.jobPath,
          {
            filesystemAdapter: filesystem.adapter,
            builderAdapter: builder.adapter,
          },
        );
        assertTrustedReportResult(result, 1);
        assert.equal(result.report.status, 'failed');
        assert.equal(result.report.failureStage, failedCheck);
        assert.deepEqual(
          result.report.violations,
          [{
            code: 'BUILD_FAILED',
            path: '$.builds.buildFailure',
            details: {},
          }],
        );
        assert.equal(builder.calls[callKey].length, passOrdinal);
        if (stage === 'gate-a-evidence') {
          assert.deepEqual(builder.calls.embedded, []);
          assert.deepEqual(builder.calls.package, []);
        } else if (stage === 'embedded-gate-a-report') {
          assert.equal(builder.calls.gateA.length, 2);
          assert.deepEqual(builder.calls.package, []);
        } else {
          assert.equal(builder.calls.gateA.length, 2);
          assert.equal(builder.calls.embedded.length, 2);
        }
        assert.strictEqual(
          filesystem.entries.get(filesystem.paths.job).bytes,
          heldJobRef,
        );
        assert.equal(sha256(heldJobRef), heldJobSha256);
        if (failureKind === 'input-mutated') {
          assert.equal(stage, 'package');
          assert.equal(builder.calls.inputMutations.length, 1);
          const [mutation] = builder.calls.inputMutations;
          assert.equal(mutation.path, '$.gateA.evidenceBytes');
          assert.notEqual(mutation.beforeSha256, mutation.afterSha256);
          assert.equal(mutation.retainedCopySha256, mutation.beforeSha256);
          assert.equal(sha256(mutation.retainedCopy), mutation.beforeSha256);
          assert.notStrictEqual(mutation.retainedCopy, mutation.ref);
          assert.equal(sha256(mutation.ref), mutation.afterSha256);

          for (const leaves of builder.calls.rawBufferLeaves.package) {
            for (const leaf of leaves) {
              if (leaf.ref === mutation.ref) continue;
              assert.equal(sha256(leaf.ref), leaf.initialSha256);
            }
          }
          const packageEvidenceLeaves = builder.calls.rawBufferLeaves.package.map(
            (leaves) => leaves.find((entry) => entry.path === mutation.path),
          );
          assert.equal(
            packageEvidenceLeaves.every((entry) => entry !== undefined),
            true,
          );
          const mutatedPass = packageEvidenceLeaves[passOrdinal - 1];
          assert.strictEqual(mutatedPass.ref, mutation.ref);
          assert.equal(mutatedPass.initialSha256, mutation.beforeSha256);
          for (let index = 0; index < packageEvidenceLeaves.length; index += 1) {
            const leaf = packageEvidenceLeaves[index];
            assert.equal(
              sha256(leaf.ref),
              index === passOrdinal - 1
                ? mutation.afterSha256
                : leaf.initialSha256,
            );
          }
          if (packageEvidenceLeaves.length === 2) {
            assert.notStrictEqual(
              packageEvidenceLeaves[0].ref,
              packageEvidenceLeaves[1].ref,
            );
            assert.equal(
              packageEvidenceLeaves[0].initialSha256,
              packageEvidenceLeaves[1].initialSha256,
            );
          }
        } else {
          assert.deepEqual(builder.calls.inputMutations, []);
        }
        assert.deepEqual(
          filesystem.operations.filter((entry) => [
            'openWriteExclusive',
            'mkdirExclusive',
            'mkdir',
            'rename',
            'removeEmptyDirectory',
          ].includes(entry.operation)),
          [],
        );
      }
    }
  }
});

test('formal runnerはstaging・input recheck・preRenameの各gateで止まり後続publication I/Oを行わない', async () => {
  const rows = [
    {
      failure: 'staging',
      code: 'PUBLICATION_STAGING_INVALID',
      path: '$.publication.staging',
      forbiddenOperations: ['inputRecheckMutation', 'preRenameRootReveal', 'rename'],
    },
    {
      failure: 'input',
      code: 'PUBLICATION_INPUT_CHANGED',
      path: '$.publication.inputRecheck.observations',
      forbiddenOperations: ['preRenameRootReveal', 'rename'],
    },
    {
      failure: 'preRename',
      code: 'PUBLICATION_PRE_RENAME_INVALID',
      path: '$.publication.preRename.formalRoot',
      forbiddenOperations: ['rename'],
    },
  ];
  for (const row of rows) {
    const runnerJob = makeRunnerJob('formal-generation', `formal-${row.failure}`);
    const filesystem = createHybridRunnerFilesystem(runnerJob, {
      formalFailure: row.failure,
    });
    const builder = createRunnerSpyBuilder();
    const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
      runnerJob.jobPath,
      {
        filesystemAdapter: filesystem.adapter,
        builderAdapter: builder.adapter,
      },
    );
    assertTrustedReportResult(result, 1);
    assert.equal(result.report.status, 'failed');
    assert.equal(result.report.failureStage, 'publication');
    assert.deepEqual(
      result.report.violations,
      [{code: row.code, path: row.path, details: {}}],
    );
    assert.equal(builder.calls.gateA.length, 2);
    assert.equal(builder.calls.embedded.length, 2);
    assert.equal(builder.calls.package.length, 2);
    const operationNames = filesystem.operations.map((entry) => entry.operation);
    for (const operation of row.forbiddenOperations) {
      assert.equal(operationNames.includes(operation), false, `${row.failure}:${operation}`);
    }
    if (row.failure !== 'staging') {
      assert.equal(operationNames.includes('stagingObserved'), true);
    }
    if (row.failure === 'input') {
      assert.equal(operationNames.includes('inputRecheckMutation'), true);
    }
    if (row.failure === 'preRename') {
      assert.equal(operationNames.includes('preRenameRootReveal'), true);
    }
  }
});

test('R3:formal artifactのopen/read失敗はPUBLICATION_FAILEDへ帰属し完全snapshot不一致は53/54/56を維持する', async () => {
  const transportRows = [
    ['staging-open', 'open', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.work}/`), 'artifact-01-open'],
    ['staging-read', 'read-throw', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.work}/`), 'artifact-01-read'],
    ['staging-post-read-fstat', 'post-read-stat-error', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.work}/`), 'artifact-01-read'],
    ['staging-close', 'close', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.work}/`), 'artifact-01-read'],
    ['published-open', 'open', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.formalRoot}/`), 'artifact-01-open'],
    ['published-read', 'read-throw', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.formalRoot}/`), 'artifact-01-read'],
    ['published-post-read-fstat', 'post-read-stat-error', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.formalRoot}/`), 'artifact-01-read'],
    ['published-close', 'close', (pathValue, filesystem) =>
      pathValue.startsWith(`${filesystem.paths.formalRoot}/`), 'artifact-01-read'],
    ['input-recheck-read', 'read-throw', (pathValue, filesystem) =>
      pathValue === resolve(WORKSPACE_ROOT, GATE_A_JOB_PATH)
        && filesystem.operations.some(
          (entry) => entry.operation === 'stagingObserved',
        ), 'input-recheck'],
  ];
  for (const [suffix, kind, pathMatcher, expectedFailurePoint] of transportRows) {
    const runnerJob = makeRunnerJob('formal-generation', `r3-${suffix}`);
    const filesystem = createHybridRunnerFilesystem(runnerJob);
    const adapter = withSyntheticReadFault(filesystem.adapter, {
      kind,
      matches: (pathValue, matchedOpenCount) =>
        matchedOpenCount === 0 && pathMatcher(pathValue, filesystem),
    });
    const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
      runnerJob.jobPath,
      {
        filesystemAdapter: adapter,
        builderAdapter: createRunnerSpyBuilder().adapter,
      },
    );
    assertTrustedReportResult(result, 1);
    assert.equal(result.report.status, 'failed');
    assert.equal(
      result.report.violations.some((entry) => entry.code === 'PUBLICATION_FAILED'),
      true,
      suffix,
    );
    assert.equal(
      result.report.publicationFailures.some(
        (entry) => entry.failurePoint === expectedFailurePoint,
      ),
      true,
      suffix,
    );
  }

  for (const [suffix, expectedCode, matcher] of [
    ['staging-complete-mismatch', 'PUBLICATION_STAGING_INVALID',
      (pathValue, filesystem) => pathValue.startsWith(`${filesystem.paths.work}/`)],
    ['published-complete-mismatch', 'PUBLISHED_PACKAGE_INVALID',
      (pathValue, filesystem) => pathValue.startsWith(`${filesystem.paths.formalRoot}/`)],
  ]) {
    const runnerJob = makeRunnerJob('formal-generation', `r3-${suffix}`);
    const filesystem = createHybridRunnerFilesystem(runnerJob);
    const adapter = withSyntheticReadFault(filesystem.adapter, {
      kind: 'post-read-stat',
      matches: (pathValue) => matcher(pathValue, filesystem),
    });
    const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
      runnerJob.jobPath,
      {
        filesystemAdapter: adapter,
        builderAdapter: createRunnerSpyBuilder().adapter,
      },
    );
    assertTrustedReportResult(result, 1);
    assert.equal(result.report.status, 'failed');
    assert.equal(
      result.report.violations.some((entry) => entry.code === expectedCode),
      true,
      suffix,
    );
    assert.equal(
      result.report.violations.some((entry) => entry.code === 'PUBLICATION_FAILED'),
      false,
      suffix,
    );
  }

  const inputJob = makeRunnerJob('formal-generation', 'r3-input-complete-mismatch');
  const inputFilesystem = createHybridRunnerFilesystem(inputJob, {
    formalFailure: 'input',
  });
  const inputResult =
    await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
      inputJob.jobPath,
      {
        filesystemAdapter: inputFilesystem.adapter,
        builderAdapter: createRunnerSpyBuilder().adapter,
      },
    );
  assertTrustedReportResult(inputResult, 1);
  assert.equal(
    inputResult.report.violations.some(
      (entry) => entry.code === 'PUBLICATION_INPUT_CHANGED',
    ),
    true,
  );
  assert.equal(
    inputResult.report.violations.some((entry) => entry.code === 'PUBLICATION_FAILED'),
    false,
  );
});

test('R3:publication失敗記録後のjobPreReport読取分類不能はexit 2かつpartial reportなしになる', async () => {
  const runnerJob = makeRunnerJob(
    'formal-generation',
    'r3-publication-failure-then-job-pre-report-untrusted',
  );
  const filesystem = createHybridRunnerFilesystem(runnerJob);
  const publicationFailureAdapter = withSyntheticReadFault(filesystem.adapter, {
    kind: 'read-throw',
    matches: (pathValue, matchedOpenCount) =>
      matchedOpenCount === 0
      && pathValue.startsWith(`${filesystem.paths.work}/`),
  });
  const jobPreReportFailureAdapter = withSyntheticReadFault(
    publicationFailureAdapter,
    {
      kind: 'read-throw',
      matches: (pathValue, matchedOpenCount) =>
        matchedOpenCount === 0
        && pathValue === filesystem.paths.job
        && filesystem.operations.some(
          (entry) => entry.operation === 'stagingObserved',
        ),
    },
  );
  const result = await packageRunner.runPresentationCaptionSemanticSourcePackageV001(
    runnerJob.jobPath,
    {
      filesystemAdapter: jobPreReportFailureAdapter,
      builderAdapter: createRunnerSpyBuilder().adapter,
    },
  );
  assert.deepEqual(result, {
    kind: 'untrusted',
    exitCode: 2,
    diagnostic: 'CAPTION_B1_PACKAGE_CLI_INTERNAL_REPORT_INVALID',
  });
  assert.equal(Object.hasOwn(result, 'report'), false);
  assert.equal(Object.hasOwn(result, 'reportBytes'), false);
  assert.equal(
    filesystem.operations.some((entry) => entry.operation === 'stagingObserved'),
    true,
  );
});

test('runner sourceは公開derive入口をproductionと検査で共用しGate A checkerを直importしない', () => {
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /derivePresentationCaptionEmbeddedGateAReportContextV001,/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /const derived = derivePresentationCaptionEmbeddedGateAReportContextV001\(\s*makeEmbeddedDerivationContext\(state\),?\s*\)/u,
  );
  assert.doesNotMatch(
    PACKAGE_RUNNER_SOURCE,
    /checkPresentationSegmenterBoundaryPreflightV001/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /buildEmbeddedGateAReport:\s*buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /buildPackage:\s*buildPresentationCaptionSemanticSourcePackageV001/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /const createProductionBuilderAdapter = \(\) => Object\.freeze\(\{\s*buildGateAEvidence:\s*buildPresentationSegmenterBoundaryEvidenceV001,\s*buildEmbeddedGateAReport:\s*buildEmbeddedPresentationSegmenterBoundaryPreflightReportV001,\s*buildPackage:\s*buildPresentationCaptionSemanticSourcePackageV001,\s*\}\);/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /const validBuilderAdapter = \(value\) => hasExactKeys\(value, \[\s*'buildGateAEvidence',\s*'buildEmbeddedGateAReport',\s*'buildPackage',\s*\]\)/u,
  );
  assert.doesNotMatch(
    PACKAGE_RUNNER_SOURCE,
    /builderAdapter\.(?:derivePresentationCaptionEmbeddedGateAReportContextV001|checkPresentationSegmenterBoundaryPreflightV001)/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /checkPresentationCaptionSemanticSourcePackageV001\(\s*checkerContext\(state,\s*contextPhase\),?\s*\)/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /validatePresentationCaptionSemanticSourcePackageRunReportV001\(\{/u,
  );
  assert.doesNotMatch(PACKAGE_RUNNER_SOURCE, /process\.env/u);
  assert.doesNotMatch(PACKAGE_RUNNER_SOURCE, /process\.stdin/u);
  assert.doesNotMatch(PACKAGE_RUNNER_SOURCE, /globalThis/u);
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /if \(result\.kind === 'trusted-report'\) \{\s*const output = result\.reportBytes\.toString\('utf8'\);\s*if \(result\.exitCode === 0\) streams\.stdout\.write\(output\);\s*else streams\.stderr\.write\(output\);/u,
  );
  assert.match(
    PACKAGE_RUNNER_SOURCE,
    /process\.exitCode = exitCode;/u,
  );
});

test('runnerは全phaseを同じcheckerへ渡し後続段を先行失敗後に実行しない構造を持つ', () => {
  for (const phase of [
    'gate-a-context-gate',
    'evidence-gate',
    'embedded-report-gate',
    'core-gate',
    'publication-gate',
    'publication-staging-gate',
    'publication-input-gate',
    'publication-pre-rename-gate',
    'final-report',
  ]) {
    assert.equal(PACKAGE_RUNNER_SOURCE.includes(`'${phase}'`), true, phase);
  }
  for (const operation of [
    'runCoreBuildStages',
    'runFormalPublication',
    'finishTrustedRun',
  ]) {
    assert.equal(PACKAGE_RUNNER_SOURCE.includes(operation), true, operation);
  }
  assert.match(PACKAGE_RUNNER_SOURCE, /if \(!checkPassed\(.*\)\) \{/su);
});

const filesystemIdentity = (stat) => Object.freeze({
  dev: stat.dev,
  ino: stat.ino,
});
const assertFilesystemIdentity = (actual, expected, label) => {
  assert.equal(actual.dev, expected.dev, `${label}:dev`);
  assert.equal(actual.ino, expected.ino, `${label}:ino`);
};
const assertOwnedRegularFile = (fd, pathValue, expectedIdentity, label) => {
  const fdStat = fstatSync(fd, {bigint: true});
  const pathStat = lstatSync(pathValue, {bigint: true});
  assert.equal(fdStat.isFile(), true, `${label}:fd-kind`);
  assert.equal(pathStat.isFile(), true, `${label}:path-kind`);
  assert.equal(pathStat.isSymbolicLink(), false, `${label}:path-symlink`);
  assert.equal(fdStat.nlink, 1n, `${label}:fd-nlink`);
  assert.equal(pathStat.nlink, 1n, `${label}:path-nlink`);
  assertFilesystemIdentity(filesystemIdentity(fdStat), expectedIdentity, `${label}:fd`);
  assertFilesystemIdentity(filesystemIdentity(pathStat), expectedIdentity, `${label}:path`);
};
const acquireOwnedExclusiveFile = (pathValue) => {
  const fd = openSync(
    pathValue,
    fsConstants.O_CREAT
      | fsConstants.O_EXCL
      | fsConstants.O_RDWR
      | fsConstants.O_NOFOLLOW,
    0o600,
  );
  try {
    const fdStat = fstatSync(fd, {bigint: true});
    const identity = filesystemIdentity(fdStat);
    assertOwnedRegularFile(fd, pathValue, identity, 'exclusive-acquire');
    return {fd, identity, closed: false};
  } catch (error) {
    closeSync(fd);
    throw error;
  }
};
const rewriteOwnedFile = (owned, pathValue, inputBytes) => {
  assert.equal(owned.closed, false);
  assert.equal(Buffer.isBuffer(inputBytes), true);
  assertOwnedRegularFile(owned.fd, pathValue, owned.identity, 'before-rewrite');
  ftruncateSync(owned.fd, 0);
  let offset = 0;
  while (offset < inputBytes.length) {
    const written = writeSync(
      owned.fd,
      inputBytes,
      offset,
      inputBytes.length - offset,
      offset,
    );
    assert.equal(written > 0, true);
    offset += written;
  }
  fsyncSync(owned.fd);
  assertOwnedRegularFile(owned.fd, pathValue, owned.identity, 'after-rewrite');
};
const releaseOwnedExclusiveFile = (owned, pathValue) => {
  assert.equal(owned.closed, false);
  try {
    assertOwnedRegularFile(owned.fd, pathValue, owned.identity, 'before-unlink');
    unlinkSync(pathValue);
    assert.equal(fstatSync(owned.fd, {bigint: true}).nlink, 0n);
  } finally {
    closeSync(owned.fd);
    owned.closed = true;
  }
};
const prepareOwnedTestDirectory = (pathValue) => {
  let created = false;
  if (!existsSync(pathValue)) {
    mkdirSync(pathValue, {mode: 0o700});
    created = true;
  }
  const stat = lstatSync(pathValue, {bigint: true});
  assert.equal(stat.isDirectory(), true);
  assert.equal(stat.isSymbolicLink(), false);
  assert.equal(realpathSync(pathValue), pathValue);
  return {
    created,
    identity: filesystemIdentity(stat),
    initialNames: readdirSync(pathValue).sort(compareUtf16),
  };
};
const releaseOwnedTestDirectory = (pathValue, observation) => {
  const finalStat = lstatSync(pathValue, {bigint: true});
  assert.equal(finalStat.isDirectory(), true);
  assert.equal(finalStat.isSymbolicLink(), false);
  assertFilesystemIdentity(
    filesystemIdentity(finalStat),
    observation.identity,
    'test-directory',
  );
  const finalNames = readdirSync(pathValue).sort(compareUtf16);
  if (observation.created) {
    assert.deepEqual(finalNames, []);
    rmdirSync(pathValue);
    assert.equal(existsSync(pathValue), false);
  } else {
    assert.deepEqual(finalNames, observation.initialNames);
  }
};

test('CLIは0件・2件を固定usage診断でexit 2にしstdoutへ何も書かない', async () => {
  for (const argv of [[], ['one.json', 'two.json']]) {
    const stdout = [];
    const stderr = [];
    const streams = Object.freeze({
      stdout: Object.freeze({write: (value) => stdout.push(value)}),
      stderr: Object.freeze({write: (value) => stderr.push(value)}),
    });
    const exitCode = await packageRunner.runPresentationCaptionSemanticSourcePackageCliV001(
      argv,
      streams,
    );
    assert.equal(exitCode, 2);
    assert.deepEqual(stdout, []);
    assert.deepEqual(stderr, ['CAPTION_B1_PACKAGE_CLI_USAGE_INVALID\n']);
  }
});

test('production CLIの実process入口も0件・2件を同じusage診断で拒否する', () => {
  for (const args of [[], ['one.json', 'two.json']]) {
    const result = spawnSync(
      process.execPath,
      [resolve(WORKSPACE_ROOT, PACKAGE_RUNNER_REPOSITORY_PATH), ...args],
      {cwd: WORKSPACE_ROOT, encoding: 'utf8'},
    );
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'CAPTION_B1_PACKAGE_CLI_USAGE_INVALID\n');
  }
});

test('production CLI実processはproduction chunk投影を共用しexit 0/1をstdout/stderr排他で返す', async () => {
  const runnerJob = makeRunnerJob('read-only-preflight', 'actual-process');
  const jobDirectory = resolve(WORKSPACE_ROOT, PACKAGE_PREFLIGHT_JOB_ROOT);
  const jobAbsolutePath = resolve(WORKSPACE_ROOT, runnerJob.jobPath);
  const directoryObservation = prepareOwnedTestDirectory(jobDirectory);
  let ownedJob = null;

  try {
    const projection =
      await packageRunner.inspectPresentationCaptionSemanticSourcePackagePreflightProjectionV001(
        runnerJob.jobPath,
        {
          filesystemAdapter:
            packageRunner
              .createPresentationCaptionSemanticSourcePackageProductionFilesystemAdapterV001(),
        },
      );
    assert.equal(projection.kind, 'trusted-projection');
    runnerJob.value.readOnlyGuard.expectedBeforeCanonicalSha256 =
      projection.expectedBeforeCanonicalSha256;
    ownedJob = acquireOwnedExclusiveFile(jobAbsolutePath);
    rewriteOwnedFile(ownedJob, jobAbsolutePath, formalBytes(runnerJob.value));
    assertOwnedRegularFile(
      ownedJob.fd,
      jobAbsolutePath,
      ownedJob.identity,
      'before-passed-process',
    );
    const passed = spawnSync(
      process.execPath,
      [resolve(WORKSPACE_ROOT, PACKAGE_RUNNER_REPOSITORY_PATH), runnerJob.jobPath],
      {
        cwd: WORKSPACE_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    assert.equal(passed.status, 0);
    assert.equal(passed.stderr, '');
    const passedReport = JSON.parse(passed.stdout);
    assert.equal(passedReport.status, 'passed');
    assert.deepEqual(passedReport.violations, []);

    runnerJob.value.gateA.expectedEvidenceHashes.evidenceCanonicalSha256 =
      '0'.repeat(64);
    rewriteOwnedFile(ownedJob, jobAbsolutePath, formalBytes(runnerJob.value));
    assertOwnedRegularFile(
      ownedJob.fd,
      jobAbsolutePath,
      ownedJob.identity,
      'before-failed-process',
    );
    const failed = spawnSync(
      process.execPath,
      [resolve(WORKSPACE_ROOT, PACKAGE_RUNNER_REPOSITORY_PATH), runnerJob.jobPath],
      {
        cwd: WORKSPACE_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    assert.equal(failed.status, 1);
    assert.equal(failed.stdout, '');
    const failedReport = JSON.parse(failed.stderr);
    assert.equal(failedReport.status, 'failed');
    assert.deepEqual(
      failedReport.violations,
      [{
        code: 'EVIDENCE_EXPECTED_HASH_MISMATCH',
        path: '$.job.value.gateA.expectedEvidenceHashes.evidenceCanonicalSha256',
        details: {},
      }],
    );
  } finally {
    if (ownedJob !== null && !ownedJob.closed) {
      releaseOwnedExclusiveFile(ownedJob, jobAbsolutePath);
    }
    releaseOwnedTestDirectory(jobDirectory, directoryObservation);
  }
  assert.equal(existsSync(jobAbsolutePath), false);
  assert.equal(existsSync(jobDirectory), !directoryObservation.created);
});

test('package担当codeと担当checkの正本写像はcore実装と検査表で欠落しない', () => {
  for (const code of PACKAGE_OWNED_CODES) {
    assert.equal(PACKAGE_CORE_SOURCE.includes(`'${code}'`), true, code);
    assert.equal(Array.isArray(PACKAGE_CHECK_BY_CODE[code]), true, code);
    assert.equal(PACKAGE_CHECK_BY_CODE[code].length >= 1, true, code);
  }
  assert.deepEqual(
    Object.keys(PACKAGE_CHECK_BY_CODE).sort(),
    [...PACKAGE_OWNED_CODES].sort(),
  );
  const semanticOwnedCodes = EXPECTED_VIOLATION_CODES.slice(23, 47);
  assert.deepEqual(
    PACKAGE_OWNED_CODES.filter((code) => semanticOwnedCodes.includes(code)),
    [],
  );
  assert.deepEqual(
    [...PACKAGE_OWNED_CODES, ...semanticOwnedCodes].sort(),
    [...EXPECTED_VIOLATION_CODES].sort(),
  );
});

test('package合成検査が動的に観測するcode×checkは承認済み割当だけである', () => {
  for (const observed of observedPackageCodeChecks) {
    const [code, check] = observed.split('\u0000');
    assert.equal(PACKAGE_OWNED_CODES.includes(code), true, code);
    assert.equal(PACKAGE_CHECK_BY_CODE[code].includes(check), true, observed);
  }
  for (const required of [
    'JOB_FILE_MISMATCH\u0000jobPrePublication',
    'JOB_FILE_MISMATCH\u0000jobStability',
    'BUILD_FAILED\u0000evidenceBuild',
    'BUILD_FAILED\u0000embeddedReportBuild',
    'BUILD_FAILED\u0000packageBuild',
    'NONDETERMINISTIC\u0000gateAReport',
    'NONDETERMINISTIC\u0000determinism',
  ]) {
    assert.equal(observedPackageCodeChecks.has(required), true, required);
  }
  const expectedPairs = new Set(
    Object.entries(PACKAGE_CHECK_BY_CODE).flatMap(([code, checks]) =>
      checks.map((check) => `${code}\u0000${check}`)),
  );
  assert.deepEqual(
    [...observedPackageCodeChecks].sort(),
    [...expectedPairs].sort(),
  );
});

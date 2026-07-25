import assert from 'node:assert/strict';
import {test} from 'node:test';

import {
  decodePresentationCaptionB4LayoutInspectionJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const bytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const raw = (value) => Buffer.from(value, 'utf8');
const clone = (value) => structuredClone(value);

const rect = (offset = 0) => ({
  left: 100.25 + offset,
  top: 200.5 + offset,
  right: 700.75 + offset,
  bottom: 320.125 + offset,
});

const item = () => ({
  layerId: 'cue-001',
  stateId: 'caption-core-v001',
  resolvedText: '表示する発話',
  lineCount: 1,
  lineRects: [rect()],
  wrapper: {
    top: 180.25,
    left: 80.5,
    width: 1520.75,
    height: 360.125,
    renderScale: 1.04,
    displayWidth: 1920.5,
    displayHeight: 1080.25,
  },
  fontSizePx: 72,
  lineHeightPx: 86.4,
});

const passed = () => ({
  status: 'passed',
  items: [item()],
  violations: [],
});

const failed = () => ({
  status: 'failed',
  items: [item()],
  violations: [
    {
      layerId: 'cue-001',
      code: 'LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT',
      details: {actual: 3, allowed: 2},
    },
    {
      layerId: 'cue-001',
      code: 'LINE_BOX_OUTSIDE_SAFE_AREA',
      details: {
        lineIndex: 0,
        rect: rect(),
        safeAreaPx: {top: 24, right: 32, bottom: 24, left: 32},
      },
    },
    {
      layerId: 'cue-001',
      code: 'LINE_BOX_POSITIVE_INTERSECTION',
      details: {
        leftIndex: 0,
        rightIndex: 1,
        overlapWidth: 12.5,
        overlapHeight: 4.25,
      },
    },
  ],
});

const decode = (value) =>
  decodePresentationCaptionB4LayoutInspectionJsonV001(bytes(value));
const replaceOnce = (input, from, to) => {
  const text = JSON.stringify(input);
  assert.equal(text.split(from).length, 2, from);
  return raw(`${text.replace(from, to)}\n`);
};

test('1 全許可item幾何pathの通常小数を含むpassedを受理する', () => {
  const result = decode(passed());
  assert.equal(result.status, 'decoded');
  assert.equal(result.value.items[0].wrapper.renderScale, 1.04);
  assert.equal(result.value.items[0].lineHeightPx, 86.4);
});

test('2 三違反種類と通常小数幾何を含むfailedを受理する', () => {
  const result = decode(failed());
  assert.equal(result.status, 'decoded');
  assert.deepEqual(
    result.value.violations.map((entry) => entry.code),
    [
      'LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT',
      'LINE_BOX_OUTSIDE_SAFE_AREA',
      'LINE_BOX_POSITIVE_INTERSECTION',
    ],
  );
});

test('3 lineCountの小数tokenを拒否する', () => {
  const result = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"lineCount":1', '"lineCount":1.5'),
  );
  assert.deepEqual(result, {status: 'invalid', reason: 'number-invalid'});
});

test('4 fontSizePxの小数tokenを拒否する', () => {
  const result = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"fontSizePx":72', '"fontSizePx":72.5'),
  );
  assert.deepEqual(result, {status: 'invalid', reason: 'number-invalid'});
});

test('5 整数pathと幾何pathのnegative zeroを拒否する', () => {
  const integer = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"lineCount":1', '"lineCount":-0'),
  );
  const geometry = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"left":100.25', '"left":-0'),
  );
  assert.deepEqual(integer, {status: 'invalid', reason: 'number-invalid'});
  assert.deepEqual(geometry, {status: 'invalid', reason: 'number-invalid'});
});

test('6 NaN・Infinity・非数を拒否する', () => {
  for (const token of ['NaN', 'Infinity']) {
    const result = decodePresentationCaptionB4LayoutInspectionJsonV001(
      replaceOnce(passed(), '"left":100.25', `"left":${token}`),
    );
    assert.deepEqual(result, {status: 'invalid', reason: 'syntax-invalid'});
  }
  const typeMismatch = clone(passed());
  typeMismatch.items[0].lineRects[0].left = '100.25';
  assert.deepEqual(
    decode(typeMismatch),
    {status: 'invalid', reason: 'schema-invalid'},
  );
});

test('7 整数pathと幾何pathのsafe範囲外整数tokenを拒否する', () => {
  const unsafe = '9007199254740992';
  const integer = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"lineCount":1', `"lineCount":${unsafe}`),
  );
  const geometry = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"left":100.25', `"left":${unsafe}`),
  );
  assert.deepEqual(integer, {status: 'invalid', reason: 'number-invalid'});
  assert.deepEqual(geometry, {status: 'invalid', reason: 'number-invalid'});
});

test('8 safeAreaPxの通常小数を拒否する', () => {
  const result = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(failed(), '"top":24', '"top":24.5'),
  );
  assert.deepEqual(result, {status: 'invalid', reason: 'number-invalid'});
});

test('9 未知数値fieldと時刻風数値fieldをnumber-invalidで拒否する', () => {
  for (const [key, value] of [['unknownNumber', 1], ['startMs', 1000]]) {
    const candidate = passed();
    candidate.items[0][key] = value;
    assert.deepEqual(
      decode(candidate),
      {status: 'invalid', reason: 'number-invalid'},
    );
  }
  const nonNumericUnknown = passed();
  nonNumericUnknown.items[0].unknownText = 'x';
  assert.deepEqual(
    decode(nonNumericUnknown),
    {status: 'invalid', reason: 'schema-invalid'},
  );
});

test('10 未知違反codeと既知codeのdetails形不一致を拒否する', () => {
  const unknownCode = failed();
  unknownCode.violations[0].code = 'UNKNOWN_LAYOUT_VIOLATION';
  assert.deepEqual(
    decode(unknownCode),
    {status: 'invalid', reason: 'schema-invalid'},
  );
  const wrongDetails = failed();
  wrongDetails.violations[0].details = {leftIndex: 0, rightIndex: 1};
  assert.deepEqual(
    decode(wrongDetails),
    {status: 'invalid', reason: 'schema-invalid'},
  );
});

test('11 BOM・重複key・trailing content・code fence・不正Unicodeを既存reasonで拒否する', () => {
  const valid = JSON.stringify(passed());
  const cases = [
    [Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), raw(valid)]), 'bom-present'],
    [raw('{"status":"passed","status":"passed","items":[],"violations":[]}'), 'duplicate-key'],
    [raw(`${valid}x`), 'trailing-content'],
    [raw(`\`\`\`json\n${valid}\n\`\`\``), 'code-fence'],
    [raw('{"status":"passed","items":[],"violations":[],"x":"\\ud800"}'), 'surrogate-invalid'],
  ];
  for (const [input, reason] of cases) {
    assert.deepEqual(
      decodePresentationCaptionB4LayoutInspectionJsonV001(input),
      {status: 'invalid', reason},
    );
  }
});

test('12 JSONPathごとの指数・小数点token方針を区別する', () => {
  const geometryExponent = decodePresentationCaptionB4LayoutInspectionJsonV001(
    replaceOnce(passed(), '"left":100.25', '"left":8.332e2'),
  );
  assert.equal(geometryExponent.status, 'decoded');
  assert.equal(geometryExponent.value.items[0].lineRects[0].left, 833.2);

  const geometryIntegerExponent =
    decodePresentationCaptionB4LayoutInspectionJsonV001(
      replaceOnce(passed(), '"left":100.25', '"left":1e0'),
    );
  assert.equal(geometryIntegerExponent.status, 'decoded');
  assert.equal(geometryIntegerExponent.value.items[0].lineRects[0].left, 1);

  for (const token of ['1e0', '1.0']) {
    const result = decodePresentationCaptionB4LayoutInspectionJsonV001(
      replaceOnce(passed(), '"lineCount":1', `"lineCount":${token}`),
    );
    assert.deepEqual(result, {status: 'invalid', reason: 'number-invalid'});
  }

  const ordinaryInteger = decode(passed());
  assert.equal(ordinaryInteger.status, 'decoded');
  assert.equal(ordinaryInteger.value.items[0].lineCount, 1);
});

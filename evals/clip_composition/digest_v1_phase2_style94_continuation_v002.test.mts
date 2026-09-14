import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {ROOT, bind, formal, readJson, readBound, fileSha, publish, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {publishQcSnapshotV002, readBackQcSnapshotV002} from './digest_v1_phase2_style94_continuation_v002.mts';

const root = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/continuation-v002';
const preflightPath = `${root}/preflight.json`;
const preflight = await readJson(preflightPath);
const record = await readBound(preflight.previousRasterBinding);
const fixtureRoot = `${root}/local-test-evidence`;
mkdirSync(path.join(ROOT, fixtureRoot));
const savedPath = `${fixtureRoot}/saved-real-raster-qc.json`;
const changedPath = `${fixtureRoot}/changed-byte.json`;
const truncatedPath = `${fixtureRoot}/truncated-byte.json`;
const cases: Json[] = [];
let savedBinding: Json;

test('実際の325件QCのserializerはBufferを返し旧string比較を拒否する', () => {
  const bytes = formal(record);
  assert(Buffer.isBuffer(bytes));
  assert.equal(record.qc.status, 'passed');
  assert.equal(record.qc.instructionCount, 325);
  assert.throws(() => assert.equal(bytes.toString('utf8'), bytes));
  cases.push({name: 'serializer-buffer-and-original-bug-reproduction', status: 'passed'});
});

test('実callbackで使う保存処理がBuffer再読とbyte照合を通ってbindingを返す', () => {
  savedBinding = publishQcSnapshotV002(savedPath, record);
  assert(readFileSync(path.join(ROOT, savedPath)).equals(formal(record)));
  assert.deepEqual(savedBinding, bind(savedPath, record));
  cases.push({name: 'actual-callback-save-buffer-readback', status: 'passed'});
});

test('保存後に既存の正式decoderとbinding検証で実QCを再読できる', async () => {
  assert.deepEqual(await readBound(savedBinding), record);
  cases.push({name: 'existing-formal-decoder-and-binding', status: 'passed'});
});

test('1byte改変を保存照合と既存binding検証が拒否する', async () => {
  const bytes = Buffer.from(formal(record)); bytes[0] ^= 1;
  writeFileSync(path.join(ROOT, changedPath), bytes, {flag: 'wx'});
  assert.throws(() => readBackQcSnapshotV002(changedPath, record), /QC_PUBLICATION_BYTES_MISMATCH/);
  await assert.rejects(() => readBound({...savedBinding, path: changedPath}));
  cases.push({name: 'changed-byte-rejected', status: 'passed'});
});

test('末尾1byteの切詰めも保存照合と既存binding検証が拒否する', async () => {
  writeFileSync(path.join(ROOT, truncatedPath), formal(record).subarray(0, -1), {flag: 'wx'});
  assert.throws(() => readBackQcSnapshotV002(truncatedPath, record), /QC_PUBLICATION_BYTES_MISMATCH/);
  await assert.rejects(() => readBound({...savedBinding, path: truncatedPath}));
  cases.push({name: 'truncated-byte-rejected', status: 'passed'});
});

test('byte不一致の場合はbindingを返す箇所へ到達しない', () => {
  for (const p of [changedPath, truncatedPath]) {
    let returned: Json | undefined;
    assert.throws(() => {returned = readBackQcSnapshotV002(p, record);}, /QC_PUBLICATION_BYTES_MISMATCH/);
    assert.equal(returned, undefined);
  }
  cases.push({name: 'binding-only-after-byte-match', status: 'passed'});
});

test('保存済みQCを上書きせず拒否する', () => {
  assert.throws(() => publishQcSnapshotV002(savedPath, record), {code: 'EEXIST'});
  assert(readFileSync(path.join(ROOT, savedPath)).equals(formal(record)));
  cases.push({name: 'existing-qc-not-overwritten', status: 'passed'});
});

test('実保存処理を通した局所検査を今回の実装へ結び付けて保存する', async () => {
  assert.equal(cases.length, 7);
  assert(cases.every(v => v.status === 'passed'));
  const testPath = 'evals/clip_composition/digest_v1_phase2_style94_continuation_v002.test.mts';
  await publish(`${root}/tests.json`, {schemaVersion: 'digest-v1-phase2-style94-continuation-tests-v002', status: 'passed', cases,
    implementationBinding: preflight.implementationBinding, preflightBinding: bind(preflightPath, preflight),
    testImplementationBinding: {path: testPath, fileSha256: await fileSha(path.join(ROOT, testPath))},
    previousRasterBinding: preflight.previousRasterBinding, savedQcBinding: savedBinding,
    old20TestLimitation: '旧20件は保存callbackを呼んでいなかった。今回の局所検査は実callbackの保存関数を実際の325件QCで呼ぶ。',
    newRenderExecutions: 0});
});

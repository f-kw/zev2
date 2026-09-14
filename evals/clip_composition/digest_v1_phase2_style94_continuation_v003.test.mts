import assert from 'node:assert/strict';
import {test} from 'node:test';
import path from 'node:path';
import {ROOT, bind, readJson, readBound, fileSha, publish, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateResourceArgumentsV003} from './digest_v1_phase2_style94_continuation_v003.mts';

const root = 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001/style-94-v001/continuation-v003';
const preflightPath = `${root}/preflight.json`;
const preflight = await readJson(preflightPath);
const evidence = await readBound(preflight.argumentBinding);
const defaults = evidence.defaultArguments;
const controlled = evidence.controlledArguments;
const cases: Json[] = [];
const check = (args: string[]) => validateResourceArgumentsV003(defaults, args, 325);
const passed = (name: string) => cases.push({name, status: 'passed'});

test('実325画像の命令差分はPNG復号325組と複合filter1組だけ', () => {
  assert.deepEqual(check(controlled), evidence.check);
  assert.equal(evidence.check.additions.length, 326);
  assert.equal(evidence.commandExecutions, 0);
  assert.equal(controlled[controlled.indexOf('-frames:v') + 1], '44408');
  assert.equal(preflight.serializePngAndFilters, true);
  passed('actual-325-inputs-exact-resource-only-difference');
});

test('土台復号の並列変更を拒否する', () => {
  const args = [...controlled]; args.splice(args.indexOf('-i'), 0, '-threads', '1');
  assert.throws(() => check(args), /BASE_DECODER_THREADS_CHANGED/);
  passed('base-decoder-change-rejected');
});

test('符号化器の並列変更を拒否する', () => {
  assert.throws(() => check([...controlled, '-threads', '1']), /ENCODER_THREADS_CHANGED/);
  passed('encoder-change-rejected');
});

test('PNG復号設定の欠落と未承認値を拒否する', () => {
  const missing = [...controlled]; missing.splice(missing.indexOf('-threads'), 2);
  assert.throws(() => check(missing), /PNG_DECODER_CONTROL_MISSING/);
  const changed = [...controlled]; changed[changed.indexOf('-threads') + 1] = '2';
  assert.throws(() => check(changed), /PNG_DECODER_CONTROL_MISSING/);
  passed('png-control-missing-or-changed-rejected');
});

test('合成filter式の変更を拒否する', () => {
  const args = [...controlled]; args[args.indexOf('-filter_complex') + 1] += ';null';
  assert.throws(() => check(args), /NON_RESOURCE_ARGUMENT_CHANGED/);
  passed('filter-graph-change-rejected');
});

test('字幕画像の入力順序変更を拒否する', () => {
  const args = [...controlled]; const inputs = args.flatMap((v: string, i: number) => v === '-i' ? [i + 1] : []);
  [args[inputs[1]], args[inputs[2]]] = [args[inputs[2]], args[inputs[1]]];
  assert.throws(() => check(args), /NON_RESOURCE_ARGUMENT_CHANGED/);
  passed('overlay-input-order-change-rejected');
});

test('frame数・映像符号化・音声の変更を拒否する', () => {
  for (const [flag, value] of [['-frames:v', '44407'], ['-c:v', 'h264'], ['-preset', 'slow'],
    ['-crf', '21'], ['-pix_fmt', 'yuv444p'], ['-c:a', 'aac']]) {
    const args = [...controlled]; args[args.indexOf(flag) + 1] = value;
    assert.throws(() => check(args), /NON_RESOURCE_ARGUMENT_CHANGED/);
  }
  passed('frame-codec-quality-audio-change-rejected');
});

test('出力mappingの変更を拒否する', () => {
  const args = [...controlled]; args[args.indexOf('-map') + 1] = '0:v';
  assert.throws(() => check(args), /NON_RESOURCE_ARGUMENT_CHANGED/);
  passed('mapping-change-rejected');
});

test('限定検査を今回の実装・描画前検査・命令差分へ結び付けて保存する', async () => {
  assert.equal(cases.length, 8);
  const testPath = 'evals/clip_composition/digest_v1_phase2_style94_continuation_v003.test.mts';
  assert.equal(await fileSha(path.join(ROOT, preflight.implementationBinding.path)), preflight.implementationBinding.fileSha256);
  await publish(`${root}/tests.json`, {schemaVersion: 'digest-v1-phase2-style94-continuation-tests-v003', status: 'passed', cases,
    implementationBinding: preflight.implementationBinding, preflightBinding: bind(preflightPath, preflight),
    testImplementationBinding: {path: testPath, fileSha256: await fileSha(path.join(ROOT, testPath))},
    argumentBinding: preflight.argumentBinding, priorPixelEquivalenceBinding: evidence.priorEquivalenceBinding,
    priorEvidenceUse: 'renderer byte不変のため既存6fixture×900frame一致証拠を参照。024への書込みと再実行0。',
    qcReadbackUse: '前版8/8と実325件描画で通過した同一保存関数をimport。実装SHAと保存検査証拠をpreflightで再照合済み。',
    preparationCorrection: '初回に過去検証の名称配列を件数と比較した設営ミスを、配列lengthとの比較へ1箇所修正。失敗sourceとlogを別保存。',
    commandExecutions: 0, newRenderExecutions: 0});
});

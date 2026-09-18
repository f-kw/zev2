import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {verifyPreviewNativeRgbBytesV001, comparePreviewNativeRgbBytesV001}
  from './presentation_editing_preview_rgb_verification_v001.mjs';
import {comparePreviewQcRgbInputsV001} from './compare_presentation_editing_preview_qc_v001.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => sha(canonicalJson(value));
const clone = value => structuredClone(value);
const identity = ref => ({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
async function fixture(t, {first = 10} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-preview-rgb-test-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const put = async (name, value) => {
    const file = path.join(root, name), bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    await writeFile(file, bytes);
    return {path: file, bytes: bytes.length, fileSha256: sha(bytes)};
  };
  const input = await put('plan.json', JSON.stringify({captions: ['検算用字幕']}) + '\n');
  const media = await put('storage-only-media.fixture', 'storage-only fixture, never decoded');
  const inputRefs = [{role: 'plan', ...input, canonicalSha256: hashJson({captions: ['検算用字幕']})},
    {role: 'completed-media', ...media}];
  // These frame files exercise storage bindings only. The wrapper owns PNG
  // decoding and complete frame pixel comparisons; no media tool runs here.
  const baseFrame = await put('base-frame.storage-fixture', 'base frame bytes');
  const completedFrame = await put('completed-frame.storage-fixture', 'completed frame bytes');
  const pixels = Buffer.from([first, 20, 30, 40, 50, 60]);
  const completedRgb = await put('completed.rgb', pixels);
  const expected = await put('expected.rgb', pixels);
  const omitted = await put('omitted.rgb', Buffer.alloc(6));
  const foreign = await put('foreign.rgb', Buffer.from([first + 1, 20, 30, 40, 50, 60]));
  const outputArtifacts = [baseFrame, completedFrame, completedRgb, expected, omitted, foreign];
  const references = [
    {id: 'expected', kind: 'expected', layers: [{bindingId: 'native', localFrame: 4, displayFrameCount: 20}],
      rgbPath: expected.path, rgbSha256: expected.fileSha256, classId: 'class-0'},
    {id: 'omitted', kind: 'omitted', layers: [], rgbPath: omitted.path, rgbSha256: omitted.fileSha256, classId: 'class-1'},
    {id: 'foreign', kind: 'foreign-state', layers: [{bindingId: 'foreign', localFrame: 4, displayFrameCount: 20}],
      rgbPath: foreign.path, rgbSha256: foreign.fileSha256, classId: 'class-2'},
    {id: 'same-pixels', kind: 'normal', layers: [{bindingId: 'same-native', localFrame: 4, displayFrameCount: 20}],
      rgbPath: expected.path, rgbSha256: expected.fileSha256, classId: 'class-0'},
  ];
  // Distances and classes are stated independently of the production classifier.
  const classes = [
    {id: 'class-0', rgbSha256: expected.fileSha256, referenceIds: ['expected', 'same-pixels'], absoluteRgbDifference: 0},
    {id: 'class-1', rgbSha256: omitted.fileSha256, referenceIds: ['omitted'], absoluteRgbDifference: first + 200},
    {id: 'class-2', rgbSha256: foreign.fileSha256, referenceIds: ['foreign'], absoluteRgbDifference: 1},
  ];
  const samples = [100, 102].map(frame => ({instructionId: 'caption', frame, mediaFrame: frame - 100,
    expectedState: 'stable', expectedOverlaySha256: sha('native PNG'),
    crop: {left: 0, top: 0, width: 2, height: 1}, baseFrame, completedFrame, completedRgb,
    completedRgbSha256: completedRgb.fileSha256, references: clone(references), classes: clone(classes),
    visible: true, expectedClassId: 'class-0', omittedClassId: 'class-1'}));
  const evidence = {inputManifest: {inputRefs, inputRefsCanonicalSha256: hashJson(inputRefs),
    before: inputRefs.map(identity), after: inputRefs.map(identity)}, outputArtifacts, samples};
  return {root, evidence};
}

test('全候補の実RGBから同値分類と整数距離を再計算し元の証拠を変えない', async t => {
  const {evidence} = await fixture(t), original = clone(evidence);
  const result = await verifyPreviewNativeRgbBytesV001({evidence});
  assert.equal(result.status, 'passed'); assert.deepEqual(evidence, original);
  assert.deepEqual(result.counts, {inputReferenceCount: 2, outputArtifactCount: 6, sampleCount: 2,
    logicalReferenceCount: 8, completedRgbBytes: 12, referenceRgbBytes: 48});
  assert.deepEqual(result.samples[0].classes.map(row => row.absoluteRgbDifference), [0, 210, 1]);
  assert.deepEqual(result.samples[0].classes[0].referenceIds, ['expected', 'same-pixels']);
  assert.equal(result.inputReferences[0].canonicalSha256, evidence.inputManifest.inputRefs[0].canonicalSha256);
});

test('比較入口は実RGBが同じでも別媒体への差替えと外側SHAの更新を拒否する', async t => {
  const {root, evidence} = await fixture(t), changed = clone(evidence);
  const file = path.join(root, 'different-media.storage-fixture'), bytes = Buffer.from('another complete media outside sampled pixels');
  await writeFile(file, bytes);
  const ref = changed.inputManifest.inputRefs.find(row => row.role === 'completed-media');
  Object.assign(ref, {path: file, bytes: bytes.length, fileSha256: sha(bytes)});
  changed.inputManifest.inputRefsCanonicalSha256 = hashJson(changed.inputManifest.inputRefs);
  changed.inputManifest.before = changed.inputManifest.inputRefs.map(identity);
  changed.inputManifest.after = changed.inputManifest.inputRefs.map(identity);
  assert.equal((await comparePreviewNativeRgbBytesV001({before: changed, after: evidence})).status, 'passed');
  await assert.rejects(comparePreviewQcRgbInputsV001({before: changed, after: evidence}), /exactly the same input files/u);
  assert.equal((await comparePreviewQcRgbInputsV001({before: evidence, after: clone(evidence)})).status, 'passed');
});

test('保存済みSHAと異なる実RGB・フレーム・欠落ファイル・入力の変更を拒否する', async t => {
  for (const target of ['completed', 'reference', 'frame', 'input', 'missing']) {
    const {evidence} = await fixture(t);
    const file = target === 'completed' ? evidence.samples[0].completedRgb.path
      : target === 'frame' ? evidence.samples[0].baseFrame.path
        : target === 'input' ? evidence.inputManifest.inputRefs[0].path : evidence.samples[0].references[2].rgbPath;
    if (target === 'missing') await rm(file);
    else await writeFile(file, 'changed bytes');
    await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence}), /SHA-256|ENOENT/u);
  }
});

test('実byteを変えない距離・同値分類・判定の改変を拒否する', async t => {
  const {evidence} = await fixture(t);
  for (const mutate of [
    value => {value.samples[0].classes[1].absoluteRgbDifference++;},
    value => {value.samples[0].references[2].classId = 'class-0';},
    value => {value.samples[0].classes[0].referenceIds.pop();},
    value => {value.samples[0].visible = false;},
    value => {value.samples[0].omittedClassId = 'class-0';},
  ]) {
    const changed = clone(evidence); mutate(changed);
    await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence: changed}), /距離・同値分類・判定/u);
  }
});

test('SHAを更新してもRGBの長さや生成物との結び付きが不正なら拒否する', async t => {
  const {evidence} = await fixture(t), foreign = evidence.samples[0].references[2];
  const shorter = Buffer.alloc(5);
  await writeFile(foreign.rgbPath, shorter);
  const artifact = evidence.outputArtifacts.find(row => row.path === foreign.rgbPath);
  artifact.bytes = shorter.length; artifact.fileSha256 = sha(shorter);
  for (const sample of evidence.samples) sample.references[2].rgbSha256 = sha(shorter);
  await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence}), /切り出し領域/u);
  const second = await fixture(t);
  second.evidence.outputArtifacts.pop();
  await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence: second.evidence}), /生成物一覧/u);
});

test('入力一覧・構造化入力・実行前後の参照が一致しなければ拒否する', async t => {
  const {evidence} = await fixture(t);
  for (const mutate of [
    value => {value.inputManifest.inputRefsCanonicalSha256 = '0'.repeat(64);},
    value => {value.inputManifest.after.pop();},
    value => {
      value.inputManifest.inputRefs[0].canonicalSha256 = '0'.repeat(64);
      value.inputManifest.inputRefsCanonicalSha256 = hashJson(value.inputManifest.inputRefs);
    },
  ]) {
    const changed = clone(evidence); mutate(changed);
    await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence: changed}), /入力|参照/u);
  }
});

test('公開移動は元のSHAを保つ完全一致の一段対応だけを受け付ける', async t => {
  const {root, evidence} = await fixture(t), original = clone(evidence), input = evidence.inputManifest.inputRefs[0];
  const moved = path.join(root, 'published-plan.json');
  await rename(input.path, moved);
  const relocation = {from: input.path, to: moved, fileSha256: input.fileSha256};
  const result = await verifyPreviewNativeRgbBytesV001({evidence, relocations: [relocation]});
  assert.equal(result.inputReferences[0].path, moved);
  assert.equal(result.inputReferences[0].recordedPath, input.path);
  assert.deepEqual(evidence, original);
  for (const relocations of [
    [{...relocation, fileSha256: '0'.repeat(64)}],
    [{...relocation, extra: true}],
    [relocation, relocation],
    [{...relocation, from: root}],
    [{...relocation, to: path.join(root, 'middle.json')},
      {from: path.join(root, 'middle.json'), to: moved, fileSha256: input.fileSha256}],
  ]) await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence, relocations}));
  await writeFile(moved, 'different published bytes');
  await assert.rejects(verifyPreviewNativeRgbBytesV001({evidence, relocations: [relocation]}), /SHA-256/u);
});

test('両側を実byte検算して全検査点と候補を同順比較する', async t => {
  const before = await fixture(t), after = await fixture(t);
  const rgb = after.evidence.samples[0].references[2];
  const destination = path.join(after.root, 'published-foreign.rgb');
  await rename(rgb.rgbPath, destination);
  const result = await comparePreviewNativeRgbBytesV001({before: before.evidence, after: after.evidence,
    afterRelocations: [{from: rgb.rgbPath, to: destination, fileSha256: rgb.rgbSha256}]});
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.counts, {sampleCount: 2, logicalReferenceCount: 8,
    comparedCompletedRgbBytes: 12, comparedReferenceRgbBytes: 48});
});

test('各側の記録が自己整合でも実RGB差・検査点順・候補の意味の差を拒否する', async t => {
  const before = await fixture(t), different = await fixture(t, {first: 11});
  await assert.rejects(comparePreviewNativeRgbBytesV001({before: before.evidence, after: different.evidence}), /RGB実byte/u);
  const changedCandidate = await fixture(t), candidate = changedCandidate.evidence.samples[0].references[2];
  const pixels = Buffer.from([12, 20, 30, 40, 50, 60]);
  await writeFile(candidate.rgbPath, pixels);
  changedCandidate.evidence.outputArtifacts.find(row => row.path === candidate.rgbPath).fileSha256 = sha(pixels);
  for (const sample of changedCandidate.evidence.samples) {
    sample.references[2].rgbSha256 = sha(pixels);
    sample.classes[2].rgbSha256 = sha(pixels);
    sample.classes[2].absoluteRgbDifference = 2;
  }
  assert.equal((await verifyPreviewNativeRgbBytesV001({evidence: changedCandidate.evidence})).status, 'passed');
  await assert.rejects(comparePreviewNativeRgbBytesV001({before: before.evidence, after: changedCandidate.evidence}), /候補のRGB実byte/u);
  const after = await fixture(t);
  for (const mutate of [
    value => {value.samples.reverse();},
    value => {value.samples[0].references[0].layers[0].localFrame++;},
    value => {value.samples[0].expectedState = 'another-state';},
    value => {value.samples.pop();},
  ]) {
    const changed = clone(after.evidence); mutate(changed);
    await assert.rejects(comparePreviewNativeRgbBytesV001({before: before.evidence, after: changed}), /検査点|重ね順/u);
  }
  assert.equal((await readFile(before.evidence.samples[0].completedRgb.path)).length, 6);
});

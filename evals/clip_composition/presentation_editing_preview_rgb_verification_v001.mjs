/** Re-read native QC inputs and RGB observations independently of saved verdicts.
 * This verifies evidence bytes; acceptance of the complete media and PNG pixel
 * equivalence remain the responsibility of the calling comparison wrapper. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {classifyPresentationNativeFrameRgbV001} from './presentation_native_frame_qc_v001.mjs';

const SHA = /^[a-f0-9]{64}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identity = ref => ({role: ref.role, path: ref.path, fileSha256: ref.fileSha256});
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));

function relocationMap(relocations) {
  assert(Array.isArray(relocations), '公開移動の指定は一覧で渡してください');
  const result = new Map();
  for (const row of relocations) {
    assert(exact(row, ['from', 'to', 'fileSha256']) && path.isAbsolute(row.from)
      && path.isAbsolute(row.to) && SHA.test(row.fileSha256), '公開移動の指定が不正です');
    assert(!result.has(row.from), '同じ参照元の公開移動を重複指定できません');
    result.set(row.from, row);
  }
  return result;
}

function resolver(relocations) {
  const relocated = relocationMap(relocations);
  return ref => {
    assert(object(ref) && typeof ref.path === 'string' && path.isAbsolute(ref.path)
      && SHA.test(ref.fileSha256), 'ファイル参照の絶対パスとSHA-256が必要です');
    if (ref.bytes !== undefined) assert(Number.isSafeInteger(ref.bytes) && ref.bytes >= 0, '参照byte数が不正です');
    const moved = relocated.get(ref.path);
    if (moved) assert.equal(moved.fileSha256, ref.fileSha256, '公開移動のSHA-256が元の観測と一致しません');
    return moved?.to ?? ref.path;
  };
}

async function readBound(ref, resolve, {rgbBytes} = {}) {
  const file = resolve(ref), before = await stat(file, {bigint: true});
  assert(before.isFile(), '検算対象は通常ファイルでなければなりません');
  let bytes, fileSha256;
  if (rgbBytes !== undefined || ref.canonicalSha256 !== undefined) {
    bytes = await readFile(file);
    fileSha256 = hash(bytes);
  } else {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(file)) digest.update(chunk);
    fileSha256 = digest.digest('hex');
  }
  const after = await stat(file, {bigint: true});
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'])
    assert.equal(after[key], before[key], '検算中に参照ファイルが変わりました');
  assert.equal(fileSha256, ref.fileSha256, '参照ファイルの実byteが保存されたSHA-256と一致しません');
  if (ref.bytes !== undefined) assert.equal(Number(after.size), ref.bytes, '参照ファイルのbyte数が一致しません');
  if (rgbBytes !== undefined) assert.equal(bytes.length, rgbBytes, 'RGBの実byte数が切り出し領域と一致しません');
  if (ref.canonicalSha256 !== undefined) {
    assert(SHA.test(ref.canonicalSha256), '構造化入力のSHA-256が不正です');
    assert.equal(hashJson(JSON.parse(bytes.toString('utf8'))), ref.canonicalSha256,
      '構造化入力の意味が保存されたSHA-256と一致しません');
  }
  return {reference: {...(ref.role === undefined ? {} : {role: ref.role}), path: file,
    ...(file === ref.path ? {} : {recordedPath: ref.path}), bytes: Number(after.size), fileSha256,
    ...(ref.canonicalSha256 === undefined ? {} : {canonicalSha256: ref.canonicalSha256})}, bytes};
}

function sampleBytes(sample) {
  assert(object(sample) && typeof sample.instructionId === 'string' && sample.instructionId.length > 0
    && Number.isSafeInteger(sample.frame) && sample.frame >= 0, '検査点の字幕と時刻が不正です');
  assert(sample.mediaFrame === undefined || Number.isSafeInteger(sample.mediaFrame) && sample.mediaFrame >= 0,
    '媒体内の検査時刻が不正です');
  assert(object(sample.crop) && Number.isSafeInteger(sample.crop.width) && sample.crop.width > 0
    && Number.isSafeInteger(sample.crop.height) && sample.crop.height > 0, 'RGBの切り出し領域が不正です');
  const length = sample.crop.width * sample.crop.height * 3;
  assert(Number.isSafeInteger(length), 'RGBの切り出し領域が大き過ぎます');
  assert(SHA.test(sample.expectedOverlaySha256) && typeof sample.expectedState === 'string'
    && sample.expectedState.length > 0, '期待する描画状態の識別が不正です');
  assert(Array.isArray(sample.references) && sample.references.length >= 2 && Array.isArray(sample.classes),
    '全候補と同値分類の観測が必要です');
  assert.equal(sample.completedRgb?.fileSha256, sample.completedRgbSha256, '完成側RGBの二つの識別が一致しません');
  return length;
}

function describe(sample) {
  return structuredClone({instructionId: sample.instructionId, frame: sample.frame, mediaFrame: sample.mediaFrame,
    expectedState: sample.expectedState, expectedOverlaySha256: sample.expectedOverlaySha256,
    crop: sample.crop, completedRgbSha256: sample.completedRgbSha256, visible: sample.visible,
    expectedClassId: sample.expectedClassId, omittedClassId: sample.omittedClassId,
    references: sample.references.map(reference => ({id: reference.id, kind: reference.kind,
      layers: reference.layers, rgbSha256: reference.rgbSha256, classId: reference.classId})),
    classes: sample.classes.map(row => ({id: row.id, rgbSha256: row.rgbSha256,
      referenceIds: row.referenceIds, absoluteRgbDifference: row.absoluteRgbDifference}))});
}

/** Relocations are exact one-step path replacements carrying the original hash.
 * Unused explicit mappings are not followed and never cause additional reads. */
export async function verifyPreviewNativeRgbBytesV001({evidence, relocations = []}) {
  const resolve = resolver(relocations);
  assert(object(evidence) && Array.isArray(evidence.samples) && object(evidence.inputManifest)
    && Array.isArray(evidence.inputManifest.inputRefs) && evidence.inputManifest.inputRefs.length > 0
    && Array.isArray(evidence.outputArtifacts), '入力・生成物・検査点の完全な観測が必要です');
  const refs = evidence.inputManifest.inputRefs;
  assert(refs.every(ref => typeof ref.role === 'string' && ref.role.length > 0)
    && new Set(refs.map(ref => ref.role)).size === refs.length, '入力参照の役割が欠落または重複しています');
  assert.equal(hashJson(refs), evidence.inputManifest.inputRefsCanonicalSha256, '入力参照の一覧が保存後に変わっています');
  assert.deepEqual(evidence.inputManifest.before, refs.map(identity), '実行前の入力参照が一致しません');
  assert.deepEqual(evidence.inputManifest.after, refs.map(identity), '実行後の入力参照が一致しません');
  const inputReferences = [];
  for (const ref of refs) inputReferences.push((await readBound(ref, resolve)).reference);
  const artifacts = new Map();
  for (const ref of evidence.outputArtifacts) {
    resolve(ref);
    assert(!artifacts.has(ref.path), '生成物参照が重複しています');
    artifacts.set(ref.path, ref);
    await readBound(ref, resolve);
  }
  const observedArtifact = ref => {
    resolve(ref);
    assert.equal(artifacts.get(ref.path)?.fileSha256, ref.fileSha256, '検査点の実ファイルが生成物一覧に結び付いていません');
  };
  const samples = [], counts = {inputReferenceCount: refs.length, outputArtifactCount: artifacts.size,
    sampleCount: evidence.samples.length, logicalReferenceCount: 0, completedRgbBytes: 0, referenceRgbBytes: 0};
  for (const sample of evidence.samples) {
    const length = sampleBytes(sample);
    for (const ref of [sample.baseFrame, sample.completedFrame]) {
      observedArtifact(ref);
      await readBound(ref, resolve);
    }
    observedArtifact(sample.completedRgb);
    const completed = (await readBound(sample.completedRgb, resolve, {rgbBytes: length})).bytes;
    const references = [];
    for (const reference of sample.references) {
      assert(typeof reference.kind === 'string' && Array.isArray(reference.layers), '候補の種類と重ね順が必要です');
      const ref = {path: reference.rgbPath, fileSha256: reference.rgbSha256};
      observedArtifact(ref);
      references.push({id: reference.id, rgb: (await readBound(ref, resolve, {rgbBytes: length})).bytes});
    }
    const actual = classifyPresentationNativeFrameRgbV001({completedRgb: completed, references});
    assert.deepEqual(actual, {visible: sample.visible, expectedClassId: sample.expectedClassId,
      omittedClassId: sample.omittedClassId,
      references: sample.references.map(row => ({id: row.id, rgbSha256: row.rgbSha256, classId: row.classId})),
      classes: sample.classes}, '実RGBから求めた距離・同値分類・判定が保存された観測と一致しません');
    samples.push(describe(sample));
    counts.logicalReferenceCount += references.length;
    counts.completedRgbBytes += completed.length;
    counts.referenceRgbBytes += references.length * length;
  }
  for (const [index, ref] of refs.entries()) assert.deepEqual((await readBound(ref, resolve)).reference,
    inputReferences[index], '検算の前後で入力の結び付きが変わりました');
  return {status: 'passed', inputReferences, samples, counts};
}

/** Recompute both sides, then compare the actual RGB bytes for every ordered
 * sample and candidate. Hash equality alone is not the cross-run comparison. */
export async function comparePreviewNativeRgbBytesV001({before, after,
  beforeRelocations = [], afterRelocations = []}) {
  const previous = await verifyPreviewNativeRgbBytesV001({evidence: before, relocations: beforeRelocations});
  const current = await verifyPreviewNativeRgbBytesV001({evidence: after, relocations: afterRelocations});
  const oldResolve = resolver(beforeRelocations), newResolve = resolver(afterRelocations);
  assert.equal(after.samples.length, before.samples.length, '比較する検査点の数が一致しません');
  const counts = {sampleCount: before.samples.length, logicalReferenceCount: 0,
    comparedCompletedRgbBytes: 0, comparedReferenceRgbBytes: 0};
  for (const [index, oldSample] of before.samples.entries()) {
    const newSample = after.samples[index], length = sampleBytes(oldSample);
    assert.equal(sampleBytes(newSample), length, '比較する切り出し領域のbyte数が一致しません');
    const oldRgb = (await readBound(oldSample.completedRgb, oldResolve, {rgbBytes: length})).bytes;
    const newRgb = (await readBound(newSample.completedRgb, newResolve, {rgbBytes: length})).bytes;
    assert(oldRgb.equals(newRgb), '同じ検査点の完成側RGB実byteが一致しません');
    assert.equal(newSample.references.length, oldSample.references.length, '比較する全候補の数が一致しません');
    for (const [referenceIndex, oldReference] of oldSample.references.entries()) {
      const newReference = newSample.references[referenceIndex];
      const left = (await readBound({path: oldReference.rgbPath, fileSha256: oldReference.rgbSha256},
        oldResolve, {rgbBytes: length})).bytes;
      const right = (await readBound({path: newReference.rgbPath, fileSha256: newReference.rgbSha256},
        newResolve, {rgbBytes: length})).bytes;
      assert(left.equals(right), '同じ検査点・候補のRGB実byteが一致しません');
      counts.logicalReferenceCount++;
      counts.comparedReferenceRgbBytes += length;
    }
    counts.comparedCompletedRgbBytes += length;
  }
  assert.deepEqual(current.samples, previous.samples, '検査点・状態・重ね順・距離・分類・判定のいずれかが一致しません');
  for (const [evidence, resolve, verified] of [[before, oldResolve, previous], [after, newResolve, current]])
    for (const [index, ref] of evidence.inputManifest.inputRefs.entries())
      assert.deepEqual((await readBound(ref, resolve)).reference, verified.inputReferences[index],
        '両側の実byte比較が終わるまでに入力の結び付きが変わりました');
  return {status: 'passed', before: previous, after: current, samples: current.samples, counts};
}

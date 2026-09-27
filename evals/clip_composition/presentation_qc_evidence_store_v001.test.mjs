import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001, readPresentationQcEvidenceV001,
  writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {classifyPresentationNativeFrameRgbV001} from './presentation_native_frame_qc_v001.mjs';

const run = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleUrl = new URL('./presentation_qc_evidence_store_v001.mjs', import.meta.url).href;
const classifierUrl = new URL('./presentation_native_frame_qc_v001.mjs', import.meta.url).href;
const temporary = async fn => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-qc-shared-evidence-'));
  try {await fn(directory);} finally {await rm(directory, {recursive: true});}
};
function fixture() {
  const baselinePlan = {schemaVersion: 'fixture-plan', elements: [{instructionId: '000103', text: 'こっち来ちゃうから'}]};
  const autoPresentation = {context: {baselinePlan}, effects: []};
  const orchestrationInput = {plan: baselinePlan, autoPresentation};
  const inputManifest = {inputRefs: [{role: 'plan', canonicalSha256: hash(JSON.stringify(baselinePlan))}]};
  const sceneBindings = [{instructionId: '000103', states: [{frame: 7801, pngSha256: hash('png')}]}];
  const executableVersions = {ffmpeg: '8.0.1'}, processes = [{command: ['ffmpeg', '-version'], executableVersions}];
  const samples = [{instructionId: '000103', frame: 7801, visible: false,
    classes: [{id: 'expected', absoluteRgbDifference: 1345125}, {id: 'duplicate', absoluteRgbDifference: 1344947}]}];
  const common = {baselinePlan, autoPresentation, orchestrationInput, inputManifest, sceneBindings,
    executableVersions, processes, samples, renderRange: null};
  const inspections = ['000103', '000104'].map(instructionId => ({instructionId,
    representativeFrame: instructionId === '000103' ? 7801 : 7900, nativeFrameQc: {...common, instructionId},
    outputArtifacts: [{path: '/fixture/evidence.rgb', fileSha256: hash('rgb')}]}));
  const rgbEvidence = {completedRgb: [10, 20, 30], references: [
    {id: 'expected', rgb: [10, 20, 31]}, {id: 'omitted', rgb: [10, 20, 30]},
  ]};
  return {status: 'failed', violations: [{instructionId: '000103', code: 'EXPECTED_NOT_UNIQUE'}],
    evidence: common, inspections, rgbEvidence};
}
const envelopeText = envelope => '{"schemaVersion":' + JSON.stringify(envelope.schemaVersion) + ',"nodes":[\n'
  + envelope.nodes.map((node, index) => (index ? ',' : '') + JSON.stringify(node) + '\n').join('')
  + '],"root":' + JSON.stringify(envelope.root) + ',"nodeCount":' + envelope.nodeCount + '}\n';
const entry = (envelope, key) => envelope.nodes.find(node => node.entries?.some(row => row[0] === key))
  ?.entries.find(row => row[0] === key);

test('valid JSON envelope preserves every observation while common objects are restored once', async () => temporary(async directory => {
  const value = fixture(), file = path.join(directory, 'evidence.json');
  const receipt = await writePresentationQcEvidenceV001(file, value), bytes = await readFile(file);
  assert.equal(receipt.schemaVersion, PRESENTATION_QC_EVIDENCE_STORE_SCHEMA_V001);
  assert.equal(receipt.fileSha256, hash(bytes));
  assert.equal(receipt.bytes, bytes.length);
  const envelope = JSON.parse(bytes.toString('utf8'));
  assert.equal(envelope.nodeCount, receipt.nodeCount);
  assert.equal(envelope.root.ref, receipt.rootSha256);
  assert.ok(receipt.reusedObjectCount > 0);
  assert.ok(receipt.deduplicatedNodeCount > 0);
  const restored = await readPresentationQcEvidenceV001(file, {expectedFileSha256: receipt.fileSha256});
  assert.deepEqual(restored, value);
  for (const key of Object.keys(value.evidence)) {
    assert.strictEqual(restored.inspections[0].nativeFrameQc[key], restored.evidence[key], key);
    assert.strictEqual(restored.inspections[1].nativeFrameQc[key], restored.evidence[key], key);
  }
  assert.strictEqual(restored.inspections[0].outputArtifacts, restored.inspections[1].outputArtifacts);
  assert.equal(restored.inspections[0].nativeFrameQc.samples[0].visible, false);
}));

test('a separate Node process preserves shared identity and the existing RGB classifier result', async () => temporary(async directory => {
  const value = fixture(), file = path.join(directory, 'evidence.json');
  const receipt = await writePresentationQcEvidenceV001(file, value);
  const expected = classifyPresentationNativeFrameRgbV001({completedRgb: Buffer.from(value.rgbEvidence.completedRgb),
    references: value.rgbEvidence.references.map(row => ({...row, rgb: Buffer.from(row.rgb)}))});
  const {stdout} = await run(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {readPresentationQcEvidenceV001} from ${JSON.stringify(moduleUrl)};
    import {classifyPresentationNativeFrameRgbV001} from ${JSON.stringify(classifierUrl)};
    const value = await readPresentationQcEvidenceV001(process.argv[1], {expectedFileSha256: process.argv[2]});
    assert.strictEqual(value.evidence.baselinePlan, value.inspections[1].nativeFrameQc.baselinePlan);
    assert.strictEqual(value.evidence.samples, value.inspections[0].nativeFrameQc.samples);
    const result = classifyPresentationNativeFrameRgbV001({completedRgb: Buffer.from(value.rgbEvidence.completedRgb),
      references: value.rgbEvidence.references.map(row => ({...row, rgb: Buffer.from(row.rgb)}))});
    process.stdout.write(JSON.stringify({result, status: value.status, violations: value.violations}));
  `, file, receipt.fileSha256]);
  assert.deepEqual(JSON.parse(stdout), {result: expected, status: value.status, violations: value.violations});
  assert.equal(expected.visible, false);
}));

test('large expanded common data never becomes a multi-gigabyte string, including in a fresh reader', async () => temporary(async directory => {
  const file = path.join(directory, 'large-logical-evidence.json');
  const {stdout} = await run(process.execPath, ['--max-old-space-size=128', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import {writePresentationQcEvidenceV001, readPresentationQcEvidenceV001} from ${JSON.stringify(moduleUrl)};
    const common = {baselinePlan: {source: 'a'.repeat(1024 * 1024)}};
    const value = {inspections: Array.from({length: 2200}, (_, instructionId) => ({instructionId, common}))};
    const receipt = await writePresentationQcEvidenceV001(process.argv[1], value);
    const restored = await readPresentationQcEvidenceV001(process.argv[1], {expectedFileSha256: receipt.fileSha256});
    assert.equal(restored.inspections.length, 2200);
    assert.strictEqual(restored.inspections[0].common, restored.inspections[2199].common);
    assert.equal(restored.inspections[2199].common.baselinePlan.source.length, 1024 * 1024);
    process.stdout.write(JSON.stringify(receipt));
  `, file], {maxBuffer: 1024 * 1024});
  assert.ok(2200 * 1024 * 1024 > 2 ** 31);
  assert.ok(JSON.parse(stdout).bytes < 3 * 1024 * 1024);
}));

test('common content, common SHA and inspection-specific tampering are rejected', async () => temporary(async directory => {
  const file = path.join(directory, 'source.json');
  await writePresentationQcEvidenceV001(file, fixture());
  const original = JSON.parse(await readFile(file, 'utf8'));
  const cases = [
    ['common-content', envelope => {entry(envelope, 'text')[1] = 'changed';}],
    ['common-sha', envelope => {envelope.nodes[0].sha256 = 'f'.repeat(64);}],
    ['inspection-content', envelope => {entry(envelope, 'representativeFrame')[1] = 7802;}],
    ['inspection-result', envelope => {entry(envelope, 'visible')[1] = true;}],
  ];
  for (const [name, change] of cases) {
    const copy = structuredClone(original); change(copy);
    const modified = path.join(directory, name + '.json'); await writeFile(modified, envelopeText(copy));
    await assert.rejects(readPresentationQcEvidenceV001(modified), /SHA mismatch|missing or forward node reference/);
  }
}));

test('missing common, missing inspection, invalid references and unknown schema are rejected', async () => temporary(async directory => {
  const file = path.join(directory, 'source.json'); await writePresentationQcEvidenceV001(file, fixture());
  const original = JSON.parse(await readFile(file, 'utf8'));
  const cases = [
    ['missing-common', envelope => {envelope.nodes.splice(0, 1);}],
    ['missing-inspection', envelope => {
      const index = envelope.nodes.findIndex(node => node.entries?.some(row => row[0] === 'representativeFrame'));
      envelope.nodes.splice(index, 1);
    }],
    ['invalid-reference', envelope => {envelope.root.ref = '0'.repeat(64);}],
    ['invalid-reference-shape', envelope => {envelope.root.extra = true;}],
    ['unknown-schema', envelope => {envelope.schemaVersion = 'presentation-qc-evidence-store-v999';}],
    ['duplicate-node', envelope => {envelope.nodes.push(envelope.nodes[0]); envelope.nodeCount++;}],
  ];
  for (const [name, change] of cases) {
    const copy = structuredClone(original); change(copy);
    const modified = path.join(directory, name + '.json'); await writeFile(modified, envelopeText(copy));
    await assert.rejects(readPresentationQcEvidenceV001(modified), /missing|invalid|unknown|duplicate/);
  }
  const truncated = path.join(directory, 'truncated.json');
  await writeFile(truncated, envelopeText(original).split('\n').slice(0, -2).join('\n') + '\n');
  await assert.rejects(readPresentationQcEvidenceV001(truncated), /missing envelope root/);
}));

test('file binding detects re-serialized transport bytes and refuses existing-file overwrite', async () => temporary(async directory => {
  const file = path.join(directory, 'source.json'), receipt = await writePresentationQcEvidenceV001(file, fixture());
  const bytes = await readFile(file);
  await assert.rejects(writePresentationQcEvidenceV001(file, {changed: true}), {code: 'EEXIST'});
  assert.deepEqual(await readFile(file), bytes);
  await assert.rejects(readPresentationQcEvidenceV001(file, {expectedFileSha256: '0'.repeat(64)}), /file SHA mismatch/);
  const modified = path.join(directory, 'modified.json');
  await writeFile(modified, bytes.toString('utf8').replace('"nodes":[', '"nodes": ['));
  await assert.rejects(readPresentationQcEvidenceV001(modified, {expectedFileSha256: receipt.fileSha256}), /file SHA mismatch/);
}));

test('literal reference-like keys, prototype-like keys and existing JSON undefined semantics are retained', async () => temporary(async directory => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":"literal","ref":"not-a-node-reference"}');
  value.array = [undefined, null, {ref: 'ordinary JSON'}]; value.omitted = undefined;
  const file = path.join(directory, 'literal.json'); await writePresentationQcEvidenceV001(file, value);
  const restored = await readPresentationQcEvidenceV001(file);
  assert.deepEqual(restored, JSON.parse(JSON.stringify(value)));
  assert.equal(Object.getPrototypeOf(restored), Object.prototype);
  assert.equal({}.polluted, undefined);
}));

test('cycles and non-JSON values fail without silently changing the evidence', async () => temporary(async directory => {
  const cyclic = {}; cyclic.self = cyclic;
  for (const [index, value] of [cyclic, {value: NaN}, {value: 1n}, new Date()].entries())
    await assert.rejects(writePresentationQcEvidenceV001(path.join(directory, String(index)), value), /cyclic|non-JSON|non-plain/);
}));

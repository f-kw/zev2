import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {inspectPresentationNativeFrameQcV001}
  from './presentation_native_frame_qc_v001.mjs';
import {verifyPresentationNativeSampleReceiptsV001, hashPresentationNativeFileV001}
  from './presentation_native_qc_streaming_v001.mjs';
import {checkFiniteExecutionEvidence, combinePresentationIntegrityStateQcV001}
  from './presentation_integrity_state_qc_v001.mjs';
import {writePresentationQcEvidenceV001, readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {inspectPresentationExactReplayQcV001, validatePresentationExactReplayQcEvidenceV001}
  from './presentation_exact_replay_qc_v001.mjs';

const execute = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value)), clone = value => structuredClone(value);
const repo = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const run = async (command, args) => {
  const {stdout, stderr} = await execute(command, args, {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024});
  return {code: 0, signal: null, stdout, stderr};
};
const bind = async pathname => ({path: pathname, fileSha256: await hashPresentationNativeFileV001(pathname)});
const save = async (pathname, value) => {await writeFile(pathname, JSON.stringify(value) + '\n', {flag: 'wx'}); return bind(pathname);};

async function priorModule(name = 'presentation_native_frame_qc_v001.mjs') {
  const {stdout} = await execute('git', ['show',
    'bfe9df173944f1549d0786585e93c12cdaee2e16:evals/clip_composition/' + name],
  {cwd: repo, maxBuffer: 1024 * 1024});
  // Bind the approved baseline source through Git. Resolve its unchanged local
  // imports explicitly; no production file or historical evidence is rewritten.
  const source = stdout.replace(/(['"])(\.\/[^'"\n]+)\1/g,
    (_match, quote, relative) => quote + new URL(relative, import.meta.url).href + quote)
    .replaceAll('import.meta.url', JSON.stringify(new URL(name, import.meta.url).href));
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-native-stream-integration-'));
  t.after(() => rm(root, {recursive: true}));
  const ffmpeg = await realpath('/opt/homebrew/bin/ffmpeg'), magick = await realpath('/opt/homebrew/bin/magick');
  const ffprobe = await realpath('/opt/homebrew/bin/ffprobe');
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 16, height: 16, fps: 30}, elements: ['甲', '乙', '甲'].map((text, index) => ({
      instructionId: 'caption-' + index, kind: 'speech-caption', text,
      indexedLines: [{lineIndex: 0, text}], startFrame: index * 10,
      endFrameExclusive: (index + 1) * 10, displayFrameCount: 10,
      visualState: {textStyle: {fontAssetId: 'synthetic-test-font', fontSizePx: 1,
        fontColor: '#FFFFFF', borderColor: '#000000', borderWidthPx: 0, glowWidthPx: 0},
      position: {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: 0},
      background: null, layout: {maxLines: 1}}}))};
  const baseline = await save(path.join(root, 'baseline.json'), plan);
  const context = {baselineRef: {...baseline, canonicalSha256: hashJson(plan)},
    decisionInputRef: await save(path.join(root, 'decision.json'), {fixture: true}),
    renderingRulesRef: AUTO_PRESENTATION_RULES_REF_V008, pulseTimingEvidence: null};
  const autoPresentation = {context, autoProposal: fixAutoPresentationProposalV001({baselinePlan: plan, context,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context,
      targetCaptionIds: plan.elements.map(row => row.instructionId), completion: 'complete', exceptions: [], effects: []}})};
  const planRef = await save(path.join(root, 'plan.json'), plan);
  const autoRef = await save(path.join(root, 'auto.json'), autoPresentation);
  // Synthetic geometric PNGs exercise file/clock/composite proof. They do not
  // claim to validate text drawing, fonts, or human presentation quality.
  const white = path.join(root, 'white.png'), green = path.join(root, 'green.png');
  await run(magick, ['-size', '16x16', 'xc:none', '-fill', '#ffffff80', '-draw', 'rectangle 2,2 7,13', white]);
  await run(magick, ['-size', '16x16', 'xc:none', '-fill', '#00ff0080', '-draw', 'rectangle 8,2 13,13', green]);
  const records = [];
  for (const [index, element] of plan.elements.entries()) {
    const png = await bind(index === 1 ? green : white);
    const props = {schemaVersion: 'presentation-renderer-overlay-props-v001', instructionId: element.instructionId,
      canvas: clone(plan.canvas), text: element.text, indexedLines: clone(element.indexedLines),
      visualState: clone(element.visualState), inspectionLineIndex: null};
    const left = index === 1 ? 8 : 2;
    const record = {element: clone(element), props, pngPath: png.path, pngSha256: png.fileSha256,
      inspection: {instructionId: element.instructionId, overlaySha256: png.fileSha256,
        appliedOverlayPropsCanonicalSha256: hashJson(props),
        alphaBounds: {left, top: 2, right: left + 6, bottom: 14, width: 6, height: 12}}};
    records.push({...record, alternates: [{...clone(record), kind: 'normal'}]});
  }
  const base = path.join(root, 'base.mp4');
  await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=#101010:s=16x16:r=30:d=1',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-frames:v', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-shortest', base]);
  const tools = {ffmpeg: await bind(ffmpeg), imageMagick: await bind(magick)};
  const provenance = {planCanonicalSha256: hashJson(plan), inputRefs: [
    {role: 'baseline-plan', ...baseline}, {role: 'plan', ...planRef}, {role: 'auto-input', ...autoRef}]};
  return {root, plan, records, tools, ffprobe, provenance, base: await bind(base)};
}

function observation(sample) {
  const {baseFrame, completedFrame, completedRgb, referenceRetention: _retention, references, ...rest} = sample;
  return JSON.parse(JSON.stringify({...rest, baseFrameSha256: baseFrame.fileSha256, completedFrameSha256: completedFrame.fileSha256,
    completedRgbSha256: completedRgb.fileSha256,
    references: references.map(({rgbPath: _path, ...row}) => row)}));
}

async function composed(f, name, changedRecords = f.records) {
  const completed = path.join(f.root, name + '.mp4');
  await run(f.tools.ffmpeg.path, [...buildPresentationCompositeArgumentsV001({baseMediaPath: f.base.path,
    plan: f.plan, overlayRecords: changedRecords, expectedFrameCount: 30, serializePngAndFilters: true}),
  '-movflags', '+faststart', completed]);
  return bind(completed);
}
const input = (f, completed, name) => ({plan: f.plan, records: f.records, provenance: f.provenance,
  media: {base: f.base, completed}, tools: f.tools, scratchDirectory: path.join(f.root, name)});

async function separateReader(file, receipt) {
  const url = name => new URL(name, import.meta.url).href;
  const source = `
    import assert from 'node:assert/strict';
    import {readPresentationQcEvidenceV001} from ${JSON.stringify(url('./presentation_qc_evidence_store_v001.mjs'))};
    import {validatePresentationNativeFrameQcInspectionsV001} from ${JSON.stringify(url('./presentation_native_frame_qc_v001.mjs'))};
    import {checkFiniteExecutionEvidence,validatePresentationIntegrityStateQcEvidenceV001} from ${JSON.stringify(url('./presentation_integrity_state_qc_v001.mjs'))};
    import {verifyPresentationNativeSampleReceiptsV001} from ${JSON.stringify(url('./presentation_native_qc_streaming_v001.mjs'))};
    const value = await readPresentationQcEvidenceV001(process.argv[1], {expectedFileSha256: process.argv[2]});
    const native = value.native;
    const checked = validatePresentationNativeFrameQcInspectionsV001({plan: value.plan, inspections: native.inspections});
    assert.equal(checked.status, native.status); assert.deepEqual(checked.violations, native.violations);
    checkFiniteExecutionEvidence(native.evidence, native.inspections, value.plan.canvas);
    await verifyPresentationNativeSampleReceiptsV001({samples: native.evidence.samples});
    if (value.combined) {
      const result = validatePresentationIntegrityStateQcEvidenceV001({plan: value.plan, overlayInspections: value.combined.inspections,
        evidence: value.combined.evidence, expectedFrameCount: 30, currentCompletedMediaRef: value.completed});
      assert.equal(result.status, 'passed', JSON.stringify(result.violations));
    }
    process.stdout.write(JSON.stringify({status: checked.status, samples: native.evidence.samples.length, combined: !!value.combined}));
  `;
  const {stdout} = await execute(process.execPath, ['--import', path.join(repo, 'runner/node_modules/tsx/dist/loader.mjs'),
    '--input-type=module', '-e', source, file, receipt.fileSha256], {cwd: repo, maxBuffer: 1024 * 1024});
  return JSON.parse(stdout);
}

test('normal native inspector feeds shared storage, a separate reader and combined exact-replay QC', async t => {
  const f = await fixture(t), completed = await composed(f, 'normal');
  const native = await inspectPresentationNativeFrameQcV001({...input(f, completed, 'native'),
    referenceRetention: 'verified-pass-regenerable-v001'});
  assert.equal(native.status, 'passed', JSON.stringify(native.violations));
  assert.equal(native.evidence.executionMethod, 'sample-batched-native-references-v003');
  assert(native.evidence.samples.every(row => row.referenceRetention.state === 'released-verified-pass'),
    'normal renderer policy releases only verified passing references');
  checkFiniteExecutionEvidence(native.evidence, native.inspections, f.plan.canvas);
  const replay = await inspectPresentationExactReplayQcV001({plan: f.plan, records: f.records,
    baseMediaPath: f.base.path, completedMediaPath: completed.path, expectedFrameCount: 30,
    scratchDirectory: path.join(f.root, 'exact-replay'), ffmpegPath: f.tools.ffmpeg.path,
    ffprobePath: f.ffprobe, serializePngAndFilters: true});
  assert.equal(replay.status, 'passed', JSON.stringify(replay.violations));
  const combined = combinePresentationIntegrityStateQcV001({plan: f.plan, replay, finite: native,
    expectedFrameCount: 30, currentCompletedMediaRef: completed});
  assert.equal(combined.status, 'passed', JSON.stringify(combined.violations));
  const saved = path.join(f.root, 'complete.json');
  const receipt = await writePresentationQcEvidenceV001(saved, {plan: f.plan, native, combined, completed});
  assert.deepEqual(await separateReader(saved, receipt), {status: 'passed', samples: 3, combined: true});
  await fixedInputProofTests(t, f, replay, completed);
  const missing = native.evidence.samples[0].referenceRetention.checkpoint.path;
  const original = await readFile(missing); await rm(missing);
  await assert.rejects(separateReader(saved, receipt), /ENOENT/);
  await writeFile(missing, original, {flag: 'wx'});
  assert.deepEqual(await separateReader(saved, receipt), {status: 'passed', samples: 3, combined: true});
});

test('real missing, foreign, double and shifted captions preserve old candidate bytes, distances, classes and failures', async t => {
  const f = await fixture(t), previous = await priorModule();
  const mutations = {
    missing: rows => rows.slice(1),
    foreign: rows => {rows[0].pngPath = rows[1].pngPath; return rows;},
    double: rows => [rows[0], clone(rows[0]), ...rows.slice(1)],
    shifted: rows => {rows[0].element.startFrame += 6; rows[0].element.endFrameExclusive += 6; return rows;},
  };
  for (const [name, mutate] of Object.entries(mutations)) {
    const completed = await composed(f, name, mutate(clone(f.records)));
    const old = await previous.inspectPresentationNativeFrameQcV001(input(f, completed, name + '-old'));
    const current = await inspectPresentationNativeFrameQcV001({...input(f, completed, name + '-new'),
      referenceBatchSize: 2, referenceRetention: 'retain-all'});
    assert.equal(old.status, 'failed', name + ': original QC must reject injected video fault');
    assert.equal(current.status, old.status, name);
    assert.deepEqual(current.violations, old.violations, name);
    assert.deepEqual(current.evidence.samples.map(observation), old.evidence.samples.map(observation), name);
    for (const [index, sample] of current.evidence.samples.entries()) for (const [refIndex, reference] of sample.references.entries())
      assert.deepEqual(await readFile(reference.rgbPath), await readFile(old.evidence.samples[index].references[refIndex].rgbPath),
        name + ':' + sample.instructionId + ':' + reference.id);
    assert.equal(current.evidence.samples[0].visible, false, name);
    assert.equal(current.evidence.samples[0].referenceRetention.state, 'retained');
    checkFiniteExecutionEvidence(current.evidence, current.inspections, f.plan.canvas);
    assert.equal((await verifyPresentationNativeSampleReceiptsV001({samples: current.evidence.samples})).status, 'passed');
    const saved = path.join(f.root, name + '-evidence.json');
    const receipt = await writePresentationQcEvidenceV001(saved, {plan: f.plan, native: current});
    assert.deepEqual(await separateReader(saved, receipt), {status: 'failed', samples: 3, combined: false});
  }
});

async function fixedInputProofTests(t, f, replay, completed) {
  const validate = evidence => validatePresentationExactReplayQcEvidenceV001({plan: f.plan, evidence,
    expectedFrameCount: 30, currentCompletedMediaRef: completed});
  const historical = clone(replay.evidence);
  historical.schemaVersion = 'presentation-exact-replay-qc-v001'; delete historical.fixedInputUtf8;
  await t.test('new replay explicitly carries original fixed-input bytes under schema v002', async () => {
    assert.equal(replay.evidence.schemaVersion, 'presentation-exact-replay-qc-v002');
    assert.equal(replay.evidence.fixedInputUtf8, await readFile(path.join(path.dirname(replay.evidence.replay.path), 'fixed-input.json'), 'utf8'));
  });
  await t.test('historical schema v001 still enforces its original exact byte rule', () => {
    assert.equal(validate(historical).status, 'passed');
  });
  await t.test('approved baseline reproduces the pre-existing nested-key-order reload defect', async () => {
    const before = await priorModule('presentation_exact_replay_qc_v001.mjs');
    const params = {plan: f.plan, evidence: historical, expectedFrameCount: 30, currentCompletedMediaRef: completed};
    assert.equal(before.validatePresentationExactReplayQcEvidenceV001(params).status, 'passed');
    const pathname = path.join(f.root, 'historical-order-proof.json');
    const receipt = await writePresentationQcEvidenceV001(pathname, params);
    const restored = await readPresentationQcEvidenceV001(pathname, {expectedFileSha256: receipt.fileSha256});
    const failed = before.validatePresentationExactReplayQcEvidenceV001(restored);
    assert.equal(failed.status, 'failed');
    assert.match(failed.violations[0].reason, /fixed-input\.json/);
  });
  await t.test('v002 keeps the raw artifact binding after all nested object keys are reordered', () => {
    const reorder = value => Array.isArray(value) ? value.map(reorder) : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])])) : value;
    assert.equal(validate(reorder(replay.evidence)).status, 'passed');
  });
  const rewrite = (evidence, mutate) => {
    const input = JSON.parse(evidence.fixedInputUtf8); mutate(input);
    evidence.fixedInputUtf8 = JSON.stringify(input, null, 2) + '\n';
    for (const ref of [...evidence.generatedArtifacts, ...evidence.verifiedGeneratedArtifacts]) {
      if (path.basename(ref.path) === 'fixed-input.json') {
        ref.fileSha256 = hash(evidence.fixedInputUtf8); ref.bytes = Buffer.byteLength(evidence.fixedInputUtf8);
      }
    }
  };
  const cases = [
    ['missing original text', e => {delete e.fixedInputUtf8;}],
    ['null original text', e => {e.fixedInputUtf8 = null;}],
    ['object in place of original text', e => {e.fixedInputUtf8 = {};}],
    ['unpaired surrogate in original text', e => {e.fixedInputUtf8 = '\ud800';}],
    ['empty original text', e => {e.fixedInputUtf8 = '';}],
    ['truncated original text', e => {e.fixedInputUtf8 = e.fixedInputUtf8.slice(0, -4);}],
    ['whitespace changed without artifact rebinding', e => {e.fixedInputUtf8 += '\n';}],
    ['unknown proof version', e => {e.schemaVersion = 'presentation-exact-replay-qc-v999';}],
    ['v001 mislabeled with v002 raw text', e => {e.schemaVersion = 'presentation-exact-replay-qc-v001';}],
    ['fixed input artifact SHA changed', e => {e.generatedArtifacts.find(r => path.basename(r.path) === 'fixed-input.json').fileSha256 = hash('other');}],
    ['fixed input artifact byte count changed', e => {e.generatedArtifacts.find(r => path.basename(r.path) === 'fixed-input.json').bytes++;}],
    ['fixed input artifact missing', e => {e.generatedArtifacts = e.generatedArtifacts.filter(r => path.basename(r.path) !== 'fixed-input.json');}],
    ['raw caption changed even with forged artifact hash', e => rewrite(e, p => {p.plan.elements[0].text = 'changed';})],
    ['raw clock changed even with forged artifact hash', e => rewrite(e, p => {p.plan.elements[0].startFrame++;})],
    ['raw image binding changed even with forged artifact hash', e => rewrite(e, p => {p.recordBindings[0].states[0].pngSha256 = hash('other image');})],
    ['raw compositor changed even with forged artifact hash', e => rewrite(e, p => {p.compositorInput.serializePngAndFilters = false;})],
    ['raw input field removed even with forged artifact hash', e => rewrite(e, p => {delete p.recordBindings;})],
    ['extra raw input field even with forged artifact hash', e => rewrite(e, p => {p.extra = true;})],
  ];
  for (const [name, change] of cases) await t.test(name + ' is rejected', () => {
    const changed = clone(replay.evidence); change(changed);
    const result = validate(changed);
    assert.equal(result.status, 'failed');
    assert(result.violations.some(row => row.code === 'EXACT_REPLAY_QC_INVALID'));
  });
}

test('normal inspector rejects a missing, substituted or changed native input before invoking a child', async t => {
  const f = await fixture(t), completed = await composed(f, 'normal');
  for (const [name, change] of [
    ['missing', rows => {rows[0].pngPath += '.absent'; rows[0].alternates[0].pngPath = rows[0].pngPath;}],
    ['foreign', rows => {rows[0].pngPath = rows[1].pngPath; rows[0].alternates[0].pngPath = rows[0].pngPath;}],
    ['hash', rows => {rows[0].pngSha256 = hash('altered');}],
  ]) {
    const request = input(f, completed, name); request.records = clone(f.records); change(request.records);
    request.processObserver = {run: async () => assert.fail('invalid fixed input reached a child process')};
    await assert.rejects(inspectPresentationNativeFrameQcV001(request), /ENOENT|input bytes changed|bindings differ/);
  }
});

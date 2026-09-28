import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, realpath, rm, writeFile, stat, readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, fixAutoPresentationProposalV001} from './presentation_auto_effects_v001.mjs';
import {inspectPresentationNativeFrameQcV001} from './presentation_native_frame_qc_v001.mjs';
import {verifyPresentationNativeSampleReceiptsV001, hashPresentationNativeFileV001} from './presentation_native_qc_streaming_v001.mjs';
import {readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
const execute = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value)), clone = structuredClone;
const run = async (command, args) => {
  const {stdout, stderr} = await execute(command, args, {encoding: 'buffer', maxBuffer: 4 * 1024 * 1024});
  return {code: 0, signal: null, stdout, stderr};
};
const bind = async pathname => ({path: pathname, fileSha256: await hashPresentationNativeFileV001(pathname)});
const save = async (pathname, value) => {await writeFile(pathname, JSON.stringify(value) + '\n', {flag: 'wx'}); return bind(pathname);};

// Tiny synthetic geometry and one-second media exercise execution ordering and
// storage only. They do not assess fonts, subtitle content or human quality.
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zev-native-execution-control-'));
  t.after(() => rm(root, {recursive: true}));
  const ffmpeg = await realpath('/opt/homebrew/bin/ffmpeg'), magick = await realpath('/opt/homebrew/bin/magick');
  const ffprobe = await realpath('/opt/homebrew/bin/ffprobe');
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 16, height: 16, fps: 30}, elements: ['甲', '乙', '甲'].map((text, index) => ({
      instructionId: 'caption-' + index, kind: 'speech-caption', text,
      indexedLines: [{lineIndex: 0, text}], startFrame: index * 10,
      endFrameExclusive: index === 0 ? 3 : (index + 1) * 10, displayFrameCount: index === 0 ? 3 : 10,
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

async function interrupted(error) {
  assert(error instanceof Error);
  const reference = error.nativeFrameQcFailure.interrupted;
  assert.equal(reference.recordWriteError, undefined);
  return readPresentationQcEvidenceV001(reference.path, {expectedFileSha256: reference.fileSha256});
}

test('awaited generation boundaries and completed receipts preserve unguarded native decisions and bytes', async t => {
  const f = await fixture(t), completed = await composed(f, 'complete'), before = [], after = [];
  const baseline = await inspectPresentationNativeFrameQcV001({...input(f, completed, 'baseline'),
    referenceBatchSize: 1, referenceRetention: 'verified-pass-regenerable-v001'});
  const guarded = await inspectPresentationNativeFrameQcV001({...input(f, completed, 'guarded'),
    referenceBatchSize: 1, referenceRetention: 'verified-pass-regenerable-v001', executionControl: {
      beforeHeavyBatch: async event => {
        before.push(structuredClone(event));
        for (const file of event.outputPaths) await assert.rejects(stat(file), {code: 'ENOENT'});
        if (event.phase.includes('frames-extract') || event.phase === 'native-layer-prepare')
          assert.equal(event.plannedLogicalBytes, null);
        if (event.phase === 'native-layer-decode')
          assert.equal(event.plannedLogicalBytes, event.outputCount * 16 * 16 * 4);
        // Callback arguments are observations; modifying them must not alter
        // the recipe, output paths, counters or later process arguments.
        event.outputPaths.length = 0; event.outputCount = -1;
      },
      afterSample: async event => {
        after.push(structuredClone(event));
        const proof = await readPresentationQcEvidenceV001(event.referenceRetention.checkpoint.path,
          {expectedFileSha256: event.referenceRetention.checkpoint.fileSha256});
        assert.equal(proof.sample.visible, event.visible);
        assert.equal(event.completedSampleCount, event.sampleIndex + 1);
        for (const file of event.outputArtifacts) assert((await stat(file.path)).isFile());
        if (event.referenceRetention.state === 'released-verified-pass')
          for (const file of event.referenceRetention.artifacts) await assert.rejects(stat(file.path), {code: 'ENOENT'});
        event.referenceRetention.state = 'mutation-must-not-escape';
      },
    }});
  assert.equal(guarded.status, baseline.status);
  assert.deepEqual(guarded.violations, baseline.violations);
  assert.deepEqual(guarded.evidence.samples.map(observation), baseline.evidence.samples.map(observation));
  for (const phase of ['source-frames-extract', 'completed-frames-extract', 'native-layer-prepare',
    'native-layer-decode', 'native-sample-start', 'completed-rgb-crop', 'native-reference-composite'])
    assert(before.some(event => event.phase === phase), phase);
  assert.equal(after.length, 3);
  assert.deepEqual(before.filter(event => event.phase === 'native-sample-start').map(event => event.sampleIndex), [0, 1, 2]);
  for (const event of before.filter(event => event.phase === 'native-reference-composite')) {
    const sample = guarded.evidence.samples[event.sampleIndex];
    assert.equal(event.plannedLogicalBytes, event.outputCount * sample.crop.width * sample.crop.height * 3);
  }
  assert.equal((await verifyPresentationNativeSampleReceiptsV001({samples: guarded.evidence.samples})).status, 'passed');
});

test('a guard refusal before any large preparation command preserves incomplete evidence without executing that batch', async t => {
  const f = await fixture(t), completed = await composed(f, 'complete');
  for (const phase of ['source-frames-extract', 'completed-frames-extract', 'native-layer-prepare', 'native-layer-decode']) {
    let refused;
    await assert.rejects(inspectPresentationNativeFrameQcV001({...input(f, completed, phase), executionControl: {
      beforeHeavyBatch: async event => {if (event.phase === phase) {refused = event; throw new Error('capacity refusal ' + phase);}},
    }}), asyncError => {
      assert.match(asyncError.message, /capacity refusal/); refused.error = asyncError; return true;
    });
    for (const file of refused.outputPaths) await assert.rejects(stat(file), {code: 'ENOENT'});
    const saved = await interrupted(refused.error);
    assert.equal(saved.status, 'incomplete'); assert.equal(saved.completedSamples.length, 0);
    assert.equal(saved.nextSampleIndex, 0);
    assert(!saved.processes.some(row => row.purpose === phase), 'refused generation must not start');
  }
});

test('refusal before a later reference batch retains completed RGB, earlier batch outputs and incomplete point evidence', async t => {
  const f = await fixture(t), completed = await composed(f, 'complete');
  let failure;
  try {
    await inspectPresentationNativeFrameQcV001({...input(f, completed, 'batch-refusal'),
      referenceBatchSize: 1, referenceRetention: 'verified-pass-regenerable-v001', executionControl: {
        beforeHeavyBatch: async event => {
          if (event.phase === 'native-reference-composite' && event.batchIndex === 1) throw new Error('batch capacity refusal');
        }, afterSample: () => assert.fail('unfinished point must not be reported complete'),
      }});
    assert.fail('guard must interrupt');
  } catch (error) {failure = error;}
  assert.match(failure.message, /batch capacity refusal/);
  const saved = await interrupted(failure);
  assert.equal(saved.completedSamples.length, 0); assert.equal(saved.currentSample.sampleIndex, 0);
  const partial = JSON.parse(await readFile(saved.sampleFailure.incomplete.path, 'utf8'));
  assert.equal(partial.status, 'incomplete'); assert.equal(partial.metrics.referenceRgbOutputs, 1);
  assert.equal(partial.generatedArtifacts.length, 1);
  assert.equal((await readdir(path.join(saved.currentSample.directory, 'references'))).length, 1);
  assert((await stat(path.join(saved.currentSample.directory, 'completed.rgb'))).size > 0);
  await assert.rejects(stat(path.join(saved.currentSample.directory, 'sample-proof.json')), {code: 'ENOENT'});
});

test('a completed-point guard failure preserves its verified receipt and does not start the next point', async t => {
  const f = await fixture(t), completed = await composed(f, 'complete');
  let failure;
  try {
    await inspectPresentationNativeFrameQcV001({...input(f, completed, 'after-sample-refusal'),
      referenceRetention: 'verified-pass-regenerable-v001', executionControl: {
        afterSample: async event => {assert.equal(event.sampleIndex, 0); throw new Error('stop after saved point');},
      }});
    assert.fail('guard must interrupt');
  } catch (error) {failure = error;}
  assert.match(failure.message, /stop after saved point/);
  const saved = await interrupted(failure);
  assert.equal(saved.completedSamples.length, 1); assert.equal(saved.nextSampleIndex, 1);
  assert.equal(saved.currentSample, null);
  assert.equal((await verifyPresentationNativeSampleReceiptsV001({samples: saved.completedSamples})).status, 'passed');
  await assert.rejects(stat(path.join(saved.referenceDirectory, 'sample-1')), {code: 'ENOENT'});
});

test('failed point observation follows complete proof preservation and reports actual retained reference sizes', async t => {
  const f = await fixture(t), after = [];
  const result = await inspectPresentationNativeFrameQcV001({...input(f, f.base, 'omitted'),
    referenceRetention: 'verified-pass-regenerable-v001', executionControl: {afterSample: async event => {
      assert.equal(event.visible, false); assert.equal(event.referenceRetention.state, 'retained');
      const bytes = (await Promise.all(event.referenceRetention.artifacts.map(row => stat(row.path))))
        .reduce((sum, row) => sum + row.size, 0);
      assert.equal(bytes, event.metrics.retainedReferenceBytes);
      assert.equal((await stat(event.referenceRetention.checkpoint.path)).size, event.metrics.checkpointBytes);
      after.push(event);
    }}});
  assert.equal(result.status, 'failed'); assert.equal(after.length, 3);
  assert.equal((await verifyPresentationNativeSampleReceiptsV001({samples: result.evidence.samples})).status, 'passed');
});

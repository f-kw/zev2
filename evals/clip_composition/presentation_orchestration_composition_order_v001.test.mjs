import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {assertOrchestrationCompositionFrameV001,
  runOrchestrationCompositionOrderFixtureV001} from './presentation_orchestration_composition_order_v001.mjs';

test('composition gate checks opaque glyph interior and refuses a dimmed glyph', () => {
  const canvas = {width: 8, height: 8}, overlayRgba = Buffer.alloc(8 * 8 * 4), overlayYuv = Buffer.alloc(8 * 8 * 3 / 2, 128);
  overlayYuv.fill(16, 0, 64);
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) {
    overlayRgba.set([255, 253, 248, 255], (y * 8 + x) * 4); overlayYuv[y * 8 + x] = 233;
  }
  const args = {overlayRgba, overlayYuv, canvas, fontColor: '#FFFDF8'};
  const correct = assertOrchestrationCompositionFrameV001({...args, frameYuv: Buffer.from(overlayYuv)});
  assert.equal(correct.opaqueGlyphInteriorPixelCount, 16);
  const wrong = Buffer.from(overlayYuv); wrong[3 * 8 + 3] = 146;
  assert.throws(() => assertOrchestrationCompositionFrameV001({...args, frameYuv: wrong}), /opaque glyph changed/);
  assert.throws(() => assertOrchestrationCompositionFrameV001({...args,
    overlayRgba: Buffer.alloc(8 * 8 * 4), frameYuv: Buffer.from(overlayYuv)}), /no opaque glyph interior/);
});

test('real native PNG and native compositor preserve glyphs after Soft and reject caption-then-Soft media', async () => {
  const root = process.cwd();
  const outputDirectory = path.join(root, 'evals/clip_composition/outputs/presentation',
    'stage3-orchestration-composition-test-' + randomUUID());
  const proof = await runOrchestrationCompositionOrderFixtureV001({repositoryRoot: root, outputDirectory,
    nativeOverlay: {
      pngRef: {path: '/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/caption-human-repair-render-v002/render/overlays/01-8da4fb838757.png',
        fileSha256: 'a8c4875e7d37a0fc08daead132073a0aba7eaba6c45885b73ac5081013ac9ece'},
      normalPlanRef: {path: '/var/folders/hb/lm6r0cts2px9tcw0kqz3kmjr0000gn/T/zev-caption-stage1-en1loox_/inputs-v001/normal-plan.json',
        fileSha256: '9a4550ee0f9d3ccaf7ddedac26ed5af8af2bf64e23c505f082830b9031c3311e'},
      captionId: 'digest-human-caption-repair-20260907-v001-instruction-instruction-000001'}});
  assert.equal(proof.status, 'passed'); assert.equal(proof.automaticDigestCandidate, false);
  assert.equal(proof.manualCaptionPlacements, 2); assert.equal(proof.nativePngPixelsUnchanged, true);
  assert.deepEqual(proof.samples.map(sample => sample.frame), [8, 27]);
  assert(proof.samples.every(sample => sample.nativeCaptionAlpha === 1 && sample.correct.comparedLumaSamples > 0
    && sample.rejection.code === 'CAPTION_DARKENED_BY_CONNECTION' && sample.wrongMatchesFiniteFullframeFadeAtEveryGlyphInterior));
  assert.equal(proof.encodedRenderer.presentationEndSampleExclusive, 52920);
  assert.equal(proof.encodedRenderer.audioCopiedWithoutSecondEncode, true);
  const saved = JSON.parse(await readFile(proof.proofRef.path, 'utf8'));
  assert.deepEqual(saved.samples, proof.samples);
  console.log(JSON.stringify({compositionOrderProof: proof.proofRef, rejectedWrongFrames: proof.samples.map(sample => sample.wrongFrame.png.path)}));
});

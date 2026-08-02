import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lstat, mkdtemp, readFile, readlink, realpath, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS,
  PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES,
  buildPresentationVerticalCropFilterV001,
  buildPresentationVerticalOverlayAdapterV001,
  buildPresentationVerticalRejectedFailureV001,
  buildPresentationVerticalTelopPropsV001,
  createPresentationVerticalCroppedBaseMediaV001,
  parseRemotionHelpVersionV001,
  validatePresentationVerticalAlphaBoundsV001,
  validatePresentationVerticalCropDecisionV001,
  validatePresentationVerticalCropOutputV001,
  validatePresentationVerticalImplementationBindingsV001,
  validatePresentationVerticalRenderJobV001,
  validatePresentationVerticalRendererTrustV001,
  validatePresentationVerticalTextModelV001,
} from './render_presentation_vertical_review_v001.ts';
import {
  evaluatePresentationVerticalReviewRendererQcV001,
} from './presentation_renderer_qc_v002.mjs';
import {
  buildFormalRemotionTelopStillArguments,
} from '../../runner/src/telop-remotion.ts';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const hex = (character) => character.repeat(64);
const cropDecision = () => ({
  schemaVersion: 'vertical-preset-type-crop-decision-v006',
  status: 'passed',
  externalApiCallsByThisScript: 0,
  classification: {
    responsePath: 'classification.json',
    responseFileSha256: hex('1'),
    screenLayoutId: 'speaker_only',
    classificationReason: 'one visible speaker',
    candidateSetCanonicalSha256: hex('2'),
  },
  selection: {
    responsePath: 'selection.json',
    responseFileSha256: hex('3'),
    selectedCandidateId: 'speaker-close',
    reason: 'approved crop',
  },
  selectedPlan: {
    screenLayoutId: 'speaker_only',
    classificationReason: 'one visible speaker',
    detections: {speaker: {face: [100, 100, 200, 200], body: [50, 50, 300, 500]}},
    viewports: {speaker: [0.2, 0, 0.8, 1]},
    displaySummary: 'speaker fills the frame',
    selectedCandidateId: 'speaker-close',
    candidateSummary: 'close',
    selectionReason: 'approved',
    candidateOptions: [{
      id: 'speaker-close',
      label: 'close',
      reason: 'approved',
      viewports: {speaker: [0.2, 0, 0.8, 1]},
    }],
  },
  provenance: {
    classificationWebObservation: {},
    selectionWebObservation: {},
    selectionPackageManifest: {},
    canonicalSelector: {},
  },
});
const presetRegistry = () => ({
  schemaVersion: 'presentation-preset-registry-v002',
  registryVersion: 'vertical-short-preset-registry-v001',
  format: 'vertical-short-1080x1920',
  canvas: {
    width: 1080,
    height: 1920,
    fps: 30,
    safeAreaPx: {top: 80, right: 20, bottom: 80, left: 20},
  },
  fontAssets: [{fontAssetId: 'line-seed-jp-extra-bold-v001', fileName: 'LINESeedJP_A_OTF_Eb.otf'}],
  transitions: [{transitionId: 'none'}],
  presets: [{
    presetId: 'vertical-short-speaker-only-readable-pop-v001',
    screenLayoutId: 'speaker_only',
    kindPolicies: [{
      kind: 'speech-caption',
      stateId: 'caption-core-vertical-speaker-only-v001',
      endResponsibility: 'target-anchor',
    }],
    visualStates: [{
      stateId: 'caption-core-vertical-speaker-only-v001',
      transitionId: 'none',
      textStyle: {
        fontAssetId: 'line-seed-jp-extra-bold-v001',
        fontSizePx: 134,
        fontColor: '#ffffff',
        borderColor: '#000000',
        borderWidthPx: 11,
        lineSpacingPercent: 100,
        glowColor: '#000000',
        glowWidthPx: 17,
        glowOpacityPercent: 100,
      },
      position: {
        preset: 'center',
        alignment: 'center',
        offsetXPercent: 0,
        offsetYPercent: -6,
      },
      background: null,
      layout: {
        maxSupportedLogicalWidthPerLine: 14,
        maxLines: 2,
        singleLine: false,
        characterWidthRule: 'unicode-width-v001',
      },
    }],
  }],
});
const element = (lines = ['これは', '字幕です。']) => {
  let sourceIndex = 0;
  return {
    instructionId: 'caption-instruction-000001',
    text: lines.join(''),
    appliedPresetId: 'vertical-short-speaker-only-readable-pop-v001',
    stateId: 'caption-core-vertical-speaker-only-v001',
    indexedLines: lines.map((renderedText, lineIndex) => ({
      lineIndex,
      renderedText,
      characters: Array.from(renderedText).map((character) => ({
        sourceIndex: sourceIndex++,
        character,
        codePoint: character.codePointAt(0),
        role: 'visible',
      })),
    })),
  };
};
const plan = () => ({
  canvas: {width: 1080, height: 1920, fps: 30},
  layoutRules: {
    maxLogicalWidthPerLine: 14,
    maxLinesPerMeaningGroup: 2,
    characterWidthRule: 'unicode-width-v001',
  },
});

test('V01: speaker_onlyの正常viewportを共通crop計算へ渡す', async () => {
  const result = await buildPresentationVerticalCropFilterV001({
    cropDecision: cropDecision(),
    sourceWidth: 1920,
    sourceHeight: 1080,
    frameCount: 100,
    fps: 30,
  });
  assert.equal(result.status, 'passed');
  assert.match(result.filter, /1080x1920/u);
});

test('V02: 必須viewport欠落を拒否する', () => {
  const input = cropDecision();
  input.selectedPlan.viewports = {};
  assert.deepEqual(
    validatePresentationVerticalCropDecisionV001(input).violations.map((entry) => entry.code),
    ['VERTICAL_LAYOUT_DECISION_INVALID'],
  );
});

test('V03: 余分なviewportを拒否する', () => {
  const input = cropDecision();
  input.selectedPlan.viewports.extra = [0, 0, 1, 1];
  assert.equal(validatePresentationVerticalCropDecisionV001(input).status, 'rejected');
});

test('V04: 非有限・範囲外・逆転viewportを拒否する', () => {
  for (const viewport of [[0, 0, Infinity, 1], [-1, 0, 1, 1], [0.8, 0, 0.2, 1]]) {
    const input = cropDecision();
    input.selectedPlan.viewports.speaker = viewport;
    assert.equal(validatePresentationVerticalCropDecisionV001(input).status, 'rejected');
  }
});

test('V05: crop decisionの入力SHA差し替えを専用codeへ帰属できる', () => {
  const failure = buildPresentationVerticalRejectedFailureV001({
    jobBinding: {path: 'job.json', fileSha256: hex('a'), canonicalSha256: hex('b')},
    violations: [{code: 'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH', relatedPaths: ['crop.json']}],
    metrics: {verifiedInputBindingCount: 14, requiredInputBindingCount: 15},
  });
  assert.equal(failure.failureStage, 'input-binding');
  assert.equal(failure.violations[0].code, 'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH');
});

test('V06: screen-layout実装SHA不一致を専用codeへ帰属する', async () => {
  const bindings = await Promise.all(PRESENTATION_VERTICAL_IMPLEMENTATION_BINDINGS.map(
    async ([role, filePath]) => ({
      role,
      path: filePath,
      fileSha256: sha(await readFile(filePath)),
    }),
  ));
  bindings[13].fileSha256 = hex('f');
  const result = await validatePresentationVerticalImplementationBindingsV001(bindings);
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'VERTICAL_LAYOUT_IMPLEMENTATION_HASH_MISMATCH');
  assert.deepEqual(result.metrics, {
    verifiedImplementationBindingCount: 28,
    requiredImplementationBindingCount: 29,
  });
});

test('V07: crop filter構築不能を専用違反へ帰属する', async () => {
  const result = await buildPresentationVerticalCropFilterV001({
    cropDecision: cropDecision(),
    sourceWidth: 0,
    sourceHeight: 1080,
    frameCount: 100,
    fps: 30,
  });
  assert.equal(result.violations[0].code, 'VERTICAL_LAYOUT_FILTER_BUILD_FAILED');
});

test('V08: crop後の1080x1920・30fps違反を拒否する', () => {
  const result = validatePresentationVerticalCropOutputV001({
    source: {width: 1920, height: 1080, fpsNumerator: 30, fpsDenominator: 1, frameCount: 20, audioPacketPayloadSha256: hex('a')},
    output: {width: 1079, height: 1920, fpsNumerator: 30, fpsDenominator: 1, frameCount: 20, audioPacketPayloadSha256: hex('a')},
  });
  assert.equal(result.violations[0].code, 'VERTICAL_BASE_FORMAT_MISMATCH');
});

test('V09: frame数変化を拒否する', () => {
  const result = validatePresentationVerticalCropOutputV001({
    source: {width: 1920, height: 1080, fpsNumerator: 30, fpsDenominator: 1, frameCount: 20, audioPacketPayloadSha256: hex('a')},
    output: {width: 1080, height: 1920, fpsNumerator: 30, fpsDenominator: 1, frameCount: 19, audioPacketPayloadSha256: hex('a')},
  });
  assert.equal(result.violations[0].code, 'VERTICAL_BASE_FRAME_COUNT_MISMATCH');
});

test('V10: 音声packet変化を拒否する', () => {
  const result = validatePresentationVerticalCropOutputV001({
    source: {width: 1920, height: 1080, fpsNumerator: 30, fpsDenominator: 1, frameCount: 20, audioPacketPayloadSha256: hex('a')},
    output: {width: 1080, height: 1920, fpsNumerator: 30, fpsDenominator: 1, frameCount: 20, audioPacketPayloadSha256: hex('b')},
  });
  assert.equal(result.violations[0].code, 'VERTICAL_BASE_AUDIO_MISMATCH');
});

test('V11: B4明示行と文字modelの行不一致を拒否する', async () => {
  const props = buildPresentationVerticalTelopPropsV001({
    element: element(),
    plan: plan(),
    presetRegistry: presetRegistry(),
  });
  const result = await validatePresentationVerticalTextModelV001(props, ['違う行']);
  assert.equal(result.violations[0].code, 'VERTICAL_RENDER_TEXT_MODEL_MISMATCH');
});

test('V12: 末尾句点を含む明示行はそのまま文字modelを通る', async () => {
  const lines = ['これは', '字幕です。'];
  const props = buildPresentationVerticalTelopPropsV001({
    element: element(lines),
    plan: plan(),
    presetRegistry: presetRegistry(),
  });
  assert.equal((await validatePresentationVerticalTextModelV001(props, lines)).status, 'passed');
});

test('V13: 134px相当のalpha境界内と外を区別する', () => {
  const common = {
    safeAreaPx: {top: 80, right: 20, bottom: 80, left: 20},
    canvas: {width: 1080, height: 1920},
  };
  assert.equal(validatePresentationVerticalAlphaBoundsV001({
    ...common,
    alphaBounds: {left: 20, top: 80, right: 1060, bottom: 1840},
  }).status, 'passed');
  assert.equal(validatePresentationVerticalAlphaBoundsV001({
    ...common,
    alphaBounds: {left: 20, top: 80, right: 1061, bottom: 1840},
  }).status, 'rejected');
});

test('V14: 版中立QCとfailure所有表は固定されたまま動く', () => {
  assert.equal(typeof evaluatePresentationVerticalReviewRendererQcV001, 'function');
  assert.equal(PRESENTATION_VERTICAL_RENDER_VIOLATION_CODES.length, 36);
  assert.throws(() => buildPresentationVerticalRejectedFailureV001({
    jobBinding: {},
    violations: [
      {code: 'VERTICAL_LAYOUT_INPUT_HASH_MISMATCH', relatedPaths: ['a']},
      {code: 'VERTICAL_BASE_AUDIO_MISMATCH', relatedPaths: ['b']},
    ],
    metrics: {},
  }));
});

test('V15: 縦型overlay adapterはfont失敗を許さない', () => {
  const adapter = buildPresentationVerticalOverlayAdapterV001(presetRegistry(), {
    nodePath: '/runtime/node',
    remotionCliPath: '/runtime/remotion',
    browserExecutablePath: '/runtime/browser',
  });
  assert.equal(adapter.buildProps(element(), plan()).fontFailurePolicy, 'strict-cancel');
});

test('V16: 正式Remotion入口は束縛実体とbrowserを必須にする', () => {
  const props = buildPresentationVerticalTelopPropsV001({
    element: element(),
    plan: plan(),
    presetRegistry: presetRegistry(),
  });
  const args = buildFormalRemotionTelopStillArguments(props, '/tmp/output.png', {
    nodePath: '/runtime/node',
    remotionCliPath: '/runtime/remotion',
    browserExecutablePath: '/runtime/browser',
  });
  assert.equal(args[0], '/runtime/remotion');
  assert.deepEqual(args.slice(-4, -2), ['--browser-executable', '/runtime/browser']);
});

test('V17: 縦型は共通下位描画入口を呼び独自合成器を持たない', async () => {
  const source = await readFile('evals/clip_composition/render_presentation_vertical_review_v001.ts', 'utf8');
  assert.match(source, /executeValidatedPresentationDrawAndQcV001/u);
  assert.doesNotMatch(source, /function\s+composite\s*\(/u);
});

test('V18: font check falseもstrict-cancel経路へ固定される', async () => {
  const source = await readFile('runner/src/remotion/renderer/TelopRenderer.tsx', 'utf8');
  assert.match(source, /FONT_FALLBACK_DETECTED/u);
  assert.match(source, /cancelRender/u);
});

test('V19: @zev2/sharedは固定symlinkとruntime exportへ解決する', async () => {
  const linkPath = 'runner/node_modules/@zev2/shared';
  assert.equal((await lstat(linkPath)).isSymbolicLink(), true);
  assert.equal(await readlink(linkPath), '../../../packages/shared');
  assert.equal(
    await realpath(linkPath),
    path.resolve('packages/shared'),
  );
  const packageJson = JSON.parse(await readFile('packages/shared/package.json', 'utf8'));
  assert.equal(packageJson.exports['.'].import, './dist/index.js');
});

test('V20: 非crop入力不一致のfailureは15件summaryとして表現する', () => {
  const failure = buildPresentationVerticalRejectedFailureV001({
    jobBinding: {path: 'job.json', fileSha256: hex('a'), canonicalSha256: hex('b')},
    violations: [{code: 'VERTICAL_RENDER_INPUT_BINDING_MISMATCH', relatedPaths: ['request.json']}],
    metrics: {verifiedInputBindingCount: 14, requiredInputBindingCount: 15},
  });
  assert.deepEqual(failure.observedProjection, {
    stage: 'input-binding',
    variant: 'input-binding-summary',
    metrics: {verifiedInputBindingCount: 14, requiredInputBindingCount: 15},
  });
});

test('V21: screen-layout以外の実装不一致は29件summaryへ帰属する', () => {
  const job = {
    schemaVersion: 'presentation-vertical-review-render-job-v001',
    jobId: 'vertical-test',
    reviewRenderRequest: {path: 'request.json', fileSha256: hex('1'), canonicalSha256: hex('2')},
    implementationBindings: [],
    runtimeProfile: {
      node: {path: '/node', version: 'v20', fileSha256: hex('1')},
      tsx: {path: '/tsx', version: '4', fileSha256: hex('2')},
      remotion: {path: '/remotion', version: '4.0.481', fileSha256: hex('3')},
      browser: {path: '/browser', version: '149', fileSha256: hex('4')},
      ffmpeg: {path: '/ffmpeg', version: '8', fileSha256: hex('5')},
      ffprobe: {path: '/ffprobe', version: '8', fileSha256: hex('6')},
      imageMagick: {path: '/magick', version: '7', fileSha256: hex('7')},
    },
    outputDirectory: 'evals/clip_composition/outputs/presentation/vertical-review-renders/vertical-test-result',
  };
  const result = validatePresentationVerticalRenderJobV001(job);
  assert.equal(result.violations[0].code, 'VERTICAL_RENDER_IMPLEMENTATION_BINDING_MISMATCH');
  assert.equal(parseRemotionHelpVersionV001({
    exitCode: 0,
    stdout: Buffer.from('@remotion/cli 4.0.481\nCommands:\n'),
    stderr: Buffer.alloc(0),
  }).version, '4.0.481');
});

test('V22: 生成時renderer来歴と現在実装のlive束縛を分離する', async () => {
  const formalJob = JSON.parse(await readFile(
    'evals/clip_composition/outputs/presentation/vertical-review-render-jobs/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json',
    'utf8',
  ));
  const trust = JSON.parse(await readFile(
    'evals/clip_composition/registries/presentation/'
      + 'presentation-vertical-renderer-trust-v001/trust.json',
    'utf8',
  ));
  const registry = JSON.parse(await readFile(
    'evals/clip_composition/registries/presentation/'
      + 'vertical-short-preset-registry-v001/preset-registry.json',
    'utf8',
  ));
  const implementationBindings = structuredClone(formalJob.implementationBindings);
  implementationBindings[0].fileSha256 = sha(await readFile(
    'evals/clip_composition/render_presentation_vertical_review_v001.ts',
  ));

  assert.equal(
    (await validatePresentationVerticalImplementationBindingsV001(
      implementationBindings,
    )).status,
    'passed',
  );
  assert.equal((await validatePresentationVerticalRendererTrustV001({
    trust,
    presetRegistry: registry,
    runtimeProfile: formalJob.runtimeProfile,
    implementationBindings,
  })).status, 'passed');

  const changedNonRendererDependency = structuredClone(trust);
  changedNonRendererDependency.rendererDependencies[1].fileSha256 = hex('f');
  assert.equal((await validatePresentationVerticalRendererTrustV001({
    trust: changedNonRendererDependency,
    presetRegistry: registry,
    runtimeProfile: formalJob.runtimeProfile,
    implementationBindings,
  })).status, 'rejected');
});

test('V23: 実crop入口は共通frame数読取処理を通してAVを保持する', async () => {
  const formalJob = JSON.parse(await readFile(
    'evals/clip_composition/outputs/presentation/vertical-review-render-jobs/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v002.json',
    'utf8',
  ));
  const fixtureDirectory = await mkdtemp(
    path.join(tmpdir(), 'zev2-presentation-vertical-crop-regression-v001-'),
  );
  const sourcePath = path.join(fixtureDirectory, 'source.mp4');
  let cropWorkDirectory = null;
  try {
    const generated = spawnSync(formalJob.runtimeProfile.ffmpeg.path, [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=320x180:r=30',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=48000:cl=stereo',
      '-frames:v',
      '6',
      '-t',
      '0.2',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      sourcePath,
    ], {encoding: null});
    assert.equal(generated.error, undefined);
    assert.equal(generated.status, 0, generated.stderr.toString('utf8'));
    assert.equal(generated.stdout.length, 0);
    assert.equal(generated.stderr.length, 0);

    const result = await createPresentationVerticalCroppedBaseMediaV001({
      baseMediaPath: sourcePath,
      cropDecision: cropDecision(),
      runtimeProfile: formalJob.runtimeProfile,
    });
    cropWorkDirectory = result.workDirectory ?? null;
    assert.equal(result.status, 'passed');
    assert.equal(result.sourceFrameCount, 6);
    assert.equal(result.outputMedia.video.width, 1080);
    assert.equal(result.outputMedia.video.height, 1920);
    assert.equal(result.outputMedia.video.frameCount, 6);
    assert.equal(
      result.outputMedia.audio.packetPayloadSha256,
      result.sourceMedia.audio.packetPayloadSha256,
    );
  } finally {
    if (cropWorkDirectory !== null) {
      await rm(cropWorkDirectory, {recursive: true, force: true});
    }
    await rm(fixtureDirectory, {recursive: true, force: true});
  }
});

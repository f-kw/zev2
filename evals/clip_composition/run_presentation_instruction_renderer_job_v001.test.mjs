import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  buildPresentationTitleInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  buildPresentationRendererLineLayoutV001,
} from './presentation_renderer_line_layout_rule_v001.mjs';
import {
  buildZevoTitleCommonCorePlanV001,
} from './presentation_output_title_compositor_v001.mjs';
import {
  buildPresentationInstructionCommonCorePlanV001,
  observePresentationRendererRuntimeBindingsV001,
  resolvePresentationRendererAppearanceV001,
} from './run_presentation_instruction_renderer_job_v001.ts';
import {
  buildPresentationRendererOverlayAdapterV001,
} from './render_presentation_v002.mjs';
import {
  createPresentationRendererProcessObserverV001,
} from './presentation_renderer_process_observation_v001.mjs';

const TITLE_MEANING_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/'
  + 'meaning-information-package.json';
const TITLE_REGISTRY_PATH = 'evals/clip_composition/registries/presentation/'
  + 'zevo-title-style-registry-v004/registry.json';
const OLD_TITLE_PLAN_PATH = 'evals/clip_composition/outputs/presentation/title-output-renders/'
  + 'qdczJpv8RCc-candidate-59-c-title-landscape-v009-output/title-display-plan-v001.json';
const CAPTION_REGISTRY_PATH = 'evals/clip_composition/registries/presentation/'
  + 'normal-landscape-preset-registry-v001/preset-registry.json';
const CAPTION_CONTROL_ROOT = 'evals/clip_composition/outputs/presentation/'
  + 'rendering-decoupling-caption-control/a-v002-voice-013-v006';
const CAPTION_RENDER_ROOT = 'evals/clip_composition/outputs/presentation/'
  + 'rendering-decoupling-caption-renders/a-v002-voice-013-v006';
const CAPTION_RESULT_PATH = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260818-rendering-decoupling-caption-attempt-0006/result.json';
const OLD_CAPTION_PAGE_LINE_PLAN_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'output-caption-cue-proof-runs/'
  + 'a-v002-caption-quality-v022-proof-20260816-v003/voice-013/horizontal-formal/'
  + 'page-line-plan-v003.json';
const HASH = '0'.repeat(64);
const binding = (schemaVersion, name) => ({
  schemaVersion,
  path: `evals/clip_composition/outputs/presentation/rendering-decoupling/${name}.json`,
  fileSha256: HASH,
  canonicalSha256: HASH,
});
const jobBinding = binding('presentation-rendering-decoupling-job-v001', 'job');
const lineRules = {
  'speech-caption': 'semantic-line-end-projection-v001',
  title: 'greedy-code-point-v001',
};
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

const captionFormalEvidence = async () => {
  const [result, projection, lineEndProjection, instruction, job, receipt, lineLayout,
    oldPageLinePlan] =
    await Promise.all([
      readJson(CAPTION_RESULT_PATH),
      readJson(`${CAPTION_CONTROL_ROOT}/cue-end-projection-v001.json`),
      readJson(`${CAPTION_CONTROL_ROOT}/semantic-line-end-projection-v001.json`),
      readJson(`${CAPTION_CONTROL_ROOT}/presentation-instruction-v001.json`),
      readJson(`${CAPTION_CONTROL_ROOT}/renderer-job-v001.json`),
      readJson(`${CAPTION_CONTROL_ROOT}/admission-receipt-v001.json`),
      readJson(`${CAPTION_CONTROL_ROOT}/line-layout-v001.json`),
      readJson(OLD_CAPTION_PAGE_LINE_PLAN_PATH),
    ]);
  return {
    result,
    projection,
    lineEndProjection,
    instruction,
    job,
    receipt,
    lineLayout,
    oldPageLinePlan,
  };
};

const titleFixture = async () => {
  const [meaningPackage, registry, oldPlan] = await Promise.all([
    readFile(TITLE_MEANING_PATH, 'utf8').then(JSON.parse),
    readFile(TITLE_REGISTRY_PATH, 'utf8').then(JSON.parse),
    readFile(OLD_TITLE_PLAN_PATH, 'utf8').then(JSON.parse),
  ]);
  const profileId = 'zevo-title-normal-landscape-top-v004';
  const profile = registry.profiles.find(row => row.profileId === profileId);
  const artifact = buildPresentationTitleInstructionArtifactV001({
    artifactId: 'rendering-decoupling-title-landscape-instruction-v001',
    sourceCaseId: 'rendering-decoupling-title-landscape-v001',
    meaningInformationPackageBinding: binding(meaningPackage.schemaVersion, 'title-meaning'),
    producerJobBinding: jobBinding,
    styleProfileId: profileId,
    displayFrameRange: profile.displayFrameRange,
    meaningPackage,
  }).artifact;
  const artifactBinding = binding(artifact.schemaVersion, 'title-instruction');
  const lineLayout = buildPresentationRendererLineLayoutV001({
    layoutId: 'rendering-decoupling-title-landscape-line-layout-v001',
    instructionArtifactBinding: artifactBinding,
    instructionArtifact: artifact,
    meaningPackage,
    maxLogicalWidth: profile.maxLogicalWidth,
    maxLines: profile.maxLines,
    lineLayoutRules: lineRules,
  }).layout;
  const job = {
    executionInputs: {
      format: profile.format,
      canvas: profile.canvas,
      visualStateId: profile.visualState.stateId,
    },
  };
  return {meaningPackage, registry, oldPlan, profile, artifact, lineLayout, job};
};

test('renderer runner title planは新line layoutから旧共通planと同じ表示値を作る', async () => {
  const fixture = await titleFixture();
  const styleRegistryWithoutTrust = structuredClone(fixture.registry);
  delete styleRegistryWithoutTrust.layoutRules;
  const current = buildPresentationInstructionCommonCorePlanV001({
    job: fixture.job,
    visualStateId: fixture.job.executionInputs.visualStateId,
    instructionArtifact: fixture.artifact,
    lineLayout: fixture.lineLayout,
    styleProfileRegistry: styleRegistryWithoutTrust,
    rendererTrust: {layoutRules: fixture.registry.layoutRules},
  });
  const oracle = buildZevoTitleCommonCorePlanV001({
    plan: fixture.oldPlan,
    registry: fixture.registry,
  });
  assert.equal(current.status, 'built');
  assert.equal(oracle.status, 'built');
  const currentElement = current.plan.elements[0];
  const oracleElement = oracle.plan.elements[0];
  for (const key of [
    'kind', 'text', 'startFrame', 'endFrameExclusive', 'displayFrameCount',
    'requestedPresetId', 'appliedPresetId', 'presetId', 'registryVersion',
    'presetRegistryVersion', 'stateId', 'visualState', 'transition',
  ]) assert.deepEqual(currentElement[key], oracleElement[key], key);
  assert.deepEqual(
    currentElement.indexedLines.map(row => row.text),
    oracleElement.indexedLines.map(row => row.text),
  );
});

test('renderer runnerは明示visualStateIdだけを選び暗黙defaultを使わない', async () => {
  const registry = JSON.parse(await readFile(CAPTION_REGISTRY_PATH, 'utf8'));
  const resolved = resolvePresentationRendererAppearanceV001({
    instructionArtifact: {styleProfileId: 'normal-landscape-readable-pop-v001'},
    styleProfileRegistry: registry,
    visualStateId: 'caption-core-v001',
  });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.visualState.stateId, 'caption-core-v001');
  const missing = resolvePresentationRendererAppearanceV001({
    instructionArtifact: {styleProfileId: 'normal-landscape-readable-pop-v001'},
    styleProfileRegistry: registry,
  });
  assert.equal(missing.status, 'rejected');
  assert.equal(missing.primaryCode, 'RENDER_ADMISSION_STYLE_INVALID');
});

test('renderer runnerは外部実行体6件をpath実体とSHAで再読する', async () => {
  const paths = {
    ffmpeg: '/opt/homebrew/bin/ffmpeg',
    ffprobe: '/opt/homebrew/bin/ffprobe',
    imageMagick: '/opt/homebrew/bin/magick',
    remotion: '/Users/kawafmm/workspace/zev2/runner/node_modules/@remotion/cli/remotion-cli.js',
    tsx: '/Users/kawafmm/workspace/zev2/runner/node_modules/tsx/dist/cli.mjs',
    chromium: '/Users/kawafmm/workspace/zev2/runner/node_modules/.remotion/'
      + 'chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/'
      + 'chrome-headless-shell',
  };
  const runtimeBindings = Object.fromEntries(await Promise.all(Object.entries(paths).map(
    async ([role, runtimePath]) => [role, {
      path: runtimePath,
      fileSha256: createHash('sha256').update(await readFile(runtimePath)).digest('hex'),
    }],
  )));
  assert.deepEqual(
    await observePresentationRendererRuntimeBindingsV001(runtimeBindings),
    runtimeBindings,
  );
});

test('renderer overlayはjobとreceiptで確定したRemotionとChromiumだけを明示使用する', async () => {
  const calls = [];
  const observer = Object.freeze({
    run: async (command, args, options) => {
      calls.push({command, args, options});
      return {code: 0, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0)};
    },
  });
  const adapter = buildPresentationRendererOverlayAdapterV001({
    remotionPath: '/runtime/remotion',
    chromiumPath: '/runtime/chromium',
    processObserver: observer,
  });
  await adapter.renderStill({schemaVersion: 'fixture'}, '/output/overlay.png');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, '/runtime/remotion');
  assert.equal(
    calls[0].args[calls[0].args.indexOf('--browser-executable') + 1],
    '/runtime/chromium',
  );
  assert.equal(calls[0].options.observationLabel, 'overlay-still');
});

test('renderer child観測は終了code・stderr・signalを出力読取前に独立保存する', async () => {
  const root = await mkdtemp('/private/tmp/presentation-renderer-observation-');
  const observer = createPresentationRendererProcessObserverV001({observationDirectory: root});
  const result = await observer.run(process.execPath, [
    '-e',
    "process.stderr.write('observed-stderr'); process.stdout.write('observed-stdout')",
  ], {observationLabel: 'fixture-process'});
  assert.equal(result.stdout.toString(), 'observed-stdout');
  const [recordName] = await readdir(root);
  const record = path.join(root, recordName);
  assert.equal(await readFile(path.join(record, 'exit-code.txt'), 'utf8'), '0\n');
  assert.equal(await readFile(path.join(record, 'stderr.txt'), 'utf8'), 'observed-stderr');
  assert.equal(await readFile(path.join(record, 'signal.txt'), 'utf8'), 'none\n');
});

test('PRM001: voice-013横型はprojectionから注文書・receipt・line layout・描画・QCまで完走する', async () => {
  const evidence = await captionFormalEvidence();
  assert.equal(evidence.result.status, 'completed');
  assert.equal(evidence.result.exitCode, 0);
  assert.equal(evidence.projection.schemaVersion, 'presentation-cue-end-projection-v001');
  assert.equal(evidence.lineEndProjection.schemaVersion,
    'presentation-semantic-line-end-projection-v001');
  assert.equal(evidence.instruction.artifactKind, 'caption');
  assert.equal(evidence.instruction.instructions.length, 11);
  assert.equal(evidence.receipt.status, 'accepted');
  assert.equal(evidence.lineLayout.entries.length, 11);
  assert.equal(evidence.result.qc.status, 'passed');
  assert.equal(evidence.result.qc.instructionCount, 11);
  assert.deepEqual(evidence.result.qc.violations, []);
  assert.equal(evidence.job.executionInputs.visualStateId, 'caption-core-v001');
  assert.equal(evidence.receipt.visualStateId, evidence.job.executionInputs.visualStateId);
  assert.deepEqual(evidence.receipt.runtimeBindings, evidence.job.runtimeBindings);
  assert.deepEqual(evidence.receipt.lineEndProjectionBinding,
    evidence.job.lineEndProjectionBinding);

  const observationRoot = `${CAPTION_CONTROL_ROOT}/process-observations/attempt-0001`;
  const processRecords = (await readdir(observationRoot, {withFileTypes: true}))
    .filter(entry => entry.isDirectory());
  assert.ok(processRecords.length > 0);
  for (const record of processRecords) {
    const recordRoot = path.join(observationRoot, record.name);
    const exitCode = await readFile(path.join(recordRoot, 'exit-code.txt'), 'utf8');
    assert.equal(
      exitCode === '0\n'
        || (record.name.endsWith('qc-image-difference') && exitCode === '1\n'),
      true,
    );
    assert.equal(await readFile(path.join(recordRoot, 'signal.txt'), 'utf8'), 'none\n');
    await readFile(path.join(recordRoot, 'stderr.txt'));
  }
});

test('PRM002: voice-013の注文書は旧render planなしで描画できる', async () => {
  const evidence = await captionFormalEvidence();
  const instructionByte = JSON.stringify(evidence.instruction);
  const jobByte = JSON.stringify(evidence.job);
  for (const obsolete of [
    'presentation-output-page-line-plan-v003',
    'presentation-output-render-plan-v003',
    'presentation-output-common-core-plan-v001',
  ]) {
    assert.equal(instructionByte.includes(obsolete), false);
    assert.equal(jobByte.includes(obsolete), false);
  }
  assert.equal(evidence.result.qc.status, 'passed');
  await readFile(`${CAPTION_RENDER_ROOT}/presentation-rendered-v002.mp4`);
});

test('PRM003: 工事前後でvoice-013の本文・cue終端・frame・行分割projectionがbyte一致する', async () => {
  const evidence = await captionFormalEvidence();
  const oldCues = evidence.oldPageLinePlan.captionDisplays[0].cues.map(cue => ({
    text: cue.text,
    cueEndBoundaryId: cue.cueEndBoundaryId,
    startFrame: cue.startFrame,
    endFrameExclusive: cue.endFrameExclusive,
    lines: cue.lines.map(line => ({
      text: line.text,
      logicalWidth: line.logicalWidth,
      sourceUnitIds: line.atomOccurrenceIds,
    })),
  }));
  const lineLayoutByInstruction = new Map(
    evidence.lineLayout.entries.map(entry => [entry.instructionId, entry.lines]),
  );
  const newCues = evidence.instruction.instructions.map(instruction => ({
    text: instruction.content.text,
    cueEndBoundaryId: instruction.cueEndReference.cueEndBoundaryId,
    startFrame: instruction.outputTime.startFrame,
    endFrameExclusive: instruction.outputTime.endFrameExclusive,
    lines: lineLayoutByInstruction.get(instruction.instructionId).map(line => ({
      text: line.text,
      logicalWidth: line.logicalWidth,
      sourceUnitIds: line.sourceUnitIds,
    })),
  }));
  assert.deepEqual(newCues, oldCues);
  assert.deepEqual(
    evidence.lineEndProjection.captions[0].cues.map(cue => ({
      cueEndBoundaryId: cue.cueEndBoundaryId,
      lineEndBoundaryIds: cue.lineEndBoundaryIds,
    })),
    evidence.oldPageLinePlan.captionDisplays[0].cues.map(cue => ({
      cueEndBoundaryId: cue.cueEndBoundaryId,
      lineEndBoundaryIds: cue.lineEndBoundaryIds,
    })),
  );
});

test('PRM004: voice-013は注文一件ごとのapplication resultとoverlay・QCが一対一になる', async () => {
  const evidence = await captionFormalEvidence();
  const instructionById = new Map(
    evidence.instruction.instructions.map(instruction => [instruction.instructionId, instruction]),
  );
  const layoutById = new Map(
    evidence.lineLayout.entries.map(entry => [entry.instructionId, entry]),
  );
  assert.equal(evidence.result.qc.instructionEvidence.length, instructionById.size);
  for (const row of evidence.result.qc.instructionEvidence) {
    assert.equal(instructionById.has(row.instructionId), true);
    assert.equal(row.lineCount, layoutById.get(row.instructionId).lines.length);
    assert.equal(row.applicationOverlayFile, row.inspectedOverlayFile);
    assert.equal(row.applicationOverlaySha256, row.overlaySha256);
    const overlayPath = path.join(CAPTION_RENDER_ROOT, row.applicationOverlayFile);
    assert.equal(
      createHash('sha256').update(await readFile(overlayPath)).digest('hex'),
      row.applicationOverlaySha256,
    );
  }
});

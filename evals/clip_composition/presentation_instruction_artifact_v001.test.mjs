import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV001,
  buildPresentationTitleInstructionArtifactV001,
  decodePresentationInstructionArtifactV001,
  serializePresentationInstructionArtifactV001,
  validatePresentationInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';

const FIXTURE_ROOT = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures';
const TITLE_MEANING_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/'
  + 'meaning-information-package.json';
const HASH = '0'.repeat(64);
const producerJobBinding = Object.freeze({
  schemaVersion: 'presentation-rendering-decoupling-instruction-job-v001',
  path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/jobs/instruction.json',
  fileSha256: HASH,
  canonicalSha256: HASH,
});

const captionFixture = async () => {
  const [sourcePackage, selection] = await Promise.all([
    readFile(`${FIXTURE_ROOT}/source-package-v001.json`, 'utf8').then(JSON.parse),
    readFile(`${FIXTURE_ROOT}/selection-v001.json`, 'utf8').then(JSON.parse),
  ]);
  const context = sourcePackage.reconstructionMap.caseContexts[0];
  const [meaningPackage, timeline] = await Promise.all([
    readFile(context.meaningPackageBinding.path, 'utf8').then(JSON.parse),
    readFile(context.baseMediaInput.timeline.path, 'utf8').then(JSON.parse),
  ]);
  const projection = buildPresentationCueEndProjectionV001({
    projectionId: 'voice-013-cue-end-projection-v001',
    sourcePackageBinding: selection.sourcePackageBinding,
    sourceSelectionDigest: {
      schemaVersion: selection.schemaVersion,
      artifactId: selection.selectionId,
      fileSha256: HASH,
      canonicalSha256: HASH,
    },
    producerJobBinding,
    sourcePackage,
    selection,
  }).projection;
  const projectionBinding = buildPresentationCueEndProjectionBindingV001({
    path: 'evals/clip_composition/outputs/presentation/rendering-decoupling/'
      + 'voice-013/cue-end-projection-v001.json',
    projection,
  });
  const result = buildPresentationCaptionInstructionArtifactV001({
    artifactId: 'voice-013-presentation-instruction-v001',
    sourceCaseId: context.caseId,
    meaningInformationPackageBinding: context.meaningPackageBinding,
    timelineBinding: context.baseMediaInput.timeline,
    cueEndProjectionBinding: projectionBinding,
    producerJobBinding,
    styleProfileId: context.resolvedStyle.presetId,
    meaningPackage,
    timeline,
    cueEndProjection: projection,
  });
  assert.equal(result.status, 'built');
  return {
    artifact: result.artifact,
    sourcePackage,
    context,
    meaningPackage,
    timeline,
    projection,
  };
};

const titleFixture = async () => {
  const bytes = await readFile(TITLE_MEANING_PATH);
  const meaningPackage = JSON.parse(bytes.toString('utf8'));
  const binding = {
    schemaVersion: meaningPackage.schemaVersion,
    path: TITLE_MEANING_PATH,
    fileSha256: createHash('sha256').update(bytes).digest('hex'),
    canonicalSha256: HASH,
  };
  const result = buildPresentationTitleInstructionArtifactV001({
    artifactId: 'title-c-v009-landscape-instruction-v001',
    sourceCaseId: 'title-c-v009-landscape',
    meaningInformationPackageBinding: binding,
    producerJobBinding,
    styleProfileId: 'zevo-title-normal-landscape-top-v004',
    displayFrameRange: {startFrame: 0, endFrameExclusive: 180},
    meaningPackage,
  });
  assert.equal(result.status, 'built');
  return {artifact: result.artifact, meaningPackage, bytes};
};

test('PRI001 formal byteとexact schema、未知key拒否', async () => {
  const {artifact} = await captionFixture();
  const bytes = serializePresentationInstructionArtifactV001(artifact);
  assert.equal(bytes[bytes.length - 1], 0x0a);
  assert.equal(decodePresentationInstructionArtifactV001(bytes).status, 'decoded');
  const invalid = structuredClone(artifact);
  invalid.unknown = true;
  assert.equal(validatePresentationInstructionArtifactV001(invalid).primaryCode,
    'INSTRUCTION_INPUT_INVALID');
});

test('PRI002 source binding全件のstable再読・SHA一致', async () => {
  const {artifact, context} = await captionFixture();
  for (const binding of [
    artifact.sourceBindings.meaningInformationPackage,
    artifact.sourceBindings.timeline,
  ]) {
    const first = await readFile(binding.path);
    const second = await readFile(binding.path);
    assert.deepEqual(first, second);
    assert.equal(createHash('sha256').update(first).digest('hex'), binding.fileSha256);
  }
  assert.deepEqual(artifact.sourceBindings.meaningInformationPackage,
    context.meaningPackageBinding);
});

test('PRI003 instruction ID一意性と決定順', async () => {
  const {artifact} = await captionFixture();
  const tuples = artifact.instructions.map(row => [
    row.outputTime.startFrame,
    row.outputTime.endFrameExclusive,
    row.instructionId,
  ]);
  assert.deepEqual([...tuples].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), tuples);
  const invalid = structuredClone(artifact);
  invalid.instructions[1].instructionId = invalid.instructions[0].instructionId;
  assert.equal(validatePresentationInstructionArtifactV001(invalid).primaryCode,
    'INSTRUCTION_INPUT_INVALID');
});

test('PRI004 frame範囲が正でtimeline内に閉じms field 0件', async () => {
  const {artifact, meaningPackage, timeline, projection} = await captionFixture();
  assert.deepEqual(artifact.instructions.map(row => row.outputTime), [
    {startFrame: 0, endFrameExclusive: 179},
    {startFrame: 179, endFrameExclusive: 402},
    {startFrame: 402, endFrameExclusive: 755},
  ]);
  assert.equal(JSON.stringify(artifact).match(/(?:start|end)Ms/gu), null);
  assert.equal(validatePresentationInstructionArtifactV001(artifact, {
    meaningPackage, timeline, cueEndProjection: projection,
  }).status, 'passed');
});

test('PRI005 caption本文・atom順・cue終端の全量閉包', async () => {
  const {artifact, meaningPackage, timeline, projection} = await captionFixture();
  assert.equal(validatePresentationInstructionArtifactV001(artifact, {
    meaningPackage, timeline, cueEndProjection: projection,
  }).status, 'passed');
  assert.deepEqual(
    artifact.instructions.flatMap(row => row.targetProvenance.atomOccurrenceIds),
    meaningPackage.captions[0].atomOccurrenceIds,
  );
  const invalid = structuredClone(artifact);
  invalid.instructions[0].content.text += '改変';
  assert.equal(validatePresentationInstructionArtifactV001(invalid, {
    meaningPackage, timeline, cueEndProjection: projection,
  }).primaryCode, 'INSTRUCTION_CONTENT_INVALID');
});

test('PRI006 title本文と意味情報package titleのbyte一致', async () => {
  const {artifact, meaningPackage} = await titleFixture();
  assert.equal(artifact.instructions[0].content.text, '片付けの「やりかけ癖」を語るマリン船長');
  assert.equal(Buffer.from(artifact.instructions[0].content.text).equals(
    Buffer.from(meaningPackage.title.text)), true);
  assert.equal(validatePresentationInstructionArtifactV001(artifact, {meaningPackage}).status,
    'passed');
});

test('PRI007 semanticKind・targetType・artifactKindの条件表一致', async () => {
  const caption = (await captionFixture()).artifact;
  const title = (await titleFixture()).artifact;
  assert.deepEqual([
    caption.artifactKind,
    caption.instructions[0].semanticKind,
    caption.instructions[0].targetProvenance.targetType,
  ], ['caption', 'speech-caption', 'semantic-caption']);
  assert.deepEqual([
    title.artifactKind,
    title.instructions[0].semanticKind,
    title.instructions[0].targetProvenance.targetType,
  ], ['title', 'title', 'meaning-title']);
  const invalid = structuredClone(title);
  invalid.instructions[0].semanticKind = 'speech-caption';
  assert.equal(validatePresentationInstructionArtifactV001(invalid).primaryCode,
    'INSTRUCTION_TARGET_INVALID');
});

test('PRI008 target・material参照実在と重複0', async () => {
  const {artifact, meaningPackage, timeline, projection} = await captionFixture();
  assert.equal(validatePresentationInstructionArtifactV001(artifact, {
    meaningPackage, timeline, cueEndProjection: projection,
  }).status, 'passed');
  assert.equal(artifact.instructions.every(row => row.materialRefs.length === 0), true);
  const invalid = structuredClone(artifact);
  invalid.instructions[0].targetProvenance.atomOccurrenceIds[0] = 'missing-atom';
  assert.equal(validatePresentationInstructionArtifactV001(invalid, {
    meaningPackage, timeline, cueEndProjection: projection,
  }).primaryCode, 'INSTRUCTION_CONTENT_INVALID');
});

test('PRI009 禁止field閉集合全件が発火し正当なtimelineは誤拒否しない', async () => {
  const {artifact} = await captionFixture();
  assert.equal(validatePresentationInstructionArtifactV001(artifact).status, 'passed');
  const forbidden = [
    'selectionBinding', 'selectionReportBinding', 'lineEndBoundaryIds', 'lines',
    'indexedLines', 'lineId', 'lineOrdinal', 'lineTexts', 'logicalWidth',
    'maxLogicalWidth', 'maxLogicalWidthPerLine', 'maxLines', 'maxLinesPerDisplayPage',
    'characterWidthRule', 'resolvedStyle', 'styleIntent', 'visualStateId', 'stateId',
    'requestedPresetId', 'appliedPresetId', 'fontAssetId', 'fontFamily', 'fontSizePx',
    'fontColor', 'fillColor', 'borderColor', 'borderWidthPx', 'glowColor',
    'glowWidthPx', 'glowBlurPx', 'backgroundColor', 'backgroundOpacity', 'position',
    'x', 'y', 'offsetX', 'offsetY', 'safeArea', 'safeAreaPx', 'canvas', 'format',
    'screenLayoutId', 'cropMode', 'cropViewport', 'cropFilter', 'sceneTransitionMode',
    'audioMode', 'transition', 'fadeFrames', 'easing', 'animation', 'animationCurve',
    'rendererImplementationBinding',
  ];
  for (const key of forbidden) {
    const invalid = structuredClone(artifact);
    invalid.instructions[0].content[key] = null;
    assert.equal(validatePresentationInstructionArtifactV001(invalid).primaryCode,
      'INSTRUCTION_FORBIDDEN_FIELD', key);
  }
  assert.equal(Object.hasOwn(artifact.sourceBindings, 'timeline'), true);
});

test('PRI010 同一入力から注文書formal byteが一致', async () => {
  const first = await captionFixture();
  const second = await captionFixture();
  assert.deepEqual(
    serializePresentationInstructionArtifactV001(first.artifact),
    serializePresentationInstructionArtifactV001(second.artifact),
  );
});

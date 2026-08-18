import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationCueEndProjectionBindingV001,
  buildPresentationCueEndProjectionV001,
  buildPresentationSemanticLineEndProjectionV001,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV001,
  buildPresentationTitleInstructionArtifactV001,
} from './presentation_instruction_artifact_v001.mjs';
import {
  buildPresentationRendererLineLayoutV001,
  validatePresentationRendererLineLayoutV001,
} from './presentation_renderer_line_layout_rule_v001.mjs';

const FIXTURE_ROOT = 'evals/clip_composition/reports/presentation/test-runs/'
  + '20260814-zevo-caption-quality-v002-f-gate-attempt-0011/fixtures';
const OLD_PLAN_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'zevo-caption-quality-v002-test/f-gate-attempt-0011/voice-013/'
  + 'horizontal-formal/page-line-plan-v003.json';
const TITLE_MEANING_PATH = 'evals/clip_composition/outputs/presentation/'
  + 'meaning-information-packages/qdczJpv8RCc-candidate-59-c-title-v002-meaning-information/'
  + 'meaning-information-package.json';
const HASH = '0'.repeat(64);
const binding = (schemaVersion, name) => ({
  schemaVersion,
  path: `evals/clip_composition/outputs/presentation/rendering-decoupling/${name}.json`,
  fileSha256: HASH,
  canonicalSha256: HASH,
});
const producerJobBinding = binding('presentation-rendering-decoupling-job-v001', 'job');
const lineRules = Object.freeze({
  'speech-caption': 'semantic-line-end-projection-v001',
  title: 'greedy-code-point-v001',
});

const captionFixture = async () => {
  const [sourcePackage, selection, oldPlan] = await Promise.all([
    readFile(`${FIXTURE_ROOT}/source-package-v001.json`, 'utf8').then(JSON.parse),
    readFile(`${FIXTURE_ROOT}/selection-v001.json`, 'utf8').then(JSON.parse),
    readFile(OLD_PLAN_PATH, 'utf8').then(JSON.parse),
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
  const lineProjection = buildPresentationSemanticLineEndProjectionV001({
    projectionId: 'voice-013-semantic-line-end-projection-v001',
    sourcePackageBinding: selection.sourcePackageBinding,
    cueEndProjectionBinding: projectionBinding,
    sourceSelectionDigest: {
      schemaVersion: selection.schemaVersion,
      artifactId: selection.selectionId,
      fileSha256: HASH,
      canonicalSha256: HASH,
    },
    producerJobBinding,
    sourcePackage,
    selection,
    cueEndProjection: projection,
  }).projection;
  const artifact = buildPresentationCaptionInstructionArtifactV001({
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
  }).artifact;
  const artifactBinding = binding(artifact.schemaVersion, 'voice-013/instruction');
  const layout = buildPresentationRendererLineLayoutV001({
    layoutId: 'voice-013-line-layout-v001',
    instructionArtifactBinding: artifactBinding,
    instructionArtifact: artifact,
    meaningPackage,
    lineEndProjection: lineProjection,
    lineEndSourcePackage: sourcePackage,
    maxLogicalWidth: 36,
    maxLines: 2,
    lineLayoutRules: lineRules,
  });
  assert.equal(layout.status, 'built');
  return {
    artifact,
    artifactBinding,
    layout: layout.layout,
    meaningPackage,
    oldPlan,
    sourcePackage,
    lineProjection,
  };
};

const titleFixture = async (profileId, width) => {
  const meaningPackage = JSON.parse(await readFile(TITLE_MEANING_PATH, 'utf8'));
  const artifact = buildPresentationTitleInstructionArtifactV001({
    artifactId: `${profileId}-instruction-v001`,
    sourceCaseId: profileId,
    meaningInformationPackageBinding: binding(meaningPackage.schemaVersion, 'title-meaning'),
    producerJobBinding,
    styleProfileId: profileId,
    displayFrameRange: {startFrame: 0, endFrameExclusive: 180},
    meaningPackage,
  }).artifact;
  const result = buildPresentationRendererLineLayoutV001({
    layoutId: `${profileId}-line-layout-v001`,
    instructionArtifactBinding: binding(artifact.schemaVersion, `${profileId}-instruction`),
    instructionArtifact: artifact,
    meaningPackage,
    maxLogicalWidth: width,
    maxLines: 2,
    lineLayoutRules: lineRules,
  });
  assert.equal(result.status, 'built');
  return result.layout;
};

test('PRL001 一行に収まるcaptionを一行にする', async () => {
  const base = await captionFixture();
  const artifact = structuredClone(base.artifact);
  artifact.instructions = [artifact.instructions[0]];
  artifact.instructions[0].content.text = 'マジ';
  artifact.instructions[0].targetProvenance.atomOccurrenceIds =
    artifact.instructions[0].targetProvenance.atomOccurrenceIds.slice(0, 2);
  const lineProjection = structuredClone(base.lineProjection);
  lineProjection.captions[0].cues[0].cueEndBoundaryId =
    base.sourcePackage.reconstructionMap.captions[0].boundaries[1].boundaryId;
  lineProjection.captions[0].cues[0].lineEndBoundaryIds = [
    base.sourcePackage.reconstructionMap.captions[0].boundaries[1].boundaryId,
  ];
  const result = buildPresentationRendererLineLayoutV001({
    layoutId: 'short-caption-layout-v001',
    instructionArtifactBinding: base.artifactBinding,
    instructionArtifact: artifact,
    meaningPackage: base.meaningPackage,
    lineEndProjection: lineProjection,
    lineEndSourcePackage: base.sourcePackage,
    maxLogicalWidth: 36,
    maxLines: 2,
    lineLayoutRules: lineRules,
  });
  assert.equal(result.status, 'built');
  assert.equal(result.layout.entries[0].lines.length, 1);
  assert.equal(result.layout.entries[0].lines[0].text, 'マジ');
});

test('PRL002 voice-013 cue 1をboundary 17へ分け同点18をordinalで退ける', async () => {
  const {layout} = await captionFixture();
  assert.deepEqual(layout.entries[0].lines.map(row => row.sourceUnitIds.at(-1)), [
    'atom-occurrence-000017', 'atom-occurrence-000034',
  ]);
  assert.deepEqual(layout.entries[0].lines.map(row => row.logicalWidth), [31, 32]);
});

test('PRL003 voice-013 cue 2/3を51/85へ分ける', async () => {
  const {layout} = await captionFixture();
  assert.deepEqual(layout.entries.slice(1).map(entry => entry.lines[0].sourceUnitIds.at(-1)), [
    'atom-occurrence-000051', 'atom-occurrence-000085',
  ]);
  assert.deepEqual(layout.entries.slice(1).map(entry => entry.lines.map(row => row.logicalWidth)), [
    [32, 33], [33, 32],
  ]);
});

test('PRL004 3 cueのline text・atom集合・論理幅が旧plan projectionとbyte一致', async () => {
  const {layout, oldPlan} = await captionFixture();
  const current = layout.entries.map(entry => entry.lines.map(line => ({
    text: line.text,
    logicalWidth: line.logicalWidth,
    atomOccurrenceIds: line.sourceUnitIds,
  })));
  const oracle = oldPlan.captionDisplays[0].cues.map(cue => cue.lines.map(line => ({
    text: line.text,
    logicalWidth: line.logicalWidth,
    atomOccurrenceIds: line.atomOccurrenceIds,
  })));
  assert.deepEqual(Buffer.from(JSON.stringify(current)), Buffer.from(JSON.stringify(oracle)));
});

test('PRL005 title landscape v009を一行で再現', async () => {
  const layout = await titleFixture('zevo-title-normal-landscape-top-v004', 42);
  assert.deepEqual(layout.entries[0].lines.map(line => line.text), [
    '片付けの「やりかけ癖」を語るマリン船長',
  ]);
});

test('PRL006 title vertical v009を11/8 code pointの二行で再現', async () => {
  const layout = await titleFixture('zevo-title-vertical-short-top-v004', 22);
  assert.deepEqual(layout.entries[0].lines.map(line => [line.text, [...line.text].length]), [
    ['片付けの「やりかけ癖」', 11],
    ['を語るマリン船長', 8],
  ]);
});

test('PRL007 有効partition 0件・maxLines超過・unit欠落重複をreject', async () => {
  const base = await captionFixture();
  const impossible = buildPresentationRendererLineLayoutV001({
    layoutId: 'impossible-layout-v001',
    instructionArtifactBinding: base.artifactBinding,
    instructionArtifact: base.artifact,
    meaningPackage: base.meaningPackage,
    lineEndProjection: base.lineProjection,
    lineEndSourcePackage: base.sourcePackage,
    maxLogicalWidth: 1,
    maxLines: 1,
    lineLayoutRules: lineRules,
  });
  assert.equal(impossible.primaryCode, 'LINE_LAYOUT_NO_VALID_PARTITION');
  const invalid = structuredClone(base.layout);
  invalid.entries[0].lines[1].sourceUnitIds[0] = invalid.entries[0].lines[0].sourceUnitIds[0];
  assert.equal(validatePresentationRendererLineLayoutV001(invalid, {
    instructionArtifact: base.artifact,
  }).primaryCode, 'LINE_LAYOUT_INPUT_INVALID');
});

test('PRL008 乱数・係数・旧selection読取・均衡再選択0件', async () => {
  const source = await readFile(
    'evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs',
    'utf8',
  );
  assert.equal(/Math\.random|randomUUID|coefficient|weighting|selectionBinding|enumerateBreaks|compareTuple/u.test(source), false);
  assert.equal((source.match(/const buildCaptionLines/gu) ?? []).length, 1);
  assert.equal((source.match(/const buildTitleLines/gu) ?? []).length, 1);
});

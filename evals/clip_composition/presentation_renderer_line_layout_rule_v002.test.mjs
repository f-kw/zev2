import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationInstructionArtifactBindingV002,
} from './presentation_instruction_artifact_v002.mjs';
import {
  buildPresentationRendererLineLayoutV002,
  decodePresentationRendererLineLayoutV002,
  serializePresentationRendererLineLayoutV002,
  validatePresentationRendererLineLayoutV002,
} from './presentation_renderer_line_layout_rule_v002.mjs';
import {
  buildActualCandidateInstructionFixtureV002,
  sha256FixtureBytesV001,
} from './presentation_instruction_timeline_v003_fixture_v001.mjs';

const buildFixture = async () => {
  const source = await buildActualCandidateInstructionFixtureV002();
  const instructionArtifactBinding = buildPresentationInstructionArtifactBindingV002({
    path: 'out/presentation-instruction-v002.json',
    artifact: source.artifact,
  });
  const result = buildPresentationRendererLineLayoutV002({
    layoutId: 'candidate-horror-claim-to-speed-up-line-layout-v002',
    instructionArtifactBinding,
    instructionArtifact: source.artifact,
    meaningPackage: source.meaningPackage,
    lineEndProjection: source.lineProjection,
    lineEndSourcePackage: source.sourcePackage,
    maxLogicalWidth: 100,
    maxLines: 2,
    lineLayoutRules: {
      'speech-caption': 'semantic-line-end-projection-v001',
      title: 'greedy-code-point-v001',
    },
  });
  assert.equal(result.status, 'built', JSON.stringify(result));
  return {...source, layout: result.layout};
};

test('PRL2-001 実候補2区間をinstruction v002から同順序で行配置する', async () => {
  const {artifact, layout} = await buildFixture();
  assert.equal(layout.schemaVersion, 'presentation-renderer-line-layout-v002');
  assert.deepEqual(layout.entries.map(row => row.instructionId),
    artifact.instructions.map(row => row.instructionId));
  assert.deepEqual(layout.entries.map(row => row.lines.map(line => line.text).join('')),
    artifact.instructions.map(row => row.content.text));
});

test('PRL2-002 同一入力byte一致とdecode成立', async () => {
  const first = await buildFixture();
  const second = await buildFixture();
  const bytes = serializePresentationRendererLineLayoutV002(first.layout);
  assert.deepEqual(bytes, serializePresentationRendererLineLayoutV002(second.layout));
  assert.equal(decodePresentationRendererLineLayoutV002(bytes).status, 'decoded');
});

test('PRL2-003 instruction v001 bindingと余分fieldを拒否する', async () => {
  const {layout} = await buildFixture();
  const old = structuredClone(layout);
  old.instructionArtifactBinding.schemaVersion = 'presentation-instruction-artifact-v001';
  assert.equal(validatePresentationRendererLineLayoutV002(old).status, 'rejected');
  const extra = structuredClone(layout);
  extra.videoClockOffsetMs = 16;
  assert.equal(validatePresentationRendererLineLayoutV002(extra).status, 'rejected');
});

test('PRL2-004 旧line layout v001実装byteを不変保持する', async () => {
  assert.equal(
    sha256FixtureBytesV001(
      await readFile('evals/clip_composition/presentation_renderer_line_layout_rule_v001.mjs'),
    ),
    'd92580b3bb0ae8033225bb06b47bbf510b071ba08938c8e65998eb122b8f59a6',
  );
});

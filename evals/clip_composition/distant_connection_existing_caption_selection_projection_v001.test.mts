import assert from 'node:assert/strict';
import test from 'node:test';

import {buildFromJob} from './distant_connection_existing_caption_selection_projection_v001.mts';

const JOB = 'evals/clip_composition/jobs/presentation/'
  + 'distant-connection-existing-caption-selection-projection/'
  + 'candidate-doctor-disappearance-to-ogre-mother-v001.json';

test('既存動画で使用済みの字幕区切りを正式selectionへ完全被覆で投影する', async () => {
  const first = await buildFromJob(process.cwd(), JOB);
  const second = await buildFromJob(process.cwd(), JOB);
  assert.deepEqual(second, first);
  assert.equal(first.meaning.candidateId, 'candidate-doctor-disappearance-to-ogre-mother');
  assert.equal(first.selection.response.captions.length, 1);
  assert.equal(first.selection.response.captions[0].cues.length, 7);
  assert.equal(
    first.sourcePackage.reconstructionMap.captions[0].atomOccurrenceIds.length,
    first.meaning.atomOccurrences.length,
  );
  const lastBoundary = first.sourcePackage.reconstructionMap.captions[0].boundaries.at(-1).boundaryId;
  assert.equal(first.selection.response.captions[0].cues.at(-1).cueEndBoundaryId, lastBoundary);
});

test('正式selectionは新しい字幕判断ではなく実在する旧instruction/layoutをprovenanceに保持する', async () => {
  const built = await buildFromJob(process.cwd(), JOB);
  const bindings = built.sourcePackage.provenance.approvedContractBindings;
  assert.equal(bindings[1].schemaVersion, 'distant-connection-video-prototype-instruction-v001');
  assert.equal(bindings[2].schemaVersion, 'distant-connection-video-prototype-line-layout-v001');
  assert.match(bindings[1].path, /candidate-doctor-disappearance-to-ogre-mother/);
  assert.match(bindings[2].path, /candidate-doctor-disappearance-to-ogre-mother/);
});

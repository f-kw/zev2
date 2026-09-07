import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readJson} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {WORK, reconstructHumanRepairV001, verifyRepairScopeV001, validateHumanRepairV001} from './repair_internal_caption_human_v001.mts';
const b = await reconstructHumanRepairV001();
const human = await readJson(`${WORK}/human-boundary-review-v001/confirmed-observations.json`);
test('actual two observations reconstruct 32 captions with 30 fully unchanged', () => {
  verifyRepairScopeV001(b.old, b.core, b.changes);
  assert.deepEqual(b.changes.map(c => c.expectedTime), [{startFrame: 1723, endFrameExclusive: 1794}, {startFrame: 2673, endFrameExclusive: 2708}]);
});
for (const [name, change] of [
  ['other-caption timing', (c: any) => c.instruction.instructions[0].outputTime.startFrame++],
  ['fixed capture end', (c: any) => c.instruction.instructions[13].outputTime.endFrameExclusive++],
  ['fixed place start', (c: any) => c.instruction.instructions[14].outputTime.startFrame++],
  ['source text ID', (c: any) => c.meaning.atomOccurrences[0].sourceSegmentId++],
  ['source line end', (c: any) => c.selection.response.captions[0].cues[0].lineEndBoundaryIds[0] = c.selection.response.captions[0].cues[1].cueEndBoundaryId],
  ['base video binding', (c: any) => c.rendererJob.cropAppliedBaseMedia.baseMedia.fileSha256 = '0'.repeat(64)],
] as const) test(`reject ${name}`, () => {
  const core = structuredClone(b.core); change(core); assert.throws(() => verifyRepairScopeV001(b.old, core, b.changes));
});
for (const [name, change] of [
  ['unselected frame', (h: any) => h.observations[0].request.frame++],
  ['different media', (h: any) => h.observations[0].targetBinding.completedMediaBinding.fileSha256 = '0'.repeat(64)],
  ['different audio sample', (h: any) => h.observations[1].selectedBoundary.sourceAudioSample++],
  ['ineligible observation', (h: any) => h.observations[0].status = 'unresolved'],
] as const) test(`reject ${name}`, () => {
  const h = structuredClone(human); change(h);
  assert.throws(() => validateHumanRepairV001(h, b.parent, b.old, b.timeline, b.generation));
});

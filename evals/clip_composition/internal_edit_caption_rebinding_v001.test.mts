import test from 'node:test';
import assert from 'node:assert/strict';
import {bind, readJson, readBound, same} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadInternalContextV001, out} from './run_candidate_internal_edit_v001.mts';
import {INTERNAL_CORE_FILES} from './candidate_internal_edit_core_v001.mts';
import {rebindCaptionArtifactsV001} from './resume_internal_edit_caption_v001.mts';

const c = await loadInternalContextV001('evals/clip_composition/jobs/presentation/candidate-internal-edit/fixed-plan-v002.json');
const original: any = Object.fromEntries(await Promise.all(Object.entries(INTERNAL_CORE_FILES)
  .map(async ([key, filename]) => [key, await readJson(out(c, filename))])));
const actual = structuredClone(original.captionAdoption.displayJudgments);
for (const key of ['request', 'response', 'result']) actual[5][key].path = out(c, `caption-revision-v001/display-6-${key}.json`);
const evidence = {schemaVersion: 'test-revision-binding', path: 'test-plan.json', fileSha256: 'a'.repeat(64), canonicalSha256: 'b'.repeat(64)};
const revised = rebindCaptionArtifactsV001(original, c, evidence, actual, out(c, 'caption-revision-v001'));

test('revised caption graph references the newly serialized bytes, including pathless selection digests', () => {
  const oldHashes = new Map(Object.entries(INTERNAL_CORE_FILES).map(([key, filename]) => [bind(out(c, filename), original[key]).fileSha256, key]));
  const newHashes = new Map(Object.entries(revised.artifacts).map(([key, b]: any) => [b.fileSha256, key]));
  let references = 0, pathlessDigests = 0;
  function walk(v: any) {
    if (!v || typeof v !== 'object') return;
    if (v.fileSha256) {
      assert(!oldHashes.has(v.fileSha256), 'stale artifact hash');
      if (newHashes.has(v.fileSha256)) {
        const target: any = revised.artifacts[newHashes.get(v.fileSha256)!];
        assert.equal(v.canonicalSha256, target.canonicalSha256);
        if (v.path) assert.equal(v.path, target.path); else pathlessDigests++;
        references++;
      }
    }
    Object.values(v).forEach(walk);
  }
  Object.values(revised.core).forEach(walk);
  assert(references > 0 && pathlessDigests > 0);
});
test('actual new judgment paths replace computed default paths without changing decision bytes', () => {
  assert(same(revised.core.captionAdoption.displayJudgments, actual));
  assert(same(revised.core.timing.displayJudgments, actual));
  assert(same(revised.core.selection.response, original.selection.response));
});
test('base media, source text, cut ranges, rendered intervals, and renderer rules are not altered', () => {
  assert(same(revised.core.meaning.atomOccurrences, original.meaning.atomOccurrences));
  assert(same(revised.core.timing.cues, original.timing.cues));
  assert(same(revised.core.instruction.instructions, original.instruction.instructions));
  const job = structuredClone(revised.core.rendererJob);
  for (const key of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'publication']) job[key] = original.rendererJob[key];
  assert(same(job, original.rendererJob));
});
test('new judgment cannot be rebound to a different response payload', () => {
  const changed = structuredClone(actual); changed[5].response.fileSha256 = 'f'.repeat(64);
  assert.throws(() => rebindCaptionArtifactsV001(original, c, evidence, changed, out(c, 'caption-revision-v001')), /DISPLAY_BYTES_NOT_THE_ACTUAL_JUDGMENT/);
});
test('retained original artifacts still resolve to their original stored bytes', async () => {
  for (const [key, filename] of Object.entries(INTERNAL_CORE_FILES))
    assert(same(await readBound(bind(out(c, filename), original[key])), original[key]));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {buildDigestCaptionDisplayAdjustmentV001, assertDigestCaptionDisplayAdjustmentV001} from './digest-caption-display-adjustment-v001.js';

type Json = Record<string, any>;
const clone = <T>(value: T): T => structuredClone(value);
const frame = await import(new URL('../../evals/clip_composition/presentation_base_media_timeline_v004.mjs', import.meta.url).href);
const formal = await import(new URL('../../evals/clip_composition/presentation_output_crop_application_v001.mjs', import.meta.url).href);
const H = 'a'.repeat(64);
// Small JSON fixture: real retained atom clocks from the two approved local windows.
// It is not a user grant, byte qualification, owner, storage context, or media job.
function fixture() {
  const clock = {inputFrameRate: '60/1', decodedFrameCount: 197406, videoPresentationOffsetMs: 0};
  const mappings = [
    {segmentId: 'segment-0028', sourceStartMs: 2296093, sourceEndMs: 2368757, sourceStartFrame30: 68883,
      sourceEndFrame30: 71063, outputStartFrame: 24112, outputEndFrame: 26292},
    {segmentId: 'segment-0031', sourceStartMs: 2579190, sourceEndMs: 2795038, sourceStartFrame30: 77376,
      sourceEndFrame30: 83851, outputStartFrame: 31144, outputEndFrame: 37619},
  ];
  const specifications: [number, string, number[]][] = [
    [28, '食い止めなければ', [2325125,2325145,2325165,2325185,2325205,2325225,2325245,2325265,2325285]],
    [28, '世界が終わる', [2325285,2325305,2325325,2325345,2325365,2325385,2325405]],
    [28, 'なんか', [2325405,2325425,2325445,2325465]],
    [28, 'いい雰囲気にしないで!', [2325465,2325485,2325505,2325525,2325686,2325706,2325726,2325766,2325786,2325806,2325826,2325846]],
    [28, 'いい雰囲気に!', [2325846,2325866,2326106,2326126,2326146,2326166,2326186,2326206]],
    [28, '全ての力を合わせて', [2328027,2328167,2328187,2328707,2329308,2329328,2329608,2329628,2329908,2329928]],
    [31, 'え?', [2625618,2625878,2625898]],
    [31, '何人いるの?', [2625898,2625998,2626158,2626318,2626338,2626358,2626918]],
    [31, 'お!', [2626918,2626938,2626958]],
    [31, '早速鬼がいるんじゃねえか!', [2626958,2627098,2627118,2627399,2627519,2628199,2628219,2628239,2628399,2628619,2628639,2628899,2629260,2632061]],
  ];
  const atoms: Json[] = [], originalRows: Json[] = [];
  for (const [i, [groupOrdinal, text, times]] of specifications.entries()) {
    const mapping = mappings.find(m => m.segmentId === `segment-${String(groupOrdinal).padStart(4, '0')}`)!;
    assert.equal([...text].length + 1, times.length);
    const rowAtoms = [...text].map((t, j) => ({atomOccurrenceId: `atom-${atoms.length + j + 1}`, ordinal: atoms.length + j + 1,
      text: t, sourceSegmentId: atoms.length + j + 7000, semanticUtteranceId: `utterance-${i + 1}`,
      retainedSpans: [{timelineSegmentId: mapping.segmentId, sourceStartMs: times[j], sourceEndMs: times[j + 1]}]}));
    atoms.push(...rowAtoms);
    const sourceStartMs = times[0], sourceEndMs = times.at(-1)!, sourceStartFrame30 = frame.frameBoundaryWithVideoOffsetV001(sourceStartMs, 0);
    const sourceEndFrame30 = frame.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, clock);
    const startFrame = mapping.outputStartFrame + sourceStartFrame30 - mapping.sourceStartFrame30;
    const endFrameExclusive = mapping.outputStartFrame + sourceEndFrame30 - mapping.sourceStartFrame30;
    const atomOccurrenceIds = rowAtoms.map(a => a.atomOccurrenceId), sourceSegmentIds = rowAtoms.map(a => a.sourceSegmentId);
    const lineAtoms = i === 3 ? [rowAtoms.slice(0, 6), rowAtoms.slice(6)] : [rowAtoms];
    const lines = lineAtoms.map(as => ({lineEndBoundaryId: `boundary-${as.at(-1)!.atomOccurrenceId}`,
      text: as.map(a => a.text).join(''), atomOccurrenceIds: as.map(a => a.atomOccurrenceId), sourceSegmentIds: as.map(a => a.sourceSegmentId)}));
    originalRows.push({groupOrdinal, cueOrdinal: i + 1, candidateId: `candidate-${groupOrdinal}`, timelineSegmentId: mapping.segmentId,
      captionId: `caption-${groupOrdinal}`, cueEndBoundaryId: `boundary-${atomOccurrenceIds.at(-1)}`, lineEndBoundaryIds: lines.map(line => line.lineEndBoundaryId),
      atomOccurrenceIds, sourceSegmentIds, semanticUtteranceIds: [`utterance-${i + 1}`],
      lines,
      sourceStartMs, sourceEndMs, sourceStartFrame30, sourceEndFrame30, startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame,
      geometry: {testOnly: true, instructionId: `old-instruction-${i + 1}`}});
  }
  const originalMeaning = {schemaVersion: 'test-small-original-meaning-v001', artifactId: 'test-original',
    transcriptBinding: {path: 'test/original-transcript.json', fileSha256: H}, atomOccurrences: atoms,
    orderedCandidates: mappings.map(m => ({candidateId: `candidate-${m.segmentId}`, timelineSegmentId: m.segmentId,
      atomOccurrenceIds: atoms.filter(a => a.retainedSpans[0].timelineSegmentId === m.segmentId).map(a => a.atomOccurrenceId)})),
    captions: [{captionId: 'test-caption', atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}]};
  const by = (i: number) => [...originalRows[i].atomOccurrenceIds];
  const declaredChanges = [
    {changeId: 'world-local-display-design', kind: 'display-span', timelineSegmentId: 'segment-0028', from: clone(originalRows.slice(1, 5)), to: [
      {atomOccurrenceIds: by(1), startFrame: 24988, endFrameExclusive: 25020, sourceStartMs: 2325285, sourceEndMs: 2326367},
      {atomOccurrenceIds: by(2), startFrame: 25020, endFrameExclusive: 25029, sourceStartMs: 2326367, sourceEndMs: 2326667},
      {atomOccurrenceIds: by(3), startFrame: 25029, endFrameExclusive: 25056, sourceStartMs: 2326667, sourceEndMs: 2327567},
      {atomOccurrenceIds: by(4), startFrame: 25056, endFrameExclusive: 25070, sourceStartMs: 2327567, sourceEndMs: 2328027},
    ]},
    {changeId: 'oh-natural-merge', kind: 'merge-only', timelineSegmentId: 'segment-0031', from: clone(originalRows.slice(7, 9)), to: [
      {atomOccurrenceIds: [...by(7), ...by(8)], startFrame: 32545, endFrameExclusive: 32577},
    ]},
  ];
  const bindings = {originalMeaningBinding: {path: 'test/original-meaning.json', fileSha256: H,
    canonicalSha256: formal.canonicalSha256PresentationOutputFiniteJsonV001(originalMeaning)},
    originalCandidateManifestBinding: {path: 'test/original-candidate.json', fileSha256: H},
    originalCorrespondenceBinding: {path: 'test/original-correspondence.json', fileSha256: H},
    originalClockBinding: {path: 'test/original-clock.json', fileSha256: H}};
  return {originalMeaning, originalRows, mappings, sourceFrameClock: clock, declaredChanges, bindings};
}
async function complete() {
  const params = fixture(), built = await buildDigestCaptionDisplayAdjustmentV001(params);
  const replacements = new Map([[1, {count: 4, cues: built.adoption.derivedCues.filter(c => c.kind === 'display-span')}],
    [7, {count: 2, cues: built.adoption.derivedCues.filter(c => c.kind === 'merge-only')}] ]);
  const candidateRows: Json[] = [];
  for (let i = 0; i < params.originalRows.length;) {
    const replacement = replacements.get(i);
    if (!replacement) {candidateRows.push(clone(params.originalRows[i++])); continue;}
    for (const cue of replacement.cues) {
      const atomOccurrenceIds = cue.atomOccurrenceIds, end = `boundary-${atomOccurrenceIds.at(-1)}`;
      const {changeId: _id, kind: _kind, ...body} = cue;
      const old = params.originalRows.find(row => JSON.stringify(row.atomOccurrenceIds) === JSON.stringify(atomOccurrenceIds));
      candidateRows.push({...clone(body), cueEndBoundaryId: end, lineEndBoundaryIds: old ? clone(old.lineEndBoundaryIds) : [end],
        lines: old ? clone(old.lines) : [{lineEndBoundaryId: end, text: cue.text, atomOccurrenceIds, sourceSegmentIds: cue.sourceSegmentIds}]});
    }
    i += replacement.count;
  }
  candidateRows.forEach((row, i) => {row.globalCueOrdinal = i + 1; row.cueOrdinal = i + 1;});
  return {...params, ...built, candidateRows};
}
test('real local frame-clock bridge keeps original STT data and source edge while accepting the declared design', async () => {
  const input = await complete(), originalSnapshot = clone(input.originalMeaning), rowSnapshot = clone(input.originalRows);
  await assertDigestCaptionDisplayAdjustmentV001(input);
  assert.deepEqual(input.originalMeaning, originalSnapshot); assert.deepEqual(input.originalRows, rowSnapshot);
  assert.deepEqual(input.adoption.derivedCues.map(c => c.displayFrameCount), [32, 9, 27, 14, 32]);
  assert.equal(input.adoption.derivedCues[0].sourceStartMs, 2325285);
  assert.equal(input.adoption.derivedCues[3].sourceEndMs, 2328027);
  assert.equal(input.adoption.derivedCues[4].text, '何人いるの?お!');
  const originalAtoms = new Map(input.originalMeaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  for (const atom of input.derivedMeaning.atomOccurrences) {
    const old: any = originalAtoms.get(atom.atomOccurrenceId);
    const isDisplay = input.adoption.derivedCues.some(c => c.kind === 'display-span' && c.atomOccurrenceIds.includes(atom.atomOccurrenceId));
    assert.deepEqual({...atom, retainedSpans: old.retainedSpans}, old);
    if (!isDisplay) assert.deepEqual(atom, old);
  }
});
test('all changed cue atoms share a display span, not evenly divided acoustic estimates', async () => {
  const input = await complete();
  for (const cue of input.adoption.derivedCues.filter(c => c.kind === 'display-span')) {
    const selected = input.derivedMeaning.atomOccurrences.filter((a: Json) => cue.atomOccurrenceIds.includes(a.atomOccurrenceId));
    assert(selected.every((a: Json) => JSON.stringify(a.retainedSpans) === JSON.stringify(selected[0].retainedSpans)));
  }
});
test('an omitted explicit adjacent source end selects the exact original next-cue boundary', async () => {
  const params = fixture(); delete (params.declaredChanges[0].to[3] as Json).sourceEndMs;
  const built = await buildDigestCaptionDisplayAdjustmentV001(params); assert.equal(built.adoption.derivedCues[3].sourceEndMs, 2328027);
});
test('a guessed 6ms-later source end is rejected even though it maps to the same frame', async () => {
  const params = fixture(); (params.declaredChanges[0].to[3] as Json).sourceEndMs = 2328033;
  await assert.rejects(buildDigestCaptionDisplayAdjustmentV001(params), /MS_ANCHOR_INVALID/);
});
const mutations: [string, (input: Json) => void, RegExp][] = [
  ['missing candidate cue', p => p.candidateRows.pop(), /CANDIDATE_COUNT_INVALID/],
  ['candidate atom substitution', p => p.candidateRows[1].atomOccurrenceIds[0] = 'other-atom', /CANDIDATE_ROW_MISMATCH/],
  ['candidate source ID substitution', p => p.candidateRows[1].sourceSegmentIds[0] = 999999, /CANDIDATE_ROW_MISMATCH/],
  ['candidate text mutation', p => p.candidateRows[1].lines[0].text = '世界が変わる', /ROW_TEXT_INVALID|CANDIDATE_TEXT_MISMATCH/],
  ['non-target meaning clock mutation', p => p.derivedMeaning.atomOccurrences[0].retainedSpans[0].sourceEndMs += 1, /MEANING_MISMATCH/],
  ['non-target meaning metadata mutation', p => p.derivedMeaning.atomOccurrences[0].semanticUtteranceId = 'other', /MEANING_MISMATCH/],
  ['non-target row clock mutation', p => p.candidateRows[0].endFrameExclusive += 1, /CANDIDATE_ROW_MISMATCH/],
  ['non-target line-boundary mutation', p => p.candidateRows[0].lineEndBoundaryIds[0] = 'other', /NON_TARGET_ROW_CHANGED/],
  ['display-only target line-boundary mutation', p => p.candidateRows[3].lineEndBoundaryIds[0] = 'other', /NON_TARGET_ROW_CHANGED/],
  ['adoption original binding substitution', p => p.adoption.bindings.originalClockBinding.fileSha256 = 'b'.repeat(64), /ADOPTION_MISMATCH/],
  ['adoption interpretation substitution', p => p.adoption.timingInterpretation = 'new-acoustic-clock', /ADOPTION_MISMATCH/],
  ['saved adoption derivation substitution', p => p.adoption.derivedCues[0].startFrame--, /ADOPTION_MISMATCH/],
];
for (const [name, mutate, error] of mutations) test(name + ' is rejected', async () => {
  const input = await complete(); mutate(input); await assert.rejects(assertDigestCaptionDisplayAdjustmentV001(input), error);
});
const buildMutations: [string, (params: Json) => void, RegExp][] = [
  ['missing target atoms', p => p.declaredChanges[0].to[0].atomOccurrenceIds.pop(), /TARGET_COVERAGE_INVALID/],
  ['from snapshot alteration', p => p.declaredChanges[0].from[0].sourceStartMs++, /FROM_ROW_MISMATCH/],
  ['overlapping display cues', p => {p.declaredChanges[0].to[1].startFrame = 25019; p.declaredChanges[0].to[1].sourceStartMs = 2326333;}, /OVERLAP/],
  ['out-of-block output frame', p => p.declaredChanges[0].to[0].startFrame = 1, /WINDOW_INVALID/],
  ['crossing the next protected cue', p => p.declaredChanges[0].to[3].endFrameExclusive = 25071, /WINDOW_INVALID/],
  ['merge-only clock extension', p => p.declaredChanges[1].to[0].endFrameExclusive = 32576, /FRAME_ROUNDTRIP_INVALID/],
  ['unknown operation mode', p => p.declaredChanges[0].kind = 'new-token-clock', /KIND_INVALID/],
  ['absolute original binding path', p => p.bindings.originalMeaningBinding.path = '/tmp/unbound.json', /BINDING_PATH_INVALID/],
  ['original meaning binding alteration', p => p.bindings.originalMeaningBinding.canonicalSha256 = 'b'.repeat(64), /ORIGINAL_MEANING_BINDING_MISMATCH/],
  ['original row input text mismatch', p => p.originalRows[0].lines[0].text = '別の本文', /ORIGINAL_TEXT_INVALID/],
];
for (const [name, mutate, error] of buildMutations) test(name + ' is rejected before a derived value is returned', async () => {
  const params = fixture(); mutate(params); await assert.rejects(buildDigestCaptionDisplayAdjustmentV001(params), error);
});

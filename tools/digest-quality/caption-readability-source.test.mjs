import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {
  createOrchestrationProjectionV001, projectCaptionPlanV001,
} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {buildReadabilitySourceAtomsV001} from './caption-readability-source.mjs';

const bytes = value => JSON.stringify(value) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
function fixture({offsetMs = 0} = {}) {
  const mediaRef = {path: '/synthetic/base-media.mp4', fileSha256: 'a'.repeat(64)};
  const baseTimeline = {
    schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'timeline-source-test',
    sourceProvenance: 'synthetic-test', sourceRef: 'source-test',
    sourceFrameClock: {inputFrameRate: '60/1', logicalFrameRate: '30/1',
      extractionRuleId: 'source-frame-60fps-global-even-v001', decodedFrameCount: 300,
      containerStartTimeMs: 0, videoStreamTimeBase: '1/1000', videoFirstPts: offsetMs,
      videoPtsStep: 17, videoPresentationOffsetMs: offsetMs},
    baseMedia: {artifactId: 'base-test', path: 'base-media.mp4', fileSha256: mediaRef.fileSha256,
      frameRate: '30/1', expectedFrameCount: 60},
    segments: [1, 3].map((seconds, i) => ({segmentId: `segment-000${i + 1}`,
      sourceStartMs: seconds * 1000 + offsetMs, sourceEndMs: (seconds + 1) * 1000 + offsetMs,
      sourceStartFrame30: seconds * 30, sourceEndFrame30: (seconds + 1) * 30,
      outputStartFrame: i * 30, outputEndFrame: (i + 1) * 30})),
  };
  const atom = (id, text, sourceSegmentId, segment, ranges) => ({
    atomOccurrenceId: id, ordinal: sourceSegmentId, text, sourceSegmentId,
    semanticUtteranceId: 'utterance-' + segment,
    retainedSpans: ranges.map(([start, end]) => ({timelineSegmentId: 'segment-000' + segment,
      sourceStartMs: start + offsetMs, sourceEndMs: end + offsetMs})),
  });
  const meaning = {atomOccurrences: [
    atom('atom-a', 'あ', 1, 1, [[1000, 1001]]),
    atom('atom-b', 'い', 2, 1, [[1001, 1600]]),
    atom('atom-c', 'う', 3, 1, [[1700, 1800], [1900, 2000]]),
    atom('atom-d', '猫', 4, 2, [[3000, 4000]]),
  ]};
  const sourcePlan = {schemaVersion: 'presentation-output-common-core-plan-v001', format: 'normal-landscape',
    canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}},
    elements: [['あいう', ['atom-a', 'atom-b', 'atom-c']], ['猫', ['atom-d']]].map(([text, ids], i) => ({
      instructionId: 'caption-' + (i + 1), kind: 'speech-caption', text,
      startFrame: i * 30, endFrameExclusive: (i + 1) * 30, displayFrameCount: 30,
      targetProvenance: {targetRefId: 'meaning-caption', targetType: 'semantic-caption', sourceAtomIds: ids},
    }))};
  const sourcePlanBytes = bytes(sourcePlan), baseTimelineBytes = bytes(baseTimeline);
  const projection = createOrchestrationProjectionV001({digestRef: {version: 'source-test', sha256: 'b'.repeat(64)},
    planRef: {path: '/synthetic/plan.json', fileSha256: hash(sourcePlanBytes)},
    timelineRef: {path: '/synthetic/timeline.json', fileSha256: hash(baseTimelineBytes)},
    mediaRef, planBytes: sourcePlanBytes, timelineBytes: baseTimelineBytes,
    playbackSampleRate: 44100, observationSampleRate: 16000,
    connections: [{connectionId: 'connection-01', preset: 'black-separator', presetVersion: 'v001'}],
  });
  const finalPlan = structuredClone(projectCaptionPlanV001({projection, planBytes: sourcePlanBytes}).plan);
  return {finalPlan, meaning, baseTimeline, projection, sourcePlanBytes, baseTimelineBytes};
}

test('source projection preserves zero-frame atoms, multiple spans, gaps and exclusive connection ends', () => {
  const input = fixture(), original = structuredClone(input), result = buildReadabilitySourceAtomsV001(input);
  assert.deepEqual(input, original);
  assert.deepEqual(result.captions.map(c => [c.startFrame, c.endFrameExclusive]), [[0, 30], [42, 72]]);
  assert.deepEqual(result.captions[0].atoms.map(a => [a.startFrame, a.endFrameExclusive]), [[0, 0], [0, 18], [21, 30]]);
  assert.deepEqual(result.captions[0].atoms[2].sourceSpans.map(s => [s.startFrame, s.endFrameExclusive]), [[21, 24], [27, 30]]);
  assert.deepEqual(result.captions[0].internalBoundaries.map(b => [b.atomEndIndexExclusive, b.boundaryFrame]), [[1, 0], [2, 21]]);
  assert.equal(result.captions[0].internalBoundaries[1].boundaryFrame, 21, 'right atom start, not left end 18 or proportional 20');
  assert(Object.isFrozen(result.captions[0].atoms[2].sourceSpans));
});

test('source video presentation offset is applied by the existing clock rule', () => {
  const normal = buildReadabilitySourceAtomsV001(fixture());
  const shifted = buildReadabilitySourceAtomsV001(fixture({offsetMs: 100}));
  assert.deepEqual(shifted.captions.map(c => c.atoms.map(a => [a.startFrame, a.endFrameExclusive])),
    normal.captions.map(c => c.atoms.map(a => [a.startFrame, a.endFrameExclusive])));
  assert.equal(shifted.captions[0].atoms[0].sourceSpans[0].sourceStartMs, 1100);
});

test('JSON reread and a separate Node process reproduce the exact same adapter result', () => {
  const input = fixture(), expected = buildReadabilitySourceAtomsV001(input);
  assert.deepEqual(buildReadabilitySourceAtomsV001(JSON.parse(JSON.stringify(input))), expected);
  const moduleUrl = new URL('./caption-readability-source.mjs', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import {readFileSync} from 'node:fs'; import {buildReadabilitySourceAtomsV001} from ${JSON.stringify(moduleUrl)};
     process.stdout.write(JSON.stringify(buildReadabilitySourceAtomsV001(JSON.parse(readFileSync(0,'utf8')))));`],
  {input: JSON.stringify(input), encoding: 'utf8'});
  assert.deepEqual(JSON.parse(output), expected);
});

for (const [name, alter] of [
  ['missing original byte binding', x => {delete x.sourcePlanBytes;}],
  ['altered saved plan bytes', x => {x.sourcePlanBytes += ' ';}],
  ['parsed timeline changed', x => {x.baseTimeline.segments[0].sourceStartMs++;}],
  ['projection hash changed', x => {x.projection = structuredClone(x.projection); x.projection.retainedSpans[1].shiftFrames++;}],
  ['caption timing changed', x => {x.finalPlan.elements[0].endFrameExclusive--;}],
  ['caption text changed', x => {x.finalPlan.elements[0].text += '変更';}],
  ['caption atom identity changed', x => {x.finalPlan.elements[0].targetProvenance.sourceAtomIds.reverse();}],
  ['caption omitted', x => {x.finalPlan.elements.pop();}],
  ['source atom text changed', x => {x.meaning.atomOccurrences[1].text = '別';}],
  ['source atom duplicated', x => {x.meaning.atomOccurrences.push(structuredClone(x.meaning.atomOccurrences[0]));}],
  ['source atom omitted', x => {x.meaning.atomOccurrences.pop();}],
  ['source atom order changed', x => {x.meaning.atomOccurrences.reverse();}],
  ['source span has wrong segment', x => {x.meaning.atomOccurrences[0].retainedSpans[0].timelineSegmentId = 'segment-0002';}],
  ['source span has no positive source time', x => {x.meaning.atomOccurrences[0].retainedSpans[0].sourceEndMs = 1000;}],
  ['source span crosses retained input', x => {x.meaning.atomOccurrences[0].retainedSpans[0].sourceStartMs = 900;}],
  ['multiple source spans run backward', x => {x.meaning.atomOccurrences[2].retainedSpans.reverse();}],
  ['source atoms overlap', x => {x.meaning.atomOccurrences[2].retainedSpans[0].sourceStartMs = 1500;}],
  ['source outer clock changed', x => {x.meaning.atomOccurrences[3].retainedSpans[0].sourceEndMs = 3900;}],
]) test('rejects ' + name, () => {
  const input = fixture(); alter(input);
  assert.throws(() => buildReadabilitySourceAtomsV001(input));
});

test('saved 326 captions retain all 4124 atoms, existing zero-frame atoms and exact final clocks', async t => {
  const root = new URL('../../', import.meta.url);
  const runtime = new URL('runtime/artifacts/digest-new-material-20260926-v001/', root);
  const read = async url => JSON.parse(await readFile(url, 'utf8'));
  let drawing;
  try { drawing = await read(new URL('presentation/drawing-evidence.json', runtime)); }
  catch (error) {
    if (error.code === 'ENOENT') {t.skip('saved local Digest fixture is unavailable'); return;}
    throw error;
  }
  const finalPlan = await read(new URL('evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-render-plan-v002.json', root));
  const input = {finalPlan, meaning: await read(new URL('caption-attempt-003/meaning-input.json', runtime)),
    baseTimeline: JSON.parse(drawing.source.timelineBytes),
    projection: await read(new URL('presentation/background/projection.json', runtime)),
    sourcePlanBytes: drawing.source.planBytes, baseTimelineBytes: drawing.source.timelineBytes};
  const snapshot = structuredClone(input), result = buildReadabilitySourceAtomsV001(input);
  assert.deepEqual(input, snapshot);
  assert.equal(result.captions.length, 326);
  const atoms = result.captions.flatMap(c => c.atoms);
  assert.equal(atoms.length, 4124);
  assert.equal(atoms.filter(a => a.startFrame === a.endFrameExclusive).length, 196);
  result.captions.forEach((c, i) => {
    assert.equal(c.captionId, finalPlan.elements[i].instructionId);
    assert.equal(c.text, finalPlan.elements[i].text);
    assert.deepEqual([c.startFrame, c.endFrameExclusive],
      [finalPlan.elements[i].startFrame, finalPlan.elements[i].endFrameExclusive]);
    c.internalBoundaries.forEach(b => assert.equal(b.boundaryFrame, c.atoms[b.atomEndIndexExclusive].startFrame));
  });
});

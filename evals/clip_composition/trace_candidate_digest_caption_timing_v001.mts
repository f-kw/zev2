import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';
import {speechRange} from '../../runner/src/transcript-utils.js';

const root = process.cwd();
const old = 'evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002';
const output = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001';
const refs: any[] = [];
async function read(p: string) {
  const bytes = await readFile(path.resolve(root, p));
  refs.push({path: path.relative(root, path.resolve(root, p)), bytes: bytes.length,
    fileSha256: createHash('sha256').update(bytes).digest('hex')});
  return JSON.parse(bytes.toString());
}
const m = await read(`${old}/manifest.json`);
const plan = await read(m.planBinding.path);
const transcript = await read(plan.request.transcript.path);
const summary = await read(path.join(path.dirname(plan.request.transcript.path), 'local-stt-response.raw.json'));
const meaning = await read(`${old}/meaning-input.json`);
const instruction = await read(`${old}/instruction.json`);
const timeline = await read(`${old}/base-media/timeline.json`);
const generation = await read(`${old}/base-media/generation-manifest.json`);
const edit = await read(`${old}/edit-plan.json`);
const rendererJob = await read(`${old}/renderer-job.json`);
const execution = await read(`${old}/renderer-result.json`);
assert.equal(refs.find(r => r.path === `${old}/instruction.json`).fileSha256, rendererJob.instructionArtifactBinding.fileSha256);
assert.equal(refs.find(r => r.path === `${old}/renderer-job.json`).fileSha256, execution.rendererJobBinding.fileSha256);
assert.equal(execution.exitCode, 0);
assert.equal(execution.result.qc.status, 'passed');
const bySource = new Map<number, any>(transcript.segments.map((s: any) => [s.id, s]));
const byAtom = new Map<string, any>(meaning.atomOccurrences.map((a: any) => [a.atomOccurrenceId, a]));
const selectedIds = new Set<number>(edit.segments.flatMap((s: any) => s.sourceSegmentIds));
const rawTrace: any[] = [];
let offset = 0;
for (const chunk of summary.chunks) {
  const end = offset + chunk.segmentCount;
  if ([...selectedIds].some(id => offset < id && id <= end)) {
    const raw = await read(chunk.rawResponsePath);
    assert.equal(raw.segments.length, chunk.segmentCount);
    for (const [index, atom] of raw.segments.entries()) {
      const id = offset + index + 1;
      if (!selectedIds.has(id)) continue;
      const source = bySource.get(id);
      assert.deepEqual([source.text, source.startMs, source.endMs],
        [atom.text, chunk.startMs + atom.startMs, chunk.startMs + atom.endMs]);
      rawTrace.push({sourceSegmentId: id, chunkIndex: chunk.index, rawSegmentId: atom.id,
        text: atom.text, chunkStartMs: chunk.startMs, rawStartMs: atom.startMs,
        rawEndMs: atom.endMs, sourceStartMs: source.startMs, sourceEndMs: source.endMs});
    }
  }
  offset = end;
}
assert.equal(rawTrace.length, selectedIds.size);
const rangeTrace = edit.segments.map((s: any, i: number) => {
  assert.deepEqual(speechRange(transcript, s.sourceSegmentIds),
    {sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs});
  const g = generation.segments[i];
  assert.deepEqual([s.segmentId, s.sourceStartMs, s.sourceEndMs], [g.segmentId, g.sourceStartMs, g.sourceEndMs]);
  const rate = generation.audio.sampleRate;
  const clockOffsetSamples = Math.round(timeline.sourceFrameClock.videoPresentationOffsetMs * rate / 1000);
  assert.equal(g.audioSamples.sourceStart, clockOffsetSamples + g.sourceStartFrame30 * rate / 30);
  assert.equal(g.audioSamples.outputStart, g.outputStartFrame * rate / 30);
  return {...g, sourceClockOffsetSamples: clockOffsetSamples};
});
const cues = instruction.instructions.map((cue: any) => {
  const atoms = cue.targetProvenance.atomOccurrenceIds.map((id: string) => byAtom.get(id));
  const first = atoms[0].retainedSpans[0], last = atoms.at(-1).retainedSpans.at(-1);
  assert(atoms.every((a: any) => a.retainedSpans.length === 1 && a.retainedSpans[0].timelineSegmentId === first.timelineSegmentId));
  for (const a of atoms) {
    const s = bySource.get(a.sourceSegmentId), span = a.retainedSpans[0];
    assert.deepEqual([a.text, span.sourceStartMs, span.sourceEndMs], [s.text, s.startMs, s.endMs]);
  }
  const projected = mapPresentationSourceIntervalV002(timeline, first.sourceStartMs, last.sourceEndMs);
  assert.equal(projected.status, 'passed');
  assert.deepEqual(cue.outputTime, {startFrame: projected.mapping.startFrame, endFrameExclusive: projected.mapping.endFrameExclusive});
  const g = generation.segments.find((s: any) => s.segmentId === first.timelineSegmentId);
  const rate = generation.audio.sampleRate;
  const boundary = (ms: number, frame: number) => ({sourceMs: ms, rendererFrame: frame,
    audioOutputMs: (g.audioSamples.outputStart - g.audioSamples.sourceStart) * 1000 / rate + ms,
    captionMinusAudioMs: frame * 1000 / 30 - ((g.audioSamples.outputStart - g.audioSamples.sourceStart) * 1000 / rate + ms)});
  return {instructionId: cue.instructionId, text: cue.content.text,
    sourceSegmentIds: atoms.map((a: any) => a.sourceSegmentId),
    timelineSegmentId: first.timelineSegmentId,
    start: boundary(first.sourceStartMs, cue.outputTime.startFrame),
    end: boundary(last.sourceEndMs, cue.outputTime.endFrameExclusive),
    displayedMs: (cue.outputTime.endFrameExclusive - cue.outputTime.startFrame) * 1000 / 30};
});
const residuals = cues.flatMap((c: any) => [c.start.captionMinusAudioMs, c.end.captionMinusAudioMs]);
const evidence = {schemaVersion: 'candidate-digest-caption-timing-trace-v001',
  status: 'saved-timing-transport-matches', instruction: 'ZEV進行管理２ 指示-002',
  checks: {selectedSourceAtoms: selectedIds.size, rawSourceExact: true, candidateRangeExact: true,
    sourceToCaptionInputExact: true, projectionToRendererExact: true, sourceAudioGridExact: true,
    captionCount: cues.length, boundaryCount: residuals.length,
    minimumCaptionMinusAudioMs: Math.min(...residuals), maximumCaptionMinusAudioMs: Math.max(...residuals)},
  interpretation: '保存済みSTTの時刻は変換で壊れていない。音声と語の実際の同期精度はこの照合では保証できない。',
  sourceBindings: refs, ranges: rangeTrace, sourceTimingTrace: rawTrace, cues};
await mkdir(path.resolve(root, output), {recursive: true});
await writeFile(path.resolve(root, output, 'caption-timing-trace-v001.json'), JSON.stringify(evidence, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify(evidence.checks));

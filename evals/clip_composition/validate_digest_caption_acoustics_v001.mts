import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateAcousticChunkV001, resolveAcousticCueV001, retainUnresolvedTimingV001} from './digest_acoustic_timing_validation_v001.mts';

const output = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001';
const refs: any[] = [];
async function read(p: string) {
  const bytes = await readFile(p);
  refs.push({path: path.relative(process.cwd(), path.resolve(p)), bytes: bytes.length,
    fileSha256: createHash('sha256').update(bytes).digest('hex')});
  return JSON.parse(bytes.toString());
}
const preflight = await read(`${output}/acoustic-preflight-v001.json`);
const preflightHash = refs[0].fileSha256;
const chunks = [];
for (const c of preflight.chunks) {
  const observed = await read(`${output}/acoustic-observation-chunk-${String(c.index).padStart(4, '0')}-v001.json`);
  assert.equal(observed.preflightBinding.fileSha256, preflightHash);
  assert.equal(observed.preflightBinding.path, path.resolve(`${output}/acoustic-preflight-v001.json`));
  chunks.push(validateAcousticChunkV001(c, observed));
}
const trace = await read(`${output}/caption-timing-trace-v001.json`);
const cues = retainUnresolvedTimingV001(trace.cues.map((cue: any) => {
  const interval = trace.ranges.find((r: any) => r.segmentId === cue.timelineSegmentId);
  assert(interval);
  const resolution = resolveAcousticCueV001(cue.sourceSegmentIds, chunks, interval, {sourceStartMs: cue.start.sourceMs, sourceEndMs: cue.end.sourceMs});
  return {instructionId: cue.instructionId, text: cue.text, timelineSegmentId: cue.timelineSegmentId,
    oldStartMs: cue.start.sourceMs, oldEndMs: cue.end.sourceMs, resolution,
    changes: resolution.status === 'resolved' ? {
      startMs: resolution.sourceStartMs! - cue.start.sourceMs,
      endMs: resolution.sourceEndMs! - cue.end.sourceMs,
    } : null};
}));
const report = {schemaVersion: 'digest-acoustic-correspondence-validation-v003',
  status: cues.every((c: any) => c.resolution.status === 'resolved') ? 'all-cue-boundaries-resolved' : 'contains-unresolved-cue-boundaries',
  interpretation: '確定本文と音響token列の一致・ID対応を検査した。人間の聴覚による同期合格を意味しない。',
  sourceBindings: refs,
  implementationBinding: {path: 'evals/clip_composition/digest_acoustic_timing_validation_v001.mts',
    fileSha256: createHash('sha256').update(await readFile('evals/clip_composition/digest_acoustic_timing_validation_v001.mts')).digest('hex')},
  counts: {chunks: chunks.length, cues: cues.length, resolved: cues.filter((c: any) => c.resolution.status === 'resolved').length,
    partial: cues.filter((c: any) => c.resolution.status === 'partial').length,
    unresolved: cues.filter((c: any) => c.resolution.status === 'unresolved').length},
  chunks, cues};
await writeFile(`${output}/acoustic-correspondence-validation-v003.json`, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({status: report.status, ...report.counts,
  unresolved: cues.filter((c: any) => c.resolution.status !== 'resolved').map((c: any) => ({text: c.text, resolution: c.resolution})),
  corrected: cues.filter((c: any) => c.resolution.status === 'resolved').map((c: any) => ({text: c.text, old: [c.oldStartMs, c.oldEndMs], measured: [c.resolution.observedStartMs, c.resolution.observedEndMs], changes: c.changes}))}, null, 2));

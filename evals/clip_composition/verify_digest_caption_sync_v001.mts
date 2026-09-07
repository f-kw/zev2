import assert from 'node:assert/strict';
import path from 'node:path';
import {readdir, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, pass} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';

const prior = 'evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002';
const output = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/sync-render-v001';
const final = await readJson(`${output}/render-manifest.json`);
const timing = await readBound(final.timingAdoption);
for (const b of timing.implementationBindings) assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);
assert.equal(await fileSha(path.join(ROOT, timing.observationValidation.path)), timing.observationValidation.fileSha256);
assert.equal(await fileSha(path.join(ROOT, timing.runtimeExecution.path)), timing.runtimeExecution.fileSha256);
const old = await readBound(timing.originalManifestBinding);
const job = await readJson(`${output}/renderer-job.json`);
const oldJob = await readBound(old.core.rendererJob);
const unchangedJobFields = structuredClone(job);
for (const key of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'publication']) unchangedJobFields[key] = oldJob[key];
assert(same(unchangedJobFields, oldJob), 'RENDERER_STYLE_OR_RUNTIME_CHANGED');
const execution = await readBound(final.renderer.execution);
const admission = await readBound(final.renderer.admission);
await readBound(final.renderer.lineLayout);
assert.equal(execution.exitCode, 0);
assert.equal(execution.result.status, 'completed');
assert.equal(execution.result.qc.status, 'passed');
assert.equal(admission.status, 'accepted');
assert.deepEqual(execution.result.qc.violations, []);
assert(same(execution.rendererJobBinding, bind(`${output}/renderer-job.json`, job)));
assert(same(job.cropAppliedBaseMedia, old.baseMedia));
for (const [key, b] of Object.entries(old.baseMedia) as [string, any][]) {
  if (key === 'baseMedia') assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);
  else await readBound(b);
}
assert.equal(await fileSha(path.join(ROOT, final.renderer.video.path)), final.renderer.video.fileSha256);
const oldExecution = await readBound(old.renderer.execution);
assert.deepEqual(execution.result.qc.mediaEvidence, oldExecution.result.qc.mediaEvidence, 'BASE_VIDEO_CLOCK_AND_AUDIO_CHANGED');
const timeline = await readBound(old.baseMedia.timeline);
const newInstruction = await readBound(job.instructionArtifactBinding), oldInstruction = await readBound(old.core.instruction);
const meaning = await readBound(newInstruction.sourceBindings.meaningInformationPackage);
assert(same(meaning.acousticTimingAdoptionBinding, final.timingAdoption));
const originalMeaning = await readBound(old.core.meaning);
assert.deepEqual(meaning.atomOccurrences.map((a: any) => [a.atomOccurrenceId, a.ordinal, a.text, a.sourceSegmentId, a.semanticUtteranceId, a.originalRetainedSpans]),
  originalMeaning.atomOccurrences.map((a: any) => [a.atomOccurrenceId, a.ordinal, a.text, a.sourceSegmentId, a.semanticUtteranceId, a.retainedSpans]));
const sourcePackage = await readJson(`${output}/source-package.json`), originalSourcePackage = await readBound(old.core.sourcePackage);
assert(same(sourcePackage.promptInput, originalSourcePackage.promptInput), 'DISPLAY_QUESTION_OR_INPUT_CHANGED');
assert.equal(newInstruction.instructions.length, oldInstruction.instructions.length);
assert.equal(execution.result.qc.instructionEvidence.length, newInstruction.instructions.length);
const generation = await readBound(old.baseMedia.generationManifest);
const grid = generation.audio.sampleRate;
const sourceAtoms = new Map<string, any>(meaning.atomOccurrences.map((a: any) => [a.atomOccurrenceId, a]));
const traces = newInstruction.instructions.map((ins: any, i: number) => {
  const original = oldInstruction.instructions[i], c = timing.cues[i];
  assert.deepEqual(ins.content, original.content);
  assert.deepEqual(ins.targetProvenance, original.targetProvenance);
  const atoms = ins.targetProvenance.atomOccurrenceIds.map((aid: string) => sourceAtoms.get(aid));
  assert.deepEqual(atoms.map((a: any) => a.sourceSegmentId), c.resolution.sourceSegmentIds);
  assert.equal(atoms.map((a: any) => a.text).join(''), ins.content.text);
  const start = c.resolution.sourceStartMs, end = c.resolution.sourceEndMs;
  for (const a of atoms) assert.deepEqual(a.retainedSpans, [{timelineSegmentId: c.timelineSegmentId, sourceStartMs: start, sourceEndMs: end}]);
  const mapped = pass(mapPresentationSourceIntervalV002(timeline, start, end), 'SYNC_FRAME_MAP_INVALID').mapping;
  assert.deepEqual(ins.outputTime, {startFrame: mapped.startFrame, endFrameExclusive: mapped.endFrameExclusive});
  const g = generation.segments.find((s: any) => s.segmentId === c.timelineSegmentId);
  const sampleOffsetMs = (g.audioSamples.outputStart - g.audioSamples.sourceStart) * 1000 / grid;
  return {text: ins.content.text, sourceSegmentIds: c.resolution.sourceSegmentIds,
    endpointStatus: {start: c.resolution.startResolution.status, end: c.resolution.endResolution.status},
    audioOutputStartMs: start + sampleOffsetMs, audioOutputEndMs: end + sampleOffsetMs,
    renderedStartFrame: ins.outputTime.startFrame, renderedEndFrameExclusive: ins.outputTime.endFrameExclusive,
    captionMinusAudioStartMs: ins.outputTime.startFrame * 1000 / 30 - (start + sampleOffsetMs),
    captionMinusAudioEndMs: ins.outputTime.endFrameExclusive * 1000 / 30 - (end + sampleOffsetMs)};
});
const files: any[] = [];
async function collect(relative: string) {
  for (const entry of (await readdir(path.join(ROOT, relative), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await collect(p);
    else {
      assert(entry.isFile());
      const bytes = await readFile(path.join(ROOT, p));
      files.push({path: p, fileSha256: createHash('sha256').update(bytes).digest('hex'),
        sizeBytes: bytes.length, encoding: 'base64', bytes: bytes.toString('base64')});
    }
  }
}
await collect(`${output}/process-observations`);
const processEvidence = await publish(`${output}/process-observation-evidence.json`, {
  schemaVersion: 'digest-sync-process-observation-evidence-v001', status: 'captured-exact-bytes', files});
const evidence = {schemaVersion: 'digest-sync-final-verification-v001', technicalStatus: 'passed',
  humanSyncStatus: 'not-evaluated; unresolved-endpoints-preserved',
  originalManifestBinding: bind(`${prior}/manifest.json`, old), syncManifestBinding: bind(`${output}/render-manifest.json`, final),
  checks: {unchangedVideoComposition: 'exact', unchangedAudioPacketPayload: 'exact', unchangedTextAndDisplayBoundaries: 'exact',
    admission: 'accepted', technicalQc: 'passed', finalVisibilityInstructionCount: traces.length,
    sourceAndOutputSha: 'exact', acousticEndpointToRendererProjection: 'exact', rendererStyleAndRuntime: 'unchanged',
    frameCount: timeline.baseMedia.expectedFrameCount, durationMs: execution.result.qc.mediaEvidence.observed.durationMs},
  endpointCounts: timing.counts, traces, processEvidence};
await publish(`${output}/final-verification.json`, evidence);
console.log(JSON.stringify({status: 'passed', checks: evidence.checks, endpointCounts: timing.counts, video: final.renderer.video}));

import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, pass} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {loadInternalContextV001, verifyInternalAdoptionV001, out} from './run_candidate_internal_edit_v001.mts';
import {INTERNAL_CORE_FILES, internalCaptionTextV001} from './candidate_internal_edit_core_v001.mts';
import {reconstructCaptionRevisionV001} from './resume_internal_edit_caption_v001.mts';
import {validatePresentationBaseMediaSegmentPlanV002, validatePresentationBaseMediaGenerationManifestV003,
  inspectPresentationBaseMediaTimelineQcV002} from './presentation_base_media_build_v003.mjs';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';

const manifestPath = process.argv[2];
assert(manifestPath, 'MANIFEST_REQUIRED');
const manifest = await readJson(manifestPath);
assert.equal(manifest.schemaVersion, 'candidate-internal-edit-manifest-v001');
assert.equal(manifest.status, 'review-ready');
const c = await loadInternalContextV001(manifest.planBinding.path);
assert(same(c.planBinding, manifest.planBinding));
const {adoption, editPlan} = await verifyInternalAdoptionV001(c);
assert(same(adoption, await readBound(manifest.machineAdoption)));
assert(same(editPlan, await readBound(manifest.editPlan)));
for (const [key, b] of Object.entries(manifest.baseMedia) as [string, any][]) {
  if (key === 'baseMedia') assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);
  else await readBound(b);
}
const text = internalCaptionTextV001(c, adoption);
assert(same(text.textInput, await readJson(out(c, 'caption-text-input.json'))));
assert(manifest.caption.displayRevision, 'FINAL_DISPLAY_REVISION_REQUIRED');
await readBound(manifest.caption.displayRevision);
const revision = await reconstructCaptionRevisionV001(manifest.caption.displayRevision.path, manifest.caption.displayJudgments);
assert(same(revision.planBinding, manifest.caption.displayRevision));
assert(same(revision.artifacts, manifest.caption.artifacts));
const core = revision.core;
for (const key of Object.keys(INTERNAL_CORE_FILES))
  assert(same(core[key as keyof typeof core], await readBound(manifest.caption.artifacts[key])), `CORE_RECONSTRUCTION_MISMATCH_${key}`);
assert(same(manifest.caption.reusedSkill, c.plan.implementationBindings.find((b: any) => b.path === 'runner/src/skills/caption-display-boundaries-v001.ts')));
for (const key of ['execution', 'admission', 'lineLayout']) await readBound(manifest.renderer[key]);
assert.equal(await fileSha(path.join(ROOT, manifest.renderer.video.path)), manifest.renderer.video.fileSha256);
const execution = await readBound(manifest.renderer.execution), admission = await readBound(manifest.renderer.admission);
assert.equal(execution.exitCode, 0); assert.equal(execution.result.status, 'completed');
assert.equal(execution.result.qc.status, 'passed'); assert.deepEqual(execution.result.qc.violations, []);
assert.equal(admission.status, 'accepted');
assert(same(execution.rendererJobBinding, manifest.caption.artifacts.rendererJob));
const oldJob = await readBound(c.prior.core.rendererJob), job = structuredClone(core.rendererJob);
for (const key of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'cropAppliedBaseMedia', 'publication']) job[key] = oldJob[key];
assert(same(job, oldJob), 'RENDERER_STYLE_OR_RUNTIME_CHANGED');
assert(same(manifest.previousVideo, c.prior.renderer.video));
assert.equal(await fileSha(path.join(ROOT, manifest.previousVideo.path)), manifest.previousVideo.fileSha256);
assert.equal(await fileSha(path.join(ROOT, manifest.syncComparisonVideo.path)), manifest.syncComparisonVideo.fileSha256);

const inspection = await readJson(out(c, 'source-media-inspection.json')), media = inspection.media;
assert(same(inspection.sourceVideoBinding, c.plan.request.sourceVideo));
const mapped = pass(validatePresentationBaseMediaSegmentPlanV002(editPlan.segments.map((s: any) => ({sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs})),
  {fps: media.fps, decodedFrameCount: media.decodedFrameCount, logicalFrameCount: media.logicalFrameCount,
    presentationOffsetMs: media.videoClock.presentationOffsetMs}, media.audioClock), 'SOURCE_TO_COMPOSITION_MAPPING_INVALID');
const generation = await readBound(manifest.baseMedia.generationManifest), timeline = await readBound(manifest.baseMedia.timeline);
pass(validatePresentationBaseMediaGenerationManifestV003(generation), 'GENERATION_MANIFEST_INVALID');
assert(same(generation.segments, mapped.mappings));
assert.equal(execution.result.qc.mediaEvidence.observed.video.frameCount, timeline.baseMedia.expectedFrameCount);
assert.equal(execution.result.qc.mediaEvidence.observed.audio.packetPayloadSha256, generation.audio.encoded.packetPayloadSha256);
inspectPresentationBaseMediaTimelineQcV002(timeline, generation, {fileSha256: manifest.baseMedia.baseMedia.fileSha256,
  frameCount: timeline.baseMedia.expectedFrameCount, timelineFileSha256: manifest.baseMedia.timeline.fileSha256});
assert.equal(execution.result.qc.instructionEvidence.length, core.instruction.instructions.length);
assert.deepEqual(execution.result.qc.instructionEvidence.map((row: any) => row.instructionId),
  core.instruction.instructions.map((row: any) => row.instructionId));
for (const [i, row] of execution.result.qc.instructionEvidence.entries()) {
  const interval = core.instruction.instructions[i].outputTime;
  assert(row.representativeFrame >= interval.startFrame && row.representativeFrame < interval.endFrameExclusive);
  assert.equal(row.applicationOverlayFile, row.inspectedOverlayFile);
  assert.equal(row.applicationOverlaySha256, row.overlaySha256);
  assert.equal(await fileSha(path.join(ROOT, path.dirname(manifest.renderer.video.path), row.applicationOverlayFile)), row.overlaySha256);
}
const cueTraces = core.instruction.instructions.map((ins: any, i: number) => {
  const cue = core.timing.cues[i], r = cue.resolution;
  assert.deepEqual(ins.targetProvenance.atomOccurrenceIds, cue.atomOccurrenceIds);
  assert.equal(ins.content.text, cue.text);
  const m = pass(mapPresentationSourceIntervalV002(timeline, r.sourceStartMs, r.sourceEndMs), 'CAPTION_MAPPING_INVALID').mapping;
  assert.deepEqual(ins.outputTime, {startFrame: m.startFrame, endFrameExclusive: m.endFrameExclusive});
  const segment = generation.segments.find((s: any) => s.segmentId === cue.timelineSegmentId);
  const audioOffset = (segment.audioSamples.outputStart - segment.audioSamples.sourceStart) * 1000 / generation.audio.sampleRate;
  return {text: cue.text, sourceSegmentIds: r.sourceSegmentIds, timelineSegmentId: cue.timelineSegmentId,
    startResolution: r.startResolution.status, endResolution: r.endResolution.status,
    rendererFrames: ins.outputTime,
    captionMinusAudioStartMs: m.startFrame * 1000 / 30 - (r.sourceStartMs + audioOffset),
    captionMinusAudioEndMs: m.endFrameExclusive * 1000 / 30 - (r.sourceEndMs + audioOffset)};
});
const keptIds = adoption.segments.flatMap((s: any) => s.sourceSegmentIds);
assert.deepEqual(core.meaning.atomOccurrences.map((a: any) => a.sourceSegmentId), keptIds);
assert.equal(new Set(keptIds).size, keptIds.length);
const parentIds = c.parents.flatMap((p: any) => p.sourceSegmentIds);
const droppedIds = adoption.candidates.flatMap((p: any) => p.blocks.filter((b: any) => b.action === 'drop').flatMap((b: any) => b.sourceSegmentIds));
assert.deepEqual([...keptIds, ...droppedIds].sort((a: number, b: number) => a - b), parentIds);
const retained = new Set(keptIds);
assert(droppedIds.every((id: number) => !retained.has(id)));

const files: any[] = [];
async function collect(relative: string) {
  for (const entry of (await readdir(path.join(ROOT, relative), {withFileTypes: true})).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await collect(p);
    else {
      assert(entry.isFile()); const bytes = await readFile(path.join(ROOT, p));
      files.push({path: p, fileSha256: createHash('sha256').update(bytes).digest('hex'), sizeBytes: bytes.length, encoding: 'base64', bytes: bytes.toString('base64')});
    }
  }
}
await collect(out(c, 'process-observations'));
await collect(`${revision.plan.outputRoot}/process-observations`);
const processEvidence = await publish(out(c, 'process-observation-evidence.json'), {
  schemaVersion: 'candidate-internal-edit-process-observation-evidence-v001', status: 'captured-exact-bytes', files});
const evidence = {schemaVersion: 'candidate-internal-edit-final-verification-v001', technicalStatus: 'passed', humanQuality: 'not-evaluated',
  manifestBinding: bind(manifestPath, manifest), checks: {meaningAndAdoptionReconstruction: 'exact',
    originalCandidatesAndOrder: 'unchanged', fullTextAccounting: 'exact', sourceAndOutputSha: 'exact',
    sourceToVideoAndAudioSampleMapping: 'exact', baseAudioPacketPreservedInFinalVideo: 'exact',
    displaySkill: 'unchanged', captionCoreReconstruction: 'exact',
    subtitleFrameProjection: 'exact', allInstructionEvidenceAndOverlayBytes: 'exact',
    rendererStyleAndRuntime: 'unchanged', admission: 'accepted', technicalQc: 'passed'},
  counts: {parentCandidates: c.parents.length, internalJudgments: adoption.judgment.revision, retainedRanges: adoption.segments.length,
    originalAtoms: parentIds.length, retainedAtoms: keptIds.length, droppedAtoms: droppedIds.length,
    captions: cueTraces.length, frameCount: timeline.baseMedia.expectedFrameCount,
    durationMs: execution.result.qc.mediaEvidence.observed.durationMs,
    resolvedCaptionEndpoints: cueTraces.reduce((n: number, r: any) => n + Number(r.startResolution === 'resolved') + Number(r.endResolution === 'resolved'), 0)},
  cueTraces, processEvidence};
await publish(out(c, 'final-verification.json'), evidence);
console.log(JSON.stringify({status: 'passed', checks: evidence.checks, counts: evidence.counts, video: manifest.renderer.video}));

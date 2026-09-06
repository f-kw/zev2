import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {
  ROOT, readJson, readBound, bind, publish, fileSha, pass, same, verifyDigestE2EV001,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {validateAcousticChunkV001, resolveAcousticCueV001, retainUnresolvedTimingV001} from './digest_acoustic_timing_validation_v001.mts';
import {validatePresentationOutputCaptionCueSourcePackageV001} from './presentation_output_caption_cue_source_package_v001.mjs';
import {buildPresentationCueEndProjectionV001, buildPresentationCueEndProjectionBindingV001,
  buildPresentationSemanticLineEndProjectionV001, buildPresentationSemanticLineEndProjectionBindingV001} from './presentation_cue_end_projection_v001.mjs';
import {buildPresentationCaptionInstructionArtifactV002, buildPresentationInstructionArtifactBindingV002} from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002} from './presentation_renderer_admission_receipt_v002.mjs';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';
import {renderDigestV001} from './candidate_digest_core_adapter_v001.mts';

const prior = 'evals/clip_composition/outputs/presentation/work-candidate-digest-skill-ymUsGrT6EaA-20260906-v002';
const work = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001';
const outputRoot = `${work}/sync-render-v001`, id = 'digest-caption-sync-20260907-v001';
const out = (name: string) => `${outputRoot}/${name}.json`;
type Json = Record<string, any>;

async function build() {
  const originalVerification = await verifyDigestE2EV001(`${prior}/manifest.json`);
  const manifest = await readJson(`${prior}/manifest.json`);
  const timingPath = `${work}/acoustic-correspondence-validation-v003.json`;
  const validation = JSON.parse(await readFile(path.join(ROOT, timingPath), 'utf8'));
  for (const b of [...validation.sourceBindings, validation.implementationBinding]) assert.equal(await fileSha(path.join(ROOT, b.path)), b.fileSha256);
  const preflight = JSON.parse(await readFile(path.join(ROOT, `${work}/acoustic-preflight-v001.json`), 'utf8'));
  const preflightSha = await fileSha(path.join(ROOT, `${work}/acoustic-preflight-v001.json`));
  const chunks = [];
  for (const c of preflight.chunks) {
    const obs = JSON.parse(await readFile(path.join(ROOT, `${work}/acoustic-observation-chunk-${String(c.index).padStart(4, '0')}-v001.json`), 'utf8'));
    assert.equal(obs.preflightBinding.fileSha256, preflightSha);
    chunks.push(validateAcousticChunkV001(c, obs));
  }
  const trace = await readJson(`${work}/caption-timing-trace-v001.json`);
  const expected = JSON.parse(JSON.stringify(retainUnresolvedTimingV001(trace.cues.map((c: Json) => ({
    instructionId: c.instructionId, text: c.text, timelineSegmentId: c.timelineSegmentId,
    oldStartMs: c.start.sourceMs, oldEndMs: c.end.sourceMs,
    resolution: resolveAcousticCueV001(c.sourceSegmentIds, chunks,
      trace.ranges.find((r: Json) => r.segmentId === c.timelineSegmentId), {sourceStartMs: c.start.sourceMs, sourceEndMs: c.end.sourceMs}),
  })))));
  assert(same(expected, validation.cues), 'ACOUSTIC_VALIDATION_RECONSTRUCTION_MISMATCH');
  const adoption = {schemaVersion: 'digest-caption-acoustic-timing-adoption-v001', artifactId: `${id}-timing`,
    instruction: 'ZEV進行管理２ 指示-003', originalManifestBinding: bind(`${prior}/manifest.json`, manifest),
    observationValidation: {path: timingPath, fileSha256: await fileSha(path.join(ROOT, timingPath))},
    runtimeExecution: {path: `${work}/acoustic-runtime-execution-v002.json`, fileSha256: await fileSha(path.join(ROOT, `${work}/acoustic-runtime-execution-v002.json`))},
    implementationBindings: await Promise.all(['evals/clip_composition/build_digest_synced_caption_v001.mts',
      'evals/clip_composition/digest_acoustic_timing_validation_v001.mts'].map(async p => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))}))),
    originalVerification, unchangedBaseMedia: manifest.baseMedia, displayJudgments: manifest.displayJudgments,
    policy: 'promote-unique-observed-endpoints-retain-unresolved-original-endpoints-without-interpolation',
    quality: 'human-sync-review-pending', counts: validation.counts, cues: expected};
  const adoptionBinding = await publish(out('timing-adoption'), adoption);
  const originalMeaning = await readBound(manifest.core.meaning), originalInstruction = await readBound(manifest.core.instruction);
  const meaning = structuredClone(originalMeaning);
  meaning.schemaVersion = 'digest-acoustic-caption-meaning-input-v001';
  meaning.artifactId = `${id}-meaning`;
  meaning.originalMeaningBinding = manifest.core.meaning;
  meaning.acousticTimingAdoptionBinding = adoptionBinding;
  meaning.timingGranularity = 'display-cue-envelope; individual-character-acoustic-times-are-not-claimed';
  meaning.captionTimingUnits = [];
  const atomsById = new Map<string, Json>(meaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
  for (const [i, c] of expected.entries()) {
    const originalCue = originalInstruction.instructions[i];
    assert.equal(c.instructionId, originalCue.instructionId);
    const atoms = originalCue.targetProvenance.atomOccurrenceIds.map((aid: string) => atomsById.get(aid)!);
    assert.deepEqual(atoms.map((a: Json) => a.sourceSegmentId), c.resolution.sourceSegmentIds);
    const unitId = `${id}-timing-unit-${i + 1}`;
    meaning.captionTimingUnits.push({unitId, sourceSegmentIds: c.resolution.sourceSegmentIds,
      originalCueId: c.instructionId, start: c.resolution.startResolution, end: c.resolution.endResolution,
      sourceStartMs: c.resolution.sourceStartMs, sourceEndMs: c.resolution.sourceEndMs});
    for (const a of atoms) {
      a.originalRetainedSpans = a.retainedSpans;
      a.captionTimingUnitId = unitId;
      // These are the shared cue's retained source spans, not fabricated per-character onset/offset times.
      a.retainedSpans = [{timelineSegmentId: c.timelineSegmentId,
        sourceStartMs: c.resolution.sourceStartMs, sourceEndMs: c.resolution.sourceEndMs}];
    }
  }
  assert.deepEqual(meaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a.ordinal, a.text, a.sourceSegmentId, a.semanticUtteranceId]),
    originalMeaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a.ordinal, a.text, a.sourceSegmentId, a.semanticUtteranceId]));
  const meaningBinding = await publish(out('meaning-input'), meaning);
  const sourcePackage = await readBound(manifest.core.sourcePackage);
  sourcePackage.packageId = `${id}-source-package`;
  sourcePackage.reconstructionMap.meaningPackageBindings = [meaningBinding];
  sourcePackage.reconstructionMap.caseContexts[0].meaningPackageBinding = meaningBinding;
  sourcePackage.provenance.sourcePackageJobBinding = adoptionBinding;
  pass(validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage), 'SYNC_SOURCE_PACKAGE_INVALID');
  const sourceBinding = await publish(out('source-package'), sourcePackage);
  const selection = await readBound(manifest.core.selection);
  selection.selectionId = `${id}-selection`;
  selection.sourcePackageBinding = sourceBinding;
  const sb = await publish(out('selection'), selection);
  const digest = {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: sb.fileSha256, canonicalSha256: sb.canonicalSha256};
  const cue = pass(buildPresentationCueEndProjectionV001({projectionId: `${id}-cue-end`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: digest, producerJobBinding: adoptionBinding, sourcePackage, selection}), 'SYNC_CUE_INVALID').projection;
  const cb = buildPresentationCueEndProjectionBindingV001({path: out('cue-end-projection'), projection: cue});
  await publish(out('cue-end-projection'), cue);
  const line = pass(buildPresentationSemanticLineEndProjectionV001({projectionId: `${id}-line-end`, sourcePackageBinding: sourceBinding,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: adoptionBinding,
    sourcePackage, selection, cueEndProjection: cue}), 'SYNC_LINE_INVALID').projection;
  const lb = buildPresentationSemanticLineEndProjectionBindingV001({path: out('line-end-projection'), projection: line});
  await publish(out('line-end-projection'), line);
  const timeline = await readBound(manifest.baseMedia.timeline);
  const instruction = pass(buildPresentationCaptionInstructionArtifactV002({artifactId: `${id}-instruction`,
    sourceCaseId: sourcePackage.reconstructionMap.caseContexts[0].caseId, meaningInformationPackageBinding: meaningBinding,
    timelineBinding: manifest.baseMedia.timeline, cueEndProjectionBinding: cb, producerJobBinding: adoptionBinding,
    styleProfileId: originalInstruction.styleProfileId, meaningPackage: meaning, timeline, cueEndProjection: cue}), 'SYNC_INSTRUCTION_INVALID').artifact;
  const ib = buildPresentationInstructionArtifactBindingV002({path: out('instruction'), artifact: instruction});
  await publish(out('instruction'), instruction);
  const job = await readBound(manifest.core.rendererJob);
  job.jobId = `${id}-renderer`; job.attemptId = id;
  job.instructionArtifactBinding = ib; job.lineEndProjectionBinding = lb;
  job.publication = {admissionReceiptPath: out('admission-receipt'), lineLayoutPath: out('line-layout'), renderOutputRoot: `${outputRoot}/render`};
  assert(same(job.cropAppliedBaseMedia, manifest.baseMedia), 'UNCHANGED_MEDIA_REQUIRED');
  pass(validatePresentationInstructionRendererJobV002(job), 'SYNC_RENDERER_JOB_INVALID');
  const jb = await publish(out('renderer-job'), job);
  for (const [i, ins] of instruction.instructions.entries()) {
    assert.deepEqual(ins.content, originalInstruction.instructions[i].content, 'SUBTITLE_CONTENT_CHANGED');
    const c = expected[i].resolution;
    const mapped = pass(mapPresentationSourceIntervalV002(timeline, c.sourceStartMs, c.sourceEndMs), 'SYNC_MAPPING_FAILED').mapping;
    assert.deepEqual(ins.outputTime, {startFrame: mapped.startFrame, endFrameExclusive: mapped.endFrameExclusive});
  }
  await publish(out('pre-render-verification'), {schemaVersion: 'digest-sync-pre-render-verification-v001', status: 'passed',
    checks: {acousticObservationReconstruction: 'exact', originalAtomsAndText: 'exact', displayJudgments: 'unchanged',
      baseVideoAndAudioAndTimeline: 'unchanged-sha', captionCount: instruction.instructions.length,
      correctedEndpointProjection: 'exact', humanSync: 'not-evaluated'},
    timingAdoptionBinding: adoptionBinding, rendererJobBinding: jb});
  console.log(JSON.stringify({status: 'ready-to-render', counts: validation.counts, rendererJob: jb}));
}

if (process.argv[2] === 'build') await build();
else if (process.argv[2] === 'render') {
  const job = await readJson(out('renderer-job'));
  const result = await renderDigestV001({plan: {outputRoot}} as any, {rendererJob: bind(out('renderer-job'), job)});
  await publish(out('render-manifest'), {schemaVersion: 'digest-caption-sync-render-manifest-v001',
    technicalStatus: 'passed', humanSyncStatus: 'pending-with-recorded-unresolved-endpoints',
    timingAdoption: bind(out('timing-adoption'), await readJson(out('timing-adoption'))), renderer: result});
  console.log(JSON.stringify(result));
} else throw new Error('Expected build or render');

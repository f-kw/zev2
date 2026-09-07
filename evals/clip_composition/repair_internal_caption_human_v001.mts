import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT, readJson, readBound, bind, publish, fileSha, same, pass, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {reconstructCaptionRevisionV001} from './resume_internal_edit_caption_v001.mts';
import {validatePresentationOutputCaptionCueSourcePackageV001} from './presentation_output_caption_cue_source_package_v001.mjs';
import {buildPresentationCueEndProjectionV001, buildPresentationCueEndProjectionBindingV001,
  buildPresentationSemanticLineEndProjectionV001, buildPresentationSemanticLineEndProjectionBindingV001} from './presentation_cue_end_projection_v001.mjs';
import {buildPresentationCaptionInstructionArtifactV002, buildPresentationInstructionArtifactBindingV002} from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationInstructionRendererJobV002} from './presentation_renderer_admission_receipt_v002.mjs';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';
import {runPresentationInstructionRendererJobFileV002 as render} from './run_presentation_instruction_renderer_job_v002.ts';

export const WORK = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001';
export const REPAIR = `${WORK}/caption-human-repair-v001`;
const SELF = 'evals/clip_composition/repair_internal_caption_human_v001.mts';
const PARENT = `${WORK}/internal-edit-v001/manifest.json`;
const HUMAN = `${WORK}/human-boundary-review-v001/confirmed-observations.json`;
const DIAGNOSIS = `${WORK}/caption-local-repair-v001/diagnosis.json`;
const ID = 'digest-human-caption-repair-20260907-v001';
const out = (name: string) => `${REPAIR}/${name}.json`;
const exactFile = async (p: string) => ({path: p, fileSha256: await fileSha(path.join(ROOT, p))});

/** This is the two-frame instruction-008 repair, not a general caption correction policy. */
export function validateHumanRepairV001(human: Json, parent: Json, old: Json, timeline: Json, generation: Json) {
  assert.equal(human.schemaVersion, 'digest-human-boundary-confirmed-observations-v001');
  assert.equal(human.userConfirmation, '指定した');
  assert.equal(human.observations.length, 2);
  return human.observations.map((o: Json, index: number) => {
    const ordinal = index + 15, side = index === 0 ? 'start' : 'end', frame = index === 0 ? 1723 : 2708;
    const t = o.targetBinding, ins = old.instruction.instructions[ordinal - 1], timing = old.timing.cues[ordinal - 1];
    assert.equal(o.status, 'eligible-for-local-promotion');
    assert.equal(t.ordinal, ordinal); assert.equal(t.side, side); assert.equal(t.id, `caption-${ordinal}-${side}`);
    assert.equal(t.captionId, ins.instructionId); assert.equal(t.text, ins.content.text);
    assert.deepEqual(t.atomOccurrenceIds, ins.targetProvenance.atomOccurrenceIds);
    assert.deepEqual(t.sourceSegmentIds, timing.resolution.sourceSegmentIds);
    assert.deepEqual(t.currentCaptionFrames, ins.outputTime);
    for (const [b, expected] of [[t.completedMediaBinding, parent.renderer.video], [t.baseMediaBinding, parent.baseMedia.baseMedia]]) {
      assert.equal(b.path, expected.path); assert.equal(b.fileSha256, expected.fileSha256);
    }
    assert.equal(t.audioPacketPayloadSha256, generation.audio.encoded.packetPayloadSha256);
    assert.equal(t.framesPerSecond, 30); assert.equal(t.audioSampleRate, generation.audio.sampleRate);
    const segment = timeline.segments.find((s: Json) => s.segmentId === timing.timelineSegmentId);
    const gen = generation.segments.find((s: Json) => s.segmentId === timing.timelineSegmentId);
    assert.deepEqual(t.timelineSegment, {...segment, audioSamples: gen.audioSamples});
    assert.equal(o.request.targetId, t.id); assert.equal(o.request.frame, frame);
    const observed = o.selectedBoundary;
    assert.equal(observed.side, side); assert.equal(observed.outputVideoFrame, frame);
    assert.equal(observed.outputAudioSample, frame * t.audioSampleRate / 30);
    assert.equal(observed.sourceAudioSample, observed.outputAudioSample - gen.audioSamples.outputStart + gen.audioSamples.sourceStart);
    assert.deepEqual(observed.outputTimeSecondsExact, {numerator: frame, denominator: 30});
    assert.deepEqual(observed.sourceAudioTimeSecondsExact, {numerator: observed.sourceAudioSample, denominator: t.audioSampleRate});
    const expectedTime = {...ins.outputTime, [side === 'start' ? 'startFrame' : 'endFrameExclusive']: frame};
    assert.equal(observed.unchangedOtherCaptionFrame, index === 0 ? ins.outputTime.endFrameExclusive : ins.outputTime.startFrame);
    assert(expectedTime.startFrame < expectedTime.endFrameExclusive);
    assert(frame >= segment.outputStartFrame && frame < segment.outputEndFrame);
    // The unchanged Core accepts integer source ms. Invert its EXISTING video clock;
    // then require exact frame round-trip. Audio sample evidence remains unrounded.
    const sourceFrame = segment.sourceStartFrame30 + frame - segment.outputStartFrame;
    const sourceMs = Math.round(sourceFrame * 1000 / 30 + timeline.sourceFrameClock.videoPresentationOffsetMs);
    const interval = {sourceStartMs: timing.resolution.sourceStartMs, sourceEndMs: timing.resolution.sourceEndMs};
    interval[side === 'start' ? 'sourceStartMs' : 'sourceEndMs'] = sourceMs;
    const mapped = pass(mapPresentationSourceIntervalV002(timeline, interval.sourceStartMs, interval.sourceEndMs), 'HUMAN_FRAME_MAPPING_INVALID').mapping;
    assert.deepEqual({startFrame: mapped.startFrame, endFrameExclusive: mapped.endFrameExclusive}, expectedTime);
    return {originalOrdinal: ordinal, originalInstructionId: ins.instructionId, side, frame, sourceFrame30: sourceFrame,
      coreIntegerSourceMs: sourceMs, sourceMsRole: 'integer-bridge-to-existing-video-frame-clock-not-a-new-acoustic-observation',
      exactHumanAudioEvidence: observed, expectedTime, interval, originalObservation: o};
  });
}

export async function reconstructHumanRepairV001() {
  const parent = await readJson(PARENT);
  const prior = await reconstructCaptionRevisionV001(parent.caption.displayRevision.path, parent.caption.displayJudgments);
  assert(same(prior.artifacts, parent.caption.artifacts));
  const old = prior.core;
  for (const [k, b] of Object.entries(parent.caption.artifacts) as [string, Json][]) assert(same(old[k], await readBound(b)));
  for (const b of [parent.renderer.video, parent.baseMedia.baseMedia]) assert.equal((await exactFile(b.path)).fileSha256, b.fileSha256);
  const timeline = await readBound(parent.baseMedia.timeline), generation = await readBound(parent.baseMedia.generationManifest);
  await readBound(parent.baseMedia.validationReceipt);
  const human = await readJson(HUMAN), diagnosis = await readJson(DIAGNOSIS);
  // Pins the actual two user observations accepted by instruction-008; never fabricated fixtures.
  assert.equal((await exactFile(HUMAN)).fileSha256, '527d45cf0d1136c48dfe5e63962f634f41f6bdfd88b6651a2ce6a4f7caf79d7a');
  const changes = validateHumanRepairV001(human, parent, old, timeline, generation);
  assert.equal(old.instruction.instructions.length, 33);
  const removed = old.instruction.instructions[0], removedIds = new Set(removed.targetProvenance.atomOccurrenceIds);
  assert.equal(removed.content.text, 'え?いるんでしょ?'); assert.equal(removedIds.size, 9);
  assert.deepEqual(diagnosis.cases[0].sourceSegmentIds, old.timing.cues[0].resolution.sourceSegmentIds);
  assert.equal(diagnosis.cases[0].humanReview.memo, 'え?いるんでしょ?は発話がない');
  const core: Json = {}, artifacts: Json = {};
  const add = (key: string, name: string, value: Json, binding?: Json) => {
    core[key] = value; artifacts[key] = binding ?? bind(out(name), value); return artifacts[key];
  };
  const adoption = {schemaVersion: 'digest-human-caption-local-repair-adoption-v001', artifactId: `${ID}-adoption`,
    instruction: 'ZEV進行管理２ 指示-008', parentManifest: bind(PARENT, parent),
    humanObservations: await exactFile(HUMAN), diagnosis: await exactFile(DIAGNOSIS), implementation: await exactFile(SELF),
    scope: 'one-caption-omission-and-two-human-frame-boundaries-only',
    structuralRenumbering: 'instruction-008-permits-dense-cue-boundary-reference-and-sha-reconstruction',
    omission: {originalInstruction: removed, sourceSegmentIds: old.timing.cues[0].resolution.sourceSegmentIds,
      reason: 'corresponding-speech-outside-retained-audio; human-confirmed-absent; source-STT-and-media-adoption-unchanged'},
    changes, humanQuality: 'pending-three-local-reviews'};
  const ab = add('adoption', 'repair-adoption', adoption);
  const timing = structuredClone(old.timing);
  timing.schemaVersion = 'digest-human-caption-timing-v001'; timing.artifactId = `${ID}-timing`;
  timing.originalTimingBinding = parent.caption.artifacts.timing; timing.humanRepairAdoptionBinding = ab;
  timing.policy = 'instruction-008-two-human-frames; retain-all-other-endpoints'; timing.humanSync = 'pending-three-local-reviews';
  timing.cues = timing.cues.slice(1);
  for (const ch of changes) {
    const row = timing.cues[ch.originalOrdinal - 2]; row.previousResolution = structuredClone(row.resolution);
    Object.assign(row.resolution, ch.interval);
    row.resolution[ch.side === 'start' ? 'startResolution' : 'endResolution'] = {
      status: 'human-frame-observed', observationBinding: adoption.humanObservations,
      originalTargetId: ch.originalObservation.targetBinding.id, outputFrame: ch.frame, coreIntegerSourceMs: ch.coreIntegerSourceMs};
    row.resolution.status = 'local-human-endpoint-promoted-other-endpoint-retained';
    row.humanFramePromotion = ch;
    row.changes = {startMs: row.resolution.sourceStartMs - row.oldStartMs, endMs: row.resolution.sourceEndMs - row.oldEndMs};
  }
  const tb = add('timing', 'caption-timing', timing);
  const meaning = structuredClone(old.meaning);
  meaning.artifactId = `${ID}-meaning`; meaning.originalMeaningBinding = parent.caption.artifacts.meaning;
  meaning.humanRepairAdoptionBinding = ab; meaning.captionTimingBinding = tb;
  meaning.atomOccurrences = meaning.atomOccurrences.filter((a: Json) => !removedIds.has(a.atomOccurrenceId));
  const atoms = new Map<string, Json>(meaning.atomOccurrences.map((a: Json, i: number) => {
    a.ordinal = i + 1; return [a.atomOccurrenceId, a];
  }));
  for (const ch of changes) for (const aid of ch.originalObservation.targetBinding.atomOccurrenceIds) {
    const a = atoms.get(aid)!; assert.equal(a.retainedSpans.length, 1); Object.assign(a.retainedSpans[0], ch.interval);
  }
  for (const c of [...meaning.orderedSegments, ...meaning.captions]) c.atomOccurrenceIds = c.atomOccurrenceIds.filter((aid: string) => !removedIds.has(aid));
  for (const c of meaning.captions) c.text = c.atomOccurrenceIds.map((aid: string) => atoms.get(aid)!.text).join('');
  const mb = add('meaning', 'meaning-input', meaning);
  const source = structuredClone(old.sourcePackage); source.packageId = `${ID}-source-package`;
  source.reconstructionMap.meaningPackageBindings = [mb]; source.reconstructionMap.caseContexts[0].meaningPackageBinding = mb;
  source.provenance.sourcePackageJobBinding = ab;
  const mapCaption = source.reconstructionMap.captions[0], promptCaption = source.promptInput.captions[0];
  mapCaption.atomOccurrenceIds = meaning.captions[0].atomOccurrenceIds;
  const replacement = new Map<string, string>();
  mapCaption.boundaries = mapCaption.boundaries.filter((b: Json) => !removedIds.has(b.afterAtomOccurrenceId)).map((b: Json, i: number) => {
    const newId = `${promptCaption.captionId}-boundary-${String(i + 1).padStart(6, '0')}`;
    replacement.set(b.boundaryId, newId); return {...b, boundaryId: newId, ordinal: i + 1};
  });
  promptCaption.boundaryCandidates = promptCaption.boundaryCandidates.filter((b: Json) => replacement.has(b.boundaryId))
    .map((b: Json) => ({...b, boundaryId: replacement.get(b.boundaryId)}));
  pass(validatePresentationOutputCaptionCueSourcePackageV001(source), 'HUMAN_SOURCE_INVALID');
  const sb = add('sourcePackage', 'source-package', source);
  const selection = structuredClone(old.selection); selection.selectionId = `${ID}-selection`; selection.sourcePackageBinding = sb;
  selection.response.captions[0].cues = selection.response.captions[0].cues.slice(1).map((c: Json) => ({
    cueEndBoundaryId: replacement.get(c.cueEndBoundaryId), lineEndBoundaryIds: c.lineEndBoundaryIds.map((b: string) => replacement.get(b))}));
  const selb = add('selection', 'selection', selection);
  const digest = {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: selb.fileSha256, canonicalSha256: selb.canonicalSha256};
  const cue = pass(buildPresentationCueEndProjectionV001({projectionId: `${ID}-cue-end`, sourcePackageBinding: sb,
    sourceSelectionDigest: digest, producerJobBinding: ab, sourcePackage: source, selection}), 'HUMAN_CUE_INVALID').projection;
  const cb = add('cueEndProjection', 'cue-end-projection', cue,
    buildPresentationCueEndProjectionBindingV001({path: out('cue-end-projection'), projection: cue}));
  const line = pass(buildPresentationSemanticLineEndProjectionV001({projectionId: `${ID}-line-end`, sourcePackageBinding: sb,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: ab,
    sourcePackage: source, selection, cueEndProjection: cue}), 'HUMAN_LINE_INVALID').projection;
  const lb = add('lineEndProjection', 'line-end-projection', line,
    buildPresentationSemanticLineEndProjectionBindingV001({path: out('line-end-projection'), projection: line}));
  const instruction = pass(buildPresentationCaptionInstructionArtifactV002({artifactId: `${ID}-instruction`,
    sourceCaseId: source.reconstructionMap.caseContexts[0].caseId, meaningInformationPackageBinding: mb,
    timelineBinding: parent.baseMedia.timeline, cueEndProjectionBinding: cb, producerJobBinding: ab,
    styleProfileId: old.instruction.styleProfileId, meaningPackage: meaning, timeline, cueEndProjection: cue}), 'HUMAN_INSTRUCTION_INVALID').artifact;
  const ib = add('instruction', 'instruction', instruction,
    buildPresentationInstructionArtifactBindingV002({path: out('instruction'), artifact: instruction}));
  const job = structuredClone(old.rendererJob); job.jobId = `${ID}-renderer`; job.attemptId = ID;
  job.instructionArtifactBinding = ib; job.lineEndProjectionBinding = lb;
  job.publication = {admissionReceiptPath: out('admission-receipt'), lineLayoutPath: out('line-layout'), renderOutputRoot: `${REPAIR}/render`};
  pass(validatePresentationInstructionRendererJobV002(job), 'HUMAN_RENDERER_JOB_INVALID'); add('rendererJob', 'renderer-job', job);
  verifyRepairScopeV001(old, core, changes);
  return {parent, old, core, artifacts, timeline, generation, changes};
}

export function verifyRepairScopeV001(old: Json, core: Json, changes: Json[]) {
  assert.equal(core.instruction.instructions.length, 32);
  assert.equal(core.meaning.atomOccurrences.length + 9, old.meaning.atomOccurrences.length);
  for (const [i, a] of core.meaning.atomOccurrences.entries()) {
    const previous = structuredClone(old.meaning.atomOccurrences[i + 9]); previous.ordinal = i + 1;
    const ch = changes.find(c => c.originalObservation.targetBinding.atomOccurrenceIds.includes(a.atomOccurrenceId));
    if (ch) Object.assign(previous.retainedSpans[0], ch.interval);
    assert.deepEqual(a, previous, 'ATOM_TEXT_ID_OR_OTHER_TIMING_CHANGED');
  }
  for (const [i, ins] of core.instruction.instructions.entries()) {
    const previous = old.instruction.instructions[i + 1], ch = changes.find(c => c.originalOrdinal === i + 2);
    for (const k of ['semanticKind', 'content', 'targetProvenance', 'materialRefs']) assert.deepEqual(ins[k], previous[k], `CAPTION_${k}_CHANGED`);
    assert.deepEqual(ins.outputTime, ch?.expectedTime ?? previous.outputTime, 'UNAUTHORIZED_DISPLAY_FRAME_CHANGE');
    const newLines = core.selection.response.captions[0].cues[i].lineEndBoundaryIds;
    const oldLines = old.selection.response.captions[0].cues[i + 1].lineEndBoundaryIds;
    const resolve = (source: Json, ids: string[]) => ids.map(id => source.reconstructionMap.captions[0].boundaries
      .find((b: Json) => b.boundaryId === id).afterAtomOccurrenceId);
    assert.deepEqual(resolve(core.sourcePackage, newLines), resolve(old.sourcePackage, oldLines), 'LINE_END_SOURCE_ID_CHANGED');
  }
  const expectedJob = structuredClone(old.rendererJob);
  for (const k of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'publication']) expectedJob[k] = core.rendererJob[k];
  assert.deepEqual(core.rendererJob, expectedJob, 'BASE_MEDIA_STYLE_RUNTIME_RENDERER_CHANGED');
}

async function build() {
  const b = await reconstructHumanRepairV001();
  for (const [key, binding] of Object.entries(b.artifacts) as [string, Json][]) await publish(binding.path, b.core[key]);
  await publish(out('pre-render-verification'), {schemaVersion: 'digest-human-caption-pre-render-verification-v001', status: 'passed',
    artifacts: b.artifacts, checks: {parentReconstruction: 'exact', originalTextIdsAndSourceStt: 'unchanged',
      captionOnlyOmission: '9-atoms-explained-415-retained-original-media-424-unchanged', other30TextFramesLineBreaks: 'exact',
      humanFramesRoundTrip: '1723,2708-exact', oppositeEndpoints: '1794,2673-unchanged', baseMediaStyleRenderer: 'unchanged'},
    humanReview: 'pending-three-local-reviews'});
  console.log(JSON.stringify({status: 'ready-to-render', artifacts: b.artifacts}));
}
async function renderAndVerify() {
  const b = await reconstructHumanRepairV001();
  for (const [key, binding] of Object.entries(b.artifacts) as [string, Json][]) assert(same(b.core[key], await readBound(binding)));
  const rendered = await render(b.artifacts.rendererJob.path, {workspaceRoot: ROOT});
  const eb = await publish(out('renderer-result'), {schemaVersion: 'digest-human-caption-renderer-execution-v001',
    rendererJobBinding: b.artifacts.rendererJob, exitCode: rendered.exitCode, result: rendered.result});
  assert.equal(rendered.exitCode, 0); assert.equal(rendered.result?.status, 'completed'); assert.equal(rendered.result?.qc?.status, 'passed');
  const qc = rendered.result!.qc; assert.deepEqual(qc.violations, []);
  assert.equal(qc.mediaEvidence.observed.video.frameCount, b.timeline.baseMedia.expectedFrameCount);
  assert.equal(qc.mediaEvidence.observed.audio.packetPayloadSha256, b.generation.audio.encoded.packetPayloadSha256);
  const video = await exactFile(`${REPAIR}/render/presentation-rendered-v002.mp4`);
  assert.deepEqual(qc.instructionEvidence.map((r: Json) => r.instructionId), b.core.instruction.instructions.map((r: Json) => r.instructionId));
  for (const [i, row] of qc.instructionEvidence.entries()) {
    const interval = b.core.instruction.instructions[i].outputTime;
    assert(row.representativeFrame >= interval.startFrame && row.representativeFrame < interval.endFrameExclusive);
    assert.equal(row.applicationOverlayFile, row.inspectedOverlayFile); assert.equal(row.applicationOverlaySha256, row.overlaySha256);
    assert.equal((await exactFile(`${REPAIR}/render/${row.applicationOverlayFile}`)).fileSha256, row.overlaySha256);
  }
  const admission = await readJson(out('admission-receipt')); assert.equal(admission.status, 'accepted');
  const manifest = {schemaVersion: 'digest-human-caption-repair-manifest-v001', status: 'review-ready',
    parentManifest: bind(PARENT, b.parent), baseMedia: b.parent.baseMedia, artifacts: b.artifacts,
    renderer: {execution: eb, admission: bind(out('admission-receipt'), admission),
      lineLayout: bind(out('line-layout'), await readJson(out('line-layout'))), video, qc: 'passed'},
    checks: {formalInputReconstruction: 'exact', other30TextFramesLineBreaksSourceIds: 'exact',
      humanFrameProjection: 'exact', unchangedBaseMediaAndAudioPackets: 'exact', instructionOverlayBytes: '32-exact',
      sourceTextAccounting: '415-caption-atoms-plus-9-explicitly-omitted-equals-original-424'},
    counts: {captions: 32, unchangedCaptions: 30, retainedMediaRanges: b.timeline.segments.length,
      frameCount: qc.mediaEvidence.observed.video.frameCount, durationMs: qc.mediaEvidence.observed.durationMs},
    humanQuality: 'pending-three-local-reviews', operations: {newInference: 0, apiCommunication: 0, newMaterial: 0}};
  await publish(out('manifest'), manifest); console.log(JSON.stringify(manifest));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const op = process.argv[2];
  (op === 'build' ? build() : op === 'render' ? renderAndVerify() : Promise.reject(new Error('Expected build or render')))
    .catch(e => {console.error(e); process.exitCode = 1;});
}

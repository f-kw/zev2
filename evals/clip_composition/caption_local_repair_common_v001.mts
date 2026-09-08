import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile, lstat, mkdir, realpath, access} from 'node:fs/promises';
import type {
  CaptionRepairSourceV001 as Source, CaptionRepairTargetV001 as Target,
  CaptionRepairPurposeV001 as Purpose, CaptionRepairByteBindingV001 as ByteBinding,
  CaptionRepairFrameObservationV001 as FrameObservation, CaptionLocalRepairOperationV001 as Operation,
  CaptionLocalRepairObservationV001 as Observation, CaptionLocalRepairApprovalV001 as Approval,
} from '../../packages/shared/src/caption-local-repair-v001.js';
import {ROOT, bind, publish, fileSha, same, canonicalSha, pass, keys, type Json}
  from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {assembleAdoptedCaptionCoreV001, renderAdoptedVideoV001, CORE_FILES}
  from './adopted_media_manufacturing_v001.mts';
import {mapPresentationSourceIntervalV002} from './presentation_base_media_timeline_v004.mjs';
import {validatePresentationInstructionArtifactV002} from './presentation_instruction_artifact_v002.mjs';
import {validatePresentationOutputCaptionCueSourcePackageV001} from './presentation_output_caption_cue_source_package_v001.mjs';

const clone = <T,>(v: T): T => structuredClone(v);
const hash = (v: unknown) => canonicalSha(v);
const byteIdentity = (v: ByteBinding) => ({path: v.path, fileSha256: v.fileSha256});
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const equal = (a: unknown, b: unknown, reason: string) => assert(same(a, b), reason);
const fps = 30; // The existing Core's formal frame clock; no perceptual timing estimate.

export async function readRepairBoundBytesV001(ref: ByteBinding): Promise<Buffer> {
  assert(ref && /^[a-f0-9]{64}$/u.test(ref.fileSha256), 'INVALID_BINDING');
  assert(typeof ref.path === 'string' && !path.isAbsolute(ref.path)
    && ref.path.split('/').every(p => p !== '' && p !== '.' && p !== '..'), 'INVALID_PATH');
  const p = path.join(ROOT, ref.path);
  assert(!(await lstat(p)).isSymbolicLink(), 'SYMLINK_INPUT');
  assert((await realpath(p)) === p, 'SYMLINK_PARENT');
  const raw = await readFile(p);
  assert.equal((await import('node:crypto')).createHash('sha256').update(raw).digest('hex'), ref.fileSha256, 'BOUND_BYTES_CHANGED');
  return raw;
}
const readJsonBound = async (ref: ByteBinding) => JSON.parse((await readRepairBoundBytesV001(ref)).toString('utf8'));

interface ContextData {
  source: Source; sourceSha256: string; old: Json; timeline: Json; generation: Json;
  targets: Target[]; references: ByteBinding[];
}
export type CaptionRepairContextV001 = Readonly<{sourceId: string}>;
const contexts = new WeakMap<CaptionRepairContextV001, ContextData>();
const contextData = (token: CaptionRepairContextV001) => {
  const data = contexts.get(token); assert(data, 'VERIFIED_REPAIR_SOURCE_REQUIRED'); return data;
};

/** Reads admitted, immutable caption inputs. Does not re-run any historical candidate plan. */
export async function loadCaptionRepairContextV001(source: Source): Promise<CaptionRepairContextV001> {
  assert(keys(source, ['schemaVersion', 'sourceId', 'completedMedia', 'base', 'artifacts', 'audioPacketSha256', 'allowedTargets']));
  assert.equal(source.schemaVersion, 'caption-local-repair-source-v001');
  assert(/^[A-Za-z0-9._-]+$/u.test(source.sourceId), 'INVALID_SOURCE_ID');
  assert(keys(source.base, ['baseMedia', 'timeline', 'generationManifest', 'validationReceipt']));
  assert(keys(source.artifacts, ['meaning', 'sourcePackage', 'selection', 'instruction', 'rendererJob', 'lineEndProjection', 'cueEndProjection']));
  const references = [source.completedMedia, ...Object.values(source.base), ...Object.values(source.artifacts)];
  for (const ref of references) await readRepairBoundBytesV001(ref);
  for (const ref of [...Object.values(source.artifacts), source.base.timeline, source.base.generationManifest, source.base.validationReceipt]) {
    assert(keys(ref, ['schemaVersion', 'path', 'fileSha256', 'canonicalSha256']), 'FORMAL_BINDING_REQUIRED');
    equal(bind(ref.path, await readJsonBound(ref)), ref, 'FORMAL_BINDING_MISMATCH');
  }
  const old: Json = {};
  for (const [key, ref] of Object.entries(source.artifacts)) old[key] = await readJsonBound(ref);
  const timeline = await readJsonBound(source.base.timeline), generation = await readJsonBound(source.base.generationManifest);
  assert.equal(timeline.baseMedia.frameRate, '30/1', 'UNSUPPORTED_CORE_FRAME_CLOCK');
  assert.equal(timeline.baseMedia.fileSha256, source.base.baseMedia.fileSha256, 'BASE_MEDIA_MISMATCH');
  assert.equal(generation.audio.encoded.packetPayloadSha256, source.audioPacketSha256, 'AUDIO_PACKET_MISMATCH');
  assert(integer(generation.audio.sampleRate) && generation.audio.sampleRate > 0 && generation.audio.sampleRate % fps === 0, 'AUDIO_FRAME_GRID_MISMATCH');
  equal(old.rendererJob.cropAppliedBaseMedia, source.base, 'MEDIA_OR_ADOPTION_CHANGED');
  equal(byteIdentity(old.rendererJob.instructionArtifactBinding), byteIdentity(source.artifacts.instruction), 'FORMAL_INPUT_MISMATCH');
  equal(byteIdentity(old.rendererJob.lineEndProjectionBinding), byteIdentity(source.artifacts.lineEndProjection), 'LINE_INPUT_MISMATCH');
  for (const [key, ref] of [['meaningInformationPackage', source.artifacts.meaning], ['timeline', source.base.timeline], ['cueEndProjection', source.artifacts.cueEndProjection]] as const)
    equal(byteIdentity(old.instruction.sourceBindings[key]), byteIdentity(ref), 'FORMAL_INPUT_SOURCE_MISMATCH');
  pass(validatePresentationInstructionArtifactV002(old.instruction,
    {meaningPackage: old.meaning, timeline, cueEndProjection: old.cueEndProjection}), 'ORIGINAL_INSTRUCTION_INVALID');
  pass(validatePresentationOutputCaptionCueSourcePackageV001(old.sourcePackage), 'ORIGINAL_SOURCE_INVALID');
  // assembleAdoptedCaptionCoreV001 builds one admitted caption track per case.
  assert.equal(old.sourcePackage.promptInput.captions.length, 1, 'SINGLE_ADMITTED_CAPTION_TRACK_REQUIRED');
  assert.equal(old.meaning.captions.length, 1, 'SINGLE_ADMITTED_CAPTION_TRACK_REQUIRED');
  assert.equal(old.selection.response.captions.length, 1);
  assert.equal(old.selection.response.captions[0].cues.length, old.instruction.instructions.length);
  assert(Array.isArray(source.allowedTargets) && source.allowedTargets.length > 0, 'NO_AUTHORIZED_TARGETS');
  assert.equal(new Set(source.allowedTargets.map(t => t.instructionId)).size, source.allowedTargets.length, 'DUPLICATE_AUTHORIZATION');
  const targets = source.allowedTargets.map(allowed => {
    assert(keys(allowed, ['instructionId', 'operations', 'reviewWindow']));
    assert(allowed.operations.length > 0 && new Set(allowed.operations).size === allowed.operations.length);
    assert(allowed.operations.every(op => ['change-start', 'change-end', 'exclude-caption'].includes(op)));
    const ins = old.instruction.instructions.find((i: Json) => i.instructionId === allowed.instructionId);
    assert(ins, 'UNKNOWN_CAPTION');
    const w = allowed.reviewWindow;
    assert(keys(w, ['startFrame', 'endFrameExclusive']) && integer(w.startFrame) && integer(w.endFrameExclusive)
      && w.startFrame < w.endFrameExclusive && w.endFrameExclusive <= timeline.baseMedia.expectedFrameCount, 'INVALID_REVIEW_WINDOW');
    const atoms = ins.targetProvenance.atomOccurrenceIds.map((id: string) => old.meaning.atomOccurrences.find((a: Json) => a.atomOccurrenceId === id));
    assert(atoms.every(Boolean), 'MISSING_TEXT_ID');
    assert.equal(atoms.map((a: Json) => a.text).join(''), ins.content.text, 'TEXT_MISMATCH');
    const segments = new Set(atoms.flatMap((a: Json) => a.retainedSpans.map((s: Json) => s.timelineSegmentId)));
    assert.equal(segments.size, 1, 'CAPTION_MUST_BELONG_TO_ONE_ADMITTED_SEGMENT');
    return {instructionId: ins.instructionId, text: ins.content.text, textIds: clone(ins.targetProvenance.atomOccurrenceIds),
      currentFrames: clone(ins.outputTime), originalFormalInputSha256: source.artifacts.instruction.fileSha256,
      completedMediaSha256: source.completedMedia.fileSha256, baseMediaSha256: source.base.baseMedia.fileSha256,
      audioPacketSha256: source.audioPacketSha256, timelineSegmentId: [...segments][0] as string};
  });
  const token = Object.freeze({sourceId: source.sourceId});
  contexts.set(token, clone({source, sourceSha256: hash(source), old, timeline, generation, targets, references}));
  return token;
}
export function describeCaptionRepairV001(context: CaptionRepairContextV001) {
  const c = contextData(context);
  return clone({sourceId: c.source.sourceId, sourceSha256: c.sourceSha256, targets: c.targets,
    allowedTargets: c.source.allowedTargets, framesPerSecond: fps, audioSampleRate: c.generation.audio.sampleRate,
    frameCount: c.timeline.baseMedia.expectedFrameCount});
}
export function captionRepairSourceSnapshotV001(context: CaptionRepairContextV001) { return clone(contextData(context)); }

interface SessionData {
  context: CaptionRepairContextV001; purpose: Purpose; evidence: ByteBinding[];
  frames: Map<string, FrameObservation>; records: Map<string, Observation>;
}
export type CaptionRepairSessionV001 = Readonly<{sessionId: string}>;
const sessions = new WeakMap<CaptionRepairSessionV001, SessionData>();
function sessionData(s: CaptionRepairSessionV001) { const d = sessions.get(s); assert(d, 'TRUSTED_SESSION_REQUIRED'); return d; }

/** Purpose is selected by the host, never by a browser request or a supplied observation. */
export async function createCaptionRepairSessionV001(context: CaptionRepairContextV001, purpose: Purpose, evidence: ByteBinding[] = []) {
  contextData(context); assert(['human-observation', 'fixture-replay', 'ui-verification'].includes(purpose));
  if (purpose === 'fixture-replay') assert(evidence.length > 0, 'PINNED_FIXTURE_EVIDENCE_REQUIRED');
  if (purpose === 'human-observation') assert.equal(evidence.length, 0, 'FIXTURE_CANNOT_BE_HUMAN_OBSERVATION');
  for (const ref of evidence) await readRepairBoundBytesV001(ref);
  const token = Object.freeze({sessionId: randomUUID()});
  sessions.set(token, {context, purpose, evidence: clone(evidence), frames: new Map(), records: new Map()});
  return token;
}

/** A browser frame callback or a pinned historical replay supplies this observation.
 * No ms input is accepted. The issuer stores the exact receipt before it can be referenced. */
export function observeCaptionRepairFrameV001(session: CaptionRepairSessionV001, instructionId: string,
  presentedVideoFrame: number, boundaryKind: 'frame-start' | 'after-final-frame' = 'frame-start') {
  const s = sessionData(session), c = contextData(s.context), target = c.targets.find(t => t.instructionId === instructionId);
  assert(target, 'UNAUTHORIZED_CAPTION');
  assert(integer(presentedVideoFrame), 'NONINTEGER_OR_NEGATIVE_FRAME');
  assert(['frame-start', 'after-final-frame'].includes(boundaryKind), 'UNKNOWN_BOUNDARY_KIND');
  const allowed = c.source.allowedTargets.find(t => t.instructionId === instructionId)!;
  assert(presentedVideoFrame >= allowed.reviewWindow.startFrame && presentedVideoFrame < allowed.reviewWindow.endFrameExclusive, 'FRAME_NOT_IN_REVIEW_WINDOW');
  const segment = c.timeline.segments.find((row: Json) => row.segmentId === target.timelineSegmentId);
  const gen = c.generation.segments.find((row: Json) => row.segmentId === target.timelineSegmentId);
  const selectedVideoFrame = boundaryKind === 'after-final-frame' ? presentedVideoFrame + 1 : presentedVideoFrame;
  if (boundaryKind === 'after-final-frame') assert.equal(selectedVideoFrame, c.timeline.baseMedia.expectedFrameCount, 'NOT_AFTER_FINAL_FRAME');
  assert(selectedVideoFrame >= segment.outputStartFrame && selectedVideoFrame <= segment.outputEndFrame, 'FRAME_OUTSIDE_ADMITTED_SEGMENT');
  const outputAudioSample = selectedVideoFrame * c.generation.audio.sampleRate / fps;
  const row: FrameObservation = {observationId: randomUUID(), target: clone(target), presentedVideoFrame,
    selectedVideoFrame, boundaryKind, outputAudioSample,
    sourceAudioSample: gen.audioSamples.sourceStart + outputAudioSample - gen.audioSamples.outputStart,
    sourceVideoFrame: segment.sourceStartFrame30 + selectedVideoFrame - segment.outputStartFrame,
    purpose: s.purpose, evidence: clone(s.evidence)};
  s.frames.set(row.observationId, clone(row)); return row;
}

function validateOperation(s: SessionData, operation: Operation) {
  const c = contextData(s.context), target = c.targets.find(t => t.instructionId === operation?.target?.instructionId);
  assert(target, 'UNAUTHORIZED_CAPTION'); equal(operation.target, target, 'CAPTION_TEXT_MEDIA_OR_FORMAL_INPUT_MISMATCH');
  const allowed = c.source.allowedTargets.find(t => t.instructionId === target.instructionId)!;
  if (operation.kind === 'exclude-caption') {
    assert(keys(operation, ['kind', 'target', 'reason', 'confirmedText']), 'EXCLUSION_BOUNDARY_CONFUSION');
    assert(allowed.operations.includes('exclude-caption'), 'EXCLUSION_NOT_AUTHORIZED');
    assert(typeof operation.reason === 'string' && operation.reason.trim().length > 0, 'EXCLUSION_REASON_REQUIRED');
    assert.equal(operation.confirmedText, target.text, 'EXCLUDED_TEXT_NOT_CONFIRMED');
    return {kind: operation.kind, target: clone(target), reason: operation.reason} as Json;
  }
  assert.equal(operation.kind, 'change-boundaries', 'UNKNOWN_REPAIR_OPERATION');
  assert(keys(operation, ['kind', 'target', 'start', 'end']), 'EXCLUSION_BOUNDARY_CONFUSION');
  const frames = clone(target.currentFrames), observed: Json = {};
  for (const side of ['start', 'end'] as const) {
    const endpoint = operation[side];
    if (endpoint?.mode === 'keep-current') {assert(keys(endpoint, ['mode']), 'KEEP_CANNOT_CONTAIN_OBSERVATION'); continue;}
    assert(keys(endpoint, ['mode', 'observation']) && endpoint.mode === 'observed', 'OBSERVED_ENDPOINT_REQUIRED');
    assert(allowed.operations.includes(side === 'start' ? 'change-start' : 'change-end'), 'ENDPOINT_NOT_AUTHORIZED');
    const issued = s.frames.get(endpoint.observation?.observationId);
    assert(issued, 'UNOBSERVED_FRAME'); equal(endpoint.observation, issued, 'OBSERVATION_OR_AUDIO_SAMPLE_CHANGED');
    equal(issued.target, target, 'OBSERVATION_CAPTION_MISMATCH');
    assert.equal(issued.purpose, s.purpose, 'FIXTURE_PURPOSE_MISMATCH');
    if (issued.boundaryKind === 'after-final-frame') assert.equal(side, 'end', 'FINAL_FRAME_END_ONLY');
    frames[side === 'start' ? 'startFrame' : 'endFrameExclusive'] = issued.selectedVideoFrame;
    observed[side] = clone(issued);
  }
  assert(Object.keys(observed).length > 0, 'NO_BOUNDARY_OBSERVATION');
  assert(integer(frames.startFrame) && integer(frames.endFrameExclusive) && frames.startFrame < frames.endFrameExclusive, 'NONPOSITIVE_CAPTION_INTERVAL');
  const atoms = target.textIds.map(id => c.old.meaning.atomOccurrences.find((a: Json) => a.atomOccurrenceId === id));
  const spans = atoms.flatMap((a: Json) => a.retainedSpans);
  const segment = c.timeline.segments.find((seg: Json) => seg.segmentId === target.timelineSegmentId);
  assert(spans.every((sp: Json) => sp.timelineSegmentId === segment.segmentId));
  const interval = {timelineSegmentId: segment.segmentId,
    sourceStartMs: Math.min(...spans.map((sp: Json) => sp.sourceStartMs)),
    sourceEndMs: Math.max(...spans.map((sp: Json) => sp.sourceEndMs))};
  for (const side of ['start', 'end'] as const) if (observed[side]) {
    const frame = observed[side].selectedVideoFrame;
    // Preserve admitted edge values exactly. Interior values invert the existing Core clock.
    interval[side === 'start' ? 'sourceStartMs' : 'sourceEndMs'] = frame === segment.outputStartFrame ? segment.sourceStartMs
      : frame === segment.outputEndFrame ? segment.sourceEndMs
      : Math.round((segment.sourceStartFrame30 + frame - segment.outputStartFrame) * 1000 / fps + c.timeline.sourceFrameClock.videoPresentationOffsetMs);
  }
  const mapping = pass(mapPresentationSourceIntervalV002(c.timeline, interval.sourceStartMs, interval.sourceEndMs), 'HUMAN_FRAME_CORE_BRIDGE_FAILED').mapping;
  equal({startFrame: mapping.startFrame, endFrameExclusive: mapping.endFrameExclusive}, frames, 'FRAME_ROUND_TRIP_FAILED');
  return {kind: operation.kind, target: clone(target), frames, coreSourceInterval: interval, observed};
}

export function saveCaptionRepairObservationV001(session: CaptionRepairSessionV001, operation: Operation): Observation {
  const s = sessionData(session), c = contextData(s.context); validateOperation(s, operation);
  const row: Observation = {schemaVersion: 'caption-local-repair-observation-v001', observationId: randomUUID(),
    sessionId: session.sessionId, sourceSha256: c.sourceSha256, purpose: s.purpose,
    operation: clone(operation), evidence: clone(s.evidence), status: 'saved-not-adopted'};
  s.records.set(row.observationId, clone(row)); return row;
}
export function savedCaptionRepairObservationsV001(session: CaptionRepairSessionV001) { return clone([...sessionData(session).records.values()]); }

export type ValidatedCaptionRepairV001 = Readonly<{validationId: string}>;
interface ValidatedData {session: CaptionRepairSessionV001; records: Observation[]; changes: Json[]; sourceSha256: string; purpose: Purpose}
const validated = new WeakMap<ValidatedCaptionRepairV001, ValidatedData>();
export function validateCaptionLocalRepairV001(session: CaptionRepairSessionV001, records: Observation[]) {
  const s = sessionData(session), c = contextData(s.context);
  assert(Array.isArray(records) && records.length > 0, 'NO_REPAIR_OBSERVATIONS');
  const ids = new Set<string>();
  const changes = records.map(row => {
    assert(keys(row, ['schemaVersion', 'observationId', 'sessionId', 'sourceSha256', 'purpose', 'operation', 'evidence', 'status']));
    const saved = s.records.get(row.observationId); assert(saved, 'UNSAVED_OBSERVATION');
    equal(row, saved, 'OBSERVATION_REPLACED_OR_FIXTURE_DISGUISED');
    assert.equal(row.status, 'saved-not-adopted'); assert.equal(row.purpose, s.purpose);
    assert.equal(row.sessionId, session.sessionId); assert.equal(row.sourceSha256, c.sourceSha256);
    assert(!ids.has(row.operation.target.instructionId), 'DUPLICATE_CAPTION_OPERATION'); ids.add(row.operation.target.instructionId);
    return validateOperation(s, row.operation);
  });
  const remaining = c.old.instruction.instructions.filter((ins: Json) => !changes.some(ch => ch.target.instructionId === ins.instructionId && ch.kind === 'exclude-caption'));
  assert(remaining.length > 0, 'EMPTY_CAPTION_TRACK_UNSUPPORTED_BY_CORE');
  const frames = remaining.map((ins: Json) => changes.find(ch => ch.target.instructionId === ins.instructionId)?.frames ?? ins.outputTime);
  for (let i = 1; i < frames.length; i++) assert(frames[i-1].endFrameExclusive <= frames[i].startFrame, 'CAPTIONS_OVERLAP');
  const token = Object.freeze({validationId: randomUUID()});
  validated.set(token, {session, records: clone(records), changes: clone(changes), sourceSha256: c.sourceSha256, purpose: s.purpose});
  return token;
}
export function captionRepairApprovalDraftV001(token: ValidatedCaptionRepairV001): Approval {
  const v = validated.get(token); assert(v, 'VALIDATION_REQUIRED');
  return {schemaVersion: 'caption-local-repair-approval-v001', sessionId: v.session.sessionId,
    sourceSha256: v.sourceSha256, observationSha256s: v.records.map(hash), purpose: v.purpose, action: 'approve-local-repair'};
}
export type AdoptedCaptionRepairV001 = Readonly<{adoptionId: string}>;
const adopted = new WeakMap<AdoptedCaptionRepairV001, {validated: ValidatedData; approval: Approval}>();
/** Explicit approved operation is separate from both observation and validation. */
export function adoptCaptionLocalRepairV001(token: ValidatedCaptionRepairV001, approval: Approval) {
  const v = validated.get(token); assert(v, 'VALIDATION_REQUIRED');
  equal(approval, captionRepairApprovalDraftV001(token), 'EXACT_REPAIR_APPROVAL_REQUIRED');
  const result = Object.freeze({adoptionId: randomUUID()});
  adopted.set(result, {validated: {...v, records: clone(v.records), changes: clone(v.changes)}, approval: clone(approval)});
  return result;
}

/** Rendering payload comparison preserves text identities, exact frame intervals and line ends.
 * Artifact IDs and hash references belong to each new provenance graph and are compared separately. */
export function captionRepairEffectiveInputsV001(core: Json) {
  const map = new Map(core.sourcePackage.reconstructionMap.captions[0].boundaries.map((b: Json) => [b.boundaryId, b.afterAtomOccurrenceId]));
  const cues = core.selection.response.captions[0].cues;
  return {styleProfileId: core.instruction.styleProfileId, instructions: core.instruction.instructions.map((ins: Json, i: number) => ({
    semanticKind: ins.semanticKind, content: clone(ins.content), outputTime: clone(ins.outputTime),
    targetProvenance: clone(ins.targetProvenance), materialRefs: clone(ins.materialRefs),
    cueEndTextId: map.get(cues[i].cueEndBoundaryId), lineEndTextIds: cues[i].lineEndBoundaryIds.map((id: string) => map.get(id)),
  }))};
}

export function verifyCaptionRepairScopeV001(context: CaptionRepairContextV001, core: Json, token: AdoptedCaptionRepairV001) {
  const a = adopted.get(token); assert(a, 'REPAIR_ADOPTION_REQUIRED');
  const v = a.validated, c = contextData(context); assert.equal(sessionData(v.session).context, context, 'ADOPTION_SOURCE_MISMATCH');
  const exclusions = new Set(v.changes.filter(ch => ch.kind === 'exclude-caption').map(ch => ch.target.instructionId));
  const oldInput = captionRepairEffectiveInputsV001(c.old), nextInput = captionRepairEffectiveInputsV001(core);
  const expectedRows = oldInput.instructions.flatMap((row: Json, index: number) => {
    const id = c.old.instruction.instructions[index].instructionId;
    if (exclusions.has(id)) return [];
    const ch = v.changes.find(ch => ch.target.instructionId === id);
    return [{...row, outputTime: ch ? ch.frames : row.outputTime}];
  });
  equal(nextInput, {...oldInput, instructions: expectedRows}, 'UNAUTHORIZED_CAPTION_TEXT_FRAME_OR_LINE_CHANGE');
  const removedIds = new Set(v.changes.filter(ch => ch.kind === 'exclude-caption').flatMap(ch => ch.target.textIds));
  const expectedAtoms = clone(c.old.meaning.atomOccurrences).filter((atom: Json) => !removedIds.has(atom.atomOccurrenceId));
  expectedAtoms.forEach((atom: Json, i: number) => {
    atom.ordinal = i + 1;
    const ch = v.changes.find(ch => ch.kind === 'change-boundaries' && ch.target.textIds.includes(atom.atomOccurrenceId));
    if (ch) atom.retainedSpans = [clone(ch.coreSourceInterval)];
  });
  equal(core.meaning.atomOccurrences, expectedAtoms, 'UNAUTHORIZED_MEANING_OR_SOURCE_CHANGE');
  for (const field of ['orderedSegments', 'orderedCandidates']) if (c.old.meaning[field]) {
    const expected = clone(c.old.meaning[field]);
    for (const row of expected) row.atomOccurrenceIds = row.atomOccurrenceIds.filter((id: string) => !removedIds.has(id));
    equal(core.meaning[field], expected, 'ADOPTED_MEDIA_SELECTION_CHANGED');
  }
  const oldJob = clone(c.old.rendererJob);
  for (const field of ['jobId', 'attemptId', 'instructionArtifactBinding', 'lineEndProjectionBinding', 'publication']) oldJob[field] = core.rendererJob[field];
  equal(core.rendererJob, oldJob, 'MEDIA_AUDIO_SEGMENTS_RENDERER_STYLE_OR_QC_CHANGED');
  equal(core.instruction.sourceBindings.timeline, c.source.base.timeline, 'TIMELINE_CHANGED');
  return {status: 'passed', remainingCaptions: expectedRows.length, excludedCaptions: exclusions.size,
    changedCaptions: v.changes.length - exclusions.size, mediaAudioAndAdoptedSegments: 'unchanged', rendererStyleAndQc: 'unchanged'};
}

export async function reconstructCaptionLocalRepairV001(token: AdoptedCaptionRepairV001, outputRoot: string, artifactId: string) {
  const a = adopted.get(token); assert(a, 'REPAIR_ADOPTION_REQUIRED');
  assert(/^[A-Za-z0-9._-]+$/u.test(artifactId));
  assert(outputRoot.startsWith('evals/clip_composition/outputs/') && outputRoot.split('/').every(p => p && p !== '.' && p !== '..'), 'NEW_OUTPUT_ROOT_REQUIRED');
  const v = a.validated, s = sessionData(v.session), c = contextData(s.context);
  for (const ref of [...c.references, ...s.evidence]) await readRepairBoundBytesV001(ref);
  assert(!c.references.some(ref => ref.path === outputRoot || ref.path.startsWith(outputRoot + '/')), 'HISTORICAL_OUTPUT_OVERWRITE');
  const out = (file: string) => `${outputRoot}/${file}`;
  const adoption = {schemaVersion: 'caption-local-repair-adoption-v001', artifactId: `${artifactId}-adoption`,
    purpose: v.purpose, newHumanJudgment: v.purpose === 'human-observation',
    originalSource: clone(c.source), originalSourceSha256: c.sourceSha256,
    validation: {status: 'passed', observationSha256s: v.records.map(hash)}, approval: clone(a.approval),
    observations: clone(v.records), changes: clone(v.changes),
    semantics: 'human frame observations or explicit caption-track exclusion; no media editing or timing inference'};
  const ab = bind(out('caption-adoption.json'), adoption);
  const removed = new Set(v.changes.filter(ch => ch.kind === 'exclude-caption').flatMap(ch => ch.target.textIds));
  const meaning = clone(c.old.meaning);
  meaning.schemaVersion = 'caption-local-repair-meaning-input-v001'; meaning.artifactId = `${artifactId}-meaning`;
  meaning.originalMeaningBinding = clone(c.source.artifacts.meaning); meaning.humanTimingAdoptionBinding = ab;
  meaning.timingInterpretation = 'caption display spans follow validated repair adoption; original recognition is retained in originalMeaningBinding';
  if (meaning.captionTimingBinding) {meaning.originalCaptionTimingBinding = meaning.captionTimingBinding; delete meaning.captionTimingBinding;}
  meaning.atomOccurrences = meaning.atomOccurrences.filter((atom: Json) => !removed.has(atom.atomOccurrenceId));
  meaning.atomOccurrences.forEach((atom: Json, i: number) => {
    atom.ordinal = i + 1;
    const ch = v.changes.find(ch => ch.kind === 'change-boundaries' && ch.target.textIds.includes(atom.atomOccurrenceId));
    if (ch) atom.retainedSpans = [clone(ch.coreSourceInterval)];
  });
  for (const rows of [meaning.captions, meaning.orderedSegments, meaning.orderedCandidates].filter(Boolean))
    for (const row of rows) row.atomOccurrenceIds = row.atomOccurrenceIds.filter((id: string) => !removed.has(id));
  const atoms = new Map(meaning.atomOccurrences.map((atom: Json) => [atom.atomOccurrenceId, atom]));
  for (const row of meaning.captions) row.text = row.atomOccurrenceIds.map((id: string) => (atoms.get(id) as Json).text).join('');
  const mb = bind(out('meaning-input.json'), meaning), source = clone(c.old.sourcePackage);
  source.packageId = `${artifactId}-source-package`; source.reconstructionMap.meaningPackageBindings = [mb];
  source.reconstructionMap.caseContexts[0].meaningPackageBinding = mb;
  source.reconstructionMap.caseContexts[0].caseId = artifactId; source.provenance.sourcePackageJobBinding = ab;
  const mapCaption = source.reconstructionMap.captions[0], promptCaption = source.promptInput.captions[0];
  mapCaption.atomOccurrenceIds = mapCaption.atomOccurrenceIds.filter((id: string) => !removed.has(id));
  const replacements = new Map<string, string>();
  mapCaption.boundaries = mapCaption.boundaries.filter((b: Json) => !removed.has(b.afterAtomOccurrenceId)).map((b: Json, i: number) => {
    const boundaryId = `${promptCaption.captionId}-boundary-${String(i+1).padStart(6, '0')}`;
    replacements.set(b.boundaryId, boundaryId); return {...b, boundaryId, ordinal: i+1};
  });
  promptCaption.boundaryCandidates = promptCaption.boundaryCandidates.filter((b: Json) => replacements.has(b.boundaryId))
    .map((b: Json) => ({...b, boundaryId: replacements.get(b.boundaryId)}));
  const cues = c.old.selection.response.captions[0].cues.filter((_: Json, i: number) => !v.changes.some(ch =>
    ch.kind === 'exclude-caption' && ch.target.instructionId === c.old.instruction.instructions[i].instructionId)).map((cue: Json) => ({
      cueEndBoundaryId: replacements.get(cue.cueEndBoundaryId), lineEndBoundaryIds: cue.lineEndBoundaryIds.map((id: string) => replacements.get(id))}));
  pass(validatePresentationOutputCaptionCueSourcePackageV001(source), 'REPAIR_SOURCE_INVALID');
  const config = {plan: {planId: artifactId, outputRoot}, rendererTemplate: c.old.rendererJob};
  const core = await assembleAdoptedCaptionCoreV001(config, {meaning, sourcePackage: source}, c.source.base, adoption, [{cues}]);
  const scope = verifyCaptionRepairScopeV001(s.context, core, token);
  const artifacts = Object.fromEntries(Object.entries(CORE_FILES).map(([key, file]) => [key, bind(out(file), core[key])]));
  const rebuilt = {context: s.context, token, config, core, artifacts, scope};
  rebuiltSeals.set(rebuilt, hash({config, core, artifacts, scope}));
  return rebuilt;
}
export type RebuiltCaptionRepairV001 = Awaited<ReturnType<typeof reconstructCaptionLocalRepairV001>>;
const rebuiltSeals = new WeakMap<RebuiltCaptionRepairV001, string>();
function assertRebuiltSeal(b: RebuiltCaptionRepairV001) {
  assert.equal(rebuiltSeals.get(b), hash({config: b.config, core: b.core, artifacts: b.artifacts, scope: b.scope}), 'REBUILT_INPUT_OR_DESTINATION_CHANGED');
  verifyCaptionRepairScopeV001(b.context, b.core, b.token);
}

/** The only new publication/render path; both techniques call it. Existing outputs are never overwritten. */
export async function publishCaptionLocalRepairV001(b: RebuiltCaptionRepairV001) {
  assertRebuiltSeal(b);
  const parent = path.dirname(path.join(ROOT, b.config.plan.outputRoot));
  await mkdir(parent, {recursive: true});
  assert.equal(await realpath(parent), parent, 'SYMLINK_OUTPUT_PARENT');
  try {await access(path.join(ROOT, b.config.plan.outputRoot)); assert.fail('OUTPUT_ALREADY_EXISTS');}
  catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  for (const [key, ref] of Object.entries(b.artifacts) as [string, Json][]) await publish(ref.path, b.core[key]);
  await publish(`${b.config.plan.outputRoot}/scope-verification.json`, {
    schemaVersion: 'caption-local-repair-scope-verification-v001', ...b.scope,
    effectiveInputs: captionRepairEffectiveInputsV001(b.core), artifacts: b.artifacts,
    purpose: b.core.captionAdoption.purpose, newHumanJudgment: b.core.captionAdoption.newHumanJudgment});
}
export async function renderCaptionLocalRepairV001(b: RebuiltCaptionRepairV001) {
  assertRebuiltSeal(b);
  const c = contextData(b.context);
  for (const ref of c.references) await readRepairBoundBytesV001(ref);
  for (const [key, ref] of Object.entries(b.artifacts) as [string, ByteBinding][]) equal(await readJsonBound(ref), b.core[key], 'PUBLISHED_INPUT_CHANGED');
  const renderer = await renderAdoptedVideoV001(b.config, b.artifacts, 'caption-local-repair-renderer-execution-v001');
  const execution = await readJsonBound(renderer.execution), qc = execution.result.qc;
  assert.equal(qc.status, 'passed'); assert.deepEqual(qc.violations, []);
  assert.equal(qc.mediaEvidence.observed.video.frameCount, c.timeline.baseMedia.expectedFrameCount, 'VIDEO_FRAMES_CHANGED');
  assert.equal(qc.mediaEvidence.observed.audio.packetPayloadSha256, c.source.audioPacketSha256, 'AUDIO_PACKETS_CHANGED');
  return renderer;
}

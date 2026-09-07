import {mkdir, copyFile, chmod, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
  ROOT, bind, readJson, publish, pass, fail, same, canonicalSha, sha, formal, fileSha,
  type Json,
} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {
  inspectPresentationBaseMediaSourceV002 as inspectSource,
  validatePresentationBaseMediaSegmentPlanV002 as segmentPlan,
  buildPresentationBaseMediaVideoV001 as buildVideo,
  buildPresentationBaseMediaAudioV001 as buildAudio,
  muxPresentationBaseMediaV001 as mux,
  inspectPresentationBaseMediaOutputV001 as inspectOutput,
  inspectPresentationBaseMediaToolProfileV001 as inspectTools,
  inspectPresentationBaseMediaToolBinaryDiagnosticsV001 as inspectBinaries,
  validatePresentationBaseMediaBuildJobV001 as validateManufacturingJob,
  validatePresentationBaseMediaGenerationManifestV003 as validateManifest,
  inspectPresentationBaseMediaTimelineQcV002 as timelineQc,
  validatePresentationBaseMediaHashGraphV001 as validateHashGraph,
  PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE as expectedTools,
} from './presentation_base_media_build_v003.mjs';
import {PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES as trustedSourceFiles}
  from './presentation_base_media_timeline_v004.mjs';
import {
  assertCaptionDisplayInputV001, assertCaptionDisplayResultV001, runCaptionDisplayBoundariesV001,
} from '../../runner/src/skills/caption-display-boundaries-v001.js';
import {validatePresentationOutputCaptionCueSourcePackageV001 as validateSourcePackage}
  from './presentation_output_caption_cue_source_package_v001.mjs';
import {
  buildPresentationCueEndProjectionV001 as cueProjection,
  buildPresentationCueEndProjectionBindingV001 as cueBinding,
  buildPresentationSemanticLineEndProjectionV001 as lineProjection,
  buildPresentationSemanticLineEndProjectionBindingV001 as lineBinding,
} from './presentation_cue_end_projection_v001.mjs';
import {
  buildPresentationCaptionInstructionArtifactV002 as instructionArtifact,
  buildPresentationInstructionArtifactBindingV002 as instructionBinding,
} from './presentation_instruction_artifact_v002.mjs';
import {buildPresentationRendererLineLayoutV002 as lineLayout}
  from './presentation_renderer_line_layout_rule_v002.mjs';
import {codePointWeightV001} from './presentation_renderer_text_layout_v001.mjs';
import {validatePresentationInstructionRendererJobV002 as validateRendererJob}
  from './presentation_renderer_admission_receipt_v002.mjs';
import {
  runPresentationInstructionRendererJobFileV002 as render,
  resolvePresentationRendererAppearanceV001 as appearance,
} from './run_presentation_instruction_renderer_job_v002.ts';
import {readBound, keys} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

import {verifyInternalAdoptionV001, type InternalContext as Context} from './run_candidate_internal_edit_v001.mts';
import {judgeThroughStdinV001} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {resolveAcousticCueV001, retainUnresolvedTimingV001} from './digest_acoustic_timing_validation_v001.mts';
import assert from 'node:assert/strict';
const exec = promisify(execFile);
const out = (c: Context, p: string) => `${c.plan.outputRoot}/${p}`;
const abs = (p: string) => path.join(ROOT, p);
const clone = <T>(v: T): T => structuredClone(v);

/** 指示-002/004の機械採用を確認し、既存Coreの製造・検査関数へそのまま接続する。 */
export async function buildInternalBaseMediaV001(c: Context) {
  const {adoption, editPlan} = await verifyInternalAdoptionV001(c);
  const ad = bind(out(c, 'machine-adoption.json'), adoption);
  const ep = bind(out(c, 'edit-plan.json'), editPlan);
  const source = {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
    sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo};
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${c.plan.planId}-manufacturing-values`, assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: source, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = {schemaVersion: 'candidate-internal-edit-core-invocation-v001',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding, machineAdoptionBinding: ad,
    editPlanBinding: ep, manufacturingValuesBinding: jb,
    admission: 'candidate-internal-retention-and-acoustic-adoption-v001',
    legacyHumanApprovalJobEntry: 'not-invoked', individualCandidateHumanApproval: 'not-performed',
    adapterBinding: c.plan.implementationBindings.find((v: Json) => v.path.endsWith('candidate_internal_edit_core_v001.mts'))};
  const invocationBinding = await publish(out(c, 'core-invocation.json'), invocation);
  const observedTools = await inspectTools();
  if (!same(observedTools, expectedTools)) fail('CORE_TOOL_PROFILE_MISMATCH');
  const binaryDiagnostics = await inspectBinaries();
  for (const v of trustedSourceFiles) {
    if (await fileSha(abs(v.path)) !== v.fileSha256) fail('CORE_TRUSTED_SOURCE_CHANGED');
  }
  const base = out(c, 'base-media'), work = out(c, 'base-media-work');
  await mkdir(abs(base), {recursive: false});
  await mkdir(abs(work), {recursive: false});
  const sourceSnapshot = abs(`${work}/source-snapshot.mp4`);
  await copyFile(abs(source.path), sourceSnapshot);
  await chmod(sourceSnapshot, 0o444);
  if (await fileSha(sourceSnapshot) !== source.fileSha256) fail('SOURCE_SNAPSHOT_MISMATCH');
  const media = await inspectSource(sourceSnapshot);
  await publish(out(c, 'source-media-inspection.json'), {
    schemaVersion: 'candidate-internal-edit-source-inspection-v001', sourceVideoBinding: c.plan.request.sourceVideo,
    observedTools, binaryDiagnostics, media,
  });
  const segments = editPlan.segments.map((r: Json) => ({sourceStartMs: r.sourceStartMs, sourceEndMs: r.sourceEndMs}));
  const validated = pass(segmentPlan(segments, {fps: media.fps, decodedFrameCount: media.decodedFrameCount,
    logicalFrameCount: media.logicalFrameCount, presentationOffsetMs: media.videoClock.presentationOffsetMs},
  media.audioClock), 'CORE_SEGMENT_MAPPING_INVALID');
  const mappings = validated.mappings;
  const buildHash = canonicalSha({invocationBinding, sourceSha256: source.fileSha256, mappings});
  const buildId = `base-media-build-${buildHash.slice(0, 24)}`;
  const intermediate = abs(`${work}/video-only.mp4`), basePath = abs(`${base}/base-media.mp4`);
  const videoBuild = await buildVideo(sourceSnapshot, intermediate, media.fps, mappings);
  const audioData = await buildAudio(sourceSnapshot, abs(work), media.audioClock, mappings);
  const audioMux = await mux(intermediate, basePath, media.audioClock, audioData);
  const inspected = await inspectOutput(basePath, mappings.at(-1).outputEndFrame, media.audioClock, audioData);
  const baseHash = await fileSha(basePath);
  const timeline = {
    schemaVersion: 'presentation-base-media-timeline-v003', timelineId: `timeline-${buildHash.slice(0, 24)}`,
    sourceProvenance: source.sourceProvenance, sourceRef: source.sourceRef,
    sourceFrameClock: {inputFrameRate: `${media.fps}/1`, logicalFrameRate: '30/1',
      extractionRuleId: media.fps === 60 ? 'source-frame-60fps-global-even-v001' : 'source-frame-30fps-identity-v001',
      decodedFrameCount: media.decodedFrameCount, containerStartTimeMs: media.videoClock.containerStartTimeMs,
      videoStreamTimeBase: media.videoClock.streamTimeBase, videoFirstPts: media.videoClock.firstPts,
      videoPtsStep: media.videoClock.ptsStep, videoPresentationOffsetMs: media.videoClock.presentationOffsetMs},
    baseMedia: {artifactId: `base-media-${buildHash.slice(0, 24)}`, path: 'base-media.mp4',
      fileSha256: baseHash, frameRate: '30/1', expectedFrameCount: mappings.at(-1).outputEndFrame},
    segments: mappings.map(({audioSamples, ...v}: Json) => v),
  };
  const tb = await publish(`${base}/timeline.json`, timeline);
  const replacements = new Map([[sourceSnapshot, '<SOURCE_MEDIA>'], [intermediate, '<TEMP_VIDEO>'],
    [audioData.sourceGridPath, '<SOURCE_GRID>'], [audioData.encodePath, '<ENCODE_PCM>'], [basePath, '<BASE_MEDIA>']]);
  const normalized = (args: string[]) => args.map(a => replacements.get(a) ?? a);
  const commands = [{stage: 'video-build', tool: 'ffmpeg', arguments: normalized(videoBuild.args), filterGraph: videoBuild.graph}];
  if (audioData.present) commands.push(
    {stage: 'audio-grid', tool: 'ffmpeg', arguments: normalized(audioData.gridArguments), filterGraph: null as any},
    {stage: 'audio-mux', tool: 'ffmpeg', arguments: normalized(audioMux.args), filterGraph: null as any});
  const corePaths = ['evals/clip_composition/presentation_base_media_build_v003.mjs',
    'evals/clip_composition/presentation_base_media_timeline_v004.mjs'];
  const manifest = {
    schemaVersion: 'presentation-base-media-generation-manifest-v003', buildId,
    job: {jobId: manufacturingJob.jobId, schemaVersion: manufacturingJob.schemaVersion, fileSha256: jb.fileSha256},
    source: {...source, streamConfiguration: media.source.streamConfiguration, video: media.source.video, audio: media.source.audio},
    // この参照は機械採用正本。許可recordは固定planの事前許可であり、個別区間目視の主張ではない。
    assemblyDecision: {decisionId: adoption.artifactId, fileSha256: ad.fileSha256,
      payloadSha256: canonicalSha(adoption), approvalRecordId: c.authorization.recordId},
    basisEditPlan: {kind: 'edit_plan_json', path: ep.path, fileSha256: ep.fileSha256}, segments: mappings,
    audio: audioData.present ? {
      present: true, sampleRate: media.audioClock.sampleRate, channels: media.audioClock.channels,
      channelLayout: media.audioClock.channelLayout, channelOrder: media.audioClock.channels === 1 ? ['FC'] : ['FL', 'FR'],
      canonicalPcmFormat: {sampleFormat: 'f32le', packing: 'interleaved'}, insertedSilenceSpans: media.audioClock.spans,
      sourceGrid: {sampleCount: audioData.sourceGridSampleCount, byteCount: audioData.sourceGridByteCount,
        payloadSha256: audioData.sourceGridPayloadSha256, decodedSampleCount: audioData.decodedSourceGridSampleCount,
        decodedTailPaddingSampleCount: audioData.decodedTailPaddingSampleCount},
      encodeInput: {sampleCount: audioData.encodeSampleCount, byteCount: audioData.encodeByteCount,
        payloadSha256: audioData.encodePayloadSha256},
      encoded: {codec: inspected.audio.codec, bitRate: '192k', movieTimeScale: 30,
        ...Object.fromEntries(['timeBase', 'startPts', 'durationTs', 'containerDurationSamples',
          'presentationDurationSamples', 'videoPresentationDurationSamples', 'trailingVideoOnlySampleCount',
          'tailPolicy', 'rawDecodedSampleCount', 'effectiveDecodedSampleCount', 'effectiveDecodedPayloadSha256',
          'packetPayloadSha256', 'skipSamples', 'discardPadding', 'encoderDelay'].map(k => [k, inspected.audio[k]]))},
    } : {present: false},
    execution: {commands, trustedSourceFiles: clone(trustedSourceFiles)},
    tools: {expected: {...expectedTools}, observed: observedTools, binaryDiagnostics},
    versions: {generatorVersion: 'presentation-base-media-builder-v003', timelineCheckerVersion: 'presentation-base-media-timeline-checker-v004'},
    git: {head: (await exec('git', ['rev-parse', 'HEAD'], {cwd: ROOT})).stdout.trim(),
      dirty: (await exec('git', ['status', '--porcelain=v1', '--untracked-files=normal'], {cwd: ROOT})).stdout.length > 0},
    implementationFiles: await Promise.all(corePaths.map(async p => ({path: p, fileSha256: await fileSha(abs(p))}))),
    outputs: {baseMedia: {artifactId: timeline.baseMedia.artifactId, path: 'base-media.mp4', fileSha256: baseHash,
      frameRate: '30/1', frameCount: inspected.frameCount, audioPacketPayloadSha256: audioData.present ? inspected.audio.packetPayloadSha256 : null},
    timeline: {timelineId: timeline.timelineId, schemaVersion: timeline.schemaVersion, path: 'timeline.json', fileSha256: tb.fileSha256}},
    excludedLegacyFields: ['screenLayout', 'telopPlan'],
  };
  pass(validateManifest(manifest), 'CORE_MANIFEST_INVALID');
  timelineQc(timeline, manifest, {fileSha256: baseHash, frameCount: inspected.frameCount, timelineFileSha256: tb.fileSha256});
  const mb = await publish(`${base}/generation-manifest.json`, manifest);
  const receipt = {schemaVersion: 'candidate-internal-edit-base-media-validation-v001', status: 'passed',
    coreInvocationBinding: invocationBinding, machineAdoptionBinding: ad, editPlanBinding: ep,
    checks: {machineAdoptionReconstruction: 'passed', sourceSnapshotSha: 'passed', formalRangeProjection: 'passed',
      videoQc: 'passed', audioQc: 'passed', timelineQc: 'passed'},
    individualCandidateHumanApproval: 'not-performed', humanQuality: 'not-evaluated',
    outputs: {baseMedia: {path: `${base}/base-media.mp4`, fileSha256: baseHash},
      timeline: tb, generationManifest: mb},
    decodedFramePayloadSha256: inspected.decodedFramePayloadSha256,
    encodeInputPayloadSha256: audioData.present ? audioData.encodePayloadSha256 : null,
  };
  pass(validateHashGraph({timeline, manifest, report: receipt, baseMediaFileSha256: baseHash,
    timelineFileSha256: tb.fileSha256, manifestFileSha256: mb.fileSha256}), 'CORE_HASH_GRAPH_INVALID');
  const rb = await publish(`${base}/validation-receipt.json`, receipt);
  // この呼出が作った一時PCM・source copyだけを処分する。元媒体・正式成果物には作用しない。
  await rm(abs(work), {recursive: true});
  return {baseMedia: receipt.outputs.baseMedia, timeline: tb, generationManifest: mb, validationReceipt: rb};
}

/** 表示判断へ渡す確定本文。音響時刻は表示の意味判断にも渡さない。 */
export function internalCaptionTextV001(c: Context, adoption: Json) {
  const byId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utterance = new Map<number, string>();
  c.utterances.utterances.forEach((u: Json) => u.sourceSegmentIds.forEach((id: number) => utterance.set(id, u.utteranceId)));
  const atoms: Json[] = [], groups: Json[] = [];
  const captionId = `${c.plan.planId}-caption`, inputCaptionId = `${c.plan.planId}-input-caption`;
  for (const segment of adoption.segments) {
    const ids: string[] = [];
    for (const id of segment.sourceSegmentIds) {
      const s = byId.get(id);
      assert(s && utterance.has(id));
      const atomOccurrenceId = `${c.plan.planId}-atom-${String(atoms.length + 1).padStart(6, '0')}`;
      atoms.push({atomOccurrenceId, ordinal: atoms.length + 1, text: s.text, sourceSegmentId: id,
        semanticUtteranceId: utterance.get(id)});
      ids.push(atomOccurrenceId);
    }
    groups.push({candidateId: segment.candidateId, timelineSegmentId: segment.segmentId, atomOccurrenceIds: ids});
  }
  const textInput = {schemaVersion: 'candidate-internal-edit-caption-text-v001', artifactId: `${c.plan.planId}-caption-text`,
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    transcriptBinding: c.plan.request.transcript, utteranceBinding: c.plan.request.utterances,
    sourceVideoBinding: c.plan.request.sourceVideo, orderedSegments: groups, atomOccurrences: atoms,
    captions: [{captionId, ordinal: 1, text: atoms.map(a => a.text).join(''), atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}]};
  const boundaries = atoms.map((a, i) => ({boundaryId: `${inputCaptionId}-boundary-${String(i + 1).padStart(6, '0')}`, text: a.text}));
  const promptInput = clone(c.captionStyleTemplate.promptInput);
  promptInput.captions = [{captionId: inputCaptionId, boundaryCandidates: boundaries}];
  assertCaptionDisplayInputV001(promptInput);
  let offset = 0;
  const requests = groups.map((group, i) => {
    const input = clone(promptInput), count = group.atomOccurrenceIds.length;
    input.captions = [{captionId: `${inputCaptionId}-segment-${i + 1}`, boundaryCandidates: boundaries.slice(offset, offset + count)}];
    offset += count;
    return {schemaVersion: 'candidate-internal-edit-display-request-v001', requestId: `${c.plan.planId}-display-${i + 1}`,
      planBinding: c.planBinding, machineAdoptionBinding: textInput.machineAdoptionBinding,
      textInputBinding: bind(out(c, 'caption-text-input.json'), textInput),
      candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId,
      input, inputCanonicalSha256: canonicalSha(input)};
  });
  return {textInput, promptInput, requests};
}

export function validateInternalDisplayV001(request: Json, response: Json, result: Json) {
  assertCaptionDisplayInputV001(request.input); assertCaptionDisplayResultV001(result);
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'candidate-internal-edit-display-response-v001'
    && response.requestFileSha256 === sha(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.length > 0
    && request.inputCanonicalSha256 === canonicalSha(request.input), 'DISPLAY_PROVENANCE_MISMATCH');
  assert.equal(result.answer.status, 'complete', 'DISPLAY_ABSTAINED');
  assert.equal(result.answer.captions.length, 1);
  const caption = request.input.captions[0], answer = result.answer.captions[0];
  assert.equal(answer.captionId, caption.captionId);
  const boundaries = caption.boundaryCandidates;
  const index = new Map<string, number>(boundaries.map((b: Json, i: number) => [b.boundaryId, i]));
  let previous = -1;
  for (const cue of answer.cues) {
    const end = index.get(cue.cueEndBoundaryId);
    assert(end !== undefined && end > previous, 'DISPLAY_CUE_MEMBERSHIP_OR_ORDER');
    assert(cue.lineEndBoundaryIds.length <= request.input.styleLimits.maxLinesPerCue, 'DISPLAY_TOO_MANY_LINES');
    let lineStart = previous;
    for (const lineId of cue.lineEndBoundaryIds) {
      const lineEnd = index.get(lineId);
      assert(lineEnd !== undefined && lineEnd > lineStart && lineEnd <= end, 'DISPLAY_LINE_MEMBERSHIP_OR_ORDER');
      const text = boundaries.slice(lineStart + 1, lineEnd + 1).map((b: Json) => b.text).join('');
      const width = [...text].reduce((sum, char) => sum + codePointWeightV001(char, request.input.styleLimits.characterWidthRule), 0);
      assert(width <= request.input.styleLimits.maxLogicalWidthPerLine, 'DISPLAY_LINE_TOO_WIDE');
      lineStart = lineEnd;
    }
    assert.equal(lineStart, end, 'DISPLAY_LINE_END_MISSING');
    const text = boundaries.slice(previous + 1, end + 1).map((b: Json) => b.text).join('');
    const width = [...text].reduce((sum, char) => sum + codePointWeightV001(char, request.input.styleLimits.characterWidthRule), 0);
    assert(width > request.input.styleLimits.maxLogicalWidthPerLine || cue.lineEndBoundaryIds.length === 1, 'UNNECESSARY_LINE_BREAK');
    previous = end;
  }
  assert.equal(previous, boundaries.length - 1, 'DISPLAY_FULL_COVERAGE_REQUIRED');
  return clone({request, response, result, cues: answer.cues});
}

export async function constructInternalCaptionCoreV001(c: Context, adoption: Json, base: Json, traces: Json[]) {
  const text = internalCaptionTextV001(c, adoption);
  assert.equal(traces.length, text.requests.length);
  const checked = traces.map((t, i) => {
    assert(same(t.request, text.requests[i]), 'DISPLAY_REQUEST_CHANGED');
    return validateInternalDisplayV001(t.request, t.response, t.result);
  });
  const byId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const atoms = clone(text.textInput.atomOccurrences), cueRows: Json[] = [];
  let offset = 0;
  checked.forEach((t, i) => {
    const segment = adoption.segments[i], boundaries = t.request.input.captions[0].boundaryCandidates;
    const index = new Map<string, number>(boundaries.map((b: Json, j: number) => [b.boundaryId, j]));
    let start = 0;
    t.cues.forEach((cue: Json) => {
      const end = index.get(cue.cueEndBoundaryId)!;
      const selected = atoms.slice(offset + start, offset + end + 1), sourceIds = selected.map((a: Json) => a.sourceSegmentId);
      const original = {sourceStartMs: byId.get(sourceIds[0])!.startMs, sourceEndMs: byId.get(sourceIds.at(-1)!)!.endMs};
      cueRows.push({unitId: `${c.plan.planId}-caption-timing-${cueRows.length + 1}`,
        timelineSegmentId: segment.segmentId, atomOccurrenceIds: selected.map((a: Json) => a.atomOccurrenceId),
        text: selected.map((a: Json) => a.text).join(''), oldStartMs: original.sourceStartMs, oldEndMs: original.sourceEndMs,
        resolution: resolveAcousticCueV001(sourceIds, c.chunks, segment, original)});
      start = end + 1;
    });
    offset += boundaries.length;
  });
  const rows = retainUnresolvedTimingV001(cueRows);
  for (const row of rows) {
    const segment = adoption.segments.find((s: Json) => s.segmentId === row.timelineSegmentId), r = row.resolution;
    assert(r.sourceStartMs >= segment.sourceStartMs && r.sourceEndMs <= segment.sourceEndMs
      && r.sourceStartMs < r.sourceEndMs, 'DISPLAY_TIMING_NOT_CONTAINED_IN_NEW_COMPOSITION');
    for (const id of row.atomOccurrenceIds) {
      const atom = atoms.find((a: Json) => a.atomOccurrenceId === id)!;
      atom.captionTimingUnitId = row.unitId;
      atom.originalTranscriptTime = {startMs: byId.get(atom.sourceSegmentId)!.startMs, endMs: byId.get(atom.sourceSegmentId)!.endMs};
      atom.retainedSpans = [{timelineSegmentId: row.timelineSegmentId, sourceStartMs: r.sourceStartMs, sourceEndMs: r.sourceEndMs}];
    }
  }
  const displayJudgments = checked.map((t, i) => ({request: bind(out(c, `display-${i + 1}-request.json`), t.request),
    response: bind(out(c, `display-${i + 1}-response.json`), t.response), result: bind(out(c, `display-${i + 1}-result.json`), t.result)}));
  const timing = {schemaVersion: 'candidate-internal-edit-caption-timing-v001', artifactId: `${c.plan.planId}-caption-timing`,
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption), acousticValidationBinding: c.plan.acousticValidation,
    displayJudgments, policy: 'observed-cue-endpoints-with-explicit-unresolved-transcript-endpoints; no-character-interpolation',
    humanSync: 'not-evaluated', cues: rows};
  const timingBinding = bind(out(c, 'caption-timing.json'), timing);
  const meaning = {...text.textInput, schemaVersion: 'candidate-internal-edit-meaning-input-v001', artifactId: `${c.plan.planId}-meaning`,
    textInputBinding: bind(out(c, 'caption-text-input.json'), text.textInput), captionTimingBinding: timingBinding,
    timingGranularity: 'display-cue-envelope; individual-character-acoustic-times-are-not-claimed', atomOccurrences: atoms};
  const meaningBinding = bind(out(c, 'meaning-input.json'), meaning);
  const sourcePackage = clone(c.captionStyleTemplate);
  sourcePackage.packageId = `${c.plan.planId}-source-package`; sourcePackage.promptInput = text.promptInput;
  const context = clone(sourcePackage.reconstructionMap.caseContexts[0]);
  const inputCaptionId = text.promptInput.captions[0].captionId, boundaries = text.promptInput.captions[0].boundaryCandidates;
  context.caseId = c.plan.planId; context.inputCaptionId = inputCaptionId;
  context.meaningPackageBinding = meaningBinding; context.baseMediaInput = base;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding],
    captions: [{captionId: inputCaptionId, meaningPackageOrdinal: 1, semanticCaptionId: meaning.captions[0].captionId,
      atomOccurrenceIds: atoms.map((a: Json) => a.atomOccurrenceId),
      boundaries: boundaries.map((b: Json, i: number) => ({boundaryId: b.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId}))}],
    caseContexts: [context]};
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: c.plan.implementationBindings.map((b: Json, i: number) => ({role: `internal-edit-source-${i + 1}`, ...b})),
    approvedContractBindings: [c.plan.authorization]};
  pass(validateSourcePackage(sourcePackage), 'INTERNAL_CAPTION_SOURCE_INVALID');
  const sourceBinding = bind(out(c, 'source-package.json'), sourcePackage);
  const captionAdoption = {schemaVersion: 'candidate-internal-edit-caption-adoption-v001', artifactId: `${c.plan.planId}-caption-adoption`,
    machineAdoptionBinding: timing.machineAdoptionBinding, meaningInputBinding: meaningBinding,
    captionTimingBinding: timingBinding, displayJudgments, quality: 'human-review-pending'};
  const producer = bind(out(c, 'caption-adoption.json'), captionAdoption);
  const selection = {schemaVersion: 'presentation-output-caption-cue-selection-v001', selectionId: `${c.plan.planId}-selection`,
    sourcePackageBinding: sourceBinding,
    response: {captions: [{captionId: inputCaptionId, cues: checked.flatMap(t => t.cues)}]}};
  const sb = bind(out(c, 'selection.json'), selection), digest = {schemaVersion: selection.schemaVersion,
    artifactId: selection.selectionId, fileSha256: sb.fileSha256, canonicalSha256: sb.canonicalSha256};
  const cue = pass(cueProjection({projectionId: `${c.plan.planId}-cue-end`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: digest, producerJobBinding: producer, sourcePackage, selection}), 'CUE_INVALID').projection;
  const cb = cueBinding({path: out(c, 'cue-end-projection.json'), projection: cue});
  const line = pass(lineProjection({projectionId: `${c.plan.planId}-line-end`, sourcePackageBinding: sourceBinding,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: producer,
    sourcePackage, selection, cueEndProjection: cue}), 'LINE_INVALID').projection;
  const lb = lineBinding({path: out(c, 'line-end-projection.json'), projection: line});
  const timeline = await readBound(base.timeline);
  const instruction = pass(instructionArtifact({artifactId: `${c.plan.planId}-instruction`, sourceCaseId: c.plan.planId,
    meaningInformationPackageBinding: meaningBinding, timelineBinding: base.timeline, cueEndProjectionBinding: cb,
    producerJobBinding: producer, styleProfileId: context.resolvedStyle.presetId,
    meaningPackage: meaning, timeline, cueEndProjection: cue}), 'INSTRUCTION_INVALID').artifact;
  const ib = instructionBinding({path: out(c, 'instruction.json'), artifact: instruction});
  const style = await readBound(c.rendererTemplate.registryBindings.styleProfileRegistry),
    trust = await readBound(c.rendererTemplate.registryBindings.rendererTrust);
  const resolved = pass(appearance({instructionArtifact: instruction, styleProfileRegistry: style,
    visualStateId: c.rendererTemplate.executionInputs.visualStateId}), 'STYLE_INVALID');
  const maxLogicalWidth = resolved.profile.maxLogicalWidth ?? resolved.visualState.layout?.maxCharsPerLine,
    maxLines = resolved.profile.maxLines ?? resolved.visualState.layout?.maxLines;
  assert.equal(sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine, maxLogicalWidth);
  assert.equal(sourcePackage.promptInput.styleLimits.maxLinesPerCue, maxLines);
  assert.equal(sourcePackage.promptInput.styleLimits.characterWidthRule, trust.layoutRules.characterWidthRule);
  pass(lineLayout({layoutId: `${c.plan.planId}-preflight-layout`, instructionArtifactBinding: ib, instructionArtifact: instruction,
    meaningPackage: meaning, lineEndProjection: line, lineEndSourcePackage: sourcePackage, maxLogicalWidth, maxLines,
    characterWidthRule: trust.layoutRules.characterWidthRule, lineLayoutRules: c.rendererTemplate.executionInputs.lineLayoutRules}), 'LAYOUT_INVALID');
  const rendererJob = clone(c.rendererTemplate);
  rendererJob.jobId = `${c.plan.planId}-renderer`; rendererJob.attemptId = c.plan.planId;
  rendererJob.instructionArtifactBinding = ib; rendererJob.lineEndProjectionBinding = lb;
  rendererJob.cropAppliedBaseMedia = clone(base);
  rendererJob.publication = {admissionReceiptPath: out(c, 'admission-receipt.json'), lineLayoutPath: out(c, 'line-layout.json'), renderOutputRoot: out(c, 'render')};
  pass(validateRendererJob(rendererJob), 'RENDERER_JOB_INVALID');
  return {timing, meaning, sourcePackage, captionAdoption, selection, cueEndProjection: cue, lineEndProjection: line, instruction, rendererJob};
}

export const INTERNAL_CORE_FILES = {timing: 'caption-timing.json', meaning: 'meaning-input.json', sourcePackage: 'source-package.json',
  captionAdoption: 'caption-adoption.json', selection: 'selection.json', cueEndProjection: 'cue-end-projection.json',
  lineEndProjection: 'line-end-projection.json', instruction: 'instruction.json', rendererJob: 'renderer-job.json'};
export async function executeInternalCaptionsV001(c: Context, adoption: Json, base: Json) {
  const text = internalCaptionTextV001(c, adoption);
  await publish(out(c, 'caption-text-input.json'), text.textInput);
  const traces: Json[] = [];
  for (const [i, request] of text.requests.entries()) {
    await publish(out(c, `display-${i + 1}-request.json`), request);
    let response: Json | undefined;
    const result = await runCaptionDisplayBoundariesV001(request.input, async input => {
      assert(same(input, request.input)); response = await judgeThroughStdinV001(request);
      await publish(out(c, `display-${i + 1}-response.json`), response!); return response!.answer;
    });
    await publish(out(c, `display-${i + 1}-result.json`), result);
    traces.push(validateInternalDisplayV001(request, response!, result));
  }
  const current = await import('./run_candidate_internal_edit_v001.mts');
  const fresh = await current.loadInternalContextV001(c.planBinding.path);
  assert(same(fresh.planBinding, c.planBinding)); await verifyInternalAdoptionV001(fresh);
  const core = await constructInternalCaptionCoreV001(fresh, adoption, base, traces), artifacts: Json = {};
  for (const [name, filename] of Object.entries(INTERNAL_CORE_FILES)) artifacts[name] = await publish(out(c, filename), core[name as keyof typeof core]);
  return {artifacts, displayJudgments: core.captionAdoption.displayJudgments,
    reusedSkill: c.plan.implementationBindings.find((b: Json) => b.path === 'runner/src/skills/caption-display-boundaries-v001.ts')};
}
export async function renderInternalEditV001(c: Context, artifacts: Json) {
  const result = await render(artifacts.rendererJob.path, {workspaceRoot: ROOT});
  const execution = await publish(out(c, 'renderer-result.json'), {schemaVersion: 'candidate-internal-edit-renderer-execution-v001',
    rendererJobBinding: artifacts.rendererJob, exitCode: result.exitCode, result: result.result});
  assert(result.exitCode === 0 && result.result?.status === 'completed' && result.result?.qc?.status === 'passed', 'RENDER_OR_QC_FAILED');
  return {execution, admission: bind(out(c, 'admission-receipt.json'), await readJson(out(c, 'admission-receipt.json'))),
    lineLayout: bind(out(c, 'line-layout.json'), await readJson(out(c, 'line-layout.json'))), qc: 'passed',
    video: {path: out(c, 'render/presentation-rendered-v002.mp4'), fileSha256: await fileSha(abs(out(c, 'render/presentation-rendered-v002.mp4')))}};
}

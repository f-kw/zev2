import {mkdir, copyFile, chmod, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
  ROOT, bind, readJson, publish, pass, fail, same, canonicalSha, sha, formal, fileSha,
  validateCandidateAdoptionV001, promoteCandidateAdoptionV001,
  type Context, type Json,
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

const exec = promisify(execFile);
const out = (c: Context, p: string) => `${c.plan.outputRoot}/${p}`;
const abs = (p: string) => path.join(ROOT, p);
const clone = <T>(v: T): T => structuredClone(v);

/** 保存された新規判断から採用を毎回再構築する。採用済み印だけでは製造しない。 */
export async function verifyDigestAdoptionV001(c: Context) {
  const [request, response, result, adoption, editPlan] = await Promise.all([
    readJson(out(c, 'candidate-request.json')), readJson(out(c, 'candidate-response.json')),
    readJson(out(c, 'candidate-result.json')), readJson(out(c, 'machine-adoption.json')),
    readJson(out(c, 'edit-plan.json')),
  ]);
  const expected = promoteCandidateAdoptionV001(validateCandidateAdoptionV001(c, request, response, result));
  if (!same(adoption, expected.adoption) || !same(editPlan, expected.editPlan)) fail('ADOPTION_RECONSTRUCTION_MISMATCH');
  return {adoption, editPlan};
}

/**
 * 指示-001の専用接続。旧個別人間承認job入口とそのvalidatorは呼ばない／変更しない。
 * 製造値だけは既存job schemaへ投影するが、参照先は新しい機械採用schemaのまま。
 * 人間個別承認への変換はない。実際に用いたCore製造関数・検査と専用接続の来歴を別々に束縛する。
 */
export async function buildDigestBaseMediaV001(c: Context) {
  const {adoption, editPlan} = await verifyDigestAdoptionV001(c);
  const ad = bind(out(c, 'machine-adoption.json'), adoption);
  const ep = bind(out(c, 'edit-plan.json'), editPlan);
  const source = {sourceProvenance: 'existing-repository-media', sourceRef: c.plan.request.sourceId,
    sourceUri: c.utterances.sourceUri, ...c.plan.request.sourceVideo};
  const manufacturingJob = {schemaVersion: 'presentation-base-media-build-job-v001',
    jobId: `${c.plan.planId}-manufacturing-values`, assemblyDecision: {path: ad.path, fileSha256: ad.fileSha256},
    sourceArtifact: source, outputDirectory: out(c, 'base-media')};
  pass(validateManufacturingJob(manufacturingJob), 'MANUFACTURING_VALUES_INVALID');
  const jb = await publish(out(c, 'manufacturing-values.json'), manufacturingJob);
  const invocation = {schemaVersion: 'candidate-digest-core-invocation-v001',
    authorizationBinding: c.plan.authorization, planBinding: c.planBinding, machineAdoptionBinding: ad,
    editPlanBinding: ep, manufacturingValuesBinding: jb,
    admission: 'candidate-digest-validated-machine-adoption-v001',
    legacyHumanApprovalJobEntry: 'not-invoked', individualCandidateHumanApproval: 'not-performed',
    adapterBinding: c.plan.implementationBindings.find((v: Json) => v.path.endsWith('candidate_digest_core_adapter_v001.mts'))};
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
    schemaVersion: 'candidate-digest-source-inspection-v001', sourceVideoBinding: c.plan.request.sourceVideo,
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
  const receipt = {schemaVersion: 'candidate-digest-base-media-validation-v001', status: 'passed',
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

// 字幕とrendererへの接続は、採用した本文片をそのまま投影する。
export function buildDigestCaptionInputsV001(c: Context, adoption: Json, base: Json) {
  const bySourceId = new Map<number, Json>(c.transcript.segments.map((s: Json) => [s.id, s]));
  const utteranceFor = new Map<number, string>();
  c.utterances.utterances.forEach((u: Json) => u.sourceSegmentIds.forEach((id: number) => utteranceFor.set(id, u.utteranceId)));
  const atoms: Json[] = [];
  const groups: Json[] = [];
  for (const candidate of adoption.selectedCandidates) {
    const atomIds = [];
    for (const id of candidate.sourceSegmentIds) {
      const s = bySourceId.get(id);
      if (!s || !utteranceFor.has(id) || s.startMs < candidate.sourceInterval.sourceStartMs
        || s.endMs > candidate.sourceInterval.sourceEndMs) fail('CAPTION_ATOM_SOURCE_MISMATCH');
      const atomId = `${c.plan.planId}-atom-${String(atoms.length + 1).padStart(6, '0')}`;
      atoms.push({atomOccurrenceId: atomId, ordinal: atoms.length + 1, text: s.text,
        sourceSegmentId: id, semanticUtteranceId: utteranceFor.get(id),
        retainedSpans: [{timelineSegmentId: candidate.timelineSegmentId, sourceStartMs: s.startMs, sourceEndMs: s.endMs}]});
      atomIds.push(atomId);
    }
    groups.push({candidateId: candidate.candidateId, timelineSegmentId: candidate.timelineSegmentId, atomOccurrenceIds: atomIds});
  }
  const captionId = `${c.plan.planId}-caption`, inputCaptionId = `${c.plan.planId}-input-caption`;
  const meaning = {schemaVersion: 'candidate-digest-presentation-meaning-input-v001', artifactId: `${c.plan.planId}-meaning`,
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adoption),
    transcriptBinding: c.plan.request.transcript, utteranceBinding: c.plan.request.utterances,
    sourceVideoBinding: c.plan.request.sourceVideo, orderedCandidates: groups, atomOccurrences: atoms,
    captions: [{captionId, ordinal: 1, text: atoms.map(a => a.text).join(''), atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId)}]};
  const meaningBinding = bind(out(c, 'meaning-input.json'), meaning);
  const boundaries = atoms.map((a, i) => ({boundaryId: `${inputCaptionId}-boundary-${String(i + 1).padStart(6, '0')}`, text: a.text}));
  const sourcePackage = clone(c.captionStyleTemplate);
  sourcePackage.packageId = `${c.plan.planId}-source-package`;
  sourcePackage.promptInput.captions = [{captionId: inputCaptionId, boundaryCandidates: boundaries}];
  const caseContext = clone(sourcePackage.reconstructionMap.caseContexts[0]);
  caseContext.caseId = c.plan.planId;
  caseContext.inputCaptionId = inputCaptionId;
  caseContext.meaningPackageBinding = meaningBinding;
  caseContext.baseMediaInput = base;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding],
    captions: [{captionId: inputCaptionId, meaningPackageOrdinal: 1, semanticCaptionId: captionId,
      atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId),
      boundaries: boundaries.map((b, i) => ({boundaryId: b.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId}))}],
    caseContexts: [caseContext]};
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: c.plan.implementationBindings.map((v: Json, i: number) => ({role: `digest-source-${i + 1}`, ...v})),
    approvedContractBindings: [c.plan.authorization]};
  pass(validateSourcePackage(sourcePackage), 'DIGEST_CAPTION_SOURCE_INVALID');
  assertCaptionDisplayInputV001(sourcePackage.promptInput);
  let offset = 0;
  const requests = groups.map((group, i) => {
    const count = group.atomOccurrenceIds.length;
    const input = clone(sourcePackage.promptInput);
    input.captions = [{captionId: `${inputCaptionId}-segment-${i + 1}`, boundaryCandidates: boundaries.slice(offset, offset + count)}];
    offset += count;
    assertCaptionDisplayInputV001(input);
    return {schemaVersion: 'candidate-digest-display-request-v001', requestId: `${c.plan.planId}-display-${i + 1}`,
      planBinding: c.planBinding, machineAdoptionBinding: meaning.machineAdoptionBinding,
      meaningInputBinding: meaningBinding, candidateId: group.candidateId, timelineSegmentId: group.timelineSegmentId,
      input, inputCanonicalSha256: canonicalSha(input)};
  });
  return {meaning, sourcePackage, requests};
}

const displayTokens = new WeakMap<object, Json>();
export function validateDigestDisplayV001(request: Json, response: Json, result: unknown) {
  assertCaptionDisplayInputV001(request.input);
  assertCaptionDisplayResultV001(result);
  const r = result as Json;
  if (!keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    || response.schemaVersion !== 'candidate-digest-display-response-v001'
    || response.requestFileSha256 !== sha(formal(request)) || !same(response.answer, r.answer)
    || typeof response.judgmentNote !== 'string' || !response.judgmentNote.length
    || request.inputCanonicalSha256 !== canonicalSha(request.input)) fail('DISPLAY_PROVENANCE_MISMATCH');
  if (r.answer.status !== 'complete' || r.answer.captions.length !== 1
    || r.answer.captions[0].captionId !== request.input.captions[0].captionId) fail('DISPLAY_ANSWER_MEMBERSHIP_INVALID');
  const caption = request.input.captions[0], boundaries = caption.boundaryCandidates;
  const indices = new Map(boundaries.map((b: Json, i: number) => [b.boundaryId, i]));
  let previousCue = -1;
  for (const cue of r.answer.captions[0].cues) {
    const end = indices.get(cue.cueEndBoundaryId) as number | undefined;
    if (end === undefined || end <= previousCue) fail('DISPLAY_CUE_ORDER_INVALID');
    if (cue.lineEndBoundaryIds.length > request.input.styleLimits.maxLinesPerCue) fail('DISPLAY_LINES_EXCEEDED');
    let previousLine = previousCue;
    for (const line of cue.lineEndBoundaryIds) {
      const e = indices.get(line) as number | undefined;
      if (e === undefined || e <= previousLine || e > end) fail('DISPLAY_LINE_ORDER_INVALID');
      const lineText = boundaries.slice(previousLine + 1, e + 1).map((b: Json) => b.text).join('');
      const width = [...lineText].reduce((sum, char) => sum + codePointWeightV001(char, request.input.styleLimits.characterWidthRule), 0);
      if (width > request.input.styleLimits.maxLogicalWidthPerLine) fail('DISPLAY_WIDTH_EXCEEDED');
      previousLine = e;
    }
    if (previousLine !== end) fail('DISPLAY_LINE_END_MISSING');
    const cueText = boundaries.slice(previousCue + 1, end + 1).map((b: Json) => b.text).join('');
    const width = [...cueText].reduce((sum, char) => sum + codePointWeightV001(char, request.input.styleLimits.characterWidthRule), 0);
    if (width <= request.input.styleLimits.maxLogicalWidthPerLine && cue.lineEndBoundaryIds.length !== 1) fail('UNNECESSARY_LINE_BREAK');
    previousCue = end;
  }
  if (previousCue !== boundaries.length - 1) fail('DISPLAY_FULL_COVERAGE_REQUIRED');
  const token = Object.freeze({status: 'validated-display-for-review'});
  displayTokens.set(token, clone({request, response, result, cues: r.answer.captions[0].cues}));
  return token;
}

export async function constructDigestCaptionCoreV001(c: Context, adopted: Json, base: Json, tokens: object[]) {
  const input = buildDigestCaptionInputsV001(c, adopted, base);
  if (tokens.length !== input.requests.length) fail('DISPLAY_RESULTS_MISSING');
  const traces = tokens.map((t, i) => {
    const v = displayTokens.get(t);
    if (!v || !same(v.request, input.requests[i])) fail('VALIDATED_DISPLAY_REQUIRED');
    return clone(v);
  });
  const sourcePackage = input.sourcePackage;
  const sourceBinding = bind(out(c, 'source-package.json'), sourcePackage);
  const coreAdoption = {schemaVersion: 'candidate-digest-caption-adoption-v001',
    machineAdoptionBinding: bind(out(c, 'machine-adoption.json'), adopted),
    meaningInputBinding: bind(out(c, 'meaning-input.json'), input.meaning),
    displayJudgments: traces.map((v, i) => ({candidateId: v.request.candidateId,
      request: bind(out(c, `display-${i + 1}-request.json`), v.request),
      response: bind(out(c, `display-${i + 1}-response.json`), v.response),
      result: bind(out(c, `display-${i + 1}-result.json`), v.result),
      cueEndBoundaryIds: v.cues.map((x: Json) => x.cueEndBoundaryId)})),
    composition: 'validated-display-cues-in-adopted-source-order', quality: 'not-evaluated'};
  const producer = bind(out(c, 'caption-adoption.json'), coreAdoption);
  const selection = {schemaVersion: 'presentation-output-caption-cue-selection-v001',
    selectionId: `${c.plan.planId}-selection`, sourcePackageBinding: sourceBinding,
    response: {captions: [{captionId: sourcePackage.promptInput.captions[0].captionId,
      cues: traces.flatMap(v => v.cues)}]}};
  const sb = bind(out(c, 'selection.json'), selection);
  const digest = {schemaVersion: selection.schemaVersion, artifactId: selection.selectionId,
    fileSha256: sb.fileSha256, canonicalSha256: sb.canonicalSha256};
  const cue = pass(cueProjection({projectionId: `${c.plan.planId}-cue-end`, sourcePackageBinding: sourceBinding,
    sourceSelectionDigest: digest, producerJobBinding: producer, sourcePackage, selection}), 'CUE_INVALID').projection;
  const cb = cueBinding({path: out(c, 'cue-end-projection.json'), projection: cue});
  const line = pass(lineProjection({projectionId: `${c.plan.planId}-line-end`, sourcePackageBinding: sourceBinding,
    cueEndProjectionBinding: cb, sourceSelectionDigest: digest, producerJobBinding: producer,
    sourcePackage, selection, cueEndProjection: cue}), 'LINE_INVALID').projection;
  const lb = lineBinding({path: out(c, 'line-end-projection.json'), projection: line});
  const timeline = await readBound(base.timeline);
  const instruction = pass(instructionArtifact({artifactId: `${c.plan.planId}-instruction`, sourceCaseId: c.plan.planId,
    meaningInformationPackageBinding: bind(out(c, 'meaning-input.json'), input.meaning), timelineBinding: base.timeline,
    cueEndProjectionBinding: cb, producerJobBinding: producer,
    styleProfileId: sourcePackage.reconstructionMap.caseContexts[0].resolvedStyle.presetId,
    meaningPackage: input.meaning, timeline, cueEndProjection: cue}), 'INSTRUCTION_INVALID').artifact;
  const ib = instructionBinding({path: out(c, 'instruction.json'), artifact: instruction});
  const style = await readBound(c.rendererTemplate.registryBindings.styleProfileRegistry);
  const trust = await readBound(c.rendererTemplate.registryBindings.rendererTrust);
  const resolved = pass(appearance({instructionArtifact: instruction, styleProfileRegistry: style,
    visualStateId: c.rendererTemplate.executionInputs.visualStateId}), 'STYLE_INVALID');
  const maxLogicalWidth = resolved.profile.maxLogicalWidth ?? resolved.visualState.layout?.maxCharsPerLine;
  const maxLines = resolved.profile.maxLines ?? resolved.visualState.layout?.maxLines;
  if (sourcePackage.promptInput.styleLimits.maxLogicalWidthPerLine !== maxLogicalWidth
    || sourcePackage.promptInput.styleLimits.maxLinesPerCue !== maxLines
    || sourcePackage.promptInput.styleLimits.characterWidthRule !== trust.layoutRules.characterWidthRule) fail('STYLE_LIMIT_MISMATCH');
  pass(lineLayout({layoutId: `${c.plan.planId}-preflight-layout`, instructionArtifactBinding: ib,
    instructionArtifact: instruction, meaningPackage: input.meaning, lineEndProjection: line,
    lineEndSourcePackage: sourcePackage, maxLogicalWidth, maxLines,
    characterWidthRule: trust.layoutRules.characterWidthRule,
    lineLayoutRules: c.rendererTemplate.executionInputs.lineLayoutRules}), 'LAYOUT_INVALID');
  const rendererJob = clone(c.rendererTemplate);
  rendererJob.jobId = `${c.plan.planId}-renderer`;
  rendererJob.attemptId = c.plan.planId;
  rendererJob.instructionArtifactBinding = ib;
  rendererJob.lineEndProjectionBinding = lb;
  rendererJob.cropAppliedBaseMedia = clone(base);
  rendererJob.publication = {admissionReceiptPath: out(c, 'admission-receipt.json'),
    lineLayoutPath: out(c, 'line-layout.json'), renderOutputRoot: out(c, 'render')};
  pass(validateRendererJob(rendererJob), 'RENDERER_JOB_INVALID');
  return {meaning: input.meaning, sourcePackage, captionAdoption: coreAdoption, selection,
    cueEndProjection: cue, lineEndProjection: line, instruction, rendererJob};
}

export const CORE_FILES = Object.freeze({meaning: 'meaning-input.json', sourcePackage: 'source-package.json',
  captionAdoption: 'caption-adoption.json', selection: 'selection.json', cueEndProjection: 'cue-end-projection.json',
  lineEndProjection: 'line-end-projection.json', instruction: 'instruction.json', rendererJob: 'renderer-job.json'});

export async function renderDigestV001(c: Context, artifacts: Json) {
  const result = await render(artifacts.rendererJob.path, {workspaceRoot: ROOT});
  const execution = await publish(out(c, 'renderer-result.json'), {
    schemaVersion: 'candidate-digest-renderer-execution-v001', rendererJobBinding: artifacts.rendererJob,
    exitCode: result.exitCode, result: result.result});
  if (result.exitCode !== 0 || result.result?.status !== 'completed' || result.result?.qc?.status !== 'passed') fail('RENDER_OR_QC_FAILED');
  const videoPath = out(c, 'render/presentation-rendered-v002.mp4');
  return {execution, admission: bind(out(c, 'admission-receipt.json'), await readJson(out(c, 'admission-receipt.json'))),
    lineLayout: bind(out(c, 'line-layout.json'), await readJson(out(c, 'line-layout.json'))),
    qc: 'passed', video: {path: videoPath, fileSha256: await fileSha(abs(videoPath))}};
}

/** Explicit Q4 adapter for the saved C-all completion and its native audio observations.
 * Historical bytes stay historical. This does not import an earlier effect answer. */
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat} from 'node:fs/promises';
import {execFile, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve, join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileSha256, verifyFileReference} from './prepare.mjs';
import {canonicalJson, rational} from './clock.mjs';
import {validatePresentationPulseEvidenceV001} from '../../evals/clip_composition/presentation_pulse_evidence_v001.mjs';
import {loadAutoPresentationContextV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';

const run = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
const require = (ok, why) => {if (!ok) throw new TypeError('Q4_C_ALL_INPUT_INVALID: ' + why);};
const clone = value => structuredClone(value);
const bytes = value => JSON.stringify(value, null, 2) + '\n';
const nativeRef = value => ({path: value.path, fileSha256: value.sha256 ?? value.fileSha256});
export const C_ALL_IDENTITY = Object.freeze({
  completedSha256: '665c31638dcf55af4bf1e6327f915839bbed31d905c007a6a9281e29776b8c34',
  baselinePlanSha256: '420bac69fb75c878a770406155171d5f09167ac22e41c1cd0c707f580229a778',
  timelineSha256: '42bd0d376648eacaba13d469dd1780a6acd330d470e1a4f2cd2fc9404252d53e',
  baseMediaSha256: '0de24b8c9b18d33d38e163f0e1eaed8a35aaeea4b2411c507d7947c992545c04',
  frameCount: 44408, captionCount: 325, segmentCount: 12, normalFontSizePx: 94,
  playbackSampleRate: 48000, observationSampleRate: 16000, observationSampleCount: 23684437,
});
const savedRoot = '/Users/kawafmm/workspace/zev2';
const savedPresentation = join(savedRoot, 'evals/clip_composition/outputs/presentation/work-digest-v1-phase2-20260913-v001');
const oldAudio = '/private/tmp/zev-vocal-accent-6mnpszdq/audio-probe/run-v001/c-all';

export function inspectCAllClockAndNormal({plan, timeline, manifest}) {
  require(plan.elements.length === 325 && plan.elements.every(row => row.kind === 'speech-caption')
    && new Set(plan.elements.map(row => row.instructionId)).size === 325, 'all 325 original captions required');
  require(same(plan.canvas, {width: 1920, height: 1080, fps: 30,
    safeAreaPx: {top: 40, right: 80, bottom: 40, left: 80}}), 'C-all canvas differs');
  require(timeline.segments.length === 12 && manifest.segments.length === 12
    && timeline.baseMedia.expectedFrameCount === 44408, 'all 12 retained intervals required');
  require(manifest.audio.sampleRate === 48000 && manifest.audio.channels === 2
    && manifest.audio.encodeInput.sampleCount === 71052800, 'saved C-all playback audio clock differs');
  const position = {preset: 'bottom-center', alignment: 'center', offsetXPercent: 0, offsetYPercent: -6};
  const transition = {transitionId: 'quick-fade-4f-v001', entry: {type: 'alpha-fade', frames: 4},
    exit: {type: 'alpha-fade', frames: 4}};
  for (const row of plan.elements) {
    require(row.visualState.textStyle.fontSizePx === 94
      && row.visualState.textStyle.fontAssetId === 'line-seed-jp-extra-bold-v001'
      && same(row.visualState.position, position) && row.visualState.background === null
      && same(row.transition, transition), 'unchanged Normal 94 px, font, position and fade required');
    require(row.displayFrameCount === row.endFrameExclusive - row.startFrame
      && row.indexedLines.length >= 1 && row.indexedLines.length <= 2
      && timeline.segments.filter(segment => row.startFrame >= segment.outputStartFrame
        && row.endFrameExclusive <= segment.outputEndFrame).length === 1, 'caption clock or retained interval differs');
  }
  let previousEnd = 0;
  const spans = timeline.segments.map((segment, index) => {
    const original = manifest.segments[index];
    require(Object.keys(segment).every(key => same(segment[key], original[key]))
      && segment.outputStartFrame === previousEnd
      && segment.sourceEndFrame30 - segment.sourceStartFrame30 === segment.outputEndFrame - segment.outputStartFrame,
    'saved timeline and generation record differ');
    previousEnd = segment.outputEndFrame;
    const expected = {sourceStart: segment.sourceStartFrame30 * 1600, sourceEnd: segment.sourceEndFrame30 * 1600,
      outputStart: segment.outputStartFrame * 1600, outputEnd: segment.outputEndFrame * 1600};
    require(same(original.audioSamples, expected), 'source audio-to-frame correspondence differs');
    return {...clone(segment), audioSamples: clone(original.audioSamples)};
  });
  require(previousEnd === 44408, 'completed timeline endpoint differs');
  return {schemaVersion: 'q4-c-all-original-clock-v001', fps: 30, frameCount: 44408,
    playbackSampleRate: 48000, playbackSampleCount: 71052800,
    observationSampleRate: 16000, observationSampleCount: 23684437,
    effectiveObservationEndSample: rational(71052800n, 3n), decoderTailObservationSamples: rational(511n, 3n),
    connectionPolicy: 'preserve-normal-cut', connectionCount: 11, insertedFrameCount: 0, spans,
    captionInvariantSha256: sha(canonicalJson(plan.elements.map(row => ({captionId: row.instructionId,
      text: row.text, indexedLines: row.indexedLines, startFrame: row.startFrame,
      endFrameExclusive: row.endFrameExclusive, visualState: row.visualState, transition: row.transition})))),
    normal: {fontSizePx: 94, fontAssetId: 'line-seed-jp-extra-bold-v001', position,
      oneLineCaptions: plan.elements.filter(row => row.indexedLines.length === 1).length,
      twoLineCaptions: plan.elements.filter(row => row.indexedLines.length === 2).length},
    limitations: ['Original stream sample offsets belong to the saved source grid; no offset is guessed from rounded milliseconds.',
      'Decoder tail is outside the completed video clock and cannot anchor a displayed expression.']};
}

/** Reconstruct every constituent from its original row, not the union maximum. */
export function adaptCAllNativeAudio({candidates, peaks, asr, candidatesRef, peaksRef}) {
  require(candidates.schemaVersion === 'presentation-vocal-audio-candidates-v001'
    && peaks.schemaVersion === 'presentation-vocal-audio-measurements-v001'
    && asr.schemaVersion === 'presentation-vocal-asr-evidence-v001', 'explicit native audio formats required');
  require([candidates, peaks, asr].every(row => same(row.source, candidates.source)
    && row.sampleRate === 16000 && row.sampleCount === 23684437), 'native audio source/clock differs');
  require(candidates.source.sha256 === C_ALL_IDENTITY.completedSha256 && same(asr.pcm, candidates.pcm)
    && candidates.pcm.bytes === candidates.sampleCount * 2, 'historical completed media/PCM identity differs');
  require(candidates.candidateCount === candidates.candidates.length && candidates.candidateCount === 306
    && asr.segmentCount === 462 && asr.segments.length === 462
    && asr.wordCount === 3159 && asr.segments.reduce((sum, row) => sum + row.words.length, 0) === 3159,
  'complete historical candidate/ASR coverage required');
  const boundPeaks = candidates.measurementEvidence.filter(row => basename(row.path) === 'acoustic-peaks.json');
  require(boundPeaks.length === 1 && same(nativeRef(boundPeaks[0]), peaksRef), 'native peak file reference differs');
  const peakMap = new Map(peaks.rows.map(row => [row.id, row]));
  const asrMap = new Map(asr.segments.map(row => [row.id, row]));
  require(peakMap.size === peaks.rows.length && asrMap.size === asr.segments.length, 'duplicate native observation ID');
  const timing = {schemaVersion: 'auto-presentation-pulse-timing-v001', sourceRef: nativeRef(candidates.source),
    candidatesRef, peaksRef, sampleRate: candidates.sampleRate, sampleCount: candidates.sampleCount,
    candidates: [], peaks: []};
  const audioCandidates = candidates.candidates.map(row => {
    timing.candidates.push({candidateId: row.id, peakIds: [...row.constituentPeakIds]});
    const nativePeaks = row.constituentPeakIds.map(id => {
      const peak = peakMap.get(id);
      require(peak?.qualifies === true, 'unknown or unqualified constituent peak');
      timing.peaks.push({peakId: id, startSample: peak.startSample,
        endSampleExclusive: peak.endSampleExclusive, peakSample: peak.peakSample});
      return clone(peak);
    });
    const getAsr = saved => {
      const segment = asrMap.get(saved.segmentId);
      require(segment && ['startSec', 'endSec', 'text'].every(key => same(segment[key], saved[key])), 'ASR context reference differs');
      return clone(segment);
    };
    return {candidateId: row.id, startSample: row.startSample, endSampleExclusive: row.endSampleExclusive,
      peakSample: row.peakSample, startSec: row.startSec, endSec: row.endSec, peakSec: row.peakSec,
      constituentPeakIds: [...row.constituentPeakIds], metrics: clone(row.metrics), peaks: nativePeaks,
      asrSegments: row.asrOverlap.map(getAsr), asrContext: row.asrContext.map(getAsr)};
  });
  validatePresentationPulseEvidenceV001(timing);
  require(peaks.rows.filter(row => row.qualifies === true).length === timing.peaks.length,
    'qualified native peak coverage differs');
  return {timing, audioCandidates, audioEvidence: {sourceRef: timing.sourceRef, candidatesRef,
    sampleRate: timing.sampleRate, sampleCount: timing.sampleCount, asrRef: nativeRef(candidates.asrEvidence),
    allAsrSegments: clone(asr.segments), measurementRefs: candidates.measurementEvidence.map(nativeRef),
    pcmRef: nativeRef(candidates.pcm), coverage: clone(candidates.coverage),
    limitations: [...candidates.limitations, 'Reused complete C-all observation; no new ASR or listening judgment.',
      'Saved ASR floating-point seconds are retained verbatim; they do not redefine caption or playback frames.',
      'C-all Normal is 94 px; current Pulse requires unchanged 96 px, so no caption receives an eligible Pulse anchor.']}};
}

async function inspectMedia(path, ffprobePath, ffmpegPath) {
  const {stdout} = await run(ffprobePath, ['-v', 'error', '-show_entries',
    'format=duration,start_time:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,time_base,start_pts,duration_ts,nb_frames,sample_rate,channels',
    '-of', 'json', path], {maxBuffer: 1024 * 1024});
  const probe = JSON.parse(stdout), video = probe.streams.find(row => row.codec_type === 'video');
  const audio = probe.streams.find(row => row.codec_type === 'audio');
  require(probe.streams.length === 2 && video?.width === 1920 && video?.height === 1080
    && video.avg_frame_rate === '30/1' && video.r_frame_rate === '30/1'
    && Number(video.nb_frames) === 44408 && Number(video.start_pts) === 0
    && Number(audio?.sample_rate) === 48000 && audio.channels === 2
    && audio.time_base === '1/48000' && Number(audio.start_pts) === 0, 'actual C-all stream metadata differs');
  const packetPayloadSha256 = await new Promise((done, reject) => {
    const child = spawn(ffmpegPath, ['-v', 'error', '-i', path, '-map', '0:a:0', '-c:a', 'copy', '-f', 'data', 'pipe:1'],
      {stdio: ['ignore', 'pipe', 'pipe']});
    const h = createHash('sha256'); let stderr = '';
    child.stdout.on('data', b => h.update(b)); child.stderr.on('data', b => {stderr += b.toString();});
    child.on('error', reject); child.on('close', code => code === 0 ? done(h.digest('hex')) : reject(new Error(stderr)));
  });
  const clockResult = await run(ffprobePath, ['-v', 'error', '-select_streams', 'a:0', '-show_entries',
    'packet=pts,duration:packet_side_data=skip_samples,discard_padding', '-of', 'json', path], {maxBuffer: 12 * 1024 * 1024});
  const packets = JSON.parse(clockResult.stdout).packets;
  const sides = packets.flatMap(row => row.side_data_list ?? []);
  return {probe, packetPayloadSha256, packetCount: packets.length, firstPacket: packets[0], lastPacket: packets.at(-1),
    skipSamples: sides.reduce((sum, row) => sum + (row.skip_samples ?? 0), 0),
    discardPadding: sides.reduce((sum, row) => sum + (row.discard_padding ?? 0), 0),
    method: 'Container/stream metadata and every encoded audio packet read; no full video decode, ASR, or encode.'};
}

export async function prepareCAllInput({outputDir, applicabilityPath,
  completionPath = join(savedPresentation, 'phase2-completion-v001/completion-record.json'),
  contextPath = '/private/tmp/zev-vocal-accent-6mnpszdq/inputs/c-all/context.json',
  candidatesPath = join(oldAudio, 'audio-candidates.json'), ffprobePath = '/opt/homebrew/bin/ffprobe',
  ffmpegPath = '/opt/homebrew/bin/ffmpeg'} = {}) {
  require(typeof outputDir === 'string' && typeof applicabilityPath === 'string', 'outputDir and current applicability report required');
  outputDir = resolve(outputDir);
  const rawDir = join(outputDir, 'raw-inputs'); await mkdir(rawDir, {recursive: true});
  const references = [], snapshots = [];
  async function bind(id, reference, snapshot = true) {
    const path = resolve(savedRoot, reference.path), fileSha = reference.fileSha256 ?? reference.sha256 ?? await fileSha256(path);
    await verifyFileReference({...reference, path, fileSha256: fileSha});
    const ref = {path, fileSha256: fileSha}; references.push({id, ...ref, bytes: (await stat(path)).size});
    if (!snapshot) return ref;
    const content = await readFile(path); require(sha(content) === fileSha, 'source changed before snapshot');
    const saved = join(rawDir, id + '.json'); await writeFile(saved, content, {flag: 'wx'});
    snapshots.push({id, original: ref, saved: {path: saved, fileSha256: fileSha}});
    return JSON.parse(content.toString('utf8'));
  }
  const completion = await bind('completion', {path: completionPath});
  require(completion.schemaVersion === 'digest-v1-phase2-completion-record-v001'
    && completion.bindings.finalMp4.fileSha256 === C_ALL_IDENTITY.completedSha256,
  'the specified C-all completed media binding is required');
  const plan = await bind('normal-plan', completion.bindings.commonPlan);
  const timeline = await bind('timeline', completion.bindings.baseMediaTimeline);
  const manifest = await bind('generation-manifest', completion.bindings.baseMediaGenerationManifest);
  require(completion.bindings.commonPlan.fileSha256 === C_ALL_IDENTITY.baselinePlanSha256
    && completion.bindings.baseMediaTimeline.fileSha256 === C_ALL_IDENTITY.timelineSha256
    && completion.bindings.baseMedia.fileSha256 === C_ALL_IDENTITY.baseMediaSha256, 'C-all baseline identity differs');
  const normalStyle = await bind('normal-style', completion.bindings.style94);
  const normalFont = normalStyle.fontAssets.find(row => row.fontAssetId === 'line-seed-jp-extra-bold-v001');
  require(normalFont, 'saved Normal font asset required');
  await bind('normal-font', normalFont, false);
  await bind('current-drawing-font', {path: resolve(fileURLToPath(new URL('../../', import.meta.url)), normalFont.path),
    fileSha256: normalFont.sha256}, false);
  await bind('caption-bridge', completion.bindings.bridge);
  await bind('base-media-validation', completion.bindings.baseMediaValidationReceipt);
  await bind('basis-edit-plan', manifest.basisEditPlan);
  const completedRef = await bind('completed-media', completion.bindings.finalMp4, false);
  const baseRef = await bind('base-media', completion.bindings.baseMedia, false);
  await bind('original-source', completion.bindings.sourceMaterial, false);
  const clock = inspectCAllClockAndNormal({plan, timeline, manifest});
  const semanticContext = await bind('legacy-semantic-context', {path: contextPath,
    fileSha256: '952c5916bb3c9b7654b3abd8fd6bed624d221431537d1963243f69f2fe664e45'});
  const candidates = await bind('legacy-audio-candidates', {path: candidatesPath,
    fileSha256: '280bb1360b9517df27753a285e3be246e310b12de5cabb4d1c75c89928664817'});
  const asr = await bind('legacy-asr', candidates.asrEvidence);
  const peakRef = candidates.measurementEvidence.find(row => basename(row.path) === 'acoustic-peaks.json');
  require(peakRef, 'native acoustic-peaks reference required');
  const peaks = await bind('legacy-acoustic-peaks', peakRef);
  await bind('legacy-pcm', candidates.pcm, false);
  for (const reference of candidates.measurementEvidence.filter(row => row !== peakRef))
    await bind('legacy-' + basename(reference.path, '.json'), reference);
  const audio = adaptCAllNativeAudio({candidates, peaks, asr,
    candidatesRef: {path: resolve(candidatesPath), fileSha256: sha(await readFile(candidatesPath))}, peaksRef: nativeRef(peakRef)});
  require(same(audio.timing.sourceRef, completedRef) && same(semanticContext.digestAudioSourceRef, completedRef),
    'historical audio points to another completion');
  const measured = {completed: await inspectMedia(completedRef.path, ffprobePath, ffmpegPath),
    baseMedia: await inspectMedia(baseRef.path, ffprobePath, ffmpegPath)};
  for (const value of Object.values(measured)) require(value.packetPayloadSha256 === manifest.audio.encoded.packetPayloadSha256
    && value.skipSamples === manifest.audio.encoded.skipSamples && value.discardPadding === manifest.audio.encoded.discardPadding,
  'actual audio packets or decoder boundary differ from the saved generation record');
  require(Number(measured.baseMedia.probe.streams.find(row => row.codec_type === 'audio').duration_ts) === clock.playbackSampleCount,
    'base media effective audio duration differs');
  const applicability = await bind('current-applicability', {path: applicabilityPath});
  require(applicability.schemaVersion === 'c-all-current-estimated-geometry-diagnostic-v001'
    && applicability.completed === true && applicability.method.measuredFontMetrics === false
    && applicability.bindings.baseline.fileSha256 === C_ALL_IDENTITY.baselinePlanSha256
    && Array.isArray(applicability.effects), 'existing estimated applicability report must bind the original caption plan');
  for (const reference of applicability.bindings.implementation) await verifyFileReference(reference);
  const captionIds = plan.elements.map(row => row.instructionId);
  const observations = ['pulse', 'bounce', 'shake'].map(preset => ({observationId: 'c-all-' + preset + '-94px-unrepresentable',
    kind: preset + '-unrepresentable', captionIds: [...captionIds],
    description: '保存Normalは94px。現行の' + preset + 'は96pxを変更しない字幕を必要とするため、今回全字幕で適用不能。技術制約であり意味上のNormal判定ではない。'}));
  for (const preset of ['color', 'panel', 'panel-graph-paper', 'panel-comic-frame', 'scale']) {
    const result = applicability.effects.find(row => row.preset === preset);
    require(result && result.rows.length === 325 && new Set(result.rows.map(row => row.captionId)).size === 325
      && result.rows.every(row => {
        const original = plan.elements.find(value => value.instructionId === row.captionId);
        return original && row.text === original.text && row.startFrame === original.startFrame
          && row.endFrameExclusive === original.endFrameExclusive && row.lineCount === original.indexedLines.length
          && typeof row.passed === 'boolean';
      }),
    'complete existing layout applicability required for ' + preset);
    const unavailable = result.rows.filter(row => !row.passed).map(row => row.captionId);
    if (unavailable.length) observations.push({observationId: 'c-all-' + preset + '-layout-unrepresentable',
      kind: preset + '-unrepresentable', captionIds: unavailable,
      description: '現行Node検査の文字幅推定に基づく安全領域検査を通らない。実フォント描画の測定値ではない。本文・改行・位置・通常94pxを変更して通さず、選択後の短尺では実描画も別途確認する。'});
  }
  const contextMap = new Map(semanticContext.captionContextIds.map(row => [row.captionId, row.contextId]));
  require(contextMap.size === 325 && semanticContext.contexts.length === 12, 'whole saved semantic context required');
  const evidence = {productionPurpose: semanticContext.productionPurpose,
    captions: plan.elements.map(row => ({captionId: row.instructionId, text: row.text,
      contextId: contextMap.get(row.instructionId), startFrame: row.startFrame,
      endFrameExclusive: row.endFrameExclusive, eligiblePulsePeakIds: []})),
    contexts: semanticContext.contexts.map(({contextId, description}) => ({contextId, description})), observations,
    audioEvidence: audio.audioEvidence, audioCandidates: audio.audioCandidates};
  const decision = {schemaVersion: 'presentation-focus-decision-input-v005', pulseTimingEvidence: audio.timing,
    adapterProvenance: {schemaVersion: 'q4-c-all-explicit-native-audio-adapter-v001',
      purpose: 'New native timing wrapper for Q4; not an upgraded or new historical semantic answer.',
      sourceSchemas: [candidates.schemaVersion, peaks.schemaVersion, asr.schemaVersion],
      sourceRefs: [audio.timing.sourceRef, audio.timing.candidatesRef, audio.timing.peaksRef, audio.audioEvidence.asrRef],
      priorSemanticAnswerImported: false, originalObservationBytesPreserved: true}};
  const decisionPath = join(outputDir, 'native-audio-binding.json');
  await writeFile(decisionPath, bytes(decision), {flag: 'wx'});
  const planRef = snapshots.find(row => row.id === 'normal-plan').saved;
  const timelineRef = snapshots.find(row => row.id === 'timeline').saved;
  const loaded = await loadAutoPresentationContextV001({baselinePath: planRef.path, decisionInputPath: decisionPath});
  const source = {digestRef: {version: completion.completionId, sha256: manifest.basisEditPlan.fileSha256},
    planRef, timelineRef, mediaRef: baseRef, planBytes: await readFile(planRef.path, 'utf8'),
    timelineBytes: await readFile(timelineRef.path, 'utf8'), playbackSampleRate: 48000, observationSampleRate: 16000,
    captionContext: loaded.context, decisionInputBytes: await readFile(decisionPath, 'utf8')};
  const context = createOrchestrationContextV001(source);
  const input = createOrchestrationJudgmentInputV001({context, evidence, connectionPolicy: 'preserve-normal-cut'});
  require(input.connectionPolicy === 'preserve-normal-cut'
    && same(input.connectionRolePresets, {continuation: ['normal-cut']}), 'bound normal-connection restriction required');
  const report = {schemaVersion: 'q4-c-all-input-preparation-v001', references, snapshots, clock,
    mediaInspection: measured, sourceSchemas: decision.adapterProvenance.sourceSchemas,
    newInputSha256: input.inputSha256, contextSha256: context.contextSha256,
    counts: {captions: 325, contexts: 12, connections: 11, audioCandidates: 306, asrSegments: 462,
      asrWords: 3159, qualifiedPeaks: audio.timing.peaks.length},
    applicabilityRef: references.find(row => row.id === 'current-applicability'),
    historicalHumanReview: {completionRef: references.find(row => row.id === 'completion'),
      note: 'Pastly used C-all material, not unseen evaluation. Earlier human answers are not semantic answer labels in this fresh input.'},
    unavailableExpressionsAreSemanticNormal: false,
    limitations: ['Layout applicability uses the existing Node character-width estimate, not measured font pixels.',
      'No new frames were observed here; selected Panel plates may cover important source content and require the planned short-video review.',
      'The parent fresh-judgment request deliberately supplies the received Q4 human policy.',
      'Past raw snapshots retain their original descriptions, including obsolete inspection wording; the new applicability observations explicitly correct the measurement scope.']};
  for (const [name, value] of Object.entries({'source-bindings.json': source, 'semantic-evidence.json': evidence,
    'judgment-input.json': input, 'preparation-report.json': report, 'original-clock.json': clock}))
    await writeFile(join(outputDir, name), bytes(value), {flag: 'wx'});
  return {source, context, evidence, input, report};
}

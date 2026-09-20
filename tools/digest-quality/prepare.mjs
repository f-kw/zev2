import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, stat, open} from 'node:fs/promises';
import {execFile, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname, resolve, extname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {canonicalJson, canonicalSha256, createQualityClock, sourcePartsForRange, projectObservationInterval, rational} from './clock.mjs';

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const HRB001_IDENTITY = Object.freeze({
  sha256: '49ea952aea47e38095c9a8e336a1722fd3278230dda4203e10ab76f0129ba225', frameCount: 4867,
  projectionSha256: '6d840adda73610ae4167e32ba029b4916f61325d2b38ea5f5c7d32a8909c45c1',
  projectedPlanSha256: '30df64b2bacf34c5575142078cef63a7601d0021493e2a6518f55d7cf051693f',
});
const fail = message => { throw new Error(`QUALITY_INPUT_INVALID: ${message}`); };
const require = (condition, message) => { if (!condition) fail(message); };
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const range = (startFrame, endFrameExclusive) => ({startFrame, endFrameExclusive});
const overlap = (a, b) => a.startFrame < b.endFrameExclusive && b.startFrame < a.endFrameExclusive;
const equal = (a, b) => canonicalJson(a) === canonicalJson(b);
const refSha = ref => ref.fileSha256 ?? ref.sha256;
const pick = (value, names) => Object.fromEntries(names.filter(name => Object.hasOwn(value, name)).map(name => [name, structuredClone(value[name])]));
export async function fileSha256(path) {
  const handle = await open(path, 'r');
  try {
    const before = await handle.stat({bigint: true});
    require(before.isFile(), `reference is not a regular file: ${path}`);
    const hash = createHash('sha256'); let size = 0n;
    for await (const bytes of handle.createReadStream({autoClose: false})) { hash.update(bytes); size += BigInt(bytes.length); }
    const after = await handle.stat({bigint: true});
    require(['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => before[key] === after[key]) && size === after.size,
      `reference changed while hashing: ${path}`);
    return hash.digest('hex');
  } finally { await handle.close(); }
}
export async function verifyFileReference(reference) {
  require(reference && typeof reference.path === 'string' && /^[a-f0-9]{64}$/.test(refSha(reference)), 'invalid file reference');
  const actual = await fileSha256(reference.path);
  require(actual === refSha(reference), `reference bytes differ: ${reference.path}`);
  if (reference.bytes !== undefined) require((await stat(reference.path)).size === reference.bytes, `reference byte length differs: ${reference.path}`);
  return actual;
}
export function validateSavedSourceBindings(source, projection) {
  for (const name of ['digestRef', 'planRef', 'timelineRef', 'mediaRef']) require(equal(source[name], projection.sourceClock[name]), `saved source ${name} differs`);
  require(hashBytes(source.planBytes) === source.planRef.fileSha256 && hashBytes(source.timelineBytes) === source.timelineRef.fileSha256, 'embedded source bytes differ');
}
async function probeMedia(path, ffprobePath) {
  const {stdout} = await run(ffprobePath, ['-v', 'error', '-count_frames', '-show_entries',
    'format=duration,start_time:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,time_base,start_pts,start_time,duration_ts,duration,nb_frames,nb_read_frames,sample_rate,channels', '-of', 'json', path], {maxBuffer: 1024 * 1024});
  return JSON.parse(stdout);
}
function videoAudio(probe, frameCount, {historicalContainer = false} = {}) {
  const videos = probe.streams.filter(row => row.codec_type === 'video');
  const audios = probe.streams.filter(row => row.codec_type === 'audio');
  require(videos.length === 1 && audios.length === 1, 'expected one video and one audio stream');
  const [v] = videos, [a] = audios;
  require(Number(v.nb_read_frames) === frameCount && Number(v.nb_frames) === frameCount, 'decoded/container frame count differs');
  require(v.avg_frame_rate === '30/1' && v.r_frame_rate === '30/1' && Number(v.start_pts) === 0, 'video clock differs');
  require(Number(a.sample_rate) === 44100 && a.time_base === '1/44100' && Number(a.start_pts) === 0, 'audio clock differs');
  if (!historicalContainer) require(Number(a.duration_ts) === frameCount * 1470, 'effective audio duration differs');
  return {video: v, audio: a};
}
async function audioPacketHash(path, ffmpegPath) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpegPath, ['-v', 'error', '-i', path, '-map', '0:a:0', '-c:a', 'copy', '-f', 'data', 'pipe:1'], {stdio: ['ignore', 'pipe', 'pipe']});
    const hash = createHash('sha256'); let error = '';
    child.stdout.on('data', bytes => hash.update(bytes));
    child.stderr.on('data', bytes => { error += bytes.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolvePromise(hash.digest('hex')) : reject(new Error(`Audio packet inspection failed: ${error}`)));
  });
}
function complement(captions, frameCount) {
  let end = 0; const gaps = [];
  for (const caption of [...captions].sort((a, b) => a.range.startFrame - b.range.startFrame)) {
    require(caption.range.startFrame >= end && caption.range.endFrameExclusive > caption.range.startFrame, 'caption overlap or empty range');
    if (caption.range.startFrame > end) gaps.push(range(end, caption.range.startFrame));
    end = caption.range.endFrameExclusive;
  }
  require(end <= frameCount, 'caption outside video');
  if (end < frameCount) gaps.push(range(end, frameCount));
  return gaps;
}
export function secondsToObservationSample(seconds, rate) {
  require(typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0, 'ASR time');
  const [whole, fraction = ''] = String(seconds).split('.');
  require(/^\d+$/.test(whole) && /^\d*$/.test(fraction), 'ASR decimal time');
  const n = BigInt(whole + fraction) * BigInt(rate), d = 10n ** BigInt(fraction.length);
  return rational(n, d);
}

/** Saved HRB001 facts only. Callers may append completed-media measurements and reseal the packet. */
export async function prepareQualityInput({outputDir,
  bindingsPath = join(root, 'docs/reports/human-review-session-20260920-v001/hrb001-bindings.json'),
  sourceBindingsPath = join(root, 'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918/source-bindings.json'),
  generationManifestPath, ffprobePath = '/opt/homebrew/bin/ffprobe', ffmpegPath = '/opt/homebrew/bin/ffmpeg'} = {}) {
  require(typeof outputDir === 'string' && outputDir.length > 0, 'outputDir required');
  outputDir = resolve(outputDir);
  const rawDir = join(outputDir, 'raw-inputs');
  await mkdir(rawDir, {recursive: true});
  const references = [], rawReceipts = [];
  async function reference(id, source, kind, copyJson = true) {
    require(!references.some(row => row.id === id), `duplicate reference ${id}`);
    const sha256 = source.fileSha256 || source.sha256 || await fileSha256(source.path);
    await verifyFileReference({...source, sha256});
    let path = source.path;
    if (copyJson && extname(path) === '.json') {
      const bytes = await readFile(path); const copied = join(rawDir, `${id}.json`);
      require(hashBytes(bytes) === sha256, `reference changed before snapshot: ${path}`);
      await writeFile(copied, bytes, {flag: 'wx'});
      rawReceipts.push({id, originalPath: path, savedPath: copied, sha256});
      path = copied;
    }
    references.push({id, path, sha256, kind});
    return extname(path) === '.json' ? JSON.parse(await readFile(path, 'utf8')) : null;
  }
  const bindings = await reference('hrb001-bindings', {path: bindingsPath}, 'saved-media-binding');
  require(bindings.schemaVersion === 'hrb001-human-review-index-v001', 'HRB001 binding schema');
  require(bindings.video.fileSha256 === HRB001_IDENTITY.sha256 && bindings.video.frameCount === HRB001_IDENTITY.frameCount, 'selected media is not HRB001');
  require(bindings.bindings.projectionSha256 === HRB001_IDENTITY.projectionSha256, 'HRB001 saved projection identity');
  require(bindings.sourceRecords.projectedPlan.fileSha256 === HRB001_IDENTITY.projectedPlanSha256, 'HRB001 saved display plan identity');
  const source = await reference('source-bindings', {path: sourceBindingsPath}, 'saved-source-bindings');
  const projection = await reference('projection', bindings.sourceRecords.projection, 'saved-clock-projection');
  const plan = await reference('completed-caption-plan', bindings.sourceRecords.projectedPlan, 'saved-final-display-plan');
  require(projection.projectionSha256 === bindings.bindings.projectionSha256
    && projection.sourceClockSha256 === bindings.bindings.sourceClockSha256, 'projection binding differs');
  validateSavedSourceBindings(source, projection);
  const baselinePlan = await reference('baseline-caption-plan', source.planRef, 'saved-baseline-caption-plan');
  const timeline = await reference('baseline-timeline', source.timelineRef, 'saved-source-timeline');
  const manifest = await reference('baseline-generation-manifest', {path: generationManifestPath ?? join(dirname(source.timelineRef.path), 'generation-manifest.json')}, 'saved-audio-source-map');
  await reference('completed-media', bindings.video, 'completed-media', false);
  await reference('baseline-media', source.mediaRef, 'baseline-media', false);
  await reference('original-source-media', {path: manifest.source.sourceUri, fileSha256: manifest.source.fileSha256}, 'original-source-media', false);
  const clock = createQualityClock({projection, timeline, generationManifest: manifest, mediaSha256: HRB001_IDENTITY.sha256});
  require(clock.completedFrameCount === HRB001_IDENTITY.frameCount, 'completed projection duration differs');
  const probe = await probeMedia(bindings.video.path, ffprobePath);
  const measured = videoAudio(probe, clock.completedFrameCount);
  const baselineProbe = await probeMedia(source.mediaRef.path, ffprobePath);
  videoAudio(baselineProbe, clock.baselineFrameCount);
  await writeFile(join(outputDir, 'media-probe.json'), JSON.stringify({completed: probe, baseline: baselineProbe}, null, 2) + '\n', {flag: 'wx'});
  await reference('media-probe', {path: join(outputDir, 'media-probe.json')}, 'local-ffprobe-result');
  const media = {id: 'HRB-001', path: bindings.video.path, sha256: HRB001_IDENTITY.sha256,
    fpsNum: 30, fpsDen: 1, frameCount: clock.completedFrameCount, audioSampleRate: 44100,
    audioSampleCount: Number(measured.audio.duration_ts)};
  const units = [], evidence = [];
  require(plan.elements.length === 32 && baselinePlan.elements.length === 32, 'expected all 32 captions');
  require(new Set(plan.elements.map(row => row.instructionId)).size === 32, 'duplicate caption ID');
  for (const element of plan.elements) {
    const original = baselinePlan.elements.find(row => row.instructionId === element.instructionId);
    require(original && original.text === element.text, 'caption text/identity differs');
    const coverage = range(element.startFrame, element.endFrameExclusive);
    const parts = sourcePartsForRange(clock, coverage);
    require(parts.length === 1 && parts[0].kind === 'retained'
      && equal(parts[0].baselineRange, range(original.startFrame, original.endFrameExclusive)), 'caption saved timing differs');
    require(element.displayFrameCount === element.endFrameExclusive - element.startFrame, 'caption duration differs');
    const display = pick(element, ['presetId', 'appliedPresetId', 'visualState', 'transition', 'presentationMotion', 'presentationPulse', 'presentationColorRange']);
    display.renderedLines = element.indexedLines.map(row => row.renderedText);
    units.push({id: element.instructionId, kind: 'caption', range: coverage, text: element.text, display,
      sourceParts: parts, evidenceIds: []});
  }
  units.sort((a, b) => a.range.startFrame - b.range.startFrame);
  const captions = [...units];
  captions.forEach((unit, index) => {
    const adjacent = neighbor => neighbor ? {id: neighbor.id, text: neighbor.text, range: neighbor.range} : null;
    unit.display.adjacentCaptions = {previous: adjacent(captions[index - 1]), next: adjacent(captions[index + 1])};
  });
  for (const gap of complement(captions, clock.completedFrameCount)) units.push({id: `no-caption-${gap.startFrame}-${gap.endFrameExclusive}`,
    kind: 'no-caption', range: gap, text: null, display: {captionPresent: false}, sourceParts: sourcePartsForRange(clock, gap), evidenceIds: []});
  for (const connection of projection.connections) {
    const before = clock.spans.find(row => row.segmentId === connection.beforeSegmentId);
    const after = clock.spans.find(row => row.segmentId === connection.afterSegmentId);
    // Two adjoining retained frames provide context without inventing a sampling cadence.
    const coverage = range(before.range.endFrameExclusive - 1, after.range.startFrame + 1);
    units.push({id: connection.connectionId, kind: 'connection', range: coverage, text: null,
      display: {preset: connection.preset, presetVersion: connection.presetVersion,
        insertedFrameCount: connection.insertedFrameCount, beforeCaptionId: captions.filter(row => row.range.endFrameExclusive <= before.range.endFrameExclusive).at(-1)?.id ?? null,
        afterCaptionId: captions.find(row => row.range.startFrame >= after.range.startFrame)?.id ?? null},
      sourceParts: sourcePartsForRange(clock, coverage), evidenceIds: []});
  }
  require(units.filter(row => row.kind === 'no-caption').length === 8 && projection.connections.length === 6, 'HRB001 scope differs');
  function addEvidence(item) {
    require(!evidence.some(row => row.id === item.id), `duplicate evidence ${item.id}`);
    const matching = units.filter(unit => overlap(unit.range, item.range));
    item.unitIds = matching.map(unit => unit.id);
    for (const unit of matching) unit.evidenceIds.push(item.id);
    evidence.push(item);
  }
  for (const unit of units) {
    addEvidence({id: `mapping.${unit.id}`, kind: 'saved-source-mapping', range: unit.range, unitIds: [],
      method: 'Verified saved final-to-baseline-to-original mapping; no generation repeated.', facts: {sourceParts: unit.sourceParts},
      limitations: ['Time correspondence does not establish audiovisual meaning.'], referenceIds: ['projection', 'baseline-timeline', 'baseline-generation-manifest', 'original-source-media']});
    addEvidence({id: `display.${unit.id}`, kind: unit.kind === 'caption' ? 'saved-caption' : 'saved-display-plan', range: unit.range, unitIds: [],
      method: 'Read the saved final display plan and concrete connection projection bound to HRB001.',
      facts: {text: unit.text, display: unit.display}, limitations: ['Saved rendering facts; no new visual quality judgment.'],
      referenceIds: ['completed-caption-plan', 'projection', 'completed-media']});
  }
  const old = source.captionContext.pulseTimingEvidence;
  require(old.sampleRate === clock.observationSampleRate, 'historical observation clock');
  const candidates = await reference('old-audio-candidates', old.candidatesRef, 'historical-audio-observation');
  const asr = await reference('old-asr', candidates.asrEvidence, 'historical-asr-observation');
  const peaks = await reference('old-acoustic-peaks', old.peaksRef, 'historical-audio-observation');
  await reference('old-observation-media', old.sourceRef, 'historical-observation-media', false);
  await reference('old-observation-pcm', candidates.pcm, 'historical-decoded-pcm', false);
  for (const [i, ref] of candidates.measurementEvidence.entries()) {
    if (ref.sha256 !== old.peaksRef.fileSha256) await reference(`old-audio-measurement-${i}`, ref, 'historical-audio-measurement');
  }
  for (const observation of [candidates, asr, peaks]) {
    require(observation.source.path === old.sourceRef.path && observation.source.sha256 === old.sourceRef.fileSha256, 'old observation media differs');
    require(observation.sampleRate === old.sampleRate && observation.sampleCount === old.sampleCount, 'old observation sample clock differs');
  }
  require(equal(asr.pcm, candidates.pcm), 'ASR PCM identity differs');
  require(candidates.pcm.bytes === old.sampleCount * 2, 'historical mono s16 PCM length differs');
  require(candidates.candidates.length === 27 && asr.segments.length === 70
    && asr.segments.reduce((sum, segment) => sum + segment.words.length, 0) === 392, 'historical observation scope differs');
  const oldProbe = await probeMedia(old.sourceRef.path, ffprobePath);
  const oldStreams = videoAudio(oldProbe, clock.baselineFrameCount, {historicalContainer: true});
  const packetHash = await audioPacketHash(old.sourceRef.path, ffmpegPath);
  require(packetHash === manifest.audio.encoded.packetPayloadSha256, 'old observation audio packets differ from baseline');
  const {stdout: packetClockBytes} = await run(ffprobePath, ['-v', 'error', '-select_streams', 'a:0', '-show_entries',
    'packet=pts,duration:packet_side_data=skip_samples,discard_padding', '-of', 'json', old.sourceRef.path], {maxBuffer: 4 * 1024 * 1024});
  const packetClock = JSON.parse(packetClockBytes).packets;
  const skips = packetClock.flatMap(row => row.side_data_list ?? []).reduce((sum, row) => sum + (row.skip_samples ?? 0), 0);
  const discards = packetClock.flatMap(row => row.side_data_list ?? []).reduce((sum, row) => sum + (row.discard_padding ?? 0), 0);
  require(skips === manifest.audio.encoded.skipSamples && discards === manifest.audio.encoded.discardPadding, 'historical decoder skip/padding differs');
  await writeFile(join(outputDir, 'historical-audio-binding.json'), JSON.stringify({probe: oldProbe,
    encodedPacketPayloadSha256: packetHash, baselineExpectedSha256: manifest.audio.encoded.packetPayloadSha256,
    packetCount: packetClock.length, firstPacket: packetClock[0], lastPacket: packetClock.at(-1),
    skipSamples: skips, discardPadding: discards, baselineEffectiveSamples: clock.baselineFrameCount * 1470,
    historicalContainerSamples: Number(oldStreams.audio.duration_ts),
    equality: 'Encoded audio packet bytes equal the saved baseline generation record; completed insertions remain a separate mapping.'}, null, 2) + '\n', {flag: 'wx'});
  await reference('historical-audio-binding', {path: join(outputDir, 'historical-audio-binding.json')}, 'local-audio-identity-inspection');
  const excludedObservations = [];
  const project = (startSample, endSampleExclusive) => projectObservationInterval(clock, {clock: 'digest-original',
    sourceClockSha256: clock.sourceClockSha256, sampleRate: old.sampleRate, startSample, endSampleExclusive});
  const historicalLimits = ['Reused observation from the saved baseline audio; not a new HRB001 observation.',
    'Integer frame ranges enclose exact sample coverage; rational sample endpoints are authoritative.',
    'Exact decimal transport preserves saved ASR timestamps, not their physical timing accuracy; tiny decimal residue is not evidence of a speech cut.',
    'The whole-observation aggregate is scoped to its saved baseline interval, not recomputed for this split part.',
    'Audio energy and ASR do not establish emotion, visual meaning, or a need for an effect.'];
  function observed(id, category, startSample, endSampleExclusive, aggregate, referenceId, extra = {}) {
    const mapped = project(startSample, endSampleExclusive);
    if (mapped.excluded.length) excludedObservations.push({id, ...mapped});
    for (const [index, part] of mapped.parts.entries()) {
      addEvidence({id: `old.${id}.part-${index + 1}`, kind: 'reused-audio-observation', range: part.range, unitIds: [],
        method: 'Project a saved baseline observation through verified retained spans once; exclude inserted silence and decoder tail.',
        facts: {category, observationId: id, historicalMediaSha256: old.sourceRef.fileSha256,
          observationRange: {clock: 'digest-original', sampleRate: old.sampleRate, startSample, endSampleExclusive},
          exactPart: part, wholeObservationAggregate: aggregate, ...(typeof extra === 'function' ? extra(part) : extra)}, limitations: historicalLimits,
        referenceIds: [referenceId, 'old-observation-media', 'old-observation-pcm', 'historical-audio-binding', 'projection']});
    }
  }
  for (const candidate of candidates.candidates) observed(candidate.id, 'audio-candidate', candidate.startSample, candidate.endSampleExclusive,
    {metrics: candidate.metrics, peakSample: candidate.peakSample, constituentPeakIds: candidate.constituentPeakIds}, 'old-audio-candidates');
  for (const peak of peaks.rows) observed(peak.id, 'acoustic-peak', peak.startSample, peak.endSampleExclusive,
    pick(peak, ['peakSample', 'peakDbfs', 'baselineDbfs', 'leftBaselineDbfs', 'rightBaselineDbfs', 'prominenceDb', 'riseDb', 'fallDb', 'plateauStartSample', 'plateauEndSampleExclusive']), 'old-acoustic-peaks');
  for (const segment of asr.segments) {
    const words = segment.words.map((word, index) => ({id: `${segment.id}:word-${index + 1}`, ...pick(word, ['text', 'probability', 'startSec', 'endSec']),
      mapped: project(secondsToObservationSample(word.startSec, old.sampleRate), secondsToObservationSample(word.endSec, old.sampleRate))}));
    observed(segment.id, 'asr-segment', secondsToObservationSample(segment.startSec, old.sampleRate), secondsToObservationSample(segment.endSec, old.sampleRate),
      pick(segment, ['text', 'avgLogprob', 'noSpeechProbability', 'compressionRatio', 'temperature']), 'old-asr', part => ({
        words: words.flatMap(word => {
          const parts = word.mapped.parts.filter(mapped => mapped.segmentId === part.segmentId && overlap(mapped.range, part.range));
          return parts.length ? [{...word, mapped: {parts, excluded: word.mapped.excluded}}] : [];
        }),
      }));
  }
  clock.provenance.historicalObservation = {sourceReferenceId: 'old-observation-media', sampleRate: old.sampleRate,
    savedSampleCount: old.sampleCount, baselineEffectiveEnd: rational(clock.baselineFrameCount * old.sampleRate, 30),
    excludedDecoderTailSamples: rational(old.sampleCount * 30 - clock.baselineFrameCount * old.sampleRate, 30),
    exclusionsReferenceId: 'historical-observation-exclusions', audioPacketIdentityReferenceId: 'historical-audio-binding',
    savedBaselineDecodedTailSamples: manifest.audio.encoded.rawDecodedSampleCount - manifest.audio.encoded.effectiveDecodedSampleCount};
  await writeFile(join(outputDir, 'historical-observation-exclusions.json'), JSON.stringify(excludedObservations, null, 2) + '\n', {flag: 'wx'});
  await reference('historical-observation-exclusions', {path: join(outputDir, 'historical-observation-exclusions.json')}, 'excluded-decoder-tail-record');
  const packet = {schemaVersion: 'digest-quality-input-v001', media, references, clock, units, evidence,
    limitations: ['All saved caption, connection and no-caption intervals are represented; this is not semantic observation of every frame.',
      'No new semantic video or audio review has been performed.',
      'Saved final display facts and historical acoustic/ASR observations are distinct from completed-media measurements.',
      'Historical packet equality binds baseline audio; time projection is not proof of perceptual equivalence after connection rendering.',
      'Initial judgment must use this packet only; raw source records are retained for audit and may contain earlier generation decisions.',
      'The probed stream duration and decoded padding are separate measurements.']};
  packet.inputSha256 = canonicalSha256(packet);
  await writeFile(join(outputDir, 'saved-input-packet.json'), JSON.stringify(packet, null, 2) + '\n', {flag: 'wx'});
  await writeFile(join(outputDir, 'raw-input-receipts.json'), JSON.stringify(rawReceipts, null, 2) + '\n', {flag: 'wx'});
  return packet;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const outputDir = process.argv[2];
  const packet = await prepareQualityInput({outputDir});
  console.log(JSON.stringify({inputSha256: packet.inputSha256, mediaSha256: packet.media.sha256,
    units: packet.units.length, evidence: packet.evidence.length, outputDir: resolve(outputDir)}, null, 2));
}

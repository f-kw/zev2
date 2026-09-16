import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {assertPresentationFocusSelectionInputV003, assertPresentationFocusSelectionResultV003,
  assertPresentationFocusSelectionCoverageV003, assertVocalAsrSegmentV003, audioCandidateOverlapsCaptionV003,
  runPresentationFocusSelectionV003} from '../../runner/src/skills/presentation-focus-selection-v001.js';
import {judgeThroughStdinV001} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {loadAutoPresentationContextV001, saveFixedAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';

type Json = Record<string, any>;
type Ref = {path: string; fileSha256: string};
export type BoundAudioEvidenceV003 = {audioEvidence: Json; candidates: Json[]; sourceRefs: Ref[]};
const formal = (v: unknown) => JSON.stringify(v, null, 2) + '\n';
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const keys = (v: any, expected: string[]) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const nonempty = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const sha = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const promptPath = fileURLToPath(new URL('./prompts/presentation_focus_selection_v001.md', import.meta.url));
const binding = (p: string, bytes: string | Buffer): Ref => ({path: path.resolve(p), fileSha256: hash(bytes)});
const save = async (p: string, value: unknown) => {
  const bytes = formal(value); await writeFile(p, bytes, {flag: 'wx'}); return binding(p, bytes);
};
async function hashFile(p: string) {
  const h = createHash('sha256'); let bytes = 0;
  for await (const part of createReadStream(p)) {h.update(part); bytes += part.length;}
  return {bytes, fileSha256: h.digest('hex')};
}
async function verifyRef(ref: Ref) {
  assert(keys(ref, ['path', 'fileSha256']) && nonempty(ref.path) && sha(ref.fileSha256), 'FOCUS_SOURCE_REFERENCE_INVALID');
  assert.equal((await hashFile(ref.path)).fileSha256, ref.fileSha256, 'FOCUS_SOURCE_CHANGED_DURING_JUDGMENT');
}
async function verifyNativeBinding(v: Json): Promise<Ref> {
  assert(keys(v, ['path', 'bytes', 'sha256']) && nonempty(v.path) && path.isAbsolute(v.path)
    && integer(v.bytes) && sha(v.sha256), 'VOCAL_NATIVE_REFERENCE_INVALID');
  const actual = await hashFile(v.path);
  assert.equal(actual.bytes, v.bytes, 'VOCAL_SOURCE_BYTES_CHANGED');
  assert.equal(actual.fileSha256, v.sha256, 'VOCAL_SOURCE_HASH_CHANGED');
  return {path: v.path, fileSha256: v.sha256};
}
function verifyGrid(rows: Json[], sampleCount: number, valueKey: string) {
  assert(Array.isArray(rows) && rows.length, 'VOCAL_MEASUREMENT_EMPTY');
  let cursor = 0;
  for (const row of rows) {
    assert(keys(row, ['startSample', 'endSampleExclusive', valueKey,
      ...(valueKey === 'voiceProbability' ? ['modelPaddingSamples'] : [])]) && row.startSample === cursor
      && integer(row.endSampleExclusive) && row.endSampleExclusive > cursor && row.endSampleExclusive <= sampleCount
      && finite(row[valueKey]), 'VOCAL_MEASUREMENT_COVERAGE_CHANGED');
    if (valueKey === 'voiceProbability') assert(row[valueKey] >= 0 && row[valueKey] <= 1
      && integer(row.modelPaddingSamples), 'VOCAL_VOICE_PROBABILITY_INVALID');
    cursor = row.endSampleExclusive;
  }
  assert.equal(cursor, sampleCount, 'VOCAL_MEASUREMENT_COVERAGE_CHANGED');
}
const asrProjection = (s: Json) => Object.fromEntries(['id', 'startSec', 'endSec', 'text', 'avgLogprob',
  'noSpeechProbability', 'temperature', 'compressionRatio', 'words'].map(k => [k, structuredClone(s[k])]));
const asrReference = (s: Json) => ({segmentId: s.id, ...Object.fromEntries(
  ['startSec', 'endSec', 'text', 'avgLogprob', 'noSpeechProbability'].map(k => [k, s[k]]))});
function voiceAtSample(rows: Json[], sample: number) {
  let low = 0, high = rows.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (rows[middle].endSampleExclusive <= sample) low = middle + 1; else high = middle;
  }
  const row = rows[low];
  assert(row && row.startSample <= sample && sample < row.endSampleExclusive, 'VOCAL_PEAK_OUTSIDE_VOICE_GRID');
  return structuredClone(row);
}

/** Read the independent, whole-audio probe output before any subtitle matching. */
export async function loadBoundAudioEvidenceV003(audioCandidatesPath: string): Promise<BoundAudioEvidenceV003> {
  const candidateBytes = await readFile(audioCandidatesPath), a = JSON.parse(candidateBytes.toString('utf8'));
  assert(keys(a, ['schemaVersion', 'source', 'pcm', 'sampleRate', 'sampleCount', 'durationSec', 'parameters', 'coverage',
    'candidateCount', 'candidates', 'asrEvidence', 'measurementEvidence', 'limitations'])
    && a.schemaVersion === 'presentation-vocal-audio-candidates-v001', 'VOCAL_CANDIDATE_FILE_INVALID');
  assert(integer(a.sampleRate) && a.sampleRate > 0 && integer(a.sampleCount) && a.sampleCount > 0
    && a.durationSec === a.sampleCount / a.sampleRate && Array.isArray(a.candidates)
    && a.candidateCount === a.candidates.length && Array.isArray(a.measurementEvidence)
    && Array.isArray(a.limitations) && a.limitations.every(nonempty), 'VOCAL_CANDIDATE_FILE_INVALID');
  assert(keys(a.coverage, ['startSample', 'endSampleExclusive', 'coveredSamples', 'gapSamples', 'overlapSamples', 'rows'])
    && a.coverage.startSample === 0 && a.coverage.endSampleExclusive === a.sampleCount
    && a.coverage.coveredSamples === a.sampleCount && a.coverage.gapSamples === 0 && a.coverage.overlapSamples === 0
    && integer(a.coverage.rows) && a.coverage.rows > 0,
  'VOCAL_AUDIO_COVERAGE_INVALID');
  const params = a.parameters;
  assert(keys(params, ['powerIntegrationFrames', 'powerIntegrationMs', 'prominenceContextFrames', 'prominenceContextMs',
    'minimumProminenceDb', 'overlappingEvents', 'voiceGate', 'transcriptionGate', 'quota', 'minimumEventGap', 'asrContextPaddingSec'])
    && params.voiceGate === null && params.transcriptionGate === null && params.quota === null && params.minimumEventGap === null
    && nonempty(params.overlappingEvents)
    && ['powerIntegrationFrames', 'powerIntegrationMs', 'prominenceContextFrames', 'prominenceContextMs']
      .every(k => integer(params[k]) && params[k] > 0)
    && finite(params.minimumProminenceDb) && params.minimumProminenceDb >= 0
    && finite(params.asrContextPaddingSec) && params.asrContextPaddingSec >= 0, 'VOCAL_PROBE_PARAMETERS_INVALID');
  const candidatesRef = binding(audioCandidatesPath, candidateBytes);
  const sourceRef = await verifyNativeBinding(a.source), pcmRef = await verifyNativeBinding(a.pcm);
  assert.equal(a.pcm.bytes, a.sampleCount * 2, 'VOCAL_PCM_COVERAGE_CHANGED');
  const asrRef = await verifyNativeBinding(a.asrEvidence);
  const asr = JSON.parse(await readFile(asrRef.path, 'utf8'));
  assert(keys(asr, ['schemaVersion', 'source', 'pcm', 'runtimeReceipt', 'sampleRate', 'sampleCount', 'durationSec',
    'recognizedLanguage', 'reportedDurationSec', 'reportedDurationAfterVadSec', 'fullInputPassed', 'generatorFullyConsumed',
    'options', 'segmentCount', 'wordCount', 'segments', 'limitations', 'elapsedSec'])
    && asr.schemaVersion === 'presentation-vocal-asr-evidence-v001'
    && same(asr.source, a.source) && same(asr.pcm, a.pcm) && asr.sampleRate === a.sampleRate && asr.sampleCount === a.sampleCount
    && asr.durationSec === a.durationSec && asr.fullInputPassed === true && asr.generatorFullyConsumed === true
    && Array.isArray(asr.segments) && asr.segmentCount === asr.segments.length, 'VOCAL_ASR_COVERAGE_INVALID');
  assert(keys(asr.options, ['language', 'word_timestamps', 'vad_filter', 'initial_prompt', 'prefix', 'hotwords', 'otherParameters'])
    && asr.options.language === 'ja' && asr.options.word_timestamps === true && asr.options.vad_filter === false
    && asr.options.initial_prompt === null && asr.options.prefix === null && asr.options.hotwords === null,
  'VOCAL_ASR_SCOPE_CHANGED');
  const runtimeRef = await verifyNativeBinding(asr.runtimeReceipt);
  const segments = asr.segments.map((s: Json) => {
    assert(keys(s, ['id', 'modelSegmentId', 'seek', 'startSec', 'endSec', 'text', 'tokens', 'avgLogprob',
      'noSpeechProbability', 'compressionRatio', 'temperature', 'words']), 'VOCAL_ASR_SEGMENT_INVALID');
    const value = asrProjection(s); assertVocalAsrSegmentV003(value); return value;
  });
  assert(new Set(segments.map((s: Json) => s.id)).size === segments.length
    && asr.wordCount === segments.reduce((n: number, s: Json) => n + s.words.length, 0), 'VOCAL_ASR_COVERAGE_INVALID');
  const measurementRefs: Ref[] = [], measurements = new Map<string, Json>();
  for (const ref of a.measurementEvidence) {
    const verified = await verifyNativeBinding(ref), name = path.basename(verified.path);
    assert(['rms.json', 'voice-probability.json', 'integrated-rms.json', 'acoustic-peaks.json'].includes(name)
      && !measurements.has(name), 'VOCAL_MEASUREMENT_REFERENCE_INVALID');
    const series = JSON.parse(await readFile(verified.path, 'utf8'));
    assert(keys(series, ['schemaVersion', 'source', 'sampleRate', 'sampleCount', 'parameters', 'rows'])
      && series.schemaVersion === 'presentation-vocal-audio-measurements-v001'
      && same(series.source, a.source) && series.sampleRate === a.sampleRate && series.sampleCount === a.sampleCount
      && same(series.parameters, params) && Array.isArray(series.rows), 'VOCAL_MEASUREMENT_BINDING_CHANGED');
    measurements.set(name, series); measurementRefs.push(verified);
  }
  assert.equal(measurements.size, 4, 'VOCAL_MEASUREMENT_REFERENCE_INVALID');
  const rms = measurements.get('rms.json')!.rows, voice = measurements.get('voice-probability.json')!.rows;
  verifyGrid(rms, a.sampleCount, 'rmsDbfs'); verifyGrid(voice, a.sampleCount, 'voiceProbability');
  assert.equal(a.coverage.rows, rms.length, 'VOCAL_AUDIO_COVERAGE_INVALID');
  verifyGrid(measurements.get('integrated-rms.json')!.rows, a.sampleCount, 'integratedRmsDbfs');
  const peaks = measurements.get('acoustic-peaks.json')!.rows, peakMap = new Map<string, Json>();
  for (const p of peaks) {
    assert(keys(p, ['id', 'startSample', 'endSampleExclusive', 'peakSample', 'peakDbfs', 'baselineDbfs',
      'leftBaselineDbfs', 'rightBaselineDbfs', 'prominenceDb', 'riseDb', 'fallDb', 'plateauStartSample',
      'plateauEndSampleExclusive', 'qualifies', 'reasons']) && nonempty(p.id) && !peakMap.has(p.id)
      && integer(p.startSample) && integer(p.endSampleExclusive) && p.endSampleExclusive > p.startSample
      && p.endSampleExclusive <= a.sampleCount && integer(p.peakSample)
      && p.startSample <= p.peakSample && p.peakSample < p.endSampleExclusive
      && ['peakDbfs', 'baselineDbfs', 'leftBaselineDbfs', 'rightBaselineDbfs', 'prominenceDb', 'riseDb', 'fallDb']
        .every(k => finite(p[k])) && typeof p.qualifies === 'boolean'
      && p.qualifies === (p.prominenceDb >= params.minimumProminenceDb), 'VOCAL_PEAK_INVALID');
    peakMap.set(p.id, p);
  }
  const usedPeaks = new Set<string>();
  const candidates = a.candidates.map((c: Json) => {
    assert(keys(c, ['id', 'startSample', 'endSampleExclusive', 'startSec', 'endSec', 'peakSample', 'peakSec',
      'constituentPeakIds', 'metrics', 'reasons', 'asrOverlap', 'asrContext']) && Array.isArray(c.constituentPeakIds)
      && c.constituentPeakIds.length && new Set(c.constituentPeakIds).size === c.constituentPeakIds.length,
    'VOCAL_CANDIDATE_INVALID');
    const constituent = c.constituentPeakIds.map((id: string) => {
      const peak = peakMap.get(id);
      assert(peak?.qualifies && !usedPeaks.has(id), 'VOCAL_PEAK_COVERAGE_CHANGED'); usedPeaks.add(id);
      return {...structuredClone(peak), voiceAtPeak: voiceAtSample(voice, peak.peakSample)};
    });
    assert.equal(c.startSample, Math.min(...constituent.map((p: Json) => p.startSample)), 'VOCAL_BASIN_CHANGED');
    assert.equal(c.endSampleExclusive, Math.max(...constituent.map((p: Json) => p.endSampleExclusive)), 'VOCAL_BASIN_CHANGED');
    const direct = segments.filter((s: Json) => s.startSec < c.endSec && c.startSec < s.endSec);
    const nearby = segments.filter((s: Json) => s.startSec < c.endSec + params.asrContextPaddingSec
      && c.startSec - params.asrContextPaddingSec < s.endSec);
    assert(same(c.asrOverlap, direct.map(asrReference)) && same(c.asrContext, nearby.map(asrReference)),
      'VOCAL_ASR_OVERLAP_CHANGED');
    return {candidateId: c.id, ...Object.fromEntries(['startSample', 'endSampleExclusive', 'peakSample', 'startSec', 'endSec',
      'peakSec', 'constituentPeakIds', 'metrics', 'reasons'].map(k => [k, structuredClone(c[k])])),
    peaks: constituent, asrSegments: direct, asrContext: nearby};
  });
  assert.equal(usedPeaks.size, peaks.filter((p: Json) => p.qualifies).length, 'VOCAL_PEAK_COVERAGE_CHANGED');
  return {audioEvidence: {sourceRef, candidatesRef, asrRef, sampleRate: a.sampleRate, sampleCount: a.sampleCount,
    coverage: structuredClone(a.coverage), limitations: structuredClone(a.limitations)}, candidates,
  sourceRefs: [candidatesRef, sourceRef, pcmRef, asrRef, runtimeRef, ...measurementRefs]};
}

/** The fixed normal plan owns text, order and time. Audio discovery never receives this plan. */
export function buildPresentationFocusSelectionInputV003(baseline: Json, context: Json, audio: BoundAudioEvidenceV003) {
  assert.equal(baseline.schemaVersion, 'presentation-output-common-core-plan-v001');
  assert(Array.isArray(baseline.elements), 'FOCUS_BASELINE_INVALID');
  assert(keys(context, ['digestId', 'productionPurpose', 'contexts', 'captionContextIds', 'observations', 'evidenceRefs', 'digestAudioSourceRef'])
    && Array.isArray(context.evidenceRefs), 'FOCUS_CONTEXT_INVALID');
  assert(keys(context.digestAudioSourceRef, ['path', 'fileSha256']) && nonempty(context.digestAudioSourceRef.path)
    && sha(context.digestAudioSourceRef.fileSha256)
    && context.digestAudioSourceRef.fileSha256 === audio.audioEvidence.sourceRef.fileSha256,
  'VOCAL_DIGEST_AUDIO_SOURCE_MISMATCH');
  assert(Number.isSafeInteger(baseline.canvas?.fps) && baseline.canvas.fps > 0, 'FOCUS_BASELINE_CLOCK_INVALID');
  const captions = baseline.elements.filter((e: Json) => e.kind === 'speech-caption');
  assert(captions.length > 0 && captions.every((e: Json) => !Object.hasOwn(e, 'presentationColorRange')
    && !Object.hasOwn(e, 'presentationPreset')), 'FOCUS_REQUIRES_NORMAL_BASELINE');
  assert(Array.isArray(context.captionContextIds) && context.captionContextIds.every((r: Json) =>
    keys(r, ['captionId', 'contextId'])), 'FOCUS_CONTEXT_MEMBERSHIP_INVALID');
  assert.deepEqual(context.captionContextIds.map((r: Json) => r.captionId),
    captions.map((e: Json) => e.instructionId), 'FOCUS_CONTEXT_MEMBERSHIP_CHANGED');
  const input = {schemaVersion: 'presentation-focus-selection-input-v003', digestId: context.digestId,
    productionPurpose: context.productionPurpose, fps: baseline.canvas.fps,
    captions: captions.map((e: Json, i: number) => ({captionId: e.instructionId, text: e.text,
      contextId: context.captionContextIds[i].contextId, startFrame: e.startFrame, endFrameExclusive: e.endFrameExclusive})),
    contexts: structuredClone(context.contexts), observations: structuredClone(context.observations),
    audioEvidence: structuredClone(audio.audioEvidence), audioCandidates: audio.candidates.map(c => ({...structuredClone(c),
      captionIds: captions.filter((caption: Json) => audioCandidateOverlapsCaptionV003(c as any, caption as any,
        audio.audioEvidence.sampleRate, baseline.canvas.fps)).map((caption: Json) => caption.instructionId)}))};
  assertPresentationFocusSelectionInputV003(input);
  return input;
}

export function validatePresentationFocusSelectionResponseV003(request: Json, response: Json, result: Json) {
  assertPresentationFocusSelectionInputV003(request.input); assertPresentationFocusSelectionResultV003(result);
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'presentation-focus-selection-response-v003'
    && response.requestFileSha256 === hash(formal(request)) && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim()
    && request.inputCanonicalSha256 === hash(canonicalJson(request.input)), 'FOCUS_RESPONSE_BINDING_CHANGED');
  assert.equal(result.answer.status, 'complete', 'FOCUS_JUDGMENT_ABSTAINED');
  assertPresentationFocusSelectionCoverageV003(request.input, result.answer); return result.answer;
}

/** Map a single accepted role to a finite rendering preset. Evidence stays in the bound judgment. */
export function projectPresentationFocusSelectionV003(input: any, answer: any, context: Json) {
  assertPresentationFocusSelectionCoverageV003(input, answer);
  assert.equal(answer.status, 'complete', 'FOCUS_JUDGMENT_ABSTAINED');
  const presets = new Map([
    ['Color Accent', {role: 'Focus', presentation: 'provisional-focus'}],
    ['Scale Accent', {role: 'Vocal accent', presentation: 'provisional-vocal'}],
    ['Panel Accent', {role: 'Panel accent', presentation: 'provisional-panel'}],
  ]);
  return {schemaVersion: 'auto-presentation-proposal-v001', context,
    targetCaptionIds: input.captions.map((c: Json) => c.captionId), completion: 'complete',
    effects: answer.decisions.filter((d: Json) => d.decision === 'selected').map((d: Json) => {
      const preset = presets.get(d.role);
      assert(preset, 'PRESENTATION_PUBLIC_ROLE_UNKNOWN');
      return {captionId: d.captionId, ...preset, ...d.selection};
    }),
    exceptions: answer.decisions.filter((d: Json) => ['unrepresentable', 'unresolved'].includes(d.decision))
      .map((d: Json) => ({captionId: d.captionId, status: d.decision, reason: d.reason}))};
}

/** Existing current-Codex transport. No API, new recognition run, or rendering authority. */
export async function executePresentationFocusSelectionV003(options: {
  baselinePath: string; contextPath: string; audioCandidatesPath: string; outputDirectory: string;
  judge?: (request: Json) => Promise<Json>;
}) {
  const {baselinePath, contextPath} = options, out = path.resolve(options.outputDirectory);
  const [baseBytes, contextBytes, promptBytes] = await Promise.all([
    readFile(baselinePath), readFile(contextPath), readFile(promptPath)]);
  const baseline = JSON.parse(baseBytes.toString('utf8')), context = JSON.parse(contextBytes.toString('utf8'));
  const audio = await loadBoundAudioEvidenceV003(options.audioCandidatesPath);
  const input = buildPresentationFocusSelectionInputV003(baseline, context, audio);
  const contextEvidence: Ref[] = [...context.evidenceRefs, context.digestAudioSourceRef];
  for (const ref of contextEvidence) await verifyRef(ref);
  const sources = {baseline: binding(baselinePath, baseBytes), context: binding(contextPath, contextBytes),
    prompt: binding(promptPath, promptBytes), audio: audio.sourceRefs, contextEvidence};
  const sourceRefs = [sources.baseline, sources.context, sources.prompt, ...sources.audio, ...contextEvidence];
  const request = {schemaVersion: 'presentation-focus-selection-request-v003',
    judgmentMethod: 'current-codex-stdin-v001', sources, prompt: promptBytes.toString('utf8'),
    input, inputCanonicalSha256: hash(canonicalJson(input))};
  await mkdir(out);
  const requestRef = await save(path.join(out, 'request.json'), request);
  let response: Json | undefined, responseRef: Ref | undefined;
  try {
    const result = await runPresentationFocusSelectionV003(input, async seen => {
      assert(same(seen, input), 'FOCUS_SKILL_INPUT_CHANGED');
      response = await (options.judge ?? judgeThroughStdinV001)(structuredClone(request));
      responseRef = await save(path.join(out, 'response.json'), response);
      return response.answer;
    });
    const resultRef = await save(path.join(out, 'result.json'), result);
    const answer = validatePresentationFocusSelectionResponseV003(request, response!, result);
    for (const source of [...sourceRefs, requestRef, responseRef!, resultRef]) await verifyRef(source);
    const decisionInputPath = path.join(out, 'decision-input.json');
    await save(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v003', sources,
      requestRef, responseRef, resultRef, inputCanonicalSha256: request.inputCanonicalSha256,
      decisionMethod: request.judgmentMethod, humanQuality: 'not-evaluated', answer});
    const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
    assert(same(loaded.baselinePlan, baseline), 'FOCUS_BASELINE_CHANGED');
    const proposal = projectPresentationFocusSelectionV003(input, answer, loaded.context);
    const fixed = await saveFixedAutoPresentationV001({baselinePath, decisionInputPath, proposal,
      outputPath: path.join(out, 'fixed-auto.json')});
    const resolved = resolveAutoPresentationV001({...loaded, autoProposal: fixed});
    await save(path.join(out, 'resolution.json'), resolved.resolution);
    const counts = Object.fromEntries(['normal', 'selected', 'unrepresentable', 'unresolved']
      .map(s => [s, answer.decisions.filter((d: Json) => d.decision === s).length]));
    const selectedRoles = Object.fromEntries(['Color Accent', 'Scale Accent', 'Panel Accent']
      .map(role => [role, answer.decisions.filter((d: Json) => d.decision === 'selected' && d.role === role).length]));
    const candidateCounts = Object.fromEntries(['selected', 'discarded', 'unrepresentable', 'unresolved']
      .map(s => [s, answer.candidateDecisions.filter((d: Json) => d.decision === s).length]));
    const validation = {schemaVersion: 'presentation-focus-selection-validation-v003', status: 'passed',
      requestRef, resultRef, proposalSha256: fixed.proposalSha256, captionCount: input.captions.length,
      audioCandidateCount: input.audioCandidates.length, counts, selectedRoles, candidateCounts,
      fullCaptionCoverage: 'passed', fullAudioCandidateCoverage: 'passed', exactAudioCaptionOverlap: 'passed',
      exactRangeValidation: 'passed', sourcesUnchanged: 'passed', humanQuality: 'not-evaluated',
      automaticSelectionQuality: 'not-evaluated', overridesApplied: false, normalOnlyIsQualitySuccess: false};
    await save(path.join(out, 'validation.json'), validation); return validation;
  } catch (error) {
    await save(path.join(out, 'rejection.json'), {status: 'rejected', reason: String(error), requestRef}); throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [baselinePath, contextPath, audioCandidatesPath, outputDirectory] = process.argv.slice(2);
  if (!baselinePath || !contextPath || !audioCandidatesPath || !outputDirectory) {
    process.stderr.write('usage: presentation_focus_selection_v001.mts normal-plan.json context.json audio-candidates.json new-output-directory\n');
    process.exitCode = 1;
  } else executePresentationFocusSelectionV003({baselinePath, contextPath, audioCandidatesPath, outputDirectory})
    .then(result => process.stdout.write(JSON.stringify(result) + '\n'))
    .catch(error => {process.stderr.write(String(error) + '\n'); process.exitCode = 1;});
}

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {executePresentationFocusSelectionV002, buildPresentationFocusSelectionInputV002, loadBoundAudioEvidenceV002}
  from './presentation_focus_selection_v001.mts';
import {loadAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001, createAutoPresentationOverridesV001, editAutoPresentationOverrideV001}
  from './presentation_auto_effects_v001.mjs';
const json = (v: any) => `${JSON.stringify(v, null, 2)}\n`;
const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const ref = async (p: string) => {const b = await readFile(p); return {path: p, bytes: b.length, sha256: sha(b)};};
const save = async (p: string, value: any) => {await writeFile(p, json(value)); return ref(p);};

/** Synthetic artifact contract, never media quality evidence or a substitute for a real judgment. */
async function fixture(t: any) {
  const dir = await mkdtemp(path.join(tmpdir(), 'zev-focus-vocal-test-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  const sourcePath = path.join(dir, 'synthetic-media'), pcmPath = path.join(dir, 'synthetic-pcm');
  const asrPath = path.join(dir, 'asr.json'), audioCandidatesPath = path.join(dir, 'audio-candidates.json');
  const baselinePath = path.join(dir, 'baseline.json'), contextPath = path.join(dir, 'context.json');
  await writeFile(sourcePath, 'synthetic source bytes'); await writeFile(pcmPath, Buffer.alloc(30000));
  const source = await ref(sourcePath), pcm = await ref(pcmPath);
  const runtimeReceipt = await save(path.join(dir, 'runtime.json'), {synthetic: true});
  const sampleRate = 1000, sampleCount = 15000;
  const parameters = {powerIntegrationFrames: 5, powerIntegrationMs: 100, prominenceContextFrames: 101,
    prominenceContextMs: 2020, minimumProminenceDb: 9, overlappingEvents: 'union of overlapping basins',
    voiceGate: null, transcriptionGate: null, quota: null, minimumEventGap: null, asrContextPaddingSec: 1};
  const peak = (id: string, startSample: number, endSampleExclusive: number, peakSample: number, qualifies = true) => ({
    id, startSample, endSampleExclusive, peakSample, peakDbfs: -10, baselineDbfs: qualifies ? -22 : -14,
    leftBaselineDbfs: qualifies ? -22 : -14, rightBaselineDbfs: qualifies ? -22 : -14,
    prominenceDb: qualifies ? 12 : 4, riseDb: qualifies ? 12 : 4, fallDb: qualifies ? 12 : 4,
    plateauStartSample: peakSample, plateauEndSampleExclusive: peakSample + 20, qualifies,
    reasons: [qualifies ? 'LOCAL_ENERGY_PROMINENCE_AT_LEAST_9_DB' : 'LOCAL_ENERGY_PROMINENCE_BELOW_9_DB']});
  const peaks = [peak('p-1', 1000, 2500, 1500), peak('p-2', 2000, 5000, 3500),
    peak('p-excluded', 5500, 5700, 5600, false), peak('p-3', 10000, 11000, 10500), peak('p-4', 13000, 14000, 13500)];
  const grid = (step: number, valueKey: string, value: number) => Array.from({length: Math.ceil(sampleCount / step)}, (_, i) => ({
    startSample: i * step, endSampleExclusive: Math.min(sampleCount, (i + 1) * step), [valueKey]: value,
    ...(valueKey === 'voiceProbability' ? {modelPaddingSamples: Math.max(0, (i + 1) * step - sampleCount)} : {})}));
  const measurementValues = {
    'rms.json': grid(20, 'rmsDbfs', -20), 'voice-probability.json': grid(512, 'voiceProbability', 0.9),
    'integrated-rms.json': grid(20, 'integratedRmsDbfs', -20), 'acoustic-peaks.json': peaks};
  const measurementEvidence = [];
  for (const [name, rows] of Object.entries(measurementValues)) measurementEvidence.push(await save(path.join(dir, name), {
    schemaVersion: 'presentation-vocal-audio-measurements-v001', source, sampleRate, sampleCount, parameters, rows}));
  const segment = (id: string, startSec: number, endSec: number, text: string) => ({id, modelSegmentId: 0, seek: 0,
    startSec, endSec, text, tokens: [1], avgLogprob: -0.3, noSpeechProbability: 0.02, temperature: 0,
    compressionRatio: 1, words: [{startSec, endSec, text, probability: 0.8}]});
  const segments = [segment('s-1', 1.1, 2.3, '必ず勝つとは限らない'), segment('s-2', 3.2, 4.8, 'あああ'),
    segment('s-context', 5.5, 5.8, '直後の発話')];
  const asr = {schemaVersion: 'presentation-vocal-asr-evidence-v001', source, pcm, runtimeReceipt,
    sampleRate, sampleCount, durationSec: 15, recognizedLanguage: 'ja', reportedDurationSec: 15,
    reportedDurationAfterVadSec: 15, fullInputPassed: true, generatorFullyConsumed: true,
    options: {language: 'ja', word_timestamps: true, vad_filter: false, initial_prompt: null, prefix: null,
      hotwords: null, otherParameters: 'installed defaults'}, segmentCount: segments.length,
    wordCount: segments.length, segments, limitations: ['Synthetic test only.'], elapsedSec: 0};
  const asrEvidence = await save(asrPath, asr);
  const asrRef = (s: any) => ({segmentId: s.id, ...Object.fromEntries(
    ['startSec', 'endSec', 'text', 'avgLogprob', 'noSpeechProbability'].map(k => [k, s[k]]))});
  const candidate = (id: string, parts: any[]) => {
    const startSample = Math.min(...parts.map(p => p.startSample)), endSampleExclusive = Math.max(...parts.map(p => p.endSampleExclusive));
    const p = parts[0], startSec = startSample / sampleRate, endSec = endSampleExclusive / sampleRate;
    return {id, startSample, endSampleExclusive, startSec, endSec, peakSample: p.peakSample, peakSec: p.peakSample / sampleRate,
      constituentPeakIds: parts.map(p => p.id), metrics: {peakDbfs: p.peakDbfs, baselineDbfs: p.baselineDbfs,
        prominenceDb: p.prominenceDb, riseDb: p.riseDb, fallDb: p.fallDb, durationSec: endSec - startSec,
        voiceProbabilityMax: 0.9, voiceProbabilityMean: 0.9}, reasons: ['ACOUSTIC_PROMINENCE'],
      asrOverlap: segments.filter(s => s.startSec < endSec && startSec < s.endSec).map(asrRef),
      asrContext: segments.filter(s => s.startSec < endSec + 1 && startSec - 1 < s.endSec).map(asrRef)};
  };
  const candidates = [candidate('a-1', peaks.slice(0, 2)), candidate('a-2', [peaks[3]]), candidate('a-3', [peaks[4]])];
  const audio = {schemaVersion: 'presentation-vocal-audio-candidates-v001', source, pcm, sampleRate, sampleCount,
    durationSec: 15, parameters, coverage: {startSample: 0, endSampleExclusive: sampleCount, coveredSamples: sampleCount,
      gapSamples: 0, overlapSamples: 0, rows: measurementValues['rms.json'].length}, candidateCount: candidates.length,
    candidates, asrEvidence, measurementEvidence, limitations: ['Mixed audio may contain game sounds.']};
  await save(audioCandidatesPath, audio);
  const plan = {schemaVersion: 'presentation-output-common-core-plan-v001',
    canvas: {width: 1920, height: 1080, fps: 30}, provenance: {fixed: 'original-source'},
    elements: ['必ず勝つとは限らない', 'あああ', 'A😀猫', '別の場面'].map((text, i) => ({
      instructionId: `c-${i + 1}`, kind: 'speech-caption', text, startFrame: i * 90,
      endFrameExclusive: (i + 1) * 90, sourceMapping: {fixed: `source-${i}`},
      indexedLines: [{lineIndex: 0, text}], visualState: {textStyle: {fontColor: '#FFFDF8', fontSizePx: 94}}}))};
  const context = {digestId: 'saved-digest', productionPurpose: null,
    contexts: [{contextId: 'a', description: '条件を伴う結論と声の反応'}, {contextId: 'b', description: '別の場面'}],
    captionContextIds: plan.elements.map((c, i) => ({captionId: c.instructionId, contextId: i < 3 ? 'a' : 'b'})),
    observations: [], evidenceRefs: [], digestAudioSourceRef: {path: sourcePath, fileSha256: source.sha256}};
  await save(baselinePath, plan); await save(contextPath, context);
  const answer = {status: 'complete', summary: '構造検証用の明示fixture。自動判断の評価には使わない。', decisions: [
    {captionId: 'c-1', role: 'Focus', decision: 'selected', reason: '否定条件を含む核', evidenceCaptionIds: ['c-1'],
      evidenceAudioCandidateIds: ['a-1'], additionalObservation: null, selection: {scope: 'partial-caption', targetText: '勝つとは限らない'}},
    {captionId: 'c-2', role: 'Vocal accent', decision: 'selected', reason: '独立音声候補内の局所変化と声の反応',
      evidenceCaptionIds: ['c-1', 'c-2'], evidenceAudioCandidateIds: ['a-1'], additionalObservation: null, selection: {scope: 'whole-caption'}},
    {captionId: 'c-3', role: 'Focus', decision: 'unrepresentable', reason: '離れた対象を同時に選べない', evidenceCaptionIds: ['c-3'],
      evidenceAudioCandidateIds: [], additionalObservation: null},
    {captionId: 'c-4', role: 'Vocal accent', decision: 'unresolved', reason: '音声認識なしでは声と効果音を区別できない',
      evidenceCaptionIds: ['c-4'], evidenceAudioCandidateIds: ['a-2'], additionalObservation: {kind: 'audio', question: '声の反応か'}}],
    candidateDecisions: [
      {candidateId: 'a-1', decision: 'selected', reason: '同じイベント中の異なる字幕に意味と声の役割を認める', targets: [
        {captionId: 'c-1', role: 'Focus', basis: 'meaning-supported', evidencePeakIds: []},
        {captionId: 'c-2', role: 'Vocal accent', basis: 'vocal-energy-supported', evidencePeakIds: ['p-2']}]},
      {candidateId: 'a-2', decision: 'unresolved', reason: '音声認識が空で声の変化と断定できない', targets: []},
      {candidateId: 'a-3', decision: 'unrepresentable', reason: '字幕のない区間なので既存字幕に演出を付けられない', targets: []}]};
  const response = (request: any) => ({schemaVersion: 'presentation-focus-selection-response-v002',
    requestFileSha256: sha(json(request)), answer: structuredClone(answer), judgmentNote: 'Explicit synthetic test only.'});
  return {dir, sourcePath, pcmPath, asrPath, plan, context, audio, asr, baselinePath, contextPath, audioCandidatesPath, answer, response};
}

test('independent whole-audio evidence binds all captions/candidates and saves one role per caption', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  const result = await executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
    assert.deepEqual(request.input.captions.map((c: any) => c.text), f.plan.elements.map(c => c.text));
    assert.deepEqual(request.input.audioCandidates.map((c: any) => c.captionIds), [['c-1', 'c-2'], ['c-4'], []]);
    const first = request.input.audioCandidates[0];
    assert.deepEqual(first.peaks.map((p: any) => p.id), ['p-1', 'p-2']);
    assert.equal(first.peaks[1].voiceAtPeak.modelPaddingSamples, 0);
    assert.equal(first.asrContext.length, 3); assert.equal(first.asrSegments.length, 2);
    assert.equal(first.asrSegments[0].words[0].probability, 0.8);
    assert.deepEqual(request.input.audioCandidates[1].asrSegments, []);
    return f.response(request);
  }});
  assert.deepEqual(result.counts, {normal: 0, selected: 2, unrepresentable: 1, unresolved: 1});
  assert.deepEqual(result.selectedRoles, {Focus: 1, 'Vocal accent': 1});
  assert.deepEqual(result.candidateCounts, {selected: 1, discarded: 0, unrepresentable: 1, unresolved: 1});
  assert.equal(result.automaticSelectionQuality, 'not-evaluated');
  const loaded = await loadAutoPresentationV001({baselinePath: f.baselinePath,
    decisionInputPath: path.join(outputDirectory, 'decision-input.json'), autoProposalPath: path.join(outputDirectory, 'fixed-auto.json')});
  const args = {baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation};
  const automatic = resolveAutoPresentationV001(args);
  assert.equal(automatic.resolution.automaticStatus, 'complete-with-exceptions');
  const expected = structuredClone(f.plan);
  expected.elements[1].visualState.textStyle.fontSizePx = 128;
  assert.deepEqual(automatic.plan.elements.map(({presentationColorRange: _unused, ...e}: any) => e), expected.elements);
  const empty = createAutoPresentationOverridesV001(args);
  const focusNormal = editAutoPresentationOverrideV001({...args, overrides: empty, captionId: 'c-1', selection: 'Normal'});
  const bothNormal = editAutoPresentationOverrideV001({...args, overrides: focusNormal, captionId: 'c-2', selection: 'Normal'});
  assert.deepEqual(resolveAutoPresentationV001({...args, overrides: bothNormal}).plan, f.plan);
  const focusReset = editAutoPresentationOverrideV001({...args, overrides: bothNormal, captionId: 'c-1', selection: 'Reset'});
  const bothReset = editAutoPresentationOverrideV001({...args, overrides: focusReset, captionId: 'c-2', selection: 'Reset'});
  assert.deepEqual(resolveAutoPresentationV001({...args, overrides: bothReset}).plan, automatic.plan);
  assert.equal(await readFile(f.baselinePath, 'utf8'), json(f.plan));
  await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory, judge: async () => {throw Error('must not run');}}), {code: 'EEXIST'});
});

for (const [name, mutate] of Object.entries({
  missingCaption: (r: any) => r.answer.decisions.pop(),
  reorderedCaptions: (r: any) => r.answer.decisions.reverse(),
  duplicateCaption: (r: any) => r.answer.decisions[1] = r.answer.decisions[0],
  missingCandidate: (r: any) => r.answer.candidateDecisions.pop(),
  reorderedCandidates: (r: any) => r.answer.candidateDecisions.reverse(),
  duplicateCandidate: (r: any) => r.answer.candidateDecisions[1] = r.answer.candidateDecisions[0],
  inventedCaptionEvidence: (r: any) => r.answer.decisions[0].evidenceCaptionIds = ['unknown'],
  inventedAudioEvidence: (r: any) => r.answer.decisions[1].evidenceAudioCandidateIds = ['unknown'],
  inventedPeakEvidence: (r: any) => r.answer.candidateDecisions[0].targets[1].evidencePeakIds = ['unknown'],
  wrongLocalPeak: (r: any) => r.answer.candidateDecisions[0].targets[1].evidencePeakIds = ['p-1'],
  drawingValue: (r: any) => r.answer.decisions[1].selection.fontSizePx = 200,
  roleStacking: (r: any) => r.answer.decisions[1].role = ['Focus', 'Vocal accent'],
  vocalWithoutAudio: (r: any) => r.answer.decisions[1].evidenceAudioCandidateIds = [],
  vocalWithPartialText: (r: any) => r.answer.decisions[1].selection = {scope: 'partial-caption', targetText: 'あああ'},
  vocalWithoutLocalPeak: (r: any) => r.answer.candidateDecisions[0].targets[1].evidencePeakIds = [],
  vocalWithMeaningOnly: (r: any) => r.answer.candidateDecisions[0].targets[1].basis = 'meaning-supported',
  conflictingRole: (r: any) => r.answer.candidateDecisions[0].targets[1] = {captionId: 'c-2', role: 'Focus', basis: 'meaning-supported', evidencePeakIds: []},
  unselectedAudioEvidence: (r: any) => r.answer.candidateDecisions[0] = {candidateId: 'a-1', decision: 'discarded', reason: 'なし', targets: []},
  discardedWithTargets: (r: any) => r.answer.candidateDecisions[0].decision = 'discarded',
  unknownText: (r: any) => r.answer.decisions[0].selection.targetText = '必ず勝つ。',
  graphemeCut: (r: any) => r.answer.decisions[2] = {...r.answer.decisions[0], captionId: 'c-3', evidenceAudioCandidateIds: [], selection: {scope: 'partial-caption', targetText: '\ud83d'}},
  oldRequest: (r: any) => r.requestFileSha256 = '0'.repeat(64),
  oldSchema: (r: any) => r.schemaVersion = 'presentation-focus-selection-response-v001',
  abstained: (r: any) => r.answer = {status: 'abstained', reason: '入力が不十分'},
  nearestCaptionForNoCaptionAudio: (r: any) => {
    r.answer.decisions[3] = {captionId: 'c-4', role: 'Vocal accent', decision: 'selected', reason: '近いから',
      evidenceCaptionIds: ['c-4'], evidenceAudioCandidateIds: ['a-3'], additionalObservation: null, selection: {scope: 'whole-caption'}};
    r.answer.candidateDecisions[2] = {candidateId: 'a-3', decision: 'selected', reason: '近いから',
      targets: [{captionId: 'c-4', role: 'Vocal accent', basis: 'vocal-energy-supported', evidencePeakIds: ['p-4']}]};
  },
})) test(`invalid ${name} never creates a fixed automatic proposal`, async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
    const r = f.response(request); mutate(r); return r;
  }}));
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
  assert.equal((await read(path.join(outputDirectory, 'rejection.json'))).status, 'rejected');
  assert.equal(await readFile(f.baselinePath, 'utf8'), json(f.plan));
});

for (const target of ['baselinePath', 'contextPath', 'audioCandidatesPath', 'asrPath', 'sourcePath', 'pcmPath'] as const)
  test(`changed ${target} during judgment cannot be rebound`, async t => {
    const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
    await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
      await writeFile(f[target], '{}\n'); return f.response(request);
    }}), /SOURCE_CHANGED/);
    assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
  });

test('completed all-Normal and all-discarded is structural success without a quality claim', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  const result = await executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
    const r = f.response(request); r.answer.decisions = r.answer.decisions.map((d: any) => ({
      captionId: d.captionId, role: 'Normal', decision: 'normal', reason: '技術fixtureの通常指定',
      evidenceCaptionIds: [d.captionId], evidenceAudioCandidateIds: [], additionalObservation: null}));
    r.answer.candidateDecisions = r.answer.candidateDecisions.map((d: any) => ({candidateId: d.candidateId,
      decision: 'discarded', reason: '技術fixtureの不採用指定', targets: []})); return r;
  }});
  assert.equal(result.counts.normal, 4); assert.equal(result.normalOnlyIsQualitySuccess, false);
  assert.equal(result.candidateCounts.discarded, 3); assert.equal(result.automaticSelectionQuality, 'not-evaluated');
});

test('the judgment callback cannot change the saved request and rebind its response', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
    request.input.captions[0].text = '条件は省略してよい'; request.inputCanonicalSha256 = '0'.repeat(64);
    return f.response(request);
  }}), /RESPONSE_BINDING_CHANGED/);
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
  assert.equal((await read(path.join(outputDirectory, 'request.json'))).input.captions[0].text, f.plan.elements[0].text);
});

test('the saved request bytes cannot change while an unchanged request is answered', async t => {
  const f = await fixture(t), outputDirectory = path.join(f.dir, 'attempt');
  await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory, judge: async request => {
    await writeFile(path.join(outputDirectory, 'request.json'), '{}\n'); return f.response(request);
  }}), /SOURCE_CHANGED/);
  assert.equal((await readdir(outputDirectory)).includes('fixed-auto.json'), false);
});

test('layout capability, context membership, exact audio binding and original baseline remain mandatory', async t => {
  const f = await fixture(t), audio = await loadBoundAudioEvidenceV002(f.audioCandidatesPath);
  f.context.captionContextIds.reverse();
  assert.throws(() => buildPresentationFocusSelectionInputV002(f.plan, f.context, audio), /MEMBERSHIP_CHANGED/);
  f.context.captionContextIds.reverse();
  const wrong = structuredClone(f.context); wrong.digestAudioSourceRef.fileSha256 = '0'.repeat(64);
  assert.throws(() => buildPresentationFocusSelectionInputV002(f.plan, wrong, audio), /DIGEST_AUDIO_SOURCE_MISMATCH/);
  (f.plan.elements[0] as any).presentationColorRange = {startCodePoint: 0, endCodePointExclusive: 1, fontColor: '#FFF000'};
  assert.throws(() => buildPresentationFocusSelectionInputV002(f.plan, f.context, audio), /NORMAL_BASELINE/);
  (f.context.observations as any[]).push({observationId: 'layout', kind: 'vocal-unrepresentable', captionIds: ['c-2'], description: '固定サイズで安全領域を超える'});
  await save(f.contextPath, f.context);
  await assert.rejects(executePresentationFocusSelectionV002({...f, outputDirectory: path.join(f.dir, 'attempt'), judge: async request => f.response(request)}), /RENDERING_UNREPRESENTABLE/);
});

for (const [name, mutate] of Object.entries({
  asrNotFull: (a: any) => a.fullInputPassed = false,
  generatorPartial: (a: any) => a.generatorFullyConsumed = false,
  captionHint: (a: any) => a.options.initial_prompt = '既存字幕を読む',
  vadGate: (a: any) => a.options.vad_filter = true,
  missingWords: (a: any) => delete a.segments[0].words,
  inventedWordProbability: (a: any) => a.segments[0].words[0].probability = 2,
})) test(`whole-audio recognition rejects ${name} even after a consistent file rebinding`, async t => {
  const f = await fixture(t); mutate(f.asr);
  f.audio.asrEvidence = await save(f.asrPath, f.asr); await save(f.audioCandidatesPath, f.audio);
  await assert.rejects(loadBoundAudioEvidenceV002(f.audioCandidatesPath));
});

for (const [name, mutate] of Object.entries({
  omittedQualifyingPeak: (a: any) => {a.candidates.pop(); a.candidateCount--;},
  unknownPeak: (a: any) => a.candidates[0].constituentPeakIds[0] = 'unknown',
  duplicatePeak: (a: any) => a.candidates[0].constituentPeakIds.push('p-1'),
  omittedAsr: (a: any) => a.candidates[0].asrOverlap.pop(),
  omittedAsrContext: (a: any) => a.candidates[0].asrContext.pop(),
  falseCoverage: (a: any) => a.coverage.coveredSamples--,
  quota: (a: any) => a.parameters.quota = 2,
  sourceHash: (a: any) => a.source.sha256 = '0'.repeat(64),
})) test(`native evidence rejects ${name}`, async t => {
  const f = await fixture(t); mutate(f.audio); await save(f.audioCandidatesPath, f.audio);
  await assert.rejects(loadBoundAudioEvidenceV002(f.audioCandidatesPath));
});

for (const name of ['rms.json', 'voice-probability.json', 'integrated-rms.json'])
  test(`declared full coverage cannot hide an actual sample gap in ${name}`, async t => {
    const f = await fixture(t), p = path.join(f.dir, name), measurement = await read(p);
    measurement.rows[1].startSample++;
    const changed = await save(p, measurement);
    f.audio.measurementEvidence = f.audio.measurementEvidence.map(r => r.path === p ? changed : r);
    await save(f.audioCandidatesPath, f.audio);
    await assert.rejects(loadBoundAudioEvidenceV002(f.audioCandidatesPath), /MEASUREMENT_COVERAGE_CHANGED/);
  });

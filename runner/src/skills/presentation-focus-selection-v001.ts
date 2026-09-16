/** Meaning and vocal-energy judgment. Rendering values remain outside this Skill. */
type FileRef = {path: string; fileSha256: string};
type Caption = {captionId: string; text: string; contextId: string | null; startFrame: number; endFrameExclusive: number};
type Word = {startSec: number; endSec: number; text: string; probability: number};
export type VocalAsrSegmentV002 = {id: string; startSec: number; endSec: number; text: string;
  avgLogprob: number; noSpeechProbability: number; temperature: number; compressionRatio: number; words: Word[]};
export type VocalPeakV002 = {id: string; startSample: number; endSampleExclusive: number; peakSample: number;
  peakDbfs: number; baselineDbfs: number; leftBaselineDbfs: number; rightBaselineDbfs: number;
  prominenceDb: number; riseDb: number; fallDb: number; plateauStartSample: number; plateauEndSampleExclusive: number;
  qualifies: true; reasons: string[]; voiceAtPeak: {startSample: number; endSampleExclusive: number;
    voiceProbability: number; modelPaddingSamples: number}};
export type VocalCandidateV002 = {candidateId: string; startSample: number; endSampleExclusive: number;
  peakSample: number; startSec: number; endSec: number; peakSec: number; captionIds: string[];
  metrics: {peakDbfs: number; baselineDbfs: number; prominenceDb: number; riseDb: number; fallDb: number;
    durationSec: number; voiceProbabilityMax: number; voiceProbabilityMean: number};
  reasons: string[]; constituentPeakIds: string[]; peaks: VocalPeakV002[];
  asrSegments: VocalAsrSegmentV002[]; asrContext: VocalAsrSegmentV002[]};
export type PresentationFocusSelectionInputV002 = {
  schemaVersion: 'presentation-focus-selection-input-v002'; digestId: string; productionPurpose: string | null;
  fps: number; captions: Caption[]; contexts: Array<{contextId: string; description: string}>;
  observations: Array<{observationId: string; kind: 'semantic' | 'video' | 'vocal-unrepresentable';
    captionIds: string[]; description: string}>;
  audioEvidence: {sourceRef: FileRef; candidatesRef: FileRef; asrRef: FileRef; sampleRate: number; sampleCount: number;
    coverage: {startSample: 0; endSampleExclusive: number; coveredSamples: number; gapSamples: 0; overlapSamples: 0; rows: number};
    limitations: string[]};
  audioCandidates: VocalCandidateV002[];
};
type Role = 'Focus' | 'Vocal accent';
type Decision = {captionId: string; role: 'Normal' | Role | null;
  decision: 'normal' | 'selected' | 'unrepresentable' | 'unresolved'; reason: string;
  evidenceCaptionIds: string[]; evidenceAudioCandidateIds: string[];
  additionalObservation: null | {kind: 'audio' | 'video'; question: string};
  selection?: {scope: 'whole-caption'} | {scope: 'partial-caption'; targetText: string; occurrence?: number}};
type CandidateDecision = {candidateId: string; decision: 'selected' | 'discarded' | 'unresolved' | 'unrepresentable';
  reason: string; targets: Array<{captionId: string; role: Role;
    basis: 'meaning-supported' | 'vocal-energy-supported'; evidencePeakIds: string[]}>};
export type PresentationFocusSelectionAnswerV002 = {status: 'abstained'; reason: string}
  | {status: 'complete'; summary: string; decisions: Decision[]; candidateDecisions: CandidateDecision[]};
export type PresentationFocusSelectionResultV002 = {schemaVersion: 'presentation-focus-selection-result-v002';
  skillId: 'presentation-focus-selection'; skillVersion: 'v002'; answer: unknown};
const object = (v: unknown): v is Record<string, any> => v !== null && typeof v === 'object' && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v));
const keys = (v: unknown, names: string[]): v is Record<string, any> => object(v)
  && Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const id = (v: unknown): v is string => text(v) && /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(v);
const list = (v: unknown): v is any[] => Array.isArray(v) && Object.keys(v).length === v.length
  && Array.from({length: v.length}, (_, i) => Object.hasOwn(v, i)).every(Boolean);
const ids = (v: unknown): v is string[] => list(v) && v.every(id) && new Set(v).size === v.length;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nonnegativeInteger = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const positiveInteger = (v: unknown): v is number => nonnegativeInteger(v) && v > 0;
const probability = (v: unknown): v is number => finite(v) && v >= 0 && v <= 1;
const fileRef = (v: unknown) => keys(v, ['path', 'fileSha256']) && text(v.path)
  && typeof v.fileSha256 === 'string' && /^[a-f0-9]{64}$/u.test(v.fileSha256);
function fail(message: string): never {throw new TypeError(message);}

/** Compare complete-audio samples to fixed output frames without rounding or proximity matching. */
export function audioCandidateOverlapsCaptionV002(candidate: Pick<VocalCandidateV002, 'startSample' | 'endSampleExclusive'>,
  caption: Pick<Caption, 'startFrame' | 'endFrameExclusive'>, sampleRate: number, fps: number) {
  return BigInt(candidate.startSample) * BigInt(fps) < BigInt(caption.endFrameExclusive) * BigInt(sampleRate)
    && BigInt(candidate.endSampleExclusive) * BigInt(fps) > BigInt(caption.startFrame) * BigInt(sampleRate);
}

export function assertVocalAsrSegmentV002(v: unknown): asserts v is VocalAsrSegmentV002 {
  if (!keys(v, ['id', 'startSec', 'endSec', 'text', 'avgLogprob', 'noSpeechProbability', 'temperature', 'compressionRatio', 'words'])
    || !id(v.id) || !finite(v.startSec) || v.startSec < 0 || !finite(v.endSec) || v.endSec < v.startSec
    || typeof v.text !== 'string' || !finite(v.avgLogprob) || !probability(v.noSpeechProbability)
    || !finite(v.temperature) || !finite(v.compressionRatio) || !list(v.words))
    fail('VOCAL_ASR_SEGMENT_INVALID');
  for (const w of v.words) {
    if (!keys(w, ['startSec', 'endSec', 'text', 'probability']) || !finite(w.startSec) || w.startSec < 0
      || !finite(w.endSec) || w.endSec < w.startSec || typeof w.text !== 'string' || !probability(w.probability))
      fail('VOCAL_ASR_WORD_INVALID');
  }
}

export function assertPresentationFocusSelectionInputV002(v: unknown): asserts v is PresentationFocusSelectionInputV002 {
  if (!keys(v, ['schemaVersion', 'digestId', 'productionPurpose', 'fps', 'captions', 'contexts', 'observations',
    'audioEvidence', 'audioCandidates']) || v.schemaVersion !== 'presentation-focus-selection-input-v002'
    || !id(v.digestId) || !(v.productionPurpose === null || text(v.productionPurpose)) || !positiveInteger(v.fps)
    || !list(v.captions) || !v.captions.length || !list(v.contexts) || !list(v.observations) || !list(v.audioCandidates))
    fail('FOCUS_INPUT_INVALID');
  const contexts = new Set<string>(), captions = new Set<string>(), observations = new Set<string>();
  for (const c of v.contexts) {
    if (!keys(c, ['contextId', 'description']) || !id(c.contextId) || !text(c.description) || contexts.has(c.contextId))
      fail('FOCUS_CONTEXT_INVALID');
    contexts.add(c.contextId);
  }
  for (const c of v.captions) {
    if (!keys(c, ['captionId', 'text', 'contextId', 'startFrame', 'endFrameExclusive']) || !id(c.captionId)
      || !text(c.text) || captions.has(c.captionId) || !(c.contextId === null || contexts.has(c.contextId))
      || !nonnegativeInteger(c.startFrame) || !positiveInteger(c.endFrameExclusive) || c.endFrameExclusive <= c.startFrame)
      fail('FOCUS_CAPTION_INVALID');
    captions.add(c.captionId);
  }
  for (const o of v.observations) {
    if (!keys(o, ['observationId', 'kind', 'captionIds', 'description']) || !id(o.observationId)
      || observations.has(o.observationId) || !['semantic', 'video', 'vocal-unrepresentable'].includes(o.kind)
      || !ids(o.captionIds) || o.captionIds.some((c: string) => !captions.has(c)) || !text(o.description))
      fail('FOCUS_OBSERVATION_INVALID');
    observations.add(o.observationId);
  }
  const a = v.audioEvidence;
  if (!keys(a, ['sourceRef', 'candidatesRef', 'asrRef', 'sampleRate', 'sampleCount', 'coverage', 'limitations'])
    || !fileRef(a.sourceRef) || !fileRef(a.candidatesRef) || !fileRef(a.asrRef)
    || !positiveInteger(a.sampleRate) || !positiveInteger(a.sampleCount)
    || !list(a.limitations) || !a.limitations.every(text)
    || !keys(a.coverage, ['startSample', 'endSampleExclusive', 'coveredSamples', 'gapSamples', 'overlapSamples', 'rows'])
    || a.coverage.startSample !== 0 || a.coverage.endSampleExclusive !== a.sampleCount
    || a.coverage.coveredSamples !== a.sampleCount || a.coverage.gapSamples !== 0 || a.coverage.overlapSamples !== 0
    || !positiveInteger(a.coverage.rows))
    fail('VOCAL_AUDIO_COVERAGE_INVALID');
  const candidates = new Set<string>();
  let lastStart = -1;
  for (const c of v.audioCandidates) {
    if (!keys(c, ['candidateId', 'startSample', 'endSampleExclusive', 'peakSample', 'startSec', 'endSec', 'peakSec',
      'captionIds', 'metrics', 'reasons', 'constituentPeakIds', 'peaks', 'asrSegments', 'asrContext'])
      || !id(c.candidateId) || candidates.has(c.candidateId)
      || !nonnegativeInteger(c.startSample) || c.startSample < lastStart || !positiveInteger(c.endSampleExclusive)
      || c.endSampleExclusive <= c.startSample || c.endSampleExclusive > a.sampleCount
      || !nonnegativeInteger(c.peakSample) || c.peakSample < c.startSample || c.peakSample >= c.endSampleExclusive
      || c.startSec !== c.startSample / a.sampleRate || c.endSec !== c.endSampleExclusive / a.sampleRate
      || c.peakSec !== c.peakSample / a.sampleRate || !ids(c.captionIds) || !ids(c.constituentPeakIds)
      || !c.constituentPeakIds.length || !list(c.reasons) || !c.reasons.length || !c.reasons.every(text)
      || !list(c.peaks) || !list(c.asrSegments) || !list(c.asrContext))
      fail('VOCAL_CANDIDATE_INVALID');
    const m = c.metrics;
    if (!keys(m, ['peakDbfs', 'baselineDbfs', 'prominenceDb', 'riseDb', 'fallDb', 'durationSec',
      'voiceProbabilityMax', 'voiceProbabilityMean']) || !Object.values(m).every(finite)
      || m.durationSec !== (c.endSampleExclusive - c.startSample) / a.sampleRate
      || !probability(m.voiceProbabilityMax) || !probability(m.voiceProbabilityMean)) fail('VOCAL_METRICS_INVALID');
    const matching = v.captions.filter((caption: Caption) => audioCandidateOverlapsCaptionV002(c as VocalCandidateV002, caption, a.sampleRate, v.fps))
      .map((caption: Caption) => caption.captionId);
    if (JSON.stringify(c.captionIds) !== JSON.stringify(matching)) fail('VOCAL_CAPTION_OVERLAP_CHANGED');
    if (JSON.stringify(c.constituentPeakIds) !== JSON.stringify(c.peaks.map((p: VocalPeakV002) => p.id)))
      fail('VOCAL_PEAK_COVERAGE_CHANGED');
    for (const p of c.peaks) {
      if (!keys(p, ['id', 'startSample', 'endSampleExclusive', 'peakSample', 'peakDbfs', 'baselineDbfs',
        'leftBaselineDbfs', 'rightBaselineDbfs', 'prominenceDb', 'riseDb', 'fallDb', 'plateauStartSample',
        'plateauEndSampleExclusive', 'qualifies', 'reasons', 'voiceAtPeak']) || !id(p.id) || p.qualifies !== true
        || !nonnegativeInteger(p.startSample) || p.startSample < c.startSample
        || !positiveInteger(p.endSampleExclusive) || p.endSampleExclusive > c.endSampleExclusive
        || p.endSampleExclusive <= p.startSample || !nonnegativeInteger(p.peakSample)
        || p.peakSample < p.startSample || p.peakSample >= p.endSampleExclusive
        || !nonnegativeInteger(p.plateauStartSample) || !positiveInteger(p.plateauEndSampleExclusive)
        || p.plateauStartSample > p.peakSample || p.plateauEndSampleExclusive <= p.peakSample
        || !['peakDbfs', 'baselineDbfs', 'leftBaselineDbfs', 'rightBaselineDbfs', 'prominenceDb', 'riseDb', 'fallDb']
          .every(k => finite(p[k])) || !list(p.reasons) || !p.reasons.length || !p.reasons.every(text))
        fail('VOCAL_PEAK_INVALID');
      const voice = p.voiceAtPeak;
      if (!keys(voice, ['startSample', 'endSampleExclusive', 'voiceProbability', 'modelPaddingSamples'])
        || !nonnegativeInteger(voice.startSample) || !positiveInteger(voice.endSampleExclusive)
        || voice.endSampleExclusive > a.sampleCount || voice.startSample > p.peakSample
        || voice.endSampleExclusive <= p.peakSample || !probability(voice.voiceProbability)
        || !nonnegativeInteger(voice.modelPaddingSamples)) fail('VOCAL_PEAK_VOICE_INVALID');
    }
    for (const [segments, direct] of [[c.asrSegments, true], [c.asrContext, false]] as const) {
      const asrIds = new Set<string>();
      for (const s of segments) {
        assertVocalAsrSegmentV002(s);
        if (asrIds.has(s.id) || (direct && !(s.startSec < c.endSec && s.endSec > c.startSec)))
          fail('VOCAL_ASR_OVERLAP_INVALID');
        asrIds.add(s.id);
      }
    }
    lastStart = c.startSample; candidates.add(c.candidateId);
  }
}

export function assertPresentationFocusSelectionAnswerV002(v: unknown): asserts v is PresentationFocusSelectionAnswerV002 {
  if (keys(v, ['status', 'reason']) && v.status === 'abstained' && text(v.reason)) return;
  if (!keys(v, ['status', 'summary', 'decisions', 'candidateDecisions']) || v.status !== 'complete' || !text(v.summary)
    || !list(v.decisions) || !v.decisions.length || !list(v.candidateDecisions)) fail('FOCUS_ANSWER_INVALID');
  for (const d of v.decisions) {
    const names = ['captionId', 'role', 'decision', 'reason', 'evidenceCaptionIds', 'evidenceAudioCandidateIds', 'additionalObservation'];
    if (d?.decision === 'selected') names.push('selection');
    if (!keys(d, names) || !id(d.captionId) || !text(d.reason) || !ids(d.evidenceCaptionIds)
      || !d.evidenceCaptionIds.length || !ids(d.evidenceAudioCandidateIds)) fail('FOCUS_DECISION_INVALID');
    if (!(d.additionalObservation === null || (keys(d.additionalObservation, ['kind', 'question'])
      && ['audio', 'video'].includes(d.additionalObservation.kind) && text(d.additionalObservation.question))))
      fail('FOCUS_ADDITIONAL_OBSERVATION_INVALID');
    if (d.decision === 'normal') {
      if (d.role !== 'Normal' || d.additionalObservation !== null) fail('FOCUS_NORMAL_INVALID');
    } else if (d.decision === 'selected') {
      if (!['Focus', 'Vocal accent'].includes(d.role) || d.additionalObservation !== null) fail('FOCUS_SELECTED_ROLE_INVALID');
      const s = d.selection;
      if (d.role === 'Vocal accent' && (!d.evidenceAudioCandidateIds.length || !keys(s, ['scope'])
        || s.scope !== 'whole-caption')) fail('VOCAL_SELECTION_INVALID');
      if (keys(s, ['scope']) && s.scope === 'whole-caption') continue;
      if (!object(s) || !keys(s, ['scope', 'targetText', ...(Object.hasOwn(s, 'occurrence') ? ['occurrence'] : [])])
        || s.scope !== 'partial-caption' || typeof s.targetText !== 'string' || !s.targetText.length
        || !/[^\r\n]/u.test(s.targetText)
        || (Object.hasOwn(s, 'occurrence') && (!Number.isSafeInteger(s.occurrence) || s.occurrence < 1)))
        fail('FOCUS_SELECTION_INVALID');
    } else if (d.decision === 'unrepresentable' || d.decision === 'unresolved') {
      if (!(d.role === null || ['Focus', 'Vocal accent'].includes(d.role))) fail('FOCUS_EXCEPTION_ROLE_INVALID');
      if (d.decision === 'unrepresentable' && d.additionalObservation !== null) fail('FOCUS_EXCEPTION_OBSERVATION_INVALID');
    } else fail('FOCUS_DECISION_INVALID');
  }
  for (const d of v.candidateDecisions) {
    if (!keys(d, ['candidateId', 'decision', 'reason', 'targets']) || !id(d.candidateId)
      || !list(d.targets) || !text(d.reason)) fail('VOCAL_CANDIDATE_DECISION_INVALID');
    if (d.decision === 'selected') {
      if (!d.targets.length || new Set(d.targets.map((t: any) => t.captionId)).size !== d.targets.length)
        fail('VOCAL_CANDIDATE_TARGET_INVALID');
      for (const t of d.targets) {
        if (!keys(t, ['captionId', 'role', 'basis', 'evidencePeakIds']) || !id(t.captionId)
          || !['Focus', 'Vocal accent'].includes(t.role) || !ids(t.evidencePeakIds)
          || t.basis !== (t.role === 'Vocal accent' ? 'vocal-energy-supported' : 'meaning-supported')
          || (t.role === 'Vocal accent' && !t.evidencePeakIds.length)) fail('VOCAL_CANDIDATE_GROUNDING_INVALID');
      }
    } else if (['discarded', 'unresolved', 'unrepresentable'].includes(d.decision)) {
      if (d.targets.length) fail('VOCAL_CANDIDATE_TARGET_INVALID');
    } else fail('VOCAL_CANDIDATE_DECISION_INVALID');
  }
}

export function assertPresentationFocusSelectionCoverageV002(input: unknown, answer: unknown) {
  assertPresentationFocusSelectionInputV002(input); assertPresentationFocusSelectionAnswerV002(answer);
  if (answer.status === 'abstained') fail('FOCUS_JUDGMENT_ABSTAINED');
  if (answer.decisions.length !== input.captions.length || answer.decisions.some((d, i) => d.captionId !== input.captions[i].captionId))
    fail('FOCUS_COVERAGE_CHANGED');
  if (answer.candidateDecisions.length !== input.audioCandidates.length
    || answer.candidateDecisions.some((d, i) => d.candidateId !== input.audioCandidates[i].candidateId))
    fail('VOCAL_CANDIDATE_COVERAGE_CHANGED');
  const captions = new Map(input.captions.map(c => [c.captionId, c]));
  const candidates = new Map(input.audioCandidates.map(c => [c.candidateId, c]));
  const decisions = new Map(answer.decisions.map(d => [d.captionId, d]));
  const candidateDecisions = new Map(answer.candidateDecisions.map(d => [d.candidateId, d]));
  const unsupported = new Set(input.observations.filter(o => o.kind === 'vocal-unrepresentable').flatMap(o => o.captionIds));
  for (const d of answer.decisions) {
    if (d.evidenceCaptionIds.some(id => !captions.has(id))) fail('FOCUS_EVIDENCE_UNKNOWN');
    if (d.evidenceAudioCandidateIds.some(id => !candidates.has(id))) fail('VOCAL_EVIDENCE_UNKNOWN');
    if (d.decision !== 'selected') continue;
    if (d.role === 'Vocal accent' && unsupported.has(d.captionId)) fail('VOCAL_RENDERING_UNREPRESENTABLE');
    for (const candidateId of d.evidenceAudioCandidateIds) {
      const c = candidates.get(candidateId)!, cd = candidateDecisions.get(candidateId)!;
      if (!c.captionIds.includes(d.captionId) || cd.decision !== 'selected'
        || !cd.targets.some(t => t.captionId === d.captionId && t.role === d.role)) fail('VOCAL_SELECTION_EVIDENCE_CONFLICT');
    }
  }
  for (const d of answer.candidateDecisions) {
    if (d.decision !== 'selected') continue;
    const c = candidates.get(d.candidateId)!;
    for (const target of d.targets) {
      const captionId = target.captionId, cd = decisions.get(captionId);
      if (!c.captionIds.includes(captionId) || cd?.decision !== 'selected' || cd.role !== target.role
        || !cd.evidenceAudioCandidateIds.includes(d.candidateId)) fail('VOCAL_SELECTION_EVIDENCE_CONFLICT');
      for (const peakId of target.evidencePeakIds) {
        const peak = c.peaks.find(p => p.id === peakId);
        if (!peak || !audioCandidateOverlapsCaptionV002(peak, captions.get(captionId)!, input.audioEvidence.sampleRate, input.fps))
          fail('VOCAL_LOCAL_PEAK_EVIDENCE_CONFLICT');
      }
    }
  }
}

export function assertPresentationFocusSelectionResultV002(v: unknown): asserts v is PresentationFocusSelectionResultV002 & {
  answer: PresentationFocusSelectionAnswerV002} {
  if (!keys(v, ['schemaVersion', 'skillId', 'skillVersion', 'answer'])
    || v.schemaVersion !== 'presentation-focus-selection-result-v002' || v.skillId !== 'presentation-focus-selection'
    || v.skillVersion !== 'v002') fail('FOCUS_RESULT_INVALID');
  assertPresentationFocusSelectionAnswerV002(v.answer);
}

export async function runPresentationFocusSelectionV002(input: PresentationFocusSelectionInputV002,
  judge: (input: PresentationFocusSelectionInputV002) => Promise<unknown>): Promise<PresentationFocusSelectionResultV002> {
  assertPresentationFocusSelectionInputV002(input);
  const answer = await judge(structuredClone(input));
  return {schemaVersion: 'presentation-focus-selection-result-v002', skillId: 'presentation-focus-selection',
    skillVersion: 'v002', answer: structuredClone(answer)};
}

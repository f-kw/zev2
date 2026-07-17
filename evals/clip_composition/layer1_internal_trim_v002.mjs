import { complementRanges, createLayer1TrimPlan, DEFAULT_EDGE_PADDING_MS, DEFAULT_GAP_CANDIDATE_MS } from './layer1_internal_trim.mjs';

export const LAYER1_TRIM_V002_VERSION = 'layer1-trim-v002';

function normalizedSpeaker(value) {
  if (typeof value !== 'string') return null;
  const speaker = value.trim();
  if (!speaker || speaker.toLowerCase() === 'unknown') return null;
  return speaker;
}

function normalizeWords(words, outerRange) {
  const seen = new Set();
  return words.map((word, index) => {
    const id = String(word?.id ?? '');
    if (!id || seen.has(id)) throw new Error(`単語IDが不正または重複しています: ${id || index}`);
    seen.add(id);
    if (!Number.isInteger(word.startMs) || !Number.isInteger(word.endMs) || word.startMs >= word.endMs) {
      throw new Error(`単語時刻が不正です: ${id}`);
    }
    return {
      id,
      text: String(word.text ?? ''),
      startMs: word.startMs,
      endMs: word.endMs,
      speaker: normalizedSpeaker(word.speaker),
      utteranceId: typeof word.utteranceId === 'string' && word.utteranceId.trim() ? word.utteranceId.trim() : null
    };
  }).sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.id.localeCompare(right.id))
    .filter((word) => word.endMs > outerRange.startMs && word.startMs < outerRange.endMs);
}

function protectionReason(previous, next) {
  if (!previous || !next) return 'word_anchor_unknown';
  if (!previous.speaker || !next.speaker) return 'speaker_unknown';
  if (previous.speaker !== next.speaker) return 'speaker_change';
  if (!previous.utteranceId || !next.utteranceId) return 'utterance_unknown';
  if (previous.utteranceId !== next.utteranceId) return 'utterance_boundary';
  return null;
}

function mergeCuts(cuts) {
  const merged = [];
  for (const cut of [...cuts].sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs)) {
    const previous = merged.at(-1);
    if (!previous || cut.startMs > previous.endMs) {
      merged.push({ ...cut, kinds: [...cut.kinds], reasons: [...cut.reasons], removedWordIds: [...cut.removedWordIds], acousticEvidence: [...(cut.acousticEvidence ?? [])] });
      continue;
    }
    const extendsEnd = cut.endMs > previous.endMs;
    previous.endMs = Math.max(previous.endMs, cut.endMs);
    previous.kinds = [...new Set([...previous.kinds, ...cut.kinds])];
    previous.reasons = [...new Set([...previous.reasons, ...cut.reasons])];
    previous.removedWordIds = [...new Set([...previous.removedWordIds, ...cut.removedWordIds])];
    previous.acousticEvidence.push(...(cut.acousticEvidence ?? []));
    if (extendsEnd) {
      previous.afterWordId = cut.afterWordId;
      previous.afterText = cut.afterText;
    }
  }
  return merged.map((cut, index) => ({ ...cut, cutId: `cut-${String(index + 1).padStart(3, '0')}`, durationMs: cut.endMs - cut.startMs }));
}

function validatePlan(outerRange, cuts, words) {
  for (const cut of cuts) {
    if (cut.startMs < outerRange.startMs || cut.endMs > outerRange.endMs || cut.startMs >= cut.endMs) {
      throw new Error(`外側境界外または不正なカット指示です: ${cut.cutId}`);
    }
  }
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index].startMs < cuts[index - 1].endMs) throw new Error('カット指示が重複しています');
  }
  const removed = new Set(cuts.flatMap((cut) => cut.removedWordIds));
  const remaining = words.filter((word) => !removed.has(word.id)).map((word) => word.id);
  const inputIds = words.map((word) => word.id);
  let cursor = 0;
  for (const id of remaining) {
    const found = inputIds.indexOf(id, cursor);
    if (found < 0) throw new Error('削除後の語列が入力語列の部分列ではありません');
    cursor = found + 1;
  }
  return remaining;
}

export function createLayer1TrimPlanV002(input) {
  if (!input || typeof input !== 'object') throw new Error('入力がありません');
  const outerRange = input.outerRange ?? {};
  if (!Number.isInteger(outerRange.startMs) || !Number.isInteger(outerRange.endMs) || outerRange.startMs >= outerRange.endMs) {
    throw new Error('外側境界が不正です');
  }
  const gapCandidateMs = input.gapCandidateMs ?? DEFAULT_GAP_CANDIDATE_MS;
  const edgePaddingMs = input.edgePaddingMs ?? DEFAULT_EDGE_PADDING_MS;
  const words = normalizeWords(input.words ?? [], outerRange);
  const v001 = createLayer1TrimPlan({ outerRange, words, gapCandidateMs, edgePaddingMs });
  const acousticCuts = [];
  const acousticProtectedCandidates = [];

  for (const [index, relativeRun] of (input.acousticEvidence?.voice?.consensusRuns ?? []).entries()) {
    if (!Number.isInteger(relativeRun.startMs) || !Number.isInteger(relativeRun.endMs) || relativeRun.endMs <= relativeRun.startMs) {
      throw new Error(`音響区間が不正です: ${index}`);
    }
    const gapStartMs = outerRange.startMs + relativeRun.startMs;
    const gapEndMs = Math.min(outerRange.endMs, outerRange.startMs + relativeRun.endMs);
    const gapMs = gapEndMs - gapStartMs;
    if (gapMs < gapCandidateMs || gapStartMs < outerRange.startMs || gapEndMs > outerRange.endMs) continue;
    const overlappingWords = words.filter((word) => word.startMs < gapEndMs && word.endMs > gapStartMs);
    const previous = words.filter((word) => word.endMs <= gapStartMs).at(-1) ?? null;
    const next = words.find((word) => word.startMs >= gapEndMs) ?? null;
    const candidate = {
      candidateId: `acoustic-${String(index + 1).padStart(3, '0')}`,
      kind: 'voice_absence',
      gapStartMs,
      gapEndMs,
      gapMs,
      beforeWordId: previous?.id ?? null,
      beforeText: previous?.text ?? null,
      afterWordId: next?.id ?? null,
      afterText: next?.text ?? null,
      overlappingWordIds: overlappingWords.map((word) => word.id),
      acousticEvidence: {
        method: input.acousticEvidence.voice.method,
        relativeStartMs: relativeRun.startMs,
        relativeEndMs: relativeRun.endMs,
        consensusDurationMs: relativeRun.durationMs,
        volumeSilenceObserved: Boolean(input.acousticEvidence.volume?.observed400ms)
      }
    };
    let reason = overlappingWords.length > 0 ? 'word_timestamp_overlaps_acoustic_gap' : protectionReason(previous, next);
    const startMs = gapStartMs + edgePaddingMs;
    const endMs = gapEndMs - edgePaddingMs;
    if (!reason && startMs >= endMs) reason = 'padding_consumes_candidate';
    if (reason) {
      acousticProtectedCandidates.push({ ...candidate, protectionReason: reason });
      continue;
    }
    acousticCuts.push({
      startMs,
      endMs,
      kinds: ['voice_absence'],
      beforeWordId: previous.id,
      beforeText: previous.text,
      afterWordId: next.id,
      afterText: next.text,
      removedWordIds: [],
      reasons: ['acoustic_and_word_timing_double_evidence'],
      acousticEvidence: [candidate.acousticEvidence]
    });
  }

  const inheritedFillerCuts = v001.cutDirectives.filter((cut) => (
    cut.kinds.includes('filler') && !cut.kinds.includes('speech_absence')
  ));
  const cuts = mergeCuts([...inheritedFillerCuts, ...acousticCuts]);
  const remainingWordIds = validatePlan(outerRange, cuts, words);
  return {
    kind: 'layer1_internal_trim_plan',
    version: LAYER1_TRIM_V002_VERSION,
    outerRange: {
      sourceVideoId: typeof outerRange.sourceVideoId === 'string' ? outerRange.sourceVideoId : null,
      startMs: outerRange.startMs,
      endMs: outerRange.endMs
    },
    initialValues: { gapCandidateMs, edgePaddingMs },
    acousticInput: {
      method: input.acousticEvidence?.voice?.method ?? null,
      consensusRunCount: input.acousticEvidence?.voice?.consensusRuns?.length ?? 0,
      volumeSilenceObserved: Boolean(input.acousticEvidence?.volume?.observed400ms)
    },
    inputWordCount: words.length,
    cutDirectives: cuts,
    protectedCandidates: [...v001.protectedCandidates, ...acousticProtectedCandidates],
    remainingSourceRanges: complementRanges(outerRange, cuts),
    remainingWordIds,
    removedDurationMs: cuts.reduce((sum, cut) => sum + cut.durationMs, 0)
  };
}

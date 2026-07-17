import fs from 'node:fs';
import path from 'node:path';

export const LAYER1_TRIM_VERSION = 'layer1-trim-v001';
export const DEFAULT_GAP_CANDIDATE_MS = 400;
export const DEFAULT_EDGE_PADDING_MS = 120;

const SAFE_FILLER_TOKENS = new Set(['えー', 'えっと', 'あのー']);

function assertFiniteInteger(value, label) {
  if (!Number.isInteger(value) || !Number.isFinite(value)) {
    throw new Error(`${label} は整数である必要があります`);
  }
}

function normalizedSpeaker(value) {
  if (typeof value !== 'string') return null;
  const speaker = value.trim();
  if (!speaker || speaker.toLowerCase() === 'unknown') return null;
  return speaker;
}

function validateAndSortWords(words) {
  if (!Array.isArray(words)) throw new Error('words は配列である必要があります');
  const seenIds = new Set();
  const sorted = words.map((word, index) => {
    if (!word || typeof word !== 'object') throw new Error(`words[${index}] が不正です`);
    const id = String(word.id ?? '');
    if (!id) throw new Error(`words[${index}].id がありません`);
    if (seenIds.has(id)) throw new Error(`単語IDが重複しています: ${id}`);
    seenIds.add(id);
    assertFiniteInteger(word.startMs, `words[${index}].startMs`);
    assertFiniteInteger(word.endMs, `words[${index}].endMs`);
    if (word.startMs >= word.endMs) throw new Error(`単語 ${id} の時刻順が不正です`);
    return {
      id,
      text: String(word.text ?? ''),
      startMs: word.startMs,
      endMs: word.endMs,
      speaker: normalizedSpeaker(word.speaker),
      utteranceId: typeof word.utteranceId === 'string' && word.utteranceId.trim() ? word.utteranceId.trim() : null
    };
  }).sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs || left.id.localeCompare(right.id));

  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].startMs < sorted[index - 1].startMs) {
      throw new Error('単語時刻の並びが不正です');
    }
  }
  return sorted;
}

function protectionReason(previous, next) {
  if (!previous.speaker || !next.speaker) return 'speaker_unknown';
  if (previous.speaker !== next.speaker) return 'speaker_change';
  if (!previous.utteranceId || !next.utteranceId) return 'utterance_unknown';
  if (previous.utteranceId !== next.utteranceId) return 'utterance_boundary';
  return null;
}

function mergeCutDirectives(cuts) {
  const sorted = [...cuts].sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  const merged = [];
  for (const cut of sorted) {
    const previous = merged.at(-1);
    if (!previous || cut.startMs > previous.endMs) {
      merged.push({ ...cut, reasons: [...cut.reasons], removedWordIds: [...cut.removedWordIds] });
      continue;
    }
    const extendsEnd = cut.endMs > previous.endMs;
    previous.endMs = Math.max(previous.endMs, cut.endMs);
    previous.reasons = [...new Set([...previous.reasons, ...cut.reasons])];
    previous.removedWordIds = [...new Set([...previous.removedWordIds, ...cut.removedWordIds])];
    previous.kinds = [...new Set([...previous.kinds, ...cut.kinds])];
    previous.afterWordId = extendsEnd ? cut.afterWordId : previous.afterWordId;
    previous.afterText = extendsEnd ? cut.afterText : previous.afterText;
  }
  return merged.map((cut, index) => ({ ...cut, cutId: `cut-${String(index + 1).padStart(3, '0')}` }));
}

export function complementRanges(outerRange, cuts) {
  const ranges = [];
  let cursor = outerRange.startMs;
  for (const cut of cuts) {
    if (cut.startMs > cursor) ranges.push({ sourceVideoId: outerRange.sourceVideoId ?? null, startMs: cursor, endMs: cut.startMs });
    cursor = Math.max(cursor, cut.endMs);
  }
  if (cursor < outerRange.endMs) ranges.push({ sourceVideoId: outerRange.sourceVideoId ?? null, startMs: cursor, endMs: outerRange.endMs });
  return ranges;
}

export function createLayer1TrimPlan(input) {
  if (!input || typeof input !== 'object') throw new Error('入力がありません');
  const outerRange = input.outerRange ?? {};
  assertFiniteInteger(outerRange.startMs, 'outerRange.startMs');
  assertFiniteInteger(outerRange.endMs, 'outerRange.endMs');
  if (outerRange.startMs >= outerRange.endMs) throw new Error('外側境界の時刻順が不正です');

  const gapCandidateMs = input.gapCandidateMs ?? DEFAULT_GAP_CANDIDATE_MS;
  const edgePaddingMs = input.edgePaddingMs ?? DEFAULT_EDGE_PADDING_MS;
  assertFiniteInteger(gapCandidateMs, 'gapCandidateMs');
  assertFiniteInteger(edgePaddingMs, 'edgePaddingMs');
  if (gapCandidateMs < 0 || edgePaddingMs < 0) throw new Error('初期値は0以上である必要があります');

  const words = validateAndSortWords(input.words).filter((word) => (
    word.endMs > outerRange.startMs && word.startMs < outerRange.endMs
  ));
  const rawCuts = [];
  const protectedCandidates = [];

  for (let index = 0; index + 1 < words.length; index += 1) {
    const previous = words[index];
    const next = words[index + 1];
    const gapMs = next.startMs - previous.endMs;
    if (gapMs < gapCandidateMs) continue;
    const candidate = {
      candidateId: `gap-${previous.id}-${next.id}`,
      kind: 'speech_absence',
      gapStartMs: previous.endMs,
      gapEndMs: next.startMs,
      gapMs,
      beforeWordId: previous.id,
      beforeText: previous.text,
      afterWordId: next.id,
      afterText: next.text
    };
    const reason = protectionReason(previous, next);
    const startMs = previous.endMs + edgePaddingMs;
    const endMs = next.startMs - edgePaddingMs;
    if (reason || startMs >= endMs) {
      protectedCandidates.push({
        ...candidate,
        protectionReason: reason ?? 'padding_consumes_candidate'
      });
      continue;
    }
    rawCuts.push({
      startMs,
      endMs,
      kinds: ['speech_absence'],
      beforeWordId: previous.id,
      beforeText: previous.text,
      afterWordId: next.id,
      afterText: next.text,
      removedWordIds: [],
      reasons: ['same_utterance_unneeded_stop']
    });
  }

  for (let index = 1; index + 1 < words.length; index += 1) {
    const filler = words[index];
    if (!SAFE_FILLER_TOKENS.has(filler.text)) continue;
    const previous = words[index - 1];
    const next = words[index + 1];
    const reason = protectionReason(previous, filler) ?? protectionReason(filler, next);
    const startMs = previous.endMs + edgePaddingMs;
    const endMs = next.startMs - edgePaddingMs;
    if (reason || startMs >= endMs || startMs > filler.startMs || endMs < filler.endMs) {
      protectedCandidates.push({
        candidateId: `filler-${filler.id}`,
        kind: 'filler',
        gapStartMs: filler.startMs,
        gapEndMs: filler.endMs,
        gapMs: filler.endMs - filler.startMs,
        beforeWordId: previous.id,
        beforeText: previous.text,
        afterWordId: next.id,
        afterText: next.text,
        removedWordIds: [filler.id],
        protectionReason: reason ?? 'padding_cannot_remove_whole_filler'
      });
      continue;
    }
    rawCuts.push({
      startMs,
      endMs,
      kinds: ['filler'],
      beforeWordId: previous.id,
      beforeText: previous.text,
      afterWordId: next.id,
      afterText: next.text,
      removedWordIds: [filler.id],
      reasons: ['standalone_safe_filler']
    });
  }

  const cuts = mergeCutDirectives(rawCuts).map((cut) => ({
    ...cut,
    durationMs: cut.endMs - cut.startMs
  }));
  for (const cut of cuts) {
    if (cut.startMs < outerRange.startMs || cut.endMs > outerRange.endMs || cut.startMs >= cut.endMs) {
      throw new Error(`外側境界外または不正なカット指示です: ${cut.cutId}`);
    }
  }
  for (let index = 1; index < cuts.length; index += 1) {
    if (cuts[index].startMs < cuts[index - 1].endMs) throw new Error('カット指示が重複しています');
  }

  const removedWordIds = new Set(cuts.flatMap((cut) => cut.removedWordIds));
  const remainingWordIds = words.filter((word) => !removedWordIds.has(word.id)).map((word) => word.id);
  const inputWordIds = words.map((word) => word.id);
  let cursor = 0;
  for (const id of remainingWordIds) {
    const found = inputWordIds.indexOf(id, cursor);
    if (found < 0) throw new Error('削除後の語列が入力語列の部分列ではありません');
    cursor = found + 1;
  }

  return {
    kind: 'layer1_internal_trim_plan',
    version: LAYER1_TRIM_VERSION,
    outerRange: {
      sourceVideoId: typeof outerRange.sourceVideoId === 'string' ? outerRange.sourceVideoId : null,
      startMs: outerRange.startMs,
      endMs: outerRange.endMs
    },
    initialValues: { gapCandidateMs, edgePaddingMs },
    inputWordCount: words.length,
    cutDirectives: cuts,
    protectedCandidates,
    remainingSourceRanges: complementRanges(outerRange, cuts),
    remainingWordIds,
    removedDurationMs: cuts.reduce((sum, cut) => sum + cut.durationMs, 0)
  };
}

function numberMs(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value < 10_000 && !Number.isInteger(value) ? Math.round(value * 1000) : Math.round(value);
}

function resolveRawPath(sttRoot, chunk) {
  if (typeof chunk.rawResponsePath === 'string' && fs.existsSync(chunk.rawResponsePath)) return chunk.rawResponsePath;
  return path.join(sttRoot, 'chunks', `chunk-${String(chunk.index).padStart(4, '0')}.raw.json`);
}

export function loadChunkedSttWords(sttRoot) {
  const manifest = JSON.parse(fs.readFileSync(path.join(sttRoot, 'manifest.json'), 'utf8'));
  const timestamps = JSON.parse(fs.readFileSync(path.join(sttRoot, 'word-timestamps.json'), 'utf8'));
  const words = timestamps.words.map((word, index) => ({
    id: String(word.segmentId ?? index + 1),
    text: String(word.text ?? ''),
    startMs: Math.round(word.startMs),
    endMs: Math.round(word.endMs),
    speaker: word.speaker,
    utteranceId: null
  }));
  const unmatchedByKey = new Map();
  for (const word of words) {
    const key = `${word.startMs}|${word.endMs}|${word.text}`;
    const bucket = unmatchedByKey.get(key) ?? [];
    bucket.push(word);
    unmatchedByKey.set(key, bucket);
  }

  let matchedWordCount = 0;
  let rawGroupCount = 0;
  for (const chunk of manifest.chunks ?? []) {
    const rawPath = resolveRawPath(sttRoot, chunk);
    if (!fs.existsSync(rawPath)) continue;
    const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const segmentsById = new Map((raw.segments ?? []).map((segment) => [segment.id, segment]));
    for (const [groupIndex, group] of (raw.speechUnitGroups ?? []).entries()) {
      rawGroupCount += 1;
      const utteranceId = `chunk-${String(chunk.index).padStart(4, '0')}-utterance-${String(groupIndex + 1).padStart(3, '0')}`;
      for (const localId of group) {
        const segment = segmentsById.get(localId);
        if (!segment) continue;
        const localStartMs = numberMs(segment.startMs ?? segment.start ?? segment.startSec);
        const localEndMs = numberMs(segment.endMs ?? segment.end ?? segment.endSec);
        if (localStartMs === null || localEndMs === null) continue;
        const startMs = Math.max(chunk.startMs, chunk.startMs + localStartMs);
        const endMs = Math.min(chunk.endMs, chunk.startMs + localEndMs);
        const key = `${startMs}|${endMs}|${String(segment.text ?? '').trim()}`;
        const bucket = unmatchedByKey.get(key);
        const word = bucket?.shift();
        if (!word) continue;
        word.utteranceId = utteranceId;
        matchedWordCount += 1;
      }
    }
  }

  return {
    words,
    diagnostics: {
      wordCount: words.length,
      matchedWordCount,
      unmatchedWordCount: words.length - matchedWordCount,
      rawGroupCount
    }
  };
}

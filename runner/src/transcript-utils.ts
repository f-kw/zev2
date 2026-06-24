import type { EditPlanArtifact, SpeechTimingRef, TranscriptArtifact } from './workflow-artifacts.js';

export function segmentTextByIds(transcript: TranscriptArtifact, ids: number[]): string {
  const idSet = new Set(ids);
  return transcript.segments
    .filter((segment) => idSet.has(segment.id))
    .map((segment) => segment.text)
    .join('');
}

export function speechUnitsByIds(transcript: TranscriptArtifact, ids: number[]): SpeechTimingRef[] {
  const idSet = new Set(ids);
  return transcript.segments
    .filter((segment) => idSet.has(segment.id))
    .map((segment) => ({
      id: segment.id,
      sourceStartMs: segment.startMs,
      sourceEndMs: segment.endMs,
      text: segment.text,
      ...(segment.speaker ? { speaker: segment.speaker } : {})
    }));
}

export function joinTelopSpeechText(speechUnits: Array<{ text: string }>): string {
  return speechUnits
    .map((speech) => speech.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTelopPlanFromSpeechUnits(
  speechUnits: SpeechTimingRef[],
  role: string
): EditPlanArtifact['telopPlan'] {
  const text = joinTelopSpeechText(speechUnits);
  return text
    ? [{
        sourceSpeechIds: speechUnits.map((speech) => speech.id),
        text,
        role
      }]
    : [];
}

export function uniqueSpeechIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

export function speechRange(
  transcript: TranscriptArtifact,
  speechIds: number[]
): { sourceStartMs: number; sourceEndMs: number } {
  const segments = transcript.segments.filter((segment) => speechIds.includes(segment.id));
  const first = segments[0] ?? transcript.segments[0];
  const last = segments[segments.length - 1] ?? first;

  return {
    sourceStartMs: first.startMs,
    sourceEndMs: last.endMs
  };
}

export function millisecondsToSeconds(valueMs: number): string {
  return (valueMs / 1000).toFixed(3);
}

import { uniqueSpeechIds } from './transcript-utils.js';

export function speechIdsFromGemini(value: unknown, knownIds: Set<number>): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueSpeechIds(
    value.filter(
      (item): item is number =>
        typeof item === 'number' &&
        Number.isInteger(item) &&
        knownIds.has(item)
    )
  );
}

export function speechIdsFromGeminiRequired(value: unknown, knownIds: Set<number>, label: string): number[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}に発話IDの配列がありません`);
  }

  const rawSpeechIds = value.map((item) => {
    if (typeof item !== 'number' || !Number.isInteger(item)) {
      throw new Error(`${label}に数値ではない発話IDがあります`);
    }

    return item;
  });
  const sourceSpeechIds = uniqueSpeechIds(rawSpeechIds);

  const unknownSpeechIds = sourceSpeechIds.filter((speechId) => !knownIds.has(speechId));
  if (unknownSpeechIds.length > 0) {
    throw new Error(`${label}に存在しない発話IDがあります: ${unknownSpeechIds.join(', ')}`);
  }

  return sourceSpeechIds;
}

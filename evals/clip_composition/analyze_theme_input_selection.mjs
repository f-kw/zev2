#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${item} の値を指定してください`);
    values.set(key, value);
    index += 1;
  }
  return {
    fixtureId: sanitize(required(values, 'fixture')),
    candidatePlanPath: resolve(required(values, 'candidatePlan')),
    localTranscriptPath: resolve(required(values, 'localTranscript')),
    promptInputPath: resolve(required(values, 'promptInput')),
    geminiOutputPath: resolve(required(values, 'geminiOutput')),
    outputId: sanitize(required(values, 'outputId'))
  };
}

function required(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return value;
}

function resolve(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  if (path.relative(evalRoot, resolved).startsWith('..')) {
    throw new Error('入力は evals/clip_composition 配下を指定してください');
  }
  return resolved;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function visibleText(text) {
  return String(text ?? '').replace(/\s+/g, '');
}

function isNonSpeechText(text) {
  const normalized = visibleText(text);
  return /^\[[^\]]+\]$/.test(normalized) || /^【[^】]+】$/.test(normalized);
}

function overlapMs(left, right) {
  if (left.sourceVideoId && right.sourceVideoId && left.sourceVideoId !== right.sourceVideoId) return 0;
  return Math.max(0, Math.min(left.sourceEndMs, right.sourceEndMs) - Math.max(left.sourceStartMs, right.sourceStartMs));
}

function chunksFromTranscript(transcript, sourceVideoId, chunkSec) {
  const chunkMs = chunkSec * 1000;
  const segments = transcript.segments
    .filter((segment) => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs))
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  const maxEndMs = Math.max(...segments.map((segment) => segment.endMs));
  const chunks = Array.from({ length: Math.ceil(maxEndMs / chunkMs) }, (_, chunkIndex) => ({
    chunkIndex,
    sourceVideoId,
    sourceStartMs: chunkIndex * chunkMs,
    sourceEndMs: (chunkIndex + 1) * chunkMs,
    roughSpeechCharCount: 0,
    roughSpeechSegmentCount: 0
  }));
  for (const segment of segments) {
    const first = Math.max(0, Math.floor(segment.startMs / chunkMs));
    const last = Math.max(first, Math.floor(Math.max(segment.startMs, segment.endMs - 1) / chunkMs));
    for (let chunkIndex = first; chunkIndex <= last && chunkIndex < chunks.length; chunkIndex += 1) {
      if (isNonSpeechText(segment.text)) continue;
      chunks[chunkIndex].roughSpeechCharCount += visibleText(segment.text).length;
      chunks[chunkIndex].roughSpeechSegmentCount += 1;
    }
  }
  const ranked = [...chunks].sort((left, right) => (
    right.roughSpeechCharCount - left.roughSpeechCharCount
    || left.sourceStartMs - right.sourceStartMs
  ));
  ranked.forEach((chunk, offset) => { chunk.speechCharRank = offset + 1; });
  return { chunks, ranked };
}

function mergedOverlapMs(expected, segments) {
  const clipped = segments
    .filter((segment) => overlapMs(expected, segment) > 0)
    .map((segment) => ({
      startMs: Math.max(expected.sourceStartMs, segment.sourceStartMs),
      endMs: Math.min(expected.sourceEndMs, segment.sourceEndMs)
    }))
    .sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
  const merged = [];
  for (const range of clipped) {
    const previous = merged.at(-1);
    if (!previous || range.startMs > previous.endMs) {
      merged.push({ ...range });
    } else {
      previous.endMs = Math.max(previous.endMs, range.endMs);
    }
  }
  return merged.reduce((sum, range) => sum + range.endMs - range.startMs, 0);
}

function intervalDistanceMs(left, right) {
  if (overlapMs(left, right) > 0) return 0;
  if (left.sourceEndMs <= right.sourceStartMs) return right.sourceStartMs - left.sourceEndMs;
  return left.sourceStartMs - right.sourceEndMs;
}

function markerRelation(marker, expected) {
  if (marker.endMs <= expected.sourceStartMs) return 'before';
  if (marker.startMs >= expected.sourceEndMs) return 'after';
  return 'overlap';
}

function timeStratifiedSelection(chunks, selectionCount) {
  const selected = [];
  for (let bandIndex = 0; bandIndex < selectionCount; bandIndex += 1) {
    const candidates = chunks
      .filter((chunk) => Math.floor(chunk.chunkIndex * selectionCount / chunks.length) === bandIndex)
      .sort((left, right) => (
        right.roughSpeechCharCount - left.roughSpeechCharCount
        || left.sourceStartMs - right.sourceStartMs
      ));
    if (candidates[0]) selected.push(candidates[0].chunkIndex);
  }
  return selected;
}

function expectedCoverage(expectedFacts, selectedChunkIndexes) {
  const selected = new Set(selectedChunkIndexes);
  return expectedFacts.filter((expected) => (
    expected.overlappingChunks.some((chunk) => selected.has(chunk.chunkIndex))
  )).map((expected) => expected.expectedIndex);
}

function localTranscriptFacts(expected, segments) {
  const inside = segments.filter((segment) => overlapMs(expected, {
    sourceStartMs: segment.startMs,
    sourceEndMs: segment.endMs
  }) > 0);
  const previous = [...segments].reverse().find((segment) => segment.endMs <= expected.sourceStartMs);
  const next = segments.find((segment) => segment.startMs >= expected.sourceEndMs);
  const positiveInternalGapsMs = [];
  for (let index = 1; index < inside.length; index += 1) {
    const gap = inside[index].startMs - inside[index - 1].endMs;
    if (gap > 0) positiveInternalGapsMs.push(gap);
  }
  const text = inside.map((segment) => segment.text).join('');
  return {
    segmentCount: inside.length,
    visibleCharCount: [...visibleText(text)].length,
    text,
    gapBeforeMs: previous ? Math.max(0, expected.sourceStartMs - previous.endMs) : null,
    gapAfterMs: next ? Math.max(0, next.startMs - expected.sourceEndMs) : null,
    positiveInternalGapsMs,
    maxInternalGapMs: positiveInternalGapsMs.length > 0 ? Math.max(...positiveInternalGapsMs) : 0,
    exactTextSignals: {
      questionMarkCount: (text.match(/[?？]/g) ?? []).length,
      exclamationMarkCount: (text.match(/[!！]/g) ?? []).length,
      laughTextCount: (text.match(/笑|ｗ|w{2,}|ハハ|はは|アハ|あは|フフ|ふふ|ヒヒ|ひひ|へへ/g) ?? []).length
    }
  };
}

async function main() {
  const expectedPath = path.join(evalRoot, 'expected', `${options.fixtureId}.json`);
  const [candidatePlan, localTranscript, promptInput, geminiOutput, expected] = await Promise.all([
    readJson(options.candidatePlanPath),
    readJson(options.localTranscriptPath),
    readJson(options.promptInputPath),
    readJson(options.geminiOutputPath),
    readJson(expectedPath)
  ]);
  const roughTranscriptPath = path.join(root, candidatePlan.roughTranscriptPath);
  const roughTranscript = await readJson(roughTranscriptPath);
  const sourceVideoId = candidatePlan.sourceVideoId;
  const { chunks, ranked } = chunksFromTranscript(roughTranscript, sourceVideoId, candidatePlan.chunkSec);
  const chunkByIndex = new Map(chunks.map((chunk) => [chunk.chunkIndex, chunk]));
  const reproducedTop50 = ranked.slice(0, candidatePlan.candidateCount).map((chunk) => chunk.chunkIndex);
  const recordedTop50 = candidatePlan.bySpeechCharCount.map((chunk) => chunk.chunkIndex);
  assert(JSON.stringify(reproducedTop50) === JSON.stringify(recordedTop50), '既存の発話量上位50を再現できません');

  const promptSegments = (promptInput.modelInput?.sources ?? []).flatMap((source) => source.segments ?? []);
  const expectedCuts = expected.expectedCuts.filter((cut) => cut.usableForCompositionPromptEval !== false);
  const expectedFacts = expectedCuts.map((cut, offset) => {
    const expectedRange = {
      sourceVideoId: cut.sourceVideoId,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs
    };
    const firstChunkIndex = Math.floor(cut.sourceStartMs / (candidatePlan.chunkSec * 1000));
    const lastChunkIndex = Math.floor((cut.sourceEndMs - 1) / (candidatePlan.chunkSec * 1000));
    const overlappingChunks = Array.from(
      { length: lastChunkIndex - firstChunkIndex + 1 },
      (_, index) => chunkByIndex.get(firstChunkIndex + index)
    );
    const enclosingStartMs = overlappingChunks[0].sourceStartMs;
    const enclosingEndMs = overlappingChunks.at(-1).sourceEndMs;
    const roughMarkers = roughTranscript.segments
      .filter((segment) => segment.startMs < enclosingEndMs && segment.endMs > enclosingStartMs)
      .filter((segment) => /\[(笑い|音楽)\]|【(笑い|音楽)】|笑/.test(String(segment.text ?? '')))
      .map((segment) => ({
        text: segment.text,
        startMs: segment.startMs,
        endMs: segment.endMs,
        relationToExpected: markerRelation(segment, cut)
      }));
    const inputOverlapMs = mergedOverlapMs(expectedRange, promptSegments);
    return {
      expectedIndex: offset + 1,
      materialBlockIndex: cut.materialBlock?.blockIndex,
      sourceVideoId: cut.sourceVideoId,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      durationMs: cut.sourceEndMs - cut.sourceStartMs,
      overlappingChunks: overlappingChunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        sourceStartMs: chunk.sourceStartMs,
        sourceEndMs: chunk.sourceEndMs,
        roughSpeechCharCount: chunk.roughSpeechCharCount,
        roughSpeechSegmentCount: chunk.roughSpeechSegmentCount,
        speechCharRank: chunk.speechCharRank,
        selectedInTop50: recordedTop50.includes(chunk.chunkIndex)
      })),
      bestSpeechCharRank: Math.min(...overlappingChunks.map((chunk) => chunk.speechCharRank)),
      inputOverlapMs,
      inputVisible: inputOverlapMs > 0,
      localTranscript: localTranscriptFacts(expectedRange, localTranscript.segments),
      roughMarkers
    };
  });
  const timeStratified50 = timeStratifiedSelection(chunks, candidatePlan.candidateCount);
  const laughMarkedChunkIndexes = [...new Set(roughTranscript.segments
    .filter((segment) => /\[(笑い)\]|【(笑い)】|笑/.test(String(segment.text ?? '')))
    .flatMap((segment) => {
      const first = Math.floor(segment.startMs / (candidatePlan.chunkSec * 1000));
      const last = Math.floor(Math.max(segment.startMs, segment.endMs - 1) / (candidatePlan.chunkSec * 1000));
      return Array.from({ length: last - first + 1 }, (_, index) => first + index);
    }))].sort((left, right) => left - right);

  const inputVisibleExpected = expectedFacts.filter((item) => item.inputVisible);
  assert(inputVisibleExpected.length === 1, `入力内expectedが1件ではありません: ${inputVisibleExpected.length}`);
  const visibleExpected = inputVisibleExpected[0];
  const candidateRanges = (geminiOutput.themes ?? []).flatMap((theme, candidateOffset) => (
    (theme.evidenceRanges ?? []).flatMap((range, rangeOffset) => {
      if (typeof range.sourceVideoId !== 'string'
        || !Number.isFinite(range.sourceStartMs)
        || !Number.isFinite(range.sourceEndMs)
        || range.sourceEndMs <= range.sourceStartMs) return [];
      return [{
        candidateIndex: candidateOffset + 1,
        rangeIndex: rangeOffset + 1,
        sourceVideoId: range.sourceVideoId,
        sourceStartMs: range.sourceStartMs,
        sourceEndMs: range.sourceEndMs,
        title: theme.title ?? null,
        summary: theme.summary ?? null,
        summaryFieldPresent: Object.hasOwn(theme, 'summary'),
        reason: theme.reason ?? null
      }];
    })
  ));
  const visibleRange = {
    sourceVideoId: visibleExpected.sourceVideoId,
    sourceStartMs: visibleExpected.sourceStartMs,
    sourceEndMs: visibleExpected.sourceEndMs
  };
  const nearestCandidates = candidateRanges
    .filter((range) => range.sourceVideoId === visibleRange.sourceVideoId)
    .map((range) => ({ ...range, distanceMs: intervalDistanceMs(visibleRange, range) }))
    .sort((left, right) => left.distanceMs - right.distanceMs || left.candidateIndex - right.candidateIndex || left.rangeIndex - right.rangeIndex);

  const result = {
    kind: 'clip_composition_theme_input_selection_analysis',
    runAt: new Date().toISOString(),
    fixtureId: options.fixtureId,
    outputId: options.outputId,
    inputs: {
      candidatePlanPath: path.relative(root, options.candidatePlanPath),
      roughTranscriptPath: path.relative(root, roughTranscriptPath),
      localTranscriptPath: path.relative(root, options.localTranscriptPath),
      promptInputPath: path.relative(root, options.promptInputPath),
      geminiOutputPath: path.relative(root, options.geminiOutputPath),
      expectedPath: path.relative(root, expectedPath)
    },
    rankDefinition: {
      unit: `${candidatePlan.chunkSec} second fixed chunk`,
      populationChunkCount: chunks.length,
      metric: 'roughSpeechCharCount',
      nonSpeechTreatment: '角括弧だけの非発話表記を除外',
      tieBreak: 'sourceStartMs ascending',
      crossChunkSegmentTreatment: '元の上位50選定と同じく、またがるsegmentの全文字数を各chunkへ計上',
      multiChunkExpectedTreatment: '全overlap chunkを記録し、最小rankをbestSpeechCharRankとして併記'
    },
    summary: {
      expectedCount: expectedFacts.length,
      selectedTop50ExpectedCount: expectedFacts.filter((item) => item.overlappingChunks.some((chunk) => chunk.selectedInTop50)).length,
      inputVisibleExpectedCount: inputVisibleExpected.length,
      sortedBestSpeechCharRanks: expectedFacts.map((item) => item.bestSpeechCharRank).sort((left, right) => left - right)
    },
    diagnosticAlternativeCoverage: {
      globalTop50SpeechChars: {
        selectedChunkCount: recordedTop50.length,
        coveredExpectedIndexes: expectedCoverage(expectedFacts, recordedTop50)
      },
      timeStratified50TopSpeechCharsPerBand: {
        selectedChunkCount: timeStratified50.length,
        definition: '394 chunkを時刻順に50帯へ決定的に分け、各帯で発話文字数最大の1 chunkを選ぶ',
        coveredExpectedIndexes: expectedCoverage(expectedFacts, timeStratified50)
      },
      roughLaughMarkedChunks: {
        selectedChunkCount: laughMarkedChunkIndexes.length,
        definition: '粗字幕に[笑い]または笑を含む30秒chunkをすべて選ぶ',
        coveredExpectedIndexes: expectedCoverage(expectedFacts, laughMarkedChunkIndexes)
      },
      fullSource: {
        selectedChunkCount: chunks.length,
        coveredExpectedIndexes: expectedFacts.map((item) => item.expectedIndex)
      }
    },
    expectedFacts,
    nearestCandidateToInputVisibleExpected: {
      expectedIndex: visibleExpected.expectedIndex,
      materialBlockIndex: visibleExpected.materialBlockIndex,
      inputOverlapMs: visibleExpected.inputOverlapMs,
      nearest: nearestCandidates[0],
      nextNearest: nearestCandidates.slice(1, 5)
    },
    v003Isolation: {
      changeOnly: 'input selection',
      proposedInput: '同じローカルSTTの全sourceを既存windowingへ渡す',
      heldConstant: [
        'theme_generation_prompt_v002',
        'gemini-web-flash',
        'requestedThemeCount',
        'window byte limit and merge rule',
        'output contract and formal scorer'
      ],
      namingNote: 'プロンプトを変えないためtheme-llm-v003とはせず、input-selection-v003として記録する'
    }
  };
  const outputPath = path.join(evalRoot, 'outputs', 'theme-input-selection-analysis', `${options.outputId}.json`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`output: ${path.relative(root, outputPath)}`);
  console.log(`rank population: ${chunks.length}`);
  console.log(`top50 expected coverage: ${result.summary.selectedTop50ExpectedCount}/${result.summary.expectedCount}`);
  console.log(`input-visible expected: ${result.summary.inputVisibleExpectedCount}/${result.summary.expectedCount}`);
  console.log(`nearest candidate distance: ${result.nearestCandidateToInputVisibleExpected.nearest.distanceMs}ms`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineIndex = item.indexOf('=');
    if (inlineIndex >= 0) {
      values.set(item.slice(2, inlineIndex), item.slice(inlineIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  return {
    fixtureId: sanitizePathPart(requireValue(values, 'fixture')),
    targetPath: resolveWorkspacePath(requireValue(values, 'target')),
    materialBlocksPath: resolveWorkspacePath(requireValue(values, 'materialBlocks')),
    reviewPackagePath: resolveWorkspacePath(requireValue(values, 'reviewPackage')),
    sourceSttId: sanitizePathPart(requireValue(values, 'sourceSttId')),
    sourceVideoId: sanitizePathPart(requireValue(values, 'sourceVideoId')),
    outputId: sanitizePathPart(requireValue(values, 'outputId')),
    ...(values.get('decision')?.trim()
      ? { decisionPath: resolveWorkspacePath(values.get('decision').trim()) }
      : {}),
    writeFixture: values.get('writeFixture') === 'true'
  };
}

function requireValue(values, key) {
  const value = values.get(key)?.trim();
  if (!value) {
    throw new Error(`--${key} を指定してください`);
  }
  return value;
}

function resolveWorkspacePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
}

function relative(filePath) {
  return path.relative(root, filePath);
}

function sanitizePathPart(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

function findPrimarySource(target, sourceSttId, sourceVideoId) {
  const source = target.sourceDiscovery?.primarySourceCandidate;
  assert(source, 'target.sourceDiscovery.primarySourceCandidate がありません');
  assert(source.id === sourceVideoId, `primarySourceCandidate.id が一致しません: ${source.id} / ${sourceVideoId}`);
  assert(source.sttId === sourceSttId, `primarySourceCandidate.sttId が一致しません: ${source.sttId} / ${sourceSttId}`);
  return source;
}

function validateMaterialBlocks(materialBlocks, target, sourceVideoId) {
  assert(materialBlocks.kind === 'clip_composition_material_blocks', `materialBlocks.kind が不正です: ${materialBlocks.kind}`);
  assert(materialBlocks.clipId === target.clip?.id, `clipId がtargetと一致しません: ${materialBlocks.clipId} / ${target.clip?.id}`);
  assert(materialBlocks.sourceVideoId === sourceVideoId, `sourceVideoId が一致しません: ${materialBlocks.sourceVideoId} / ${sourceVideoId}`);
  const blocks = materialBlocks.blocks ?? [];
  const boundaries = materialBlocks.boundaries ?? [];
  assert(blocks.length >= 2, `複数区間fixtureには素材ブロックが2件以上必要です: ${blocks.length}`);
  assert(boundaries.length === blocks.length - 1, `素材境界数がblock数-1ではありません: ${boundaries.length} / ${blocks.length}`);
  for (const [offset, block] of blocks.entries()) {
    const expectedIndex = offset + 1;
    assert(block.blockIndex === expectedIndex, `blockIndexが連番ではありません: ${block.blockIndex} / ${expectedIndex}`);
    assert(Number.isFinite(block.clipStartMs) && Number.isFinite(block.clipEndMs) && block.clipEndMs > block.clipStartMs,
      `block ${block.blockIndex} のclip範囲が不正です`);
    assert(Number.isFinite(block.sourceStartMs) && Number.isFinite(block.sourceEndMs) && block.sourceEndMs > block.sourceStartMs,
      `block ${block.blockIndex} のsource範囲が不正です`);
  }
  for (const [offset, boundary] of boundaries.entries()) {
    const expectedIndex = offset + 1;
    assert(boundary.boundaryIndex === expectedIndex, `boundaryIndexが連番ではありません: ${boundary.boundaryIndex} / ${expectedIndex}`);
    assert(boundary.beforeBlockIndex === expectedIndex && boundary.afterBlockIndex === expectedIndex + 1,
      `boundary ${boundary.boundaryIndex} の前後blockが不正です`);
  }
  return { blocks, boundaries };
}

function buildDecisionTemplate(input) {
  return {
    kind: 'clip_composition_multiblock_material_human_decision',
    fixtureId: input.fixtureId,
    targetId: input.target.targetId,
    sourceVideoId: input.sourceVideoId,
    sourceSttId: input.sourceSttId,
    evidence: {
      materialBlocksPath: relative(input.materialBlocksPath),
      materialBlocksSha256: input.materialBlocksSha256,
      reviewPackagePath: relative(input.reviewPackagePath),
      reviewPackageSha256: input.reviewPackageSha256
    },
    humanConfirmation: {
      checkedBy: '',
      checkedAt: '',
      method: '境界確認パッケージの動画・音声確認',
      allBlocksReviewed: false,
      allBoundariesReviewed: false,
      note: ''
    },
    blocks: input.blocks.map((block) => ({
      blockIndex: block.blockIndex,
      status: 'pending',
      clipRange: {
        startMs: block.clipStartMs,
        endMs: block.clipEndMs
      },
      sourceRange: {
        startMs: block.sourceStartMs,
        endMs: block.sourceEndMs
      },
      note: ''
    })),
    boundaries: input.boundaries.map((boundary) => ({
      boundaryIndex: boundary.boundaryIndex,
      beforeBlockIndex: boundary.beforeBlockIndex,
      afterBlockIndex: boundary.afterBlockIndex,
      status: 'pending',
      beforeMatches: null,
      afterMatches: null,
      sourcePositionSwitches: null,
      note: ''
    })),
    fixedTheme: {
      title: '',
      summary: '',
      compositionNote: '人間確認で採用した複数素材ブロックを、切り抜き内の順番どおり別々のselectedCutsとして扱う。'
    },
    readyForFreeze: false
  };
}

function exactRangeMatches(decisionRange, startMs, endMs) {
  return decisionRange?.startMs === startMs && decisionRange?.endMs === endMs;
}

function validateDecision(input) {
  if (!input.decision) {
    return {
      hasDecision: false,
      readyForFreeze: false,
      issues: ['人間確認decisionが未入力です'],
      acceptedBlockIndexes: [],
      rejectedBlockIndexes: [],
      unresolvedBlockIndexes: [],
      confirmedBoundaryIndexes: [],
      rejectedBoundaryIndexes: [],
      unresolvedBoundaryIndexes: []
    };
  }

  const issues = [];
  const decision = input.decision;
  if (decision.kind !== 'clip_composition_multiblock_material_human_decision') {
    issues.push(`decision.kind が不正です: ${decision.kind}`);
  }
  if (decision.fixtureId !== input.fixtureId) {
    issues.push(`decision.fixtureId が一致しません: ${decision.fixtureId}`);
  }
  if (decision.targetId !== input.target.targetId) {
    issues.push(`decision.targetId が一致しません: ${decision.targetId}`);
  }
  if (decision.sourceVideoId !== input.sourceVideoId || decision.sourceSttId !== input.sourceSttId) {
    issues.push('decisionのsourceVideoId/sourceSttIdが一致しません');
  }
  if (decision.evidence?.materialBlocksSha256 !== input.materialBlocksSha256) {
    issues.push('decisionが参照する素材ブロックのSHA-256が一致しません');
  }
  if (decision.evidence?.reviewPackageSha256 !== input.reviewPackageSha256) {
    issues.push('decisionが参照する確認パッケージのSHA-256が一致しません');
  }

  const confirmation = decision.humanConfirmation ?? {};
  if (!confirmation.checkedBy?.trim()) {
    issues.push('humanConfirmation.checkedBy が未入力です');
  }
  if (!confirmation.checkedAt?.trim()) {
    issues.push('humanConfirmation.checkedAt が未入力です');
  }
  if (!confirmation.method?.trim()) {
    issues.push('humanConfirmation.method が未入力です');
  }
  if (confirmation.allBlocksReviewed !== true) {
    issues.push('humanConfirmation.allBlocksReviewed が true ではありません');
  }
  if (confirmation.allBoundariesReviewed !== true) {
    issues.push('humanConfirmation.allBoundariesReviewed が true ではありません');
  }

  const blockByIndex = new Map();
  for (const blockDecision of decision.blocks ?? []) {
    if (blockByIndex.has(blockDecision.blockIndex)) {
      issues.push(`decision.blocks のblock ${blockDecision.blockIndex} が重複しています`);
    }
    blockByIndex.set(blockDecision.blockIndex, blockDecision);
  }
  const acceptedBlockIndexes = [];
  const rejectedBlockIndexes = [];
  const unresolvedBlockIndexes = [];
  for (const block of input.blocks) {
    const blockDecision = blockByIndex.get(block.blockIndex);
    if (!blockDecision) {
      issues.push(`block ${block.blockIndex} の人間判定がありません`);
      continue;
    }
    if (!exactRangeMatches(blockDecision.clipRange, block.clipStartMs, block.clipEndMs)
      || !exactRangeMatches(blockDecision.sourceRange, block.sourceStartMs, block.sourceEndMs)) {
      issues.push(`block ${block.blockIndex} の時刻が素材ブロックと一致しません`);
    }
    if (blockDecision.status === 'accepted') {
      acceptedBlockIndexes.push(block.blockIndex);
    } else if (blockDecision.status === 'rejected') {
      rejectedBlockIndexes.push(block.blockIndex);
      if (!blockDecision.note?.trim()) {
        issues.push(`rejected block ${block.blockIndex} の理由がありません`);
      }
    } else if (blockDecision.status === 'unresolved') {
      unresolvedBlockIndexes.push(block.blockIndex);
      if (!blockDecision.note?.trim()) {
        issues.push(`unresolved block ${block.blockIndex} の理由がありません`);
      }
    } else {
      issues.push(`block ${block.blockIndex} のstatusが確定していません: ${blockDecision.status}`);
    }
  }
  for (const blockIndex of blockByIndex.keys()) {
    if (!input.blocks.some((block) => block.blockIndex === blockIndex)) {
      issues.push(`素材ブロックに存在しないblock ${blockIndex} がdecisionにあります`);
    }
  }
  if (acceptedBlockIndexes.length === 0) {
    issues.push('accepted block が1件もありません');
  }

  const boundaryByIndex = new Map();
  for (const boundaryDecision of decision.boundaries ?? []) {
    if (boundaryByIndex.has(boundaryDecision.boundaryIndex)) {
      issues.push(`decision.boundaries のboundary ${boundaryDecision.boundaryIndex} が重複しています`);
    }
    boundaryByIndex.set(boundaryDecision.boundaryIndex, boundaryDecision);
  }
  const confirmedBoundaryIndexes = [];
  const rejectedBoundaryIndexes = [];
  const unresolvedBoundaryIndexes = [];
  const acceptedSet = new Set(acceptedBlockIndexes);
  for (const boundary of input.boundaries) {
    const boundaryDecision = boundaryByIndex.get(boundary.boundaryIndex);
    if (!boundaryDecision) {
      issues.push(`boundary ${boundary.boundaryIndex} の人間判定がありません`);
      continue;
    }
    if (boundaryDecision.beforeBlockIndex !== boundary.beforeBlockIndex
      || boundaryDecision.afterBlockIndex !== boundary.afterBlockIndex) {
      issues.push(`boundary ${boundary.boundaryIndex} の前後blockが一致しません`);
    }
    if (boundaryDecision.status === 'confirmed') {
      confirmedBoundaryIndexes.push(boundary.boundaryIndex);
      if (boundaryDecision.beforeMatches !== true
        || boundaryDecision.afterMatches !== true
        || boundaryDecision.sourcePositionSwitches !== true) {
        issues.push(`confirmed boundary ${boundary.boundaryIndex} の3判定がすべてtrueではありません`);
      }
      if (!acceptedSet.has(boundary.beforeBlockIndex) || !acceptedSet.has(boundary.afterBlockIndex)) {
        issues.push(`confirmed boundary ${boundary.boundaryIndex} の前後blockがacceptedではありません`);
      }
    } else if (boundaryDecision.status === 'rejected') {
      rejectedBoundaryIndexes.push(boundary.boundaryIndex);
      if (!boundaryDecision.note?.trim()) {
        issues.push(`rejected boundary ${boundary.boundaryIndex} の理由がありません`);
      }
    } else if (boundaryDecision.status === 'unresolved') {
      unresolvedBoundaryIndexes.push(boundary.boundaryIndex);
      if (!boundaryDecision.note?.trim()) {
        issues.push(`unresolved boundary ${boundary.boundaryIndex} の理由がありません`);
      }
    } else {
      issues.push(`boundary ${boundary.boundaryIndex} のstatusが確定していません: ${boundaryDecision.status}`);
    }
    if (acceptedSet.has(boundary.beforeBlockIndex)
      && acceptedSet.has(boundary.afterBlockIndex)
      && boundaryDecision.status !== 'confirmed') {
      issues.push(`accepted block ${boundary.beforeBlockIndex}/${boundary.afterBlockIndex} 間のboundary ${boundary.boundaryIndex} がconfirmedではありません`);
    }
  }
  for (const boundaryIndex of boundaryByIndex.keys()) {
    if (!input.boundaries.some((boundary) => boundary.boundaryIndex === boundaryIndex)) {
      issues.push(`素材境界に存在しないboundary ${boundaryIndex} がdecisionにあります`);
    }
  }

  if (!decision.fixedTheme?.title?.trim()) {
    issues.push('fixedTheme.title が未入力です');
  }
  if (!decision.fixedTheme?.summary?.trim()) {
    issues.push('fixedTheme.summary が未入力です');
  }
  if (decision.readyForFreeze !== true) {
    issues.push('decision.readyForFreeze が true ではありません');
  }

  return {
    hasDecision: true,
    readyForFreeze: issues.length === 0,
    issues,
    acceptedBlockIndexes,
    rejectedBlockIndexes,
    unresolvedBlockIndexes,
    confirmedBoundaryIndexes,
    rejectedBoundaryIndexes,
    unresolvedBoundaryIndexes
  };
}

function wordsForBlock(words, block) {
  return words
    .filter((word) => word.endMs > block.sourceStartMs && word.startMs < block.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function buildTranscript(blocks, words, source, sourceSttId, copiedAt, mode) {
  const segments = [];
  const speechUnitGroups = [];
  const blockSummaries = [];
  for (const block of blocks) {
    const selectedWords = wordsForBlock(words, block);
    assert(selectedWords.length > 0, `block ${block.blockIndex} に対応するSTT単語がありません`);
    const group = [];
    for (const word of selectedWords) {
      const startMs = Math.max(word.startMs, block.sourceStartMs);
      const endMs = Math.min(word.endMs, block.sourceEndMs);
      if (endMs <= startMs) {
        continue;
      }
      const id = segments.length + 1;
      segments.push({
        id,
        startMs,
        endMs,
        text: word.text,
        ...(word.speaker ? { speaker: word.speaker } : {}),
        sourceVideoId: source.id,
        sourceUrl: source.url,
        sourceSttId,
        multiblockPartIndex: speechUnitGroups.length,
        materialBlockIndex: block.blockIndex,
        clipStartMs: block.clipStartMs,
        clipEndMs: block.clipEndMs
      });
      group.push(id);
    }
    assert(group.length > 0, `block ${block.blockIndex} に正の時間幅を持つSTT単語がありません`);
    speechUnitGroups.push(group);
    blockSummaries.push({
      blockIndex: block.blockIndex,
      clipStartMs: block.clipStartMs,
      clipEndMs: block.clipEndMs,
      sourceStartMs: block.sourceStartMs,
      sourceEndMs: block.sourceEndMs,
      segmentCount: group.length,
      textPreview: segments.filter((segment) => group.includes(segment.id)).map((segment) => segment.text).join('').slice(0, 160)
    });
  }
  return {
    transcript: {
      kind: 'transcript_json',
      mode,
      sourceUri: source.url,
      sampleSource: {
        title: source.title,
        path: source.localVideoPath,
        sourceVideoId: source.id,
        sourceRanges: blocks.map((block, index) => ({
          partIndex: index,
          materialBlockIndex: block.blockIndex,
          sourceStartMs: block.sourceStartMs,
          sourceEndMs: block.sourceEndMs,
          clipStartMs: block.clipStartMs,
          clipEndMs: block.clipEndMs
        }))
      },
      notes: [
        '複数素材ブロックを切り抜き内の順番で固定するための文字起こし。',
        'segment時刻は元配信内の絶対時刻で、speechUnitGroupsが素材ブロック単位を表す。',
        '評価実行時はruntime/artifactsを読まない。'
      ],
      generatedAt: copiedAt,
      language: 'ja-JP',
      durationSec: Math.round(blocks.reduce((sum, block) => sum + block.sourceEndMs - block.sourceStartMs, 0) / 1000 * 1000) / 1000,
      segmentCount: segments.length,
      segments,
      speechUnitGroups
    },
    blockSummaries
  };
}

function buildExcludedRanges(blocks, source, status, decision) {
  return blocks.map((block) => ({
    id: `${status}_material_block_${block.blockIndex}`,
    sourceStartMs: block.sourceStartMs,
    sourceEndMs: block.sourceEndMs,
    clipStartMs: block.clipStartMs,
    clipEndMs: block.clipEndMs,
    sourceVideoId: source.id,
    sourceUrl: source.url,
    evidenceStatus: status === 'rejected'
      ? 'human_rejected_material_candidate'
      : 'human_unresolved_material_candidate',
    scoringTreatment: 'excluded_from_fixture_expected',
    reason: decision.blocks.find((item) => item.blockIndex === block.blockIndex)?.note
  }));
}

function buildFrozenDrafts(input) {
  const decision = input.decision;
  const acceptedSet = new Set(input.validation.acceptedBlockIndexes);
  const rejectedSet = new Set(input.validation.rejectedBlockIndexes);
  const unresolvedSet = new Set(input.validation.unresolvedBlockIndexes);
  const acceptedBlocks = input.blocks.filter((block) => acceptedSet.has(block.blockIndex));
  const rejectedBlocks = input.blocks.filter((block) => rejectedSet.has(block.blockIndex));
  const unresolvedBlocks = input.blocks.filter((block) => unresolvedSet.has(block.blockIndex));
  const { transcript, blockSummaries } = buildTranscript(
    acceptedBlocks,
    input.words,
    input.source,
    input.sourceSttId,
    input.copiedAt,
    'zev-local-stt-multiblock-material-human-confirmed'
  );
  const allSpeechIds = transcript.speechUnitGroups.flat();
  const representativeSpeechIds = transcript.speechUnitGroups[0] ?? allSpeechIds;
  const representativeText = transcript.segments
    .filter((segment) => representativeSpeechIds.includes(segment.id))
    .map((segment) => segment.text)
    .join('');
  const humanConfirmation = {
    status: 'confirmed',
    checkedBy: decision.humanConfirmation.checkedBy,
    checkedAt: decision.humanConfirmation.checkedAt,
    method: decision.humanConfirmation.method,
    note: decision.humanConfirmation.note,
    acceptedBlocks: input.validation.acceptedBlockIndexes,
    rejectedBlocks: input.validation.rejectedBlockIndexes,
    unresolvedBlocks: input.validation.unresolvedBlockIndexes,
    confirmedBoundaries: input.validation.confirmedBoundaryIndexes,
    rejectedBoundaries: input.validation.rejectedBoundaryIndexes,
    unresolvedBoundaries: input.validation.unresolvedBoundaryIndexes,
    materialBlocksPath: relative(input.materialBlocksPath),
    materialBlocksSha256: input.materialBlocksSha256,
    reviewPackagePath: relative(input.reviewPackagePath),
    reviewPackageSha256: input.reviewPackageSha256
  };
  const boundaryPrecision = {
    grade: 'material_block_granularity',
    meaning: '素材対応の切り替わりを表す粒度。細かい詰めは境界にしない。'
  };
  const expectedCuts = acceptedBlocks.map((block, index) => ({
    sourceStartMs: block.sourceStartMs,
    sourceEndMs: block.sourceEndMs,
    reason: '人間が切り抜き側と元配信側で同じ素材と確認した素材ブロックのため。',
    sourceVideoId: input.source.id,
    sourceUrl: input.source.url,
    sourceSttId: input.sourceSttId,
    clipId: input.target.clip.id,
    clipUrl: input.target.clip.url,
    verificationStatus: 'multiblock_material_human_confirmed',
    usableForClipLocationEval: true,
    usableForCompositionPromptEval: true,
    multicutPartIndex: index,
    clipStartMs: block.clipStartMs,
    clipEndMs: block.clipEndMs,
    qualityGrade: 'material_block_granularity',
    boundaryPrecision,
    label: `block ${block.blockIndex}`,
    materialBlock: {
      blockIndex: block.blockIndex,
      matchedWordPairCount: block.matchedWordPairCount,
      internalGapMs: block.internalGapMs,
      internalTransitions: block.internalTransitions,
      runIndexes: block.runIndexes
    },
    humanVerification: humanConfirmation
  }));
  const themes = {
    kind: 'theme_json',
    mode: 'human-reverse-written-multiblock-material-theme',
    generatedAt: input.copiedAt,
    sourceUri: input.source.url,
    themes: [{
      id: 'theme_multiblock_material_1',
      title: decision.fixedTheme.title,
      summary: decision.fixedTheme.summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds: allSpeechIds,
      whyItCanBeClipped: '人間確認済みの複数素材ブロックから逆算した固定テーマとしてcompositionを評価するため。',
      compositionNote: decision.fixedTheme.compositionNote,
      evidenceRefs: [{
        kind: 'human_multiblock_material_review',
        refId: input.fixtureId,
        meaning: relative(input.reviewPackagePath)
      }]
    }]
  };
  const expected = {
    draftId: input.fixtureId,
    fixtureId: input.fixtureId,
    expectedCuts,
    excludedRanges: [
      ...buildExcludedRanges(rejectedBlocks, input.source, 'rejected', decision),
      ...buildExcludedRanges(unresolvedBlocks, input.source, 'unresolved', decision)
    ],
    excludedClipRanges: [
      ...buildExcludedRanges(rejectedBlocks, input.source, 'rejected', decision),
      ...buildExcludedRanges(unresolvedBlocks, input.source, 'unresolved', decision)
    ],
    freezeGuard: {
      allMaterialBlocksReviewed: true,
      allBoundariesReviewed: true,
      acceptedBlocksHumanConfirmed: input.validation.acceptedBlockIndexes,
      rejectedBlocks: input.validation.rejectedBlockIndexes,
      unresolvedBlocks: input.validation.unresolvedBlockIndexes,
      fixedThemeHumanSpecified: true,
      fixedThemeTitle: decision.fixedTheme.title,
      checkedBy: decision.humanConfirmation.checkedBy,
      checkedAt: decision.humanConfirmation.checkedAt,
      materialBlocksSha256: input.materialBlocksSha256,
      reviewPackageSha256: input.reviewPackageSha256
    },
    humanConfirmation,
    boundaryPrecision
  };
  const fixture = {
    fixtureId: input.fixtureId,
    draftId: input.fixtureId,
    description: '人間確認済みの複数素材ブロックを切り抜き内の順番で固定したfixture。',
    copiedFrom: [
      relative(input.targetPath),
      relative(input.materialBlocksPath),
      relative(input.reviewPackagePath),
      relative(input.decisionPath),
      `evals/clip_composition/stt/${input.sourceSttId}/source/word-timestamps.json`
    ],
    copiedAt: input.copiedAt,
    sourceUri: input.source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_multiblock_material_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      'expectedCutsは人間確認でacceptedになった素材ブロックだけ。',
      'rejectedとunresolvedは採点対象外としてexpectedに記録する。',
      '固定テーマは人間が正解区間から逆算して書いた。',
      '同一素材内の細かい詰めはexpected境界にしない。'
    ],
    humanConfirmation,
    boundaryPrecision
  };
  return { fixture, transcript, themes, expected, blockSummaries };
}

function reportText(preview, resultPath, templatePath) {
  const lines = [
    '# 複数素材ブロックfixture凍結preview',
    '',
    `- 結果JSON: ${relative(resultPath)}`,
    `- 人間確認テンプレート: ${relative(templatePath)}`,
    `- fixture ID: ${preview.fixtureId}`,
    `- 素材ブロック: ${preview.candidateBlockCount}`,
    `- 素材境界: ${preview.candidateBoundaryCount}`,
    `- 人間確認decision: ${preview.decisionValidation.hasDecision ? 'あり' : 'なし'}`,
    `- fixture書き込み可能: ${preview.fixtureWriteReady ? 'yes' : 'no'}`,
    `- fixture/expected書き込み実行: ${preview.writeFixture ? 'yes' : 'no'}`,
    '',
    '## 凍結を止めている条件',
    ''
  ];
  for (const issue of preview.decisionValidation.issues) {
    lines.push(`- ${issue}`);
  }
  lines.push('', '## 素材ブロックとSTT', '');
  lines.push('| block | clip | source | STT segments | preview |');
  lines.push('| ---: | --- | --- | ---: | --- |');
  for (const item of preview.provisionalBlockSummaries) {
    lines.push(`| ${item.blockIndex} | ${item.clipStartMs}-${item.clipEndMs} | ${item.sourceStartMs}-${item.sourceEndMs} | ${item.segmentCount} | ${item.textPreview.replace(/\|/g, '/')} |`);
  }
  lines.push('', '## 書き込み予定先', '');
  lines.push(`- fixture: ${preview.plannedWrites.fixturePath}`);
  lines.push(`- transcript: ${preview.plannedWrites.transcriptPath}`);
  lines.push(`- themes: ${preview.plannedWrites.themesPath}`);
  lines.push(`- expected: ${preview.plannedWrites.expectedPath}`);
  lines.push('', '## 制約確認', '');
  lines.push(preview.writeFixture
    ? '- 人間確認・固定テーマ・明示承認を検証してからfixtureとexpectedを書き込んだ。'
    : '- fixture/expectedへの書き込みは実行していない。');
  lines.push('- runtime、本体UI/API/キュー/DBへの書き込みはない。');
  lines.push('- 独自係数、重み付け、照合結果からの自動採否は追加していない。');
  return `${lines.join('\n')}\n`;
}

async function main() {
  assert(existsSync(options.reviewPackagePath), `確認パッケージがありません: ${options.reviewPackagePath}`);
  const [target, materialBlocks, wordPayload, materialBlocksSha256, reviewPackageSha256, decision] = await Promise.all([
    readJson(options.targetPath),
    readJson(options.materialBlocksPath),
    readJson(path.join(evalRoot, 'stt', options.sourceSttId, 'source', 'word-timestamps.json')),
    sha256(options.materialBlocksPath),
    sha256(options.reviewPackagePath),
    options.decisionPath ? readJson(options.decisionPath) : undefined
  ]);
  const source = findPrimarySource(target, options.sourceSttId, options.sourceVideoId);
  const { blocks, boundaries } = validateMaterialBlocks(materialBlocks, target, options.sourceVideoId);
  const words = wordPayload.words ?? [];
  assert(words.length > 0, '元配信STTに単語タイムスタンプがありません');
  const copiedAt = new Date().toISOString();
  const template = buildDecisionTemplate({
    fixtureId: options.fixtureId,
    target,
    sourceVideoId: options.sourceVideoId,
    sourceSttId: options.sourceSttId,
    materialBlocksPath: options.materialBlocksPath,
    materialBlocksSha256,
    reviewPackagePath: options.reviewPackagePath,
    reviewPackageSha256,
    blocks,
    boundaries
  });
  const validation = validateDecision({
    decision,
    fixtureId: options.fixtureId,
    target,
    sourceVideoId: options.sourceVideoId,
    sourceSttId: options.sourceSttId,
    materialBlocksSha256,
    reviewPackageSha256,
    blocks,
    boundaries
  });
  const provisional = buildTranscript(
    blocks,
    words,
    source,
    options.sourceSttId,
    copiedAt,
    'zev-local-stt-multiblock-material-preview-not-frozen'
  );
  const frozenDrafts = validation.readyForFreeze
    ? buildFrozenDrafts({
      fixtureId: options.fixtureId,
      target,
      targetPath: options.targetPath,
      source,
      sourceSttId: options.sourceSttId,
      materialBlocksPath: options.materialBlocksPath,
      materialBlocksSha256,
      reviewPackagePath: options.reviewPackagePath,
      reviewPackageSha256,
      decision,
      decisionPath: options.decisionPath,
      validation,
      blocks,
      words,
      copiedAt
    })
    : null;

  if (options.writeFixture && !validation.readyForFreeze) {
    throw new Error(`fixture/expectedへ書き込めません: ${validation.issues.join(' / ')}`);
  }
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const expectedPath = path.join(evalRoot, 'expected', `${options.fixtureId}.json`);
  const plannedWrites = {
    fixturePath: relative(path.join(fixtureDir, 'fixture.json')),
    transcriptPath: relative(path.join(fixtureDir, 'transcript.json')),
    themesPath: relative(path.join(fixtureDir, 'themes.json')),
    expectedPath: relative(expectedPath)
  };
  if (options.writeFixture) {
    assert(!existsSync(fixtureDir), `既存fixtureを上書きしません: ${relative(fixtureDir)}`);
    assert(!existsSync(expectedPath), `既存expectedを上書きしません: ${relative(expectedPath)}`);
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(frozenDrafts.fixture, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(frozenDrafts.transcript, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(frozenDrafts.themes, null, 2)}\n`, 'utf8');
    await writeFile(expectedPath, `${JSON.stringify(frozenDrafts.expected, null, 2)}\n`, 'utf8');
  }

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const baseName = `multiblock-material-fixture-freeze-preview-${options.fixtureId}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const templatePath = path.join(outputDir, `multiblock-material-human-decision-template-${options.fixtureId}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  const preview = {
    kind: 'clip_composition_multiblock_material_fixture_freeze_preview',
    runAt: copiedAt,
    fixtureId: options.fixtureId,
    writeFixture: options.writeFixture,
    fixtureWriteReady: validation.readyForFreeze,
    targetPath: relative(options.targetPath),
    materialBlocksPath: relative(options.materialBlocksPath),
    materialBlocksSha256,
    reviewPackagePath: relative(options.reviewPackagePath),
    reviewPackageSha256,
    sourceVideoId: options.sourceVideoId,
    sourceSttId: options.sourceSttId,
    candidateBlockCount: blocks.length,
    candidateBoundaryCount: boundaries.length,
    decisionPath: options.decisionPath ? relative(options.decisionPath) : null,
    decisionValidation: validation,
    plannedWrites,
    decisionTemplatePath: relative(templatePath),
    provisionalTranscriptStatus: '全素材ブロックのSTT対応を検証するためのpreview。fixture正本ではない。',
    provisionalTranscript: provisional.transcript,
    provisionalBlockSummaries: provisional.blockSummaries,
    fixtureDraft: frozenDrafts?.fixture ?? null,
    transcriptDraft: frozenDrafts?.transcript ?? null,
    themesDraft: frozenDrafts?.themes ?? null,
    expectedDraft: frozenDrafts?.expected ?? null,
    productionImpact: {
      fixtureCreated: options.writeFixture,
      expectedCreated: options.writeFixture,
      runtimeWrites: false,
      productionCodeChanged: false,
      productionUiApiQueueDbChanged: false
    }
  };
  await writeFile(resultPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(templatePath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportText(preview, resultPath, templatePath), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`decision template: ${templatePath}`);
  console.log(`candidate blocks: ${blocks.length}`);
  console.log(`candidate boundaries: ${boundaries.length}`);
  console.log(`fixture write ready: ${validation.readyForFreeze ? 'yes' : 'no'}`);
  console.log(`write fixture: ${options.writeFixture ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

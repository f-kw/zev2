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
    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
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

  const fixtureId = sanitizePathPart(requireValue(values, 'fixture'));
  return {
    fixtureId,
    targetPath: resolveWorkspacePath(requireValue(values, 'target')),
    materialBlocksPath: resolveWorkspacePath(requireValue(values, 'materialBlocks')),
    sourceSttId: sanitizePathPart(requireValue(values, 'sourceSttId')),
    sourceVideoId: sanitizePathPart(requireValue(values, 'sourceVideoId')),
    themeTitle: requireValue(values, 'themeTitle'),
    themeSummary: values.get('themeSummary')?.trim() || requireValue(values, 'themeTitle'),
    checkedBy: requireValue(values, 'checkedBy'),
    checkedAt: requireValue(values, 'checkedAt'),
    reviewReportPath: resolveWorkspacePath(requireValue(values, 'reviewReport')),
    outputReason: values.get('reason')?.trim() || '音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致した単一区間素材ブロックのため。',
    dryRun: values.has('dry-run')
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

function sanitizePathPart(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sourceWordPath(sourceSttId) {
  return path.join(evalRoot, 'stt', sourceSttId, 'source', 'word-timestamps.json');
}

function rangeText(words) {
  return words.map((word) => word.text).join('');
}

function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function findSource(target, sourceSttId, sourceVideoId) {
  const source = target.sourceCandidates?.find((candidate) => (
    (candidate.sttId ?? candidate.id) === sourceSttId || candidate.id === sourceVideoId
  ));
  if (!source) {
    throw new Error(`targetにsourceSttId/sourceVideoIdがありません: ${sourceSttId} / ${sourceVideoId}`);
  }
  return source;
}

async function verifyGuard(materialBlocks, reviewReportText) {
  const blocks = materialBlocks.blocks ?? [];
  assert(blocks.length === 1, `単一区間fixtureとして凍結するには素材ブロックが1件である必要があります。現在: ${blocks.length}件`);
  assert((materialBlocks.boundaries ?? []).length === 0, '単一区間fixtureとして凍結するには素材境界候補が0件である必要があります');
  assert(reviewReportText.includes('結論: 全run一致'), '音声分離確認レポートに「結論: 全run一致」がありません');
  return blocks[0];
}

async function main() {
  const target = await readJson(options.targetPath);
  const materialBlocks = await readJson(options.materialBlocksPath);
  const reviewReportText = await readFile(options.reviewReportPath, 'utf8');
  const block = await verifyGuard(materialBlocks, reviewReportText);
  const source = findSource(target, options.sourceSttId, options.sourceVideoId);
  const wordPayload = await readJson(sourceWordPath(options.sourceSttId));
  const words = (wordPayload.words ?? [])
    .filter((word) => word.endMs > block.sourceStartMs && word.startMs < block.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
  assert(words.length > 0, '素材ブロック範囲にSTT単語がありません');

  const segments = words.map((word, index) => ({
    id: index + 1,
    startMs: Math.max(word.startMs, block.sourceStartMs),
    endMs: Math.min(word.endMs, block.sourceEndMs),
    text: word.text,
    ...(word.speaker ? { speaker: word.speaker } : {})
  })).filter((segment) => segment.endMs >= segment.startMs);
  assert(segments.length > 0, '素材ブロック範囲に有効な発話単位がありません');

  const allSpeechIds = segments.map((segment) => segment.id);
  const copiedAt = new Date().toISOString();
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const sourceUrl = source.url;
  const representativeText = rangeText(segments);

  const fixture = {
    fixtureId: options.fixtureId,
    draftId: options.fixtureId,
    description: '音声分離確認で全run一致した単一区間素材ブロックを、composition評価用に固定したfixture。',
    copiedFrom: [
      path.relative(root, options.materialBlocksPath),
      path.relative(root, options.reviewReportPath),
      `stt/${options.sourceSttId}/source/word-timestamps.json`
    ],
    copiedAt,
    sourceUri: sourceUrl,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_material_block_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      'expectedCutsは素材対応の切り替わり点の定義に基づく単一区間素材ブロック。',
      '固定テーマは人間が正解区間から逆算して書いた。',
      '同一素材内の詰めは境界ではなくinternalGapMsとして記録する。'
    ]
  };

  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt-material-block',
    sourceUri: sourceUrl,
    sampleSource: {
      title: target.title,
      path: source.localVideoPath,
      sourceRange: {
        sourceStartMs: block.sourceStartMs,
        sourceEndMs: block.sourceEndMs
      }
    },
    notes: [
      'clip_composition評価環境で、確認済み素材ブロック範囲を固定した文字起こし。',
      '切り抜き内部の詰めはspeechUnitGroupsを分割せず、同一素材ブロック内の注記として扱う。'
    ],
    generatedAt: copiedAt,
    language: 'ja-JP',
    durationSec: Math.round((block.sourceEndMs - block.sourceStartMs) / 10) / 100,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: [allSpeechIds]
  };

  const themes = {
    kind: 'theme_json',
    mode: 'human-reverse-written-material-block-theme',
    generatedAt: copiedAt,
    sourceUri: sourceUrl,
    themes: [
      {
        id: 'theme_material_block_1',
        title: options.themeTitle,
        summary: options.themeSummary,
        representativeText,
        representativeSpeechIds: allSpeechIds,
        relatedSpeechIds: allSpeechIds,
        whyItCanBeClipped: '音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致し、組織内の関係性に関する一連の流れとして見られるため。',
        compositionNote: '単一区間素材ブロックとして、内部の詰めを境界化せず、意味の連続性が保たれる範囲を選ぶ。',
        evidenceRefs: [
          {
            kind: 'human_audio_separated_review',
            refId: 'material_block_audio_review_v002',
            meaning: path.relative(root, options.reviewReportPath)
          },
          {
            kind: 'time_range',
            refId: 'confirmed_material_block_source_range',
            meaning: `${sourceUrl} ${block.sourceStartMs}ms-${block.sourceEndMs}ms`
          }
        ]
      }
    ]
  };

  const expected = {
    draftId: options.fixtureId,
    fixtureId: options.fixtureId,
    expectedCuts: [
      {
        sourceStartMs: block.sourceStartMs,
        sourceEndMs: block.sourceEndMs,
        reason: options.outputReason,
        sourceVideoId: options.sourceVideoId,
        sourceUrl,
        sourceSttId: options.sourceSttId,
        clipId: target.clip.id,
        clipUrl: target.clip.url,
        verificationStatus: 'material_block_audio_separated_human_confirmed',
        usableForClipLocationEval: true,
        usableForCompositionPromptEval: true,
        qualityGrade: 'material_block_granularity',
        clipStartMs: block.clipStartMs,
        clipEndMs: block.clipEndMs,
        internalGapMs: block.internalGapMs,
        materialBlock: dropUndefined({
          blockIndex: block.blockIndex,
          matchedWordPairCount: block.matchedWordPairCount,
          clipDurationMs: block.clipDurationMs,
          sourceDurationMs: block.sourceDurationMs,
          sourceMinusClipDurationMs: block.sourceMinusClipDurationMs,
          runIndexes: block.runIndexes,
          internalTransitions: block.internalTransitions
        }),
        humanAudioSeparatedVerification: {
          status: 'confirmed',
          checkedBy: options.checkedBy,
          checkedAt: options.checkedAt,
          method: '音声分離確認パッケージ(v002)',
          reportPath: path.relative(root, options.reviewReportPath),
          note: '同時再生では一部が不一致/判定困難に見えたが、切り抜き側と元配信側を分離して順番に聴く確認では全run一致。'
        },
        freezeGuard: {
          allMaterialBlocksConfirmed: true,
          fixedThemeHumanReverseWritten: true,
          fixedThemeTitle: options.themeTitle,
          fixedThemeSummary: options.themeSummary
        }
      }
    ]
  };

  if (!options.dryRun) {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(themes, null, 2)}\n`, 'utf8');
    await writeFile(path.join(evalRoot, 'expected', `${options.fixtureId}.json`), `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    fixture: path.relative(root, fixtureDir),
    expected: path.relative(root, path.join(evalRoot, 'expected', `${options.fixtureId}.json`)),
    sourceRange: {
      sourceStartMs: block.sourceStartMs,
      sourceEndMs: block.sourceEndMs,
      durationMs: block.sourceEndMs - block.sourceStartMs
    },
    clipRange: {
      clipStartMs: block.clipStartMs,
      clipEndMs: block.clipEndMs,
      durationMs: block.clipEndMs - block.clipStartMs
    },
    internalGapMs: block.internalGapMs,
    segmentCount: segments.length,
    write: options.dryRun ? 'no' : 'yes'
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

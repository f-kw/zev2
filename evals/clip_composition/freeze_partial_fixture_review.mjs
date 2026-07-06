import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
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

  const themeTitle = values.get('themeTitle')?.trim();
  if (!themeTitle) {
    throw new Error('--themeTitle に人間が逆算した固定テーマを指定してください');
  }

  return {
    reviewPath: resolveWorkspacePath(values.get('review') ?? 'evals/clip_composition/outputs/partial-fixture-review-r_ztjHaHmcg-20260706-v001.json'),
    targetPath: resolveWorkspacePath(values.get('target') ?? 'evals/clip_composition/stt-targets/r_ztjHaHmcg.json'),
    sourceSttId: sanitizePathPart(values.get('sourceSttId') ?? 'r_ztjHaHmcg_-DwSCDMCWDQ_local300_v001'),
    fixtureId: sanitizePathPart(values.get('fixture') ?? 'r_ztjHaHmcg_partial_material_v001'),
    checkedBy: values.get('checkedBy')?.trim() || 'kawafmm',
    checkedAt: values.get('checkedAt')?.trim() || '2026-07-06',
    themeTitle,
    themeSummary: values.get('themeSummary')?.trim() || themeTitle,
    themeCompositionNote: values.get('themeCompositionNote')?.trim()
      || '素材ブロック粒度で、配信者が食べていける同接規模について現実的に答える流れを複数区間として扱う。境界2の未解決区間は除外する。',
    outputId: sanitizePathPart(values.get('outputId') ?? '20260706-v001'),
    writeFixture: values.get('writeFixture') === 'true'
  };
}

function sanitizePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function resolveWorkspacePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath) {
  return path.relative(workspaceRoot(), filePath);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function requireArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} がありません`);
  }
  return value;
}

function sttWordPath(sourceSttId) {
  return path.join(evalRoot, 'stt', sourceSttId, 'source', 'word-timestamps.json');
}

function wordsInRange(words, cut) {
  return words
    .filter((word) => word.endMs > cut.sourceStartMs && word.startMs < cut.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function textFromSegments(segments) {
  return segments.map((segment) => segment.text).join('');
}

function buildTranscript(input) {
  const segments = [];
  const speechUnitGroups = [];
  const cutTranscriptSummary = [];

  for (const cut of input.expectedCuts) {
    const words = wordsInRange(input.words, cut);
    if (words.length === 0) {
      throw new Error(`block ${cut.multicutPartIndex + 1} に対応する単語タイムスタンプがありません`);
    }

    const group = [];
    for (const word of words) {
      const id = segments.length + 1;
      const segment = {
        id,
        startMs: Math.max(word.startMs, cut.sourceStartMs),
        endMs: Math.min(word.endMs, cut.sourceEndMs),
        text: word.text,
        ...(word.speaker ? { speaker: word.speaker } : {})
      };
      if (segment.endMs < segment.startMs) {
        continue;
      }
      segments.push(segment);
      group.push(id);
    }

    speechUnitGroups.push(group);
    cutTranscriptSummary.push({
      partIndex: cut.multicutPartIndex,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      segmentCount: group.length,
      textPreview: textFromSegments(segments.filter((segment) => group.includes(segment.id))).slice(0, 160)
    });
  }

  return {
    transcript: {
      kind: 'transcript_json',
      mode: 'zev-local-stt-partial-material-review',
      sourceUri: input.source.url,
      sampleSource: {
        title: input.target.title ?? input.review.title,
        path: input.source.localVideoPath,
        sourceRanges: input.expectedCuts.map((cut) => ({
          partIndex: cut.multicutPartIndex,
          sourceStartMs: cut.sourceStartMs,
          sourceEndMs: cut.sourceEndMs,
          qualityGrade: cut.qualityGrade
        }))
      },
      notes: [
        'clip_composition評価環境で、境界2の未解決区間を除外した部分fixture。',
        'speechUnitGroupsは素材ブロック粒度の各区間に対応する。',
        '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
        '素材ブロック粒度と高精度サンプルは混同しない。'
      ],
      generatedAt: input.copiedAt,
      language: 'ja-JP',
      durationSec: Math.round(input.expectedCuts.reduce((sum, cut) => sum + (cut.sourceEndMs - cut.sourceStartMs), 0) / 1000 * 1000) / 1000,
      segmentCount: segments.length,
      segments,
      speechUnitGroups
    },
    cutTranscriptSummary
  };
}

function buildThemes(input) {
  const relatedSpeechIds = input.speechUnitGroups.flat();
  const representativeSpeechIds = relatedSpeechIds;
  const representativeText = textFromSegments(input.segments.filter((segment) => representativeSpeechIds.includes(segment.id)));
  return {
    kind: 'theme_json',
    mode: 'human-reverse-written-partial-material-theme',
    generatedAt: input.copiedAt,
    sourceUri: input.sourceUrl,
    themes: [
      {
        id: 'theme_partial_material_1',
        title: input.options.themeTitle,
        summary: input.options.themeSummary,
        representativeText,
        representativeSpeechIds,
        relatedSpeechIds,
        whyItCanBeClipped: '人間が認定した素材ブロック境界に基づき、配信者が食べていける同接規模について現実的に答える流れが複数区間で構成されているため。',
        compositionNote: input.options.themeCompositionNote,
        evidenceRefs: [
          {
            kind: 'eval_review_packet',
            refId: input.review.draftExpectedFixtureId,
            meaning: '境界2を未解決除外とした部分fixture凍結前確認パケット'
          }
        ]
      }
    ]
  };
}

function buildExpectedCuts(input) {
  return input.review.expectedFileDraft.expectedCuts.map((cut, index) => ({
    ...cut,
    sourceSttId: input.options.sourceSttId,
    verificationStatus: 'partial_material_boundaries_human_confirmed_with_unresolved_exclusion',
    usableForClipLocationEval: true,
    usableForCompositionPromptEval: true,
    multicutPartIndex: typeof cut.multicutPartIndex === 'number' ? cut.multicutPartIndex : index,
    humanVisualVerification: {
      status: 'confirmed',
      checkedBy: input.options.checkedBy,
      checkedAt: input.options.checkedAt,
      note: '境界1・3・4・5は人間認定済み。境界2を含むclip 0:33.504-0:51.810はunresolvedとして除外する判断を人間が承認した。'
    },
    partialFixturePolicy: {
      unresolvedExcluded: true,
      unresolvedRangeIds: input.review.excludedRanges.map((range) => range.id),
      qualityGrade: cut.qualityGrade,
      note: '素材対応ブロック粒度のexpected。高精度サンプルとは別の品質等級として扱う。'
    }
  }));
}

function buildDecision(input) {
  return {
    kind: 'clip_composition_partial_fixture_human_decision',
    fixtureId: input.options.fixtureId,
    targetId: input.review.targetId,
    sourceId: input.review.sourceId,
    reviewPath: relativeWorkspacePath(input.options.reviewPath),
    humanConfirmation: {
      partialFixtureConfirmed: true,
      checkedBy: input.options.checkedBy,
      checkedAt: input.options.checkedAt,
      note: '境界2を未解決除外し、境界1・3・4・5に基づく部分fixtureとして固定する。'
    },
    fixedTheme: {
      title: input.options.themeTitle,
      summary: input.options.themeSummary,
      compositionNote: input.options.themeCompositionNote
    },
    unresolvedRanges: input.review.excludedRanges.map((range) => ({
      id: range.id,
      status: 'excluded_confirmed',
      clipRange: {
        startMs: range.clipStartMs,
        endMs: range.clipEndMs
      },
      sourceRange: {
        startMs: range.sourceStartMs,
        endMs: range.sourceEndMs
      },
      acceptedAsExcluded: true,
      reSplitRequired: true,
      note: range.reason
    })),
    chunks: input.review.expectedCutsDraft.map((cut) => ({
      cutIndex: cut.partIndex - 1,
      blockIndex: cut.partIndex,
      status: 'confirmed',
      qualityGrade: cut.qualityGrade,
      clipRange: {
        startMs: cut.clipStartMs,
        endMs: cut.clipEndMs
      },
      sourceRange: {
        startMs: cut.sourceStartMs,
        endMs: cut.sourceEndMs
      },
      note: '素材ブロック粒度として確認済み。'
    })),
    readyForFreeze: true
  };
}

function buildReport(preview, resultPath) {
  const lines = [
    '# 部分fixture凍結結果',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- fixture ID: ${preview.fixtureId}`,
    `- 書き込み実行: ${preview.writeFixture ? 'yes' : 'no'}`,
    `- 人間確認済み: ${preview.humanConfirmed ? 'yes' : 'no'}`,
    `- 固定テーマ: ${preview.fixedTheme.title}`,
    '',
    '## 書き込み先',
    '',
    `- fixture: ${preview.plannedWrites.fixturePath}`,
    `- transcript: ${preview.plannedWrites.transcriptPath}`,
    `- themes: ${preview.plannedWrites.themesPath}`,
    `- expected: ${preview.plannedWrites.expectedPath}`,
    `- human decision: ${preview.plannedWrites.humanDecisionPath}`,
    '',
    '## 除外した未解決区間',
    '',
    '| id | clip | source | 理由 |',
    '| --- | --- | --- | --- |'
  ];

  for (const range of preview.excludedRanges) {
    lines.push(`| ${range.id} | ${range.clipStartMs}-${range.clipEndMs} | ${range.sourceStartMs}-${range.sourceEndMs} | ${range.reason} |`);
  }

  lines.push('');
  lines.push('## 区間別文字起こし');
  lines.push('');
  lines.push('| part | source | segments | preview |');
  lines.push('| ---: | --- | ---: | --- |');
  for (const item of preview.cutTranscriptSummary) {
    lines.push(`| ${item.partIndex + 1} | ${item.sourceStartMs}-${item.sourceEndMs} | ${item.segmentCount} | ${item.textPreview} |`);
  }

  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  lines.push('- evals/clip_composition/fixtures と expected だけにfixtureを固定');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const [review, target, wordPayload] = await Promise.all([
    readJson(options.reviewPath),
    readJson(options.targetPath),
    readJson(sttWordPath(options.sourceSttId))
  ]);

  const expectedCuts = buildExpectedCuts({ review, options });
  requireArray(expectedCuts, 'expectedCuts');
  const source = target.sourceCandidates?.find((candidate) => candidate.id === review.sourceId) ?? target.sourceCandidates?.[0];
  if (!source) {
    throw new Error('元動画候補がtargetにありません');
  }
  const words = requireArray(wordPayload.words, '単語タイムスタンプ');
  const copiedAt = new Date().toISOString();
  const { transcript, cutTranscriptSummary } = buildTranscript({
    review,
    target,
    source,
    words,
    expectedCuts,
    copiedAt
  });
  const themesDraft = buildThemes({
    options,
    review,
    sourceUrl: source.url,
    segments: transcript.segments,
    speechUnitGroups: transcript.speechUnitGroups,
    copiedAt
  });
  const expectedDraft = {
    draftId: options.fixtureId,
    fixtureId: options.fixtureId,
    expectedCuts
  };
  const fixtureDraft = {
    fixtureId: options.fixtureId,
    draftId: options.fixtureId,
    description: '境界2の未解決区間を除外した、素材ブロック粒度の部分fixture。',
    copiedFrom: [
      relativeWorkspacePath(options.reviewPath),
      relativeWorkspacePath(options.targetPath),
      `stt/${options.sourceSttId}/source/word-timestamps.json`
    ],
    copiedAt,
    sourceUri: source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_partial_material_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      '境界2を含むclip 0:33.504-0:51.810はunresolvedとして除外している。',
      'expectedCutsは素材ブロック粒度。高精度サンプルとは別品質として扱う。',
      '固定テーマは人間が正解区間から逆算して書いた。'
    ]
  };
  const decision = buildDecision({ review, options });

  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const plannedWrites = {
    fixtureDir: relativeWorkspacePath(fixtureDir),
    fixturePath: relativeWorkspacePath(path.join(fixtureDir, 'fixture.json')),
    transcriptPath: relativeWorkspacePath(path.join(fixtureDir, 'transcript.json')),
    themesPath: relativeWorkspacePath(path.join(fixtureDir, 'themes.json')),
    expectedPath: relativeWorkspacePath(path.join(evalRoot, 'expected', `${options.fixtureId}.json`)),
    humanDecisionPath: relativeWorkspacePath(path.join(evalRoot, 'outputs', `partial-fixture-human-decision-${options.fixtureId}-${options.outputId}.json`))
  };
  const preview = {
    kind: 'clip_composition_partial_fixture_freeze',
    runAt: copiedAt,
    writeFixture: options.writeFixture,
    humanConfirmed: true,
    fixtureId: options.fixtureId,
    reviewPath: relativeWorkspacePath(options.reviewPath),
    targetPath: relativeWorkspacePath(options.targetPath),
    sourceSttId: options.sourceSttId,
    fixedTheme: {
      title: options.themeTitle,
      summary: options.themeSummary,
      compositionNote: options.themeCompositionNote
    },
    plannedWrites,
    fixtureDraft,
    transcriptDraft: transcript,
    themesDraft,
    expectedDraft,
    humanDecision: decision,
    excludedRanges: review.excludedRanges,
    cutTranscriptSummary,
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false
    }
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `partial-fixture-freeze-${options.fixtureId}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `partial-fixture-freeze-${options.fixtureId}-${options.outputId}.md`);
  const decisionPath = path.join(outputDir, `partial-fixture-human-decision-${options.fixtureId}-${options.outputId}.json`);

  if (options.writeFixture) {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(fixtureDraft, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(themesDraft, null, 2)}\n`, 'utf8');
    await writeFile(path.join(evalRoot, 'expected', `${options.fixtureId}.json`), `${JSON.stringify(expectedDraft, null, 2)}\n`, 'utf8');
    await writeFile(decisionPath, `${JSON.stringify(decision, null, 2)}\n`, 'utf8');
  }

  await writeFile(resultPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(preview, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`write fixture: ${options.writeFixture ? 'yes' : 'no'}`);
  console.log(`expected cuts: ${expectedCuts.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

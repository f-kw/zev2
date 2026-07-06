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

  return {
    materialBlocksPath: resolveWorkspacePath(values.get('materialBlocks') ?? 'evals/clip_composition/outputs/material-blocks-r_ztjHaHmcg-20260706-v001.json'),
    targetPath: resolveWorkspacePath(values.get('target') ?? 'evals/clip_composition/stt-targets/r_ztjHaHmcg.json'),
    confirmedPairsPath: resolveWorkspacePath(values.get('confirmedPairs') ?? 'evals/clip_composition/confirmed_pairs/r_ztjHaHmcg.json'),
    outputId: sanitizePathPart(values.get('outputId') ?? '20260706-v001')
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

function requireBoundary(materialBlocks, boundaryIndex) {
  const boundary = materialBlocks.boundaries?.find((item) => item.boundaryIndex === boundaryIndex);
  if (!boundary) {
    throw new Error(`境界${boundaryIndex}が素材ブロックJSONにありません`);
  }
  return boundary;
}

function msLabel(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function rangeLabel(startMs, endMs) {
  return `${msLabel(startMs)}-${msLabel(endMs)}`;
}

function buildBoundaryReviews(materialBlocks) {
  return [
    {
      boundaryIndex: 1,
      status: 'human_recognized_material_switch',
      humanFinding: 'clip側はcrossfadeで切り替わり、source側も切り替わる。source後半はclip側の後素材と同じ場面。',
      evidenceLabels: ['境界1-A clip連続再生', '境界1-B source前後連続再生']
    },
    {
      boundaryIndex: 2,
      status: 'unresolved_requires_resplit',
      humanFinding: 'clip側は2回切り替わり、source側も無音だが切り替わっている。単一境界として扱えない。',
      evidenceLabels: ['境界2-A clip連続再生', '境界2-B source前後連続再生']
    },
    {
      boundaryIndex: 3,
      status: 'human_recognized_material_switch',
      humanFinding: 'clip側はcrossfadeで切り替わり、source側も切り替わる。',
      evidenceLabels: ['境界3-A clip連続再生', '境界3-B source前後連続再生']
    },
    {
      boundaryIndex: 4,
      status: 'human_recognized_material_switch',
      humanFinding: 'clip側はcrossfadeで切り替わり、source側も切り替わる。',
      evidenceLabels: ['境界4-A clip連続再生', '境界4-B source前後連続再生']
    },
    {
      boundaryIndex: 5,
      status: 'human_recognized_material_switch',
      humanFinding: 'clip側はcrossfadeで切り替わり、source側も切り替わる。',
      evidenceLabels: ['境界5-A clip連続再生', '境界5-B source前後連続再生']
    }
  ].map((review) => {
    const boundary = requireBoundary(materialBlocks, review.boundaryIndex);
    return {
      ...review,
      clipBeforeEndMs: boundary.clipBeforeEndMs,
      clipAfterStartMs: boundary.clipAfterStartMs,
      sourceBeforeEndMs: boundary.sourceBeforeEndMs,
      sourceAfterStartMs: boundary.sourceAfterStartMs,
      materialJumpMs: boundary.materialJumpMs
    };
  });
}

function boundaryStatusForBlock(blockIndex, side) {
  if (side === 'leading') {
    if (blockIndex === 1) {
      return { status: 'clip_review_start', meaning: '部分fixtureの先頭。前境界は今回の判定対象外。' };
    }
    if (blockIndex === 3) {
      return { status: 'adjacent_to_unresolved_exclusion', meaning: '直前に境界2の未解決除外区間がある。' };
    }
    return { status: 'human_recognized_material_switch', boundaryIndex: blockIndex - 1, meaning: `境界${blockIndex - 1}で素材対応の切り替わりを人間認定済み。` };
  }

  if (blockIndex === 6) {
    return { status: 'clip_review_end', meaning: '部分fixtureの終端。後境界は今回の判定対象外。' };
  }
  if (blockIndex === 2) {
    return { status: 'adjacent_to_unresolved_exclusion', boundaryIndex: 2, meaning: '直後に境界2の未解決除外区間がある。' };
  }
  return { status: 'human_recognized_material_switch', boundaryIndex: blockIndex, meaning: `境界${blockIndex}で素材対応の切り替わりを人間認定済み。` };
}

function buildExpectedCutsDraft(materialBlocks, target, confirmedPairs) {
  const source = target.sourceCandidates?.[0] ?? {};
  const activePair = confirmedPairs.activePair;
  return materialBlocks.blocks.map((block) => {
    const draft = {
      partIndex: block.blockIndex,
      qualityGrade: 'material_block_granularity',
      clipStartMs: block.clipStartMs,
      clipEndMs: block.clipEndMs,
      sourceStartMs: block.sourceStartMs,
      sourceEndMs: block.sourceEndMs,
      clipDurationMs: block.clipDurationMs,
      sourceDurationMs: block.sourceDurationMs,
      matchedWordPairCount: block.matchedWordPairCount,
      sourceVideoId: source.id,
      sourceUrl: source.url,
      clipId: target.clip?.id,
      clipUrl: target.clip?.url,
      reviewState: 'needs_human_freeze_confirmation',
      usableForClipLocationEval: true,
      usableForCompositionPromptEval: false,
      reason: '素材対応の切り替わり点を境界とする定義に基づく、部分fixture用の素材ブロック草案。',
      boundaryStatus: {
        leading: boundaryStatusForBlock(block.blockIndex, 'leading'),
        trailing: boundaryStatusForBlock(block.blockIndex, 'trailing')
      },
      internalGapMs: block.internalGapMs,
      internalTransitions: block.internalTransitions ?? []
    };

    if (
      activePair &&
      block.clipStartMs <= activePair.clipStartMs &&
      block.clipEndMs >= activePair.clipEndMs &&
      block.sourceStartMs <= activePair.sourceStartMs &&
      block.sourceEndMs >= activePair.sourceEndMs
    ) {
      draft.highPrecisionSamples = [
        {
          qualityGrade: 'high_precision_sample',
          clipStartMs: activePair.clipStartMs,
          clipEndMs: activePair.clipEndMs,
          sourceStartMs: activePair.sourceStartMs,
          sourceEndMs: activePair.sourceEndMs,
          verifiedAt: activePair.verifiedAt,
          checkedBy: activePair.checkedBy,
          verificationMethod: activePair.verificationMethod,
          note: activePair.metadata?.durationDeltaNote
        }
      ];
    }

    if (block.blockIndex === 2) {
      draft.notes = ['直後の境界2を含む区間は未解決として除外。block2自体は除外区間の手前までの素材ブロック草案。'];
    }
    if (block.blockIndex === 3) {
      draft.notes = ['直前の境界2を含む区間は未解決として除外。block3自体は除外区間の後からの素材ブロック草案。'];
    }

    return draft;
  });
}

function buildPacket(input) {
  const boundaryReviews = buildBoundaryReviews(input.materialBlocks);
  const unresolvedBoundary = requireBoundary(input.materialBlocks, 2);
  const fixtureId = `${sanitizePathPart(input.target.targetId)}_partial_material_v001`;
  const expectedCutsDraft = buildExpectedCutsDraft(input.materialBlocks, input.target, input.confirmedPairs);

  return {
    kind: 'clip_composition_partial_fixture_review_packet',
    runAt: new Date().toISOString(),
    targetId: input.target.targetId,
    title: input.target.title,
    sourceId: input.target.sourceCandidates?.[0]?.id,
    draftExpectedFixtureId: fixtureId,
    boundaryDefinition: {
      expectedCutsBoundary: '素材対応の切り替わり点。元動画の別位置へ飛ぶ点だけを境界とし、同一場面内の詰めはinternalGapMs系の注記にする。',
      crossfadeHandling: 'crossfadeは素材対応の切り替わりとして扱う。ただし境界点を1フレームに厳密化せず、遷移として確認した事実を注記する。',
      unresolvedHandling: '長い未説明区間は内部詰めに吸収せず、再分割が必要なunresolved区間としてfixtureから除外する。',
      qualityGrades: {
        material_block_granularity: '素材の飛びを測る粗い粒度。source/clip範囲内に内部詰めを含みうる。',
        high_precision_sample: '映像・音声で境界を詰めた採点基準。素材ブロック粒度とは別に保持する。'
      }
    },
    evidenceInputs: {
      materialBlocksPath: relativeWorkspacePath(input.options.materialBlocksPath),
      targetPath: relativeWorkspacePath(input.options.targetPath),
      confirmedPairsPath: relativeWorkspacePath(input.options.confirmedPairsPath),
      boundaryReviewPackage: 'evals/clip_composition/outputs/boundary-check/r_ztjHaHmcg/20260706-material-boundaries-v001/index.html'
    },
    freezeReadiness: {
      expectedCutsFrozenNow: false,
      readyForFreeze: false,
      canFreezePartialAfterHumanReview: true,
      reason: '境界2を含むclip 0:33.504-0:51.810は未解決として除外した。部分fixtureとしての採用は、今回のレビューJSON/MDを人間が確認してから行う。'
    },
    humanBoundaryReviews: boundaryReviews,
    excludedRanges: [
      {
        id: 'boundary2_unresolved_clip_33504_51810',
        boundaryIndex: 2,
        status: 'unresolved_requires_resplit',
        clipStartMs: unresolvedBoundary.clipBeforeEndMs,
        clipEndMs: unresolvedBoundary.clipAfterStartMs,
        sourceStartMs: unresolvedBoundary.sourceBeforeEndMs,
        sourceEndMs: unresolvedBoundary.sourceAfterStartMs,
        clipDurationMs: unresolvedBoundary.clipAfterStartMs - unresolvedBoundary.clipBeforeEndMs,
        sourceDurationMs: unresolvedBoundary.sourceAfterStartMs - unresolvedBoundary.sourceBeforeEndMs,
        reason: '人間確認で、境界2-Aは2回切り替わり、境界2-Bも無音だが切り替わっていると判定された。単一の素材境界ではなく再分割が必要なため、部分fixtureから除外する。'
      }
    ],
    expectedCutsDraft,
    expectedFileDraft: {
      draftId: fixtureId,
      fixtureId,
      expectedCuts: expectedCutsDraft.map((cut) => ({
        sourceStartMs: cut.sourceStartMs,
        sourceEndMs: cut.sourceEndMs,
        reason: cut.reason,
        sourceVideoId: cut.sourceVideoId,
        sourceUrl: cut.sourceUrl,
        clipId: cut.clipId,
        clipUrl: cut.clipUrl,
        verificationStatus: 'partial_material_boundaries_human_recognized_freeze_pending',
        usableForClipLocationEval: cut.usableForClipLocationEval,
        usableForCompositionPromptEval: cut.usableForCompositionPromptEval,
        multicutPartIndex: cut.partIndex - 1,
        clipStartMs: cut.clipStartMs,
        clipEndMs: cut.clipEndMs,
        qualityGrade: cut.qualityGrade,
        boundaryStatus: cut.boundaryStatus,
        internalGapMs: cut.internalGapMs,
        ...(cut.highPrecisionSamples ? { highPrecisionSamples: cut.highPrecisionSamples } : {}),
        ...(cut.notes ? { notes: cut.notes } : {})
      }))
    },
    fixedThemeReview: {
      status: 'needs_human_reverse_written_theme',
      instruction: '素材ブロック草案と除外区間を確認したうえで、「この切り抜き師は何をテーマとして切ったか」を人間が1行で逆算して書く。',
      suggestedThemeDraftForReview: null
    },
    humanReviewChecklist: [
      '境界2を含むclip 0:33.504-0:51.810がunresolvedとして除外されていることを確認する。',
      '境界1・3・4・5の人間認定内容が、今回のJSON/MDに正しく転記されていることを確認する。',
      'expectedCutsDraftが素材ブロック粒度であり、高精度サンプルと混同していないことを確認する。',
      '部分fixtureとして凍結してよい場合だけ、人間確認テンプレートを埋める。',
      '固定テーマはAI生成ではなく、正解区間から人間が逆算して書く。'
    ],
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false,
      writesExpectedDirectory: false,
      writesFixturesDirectory: false,
      confirmedPairChanged: false
    }
  };
}

function buildDecisionTemplate(packet) {
  return {
    kind: 'clip_composition_partial_fixture_human_decision_template',
    fixtureId: packet.draftExpectedFixtureId,
    targetId: packet.targetId,
    sourceId: packet.sourceId,
    reviewPath: '',
    humanConfirmation: {
      partialFixtureConfirmed: false,
      checkedBy: '',
      checkedAt: '',
      note: ''
    },
    fixedTheme: {
      title: '',
      summary: '',
      compositionNote: ''
    },
    unresolvedRanges: packet.excludedRanges.map((range) => ({
      id: range.id,
      status: 'excluded_pending_human_confirmation',
      clipRange: {
        startMs: range.clipStartMs,
        endMs: range.clipEndMs
      },
      sourceRange: {
        startMs: range.sourceStartMs,
        endMs: range.sourceEndMs
      },
      acceptedAsExcluded: null,
      reSplitRequired: true,
      note: ''
    })),
    chunks: packet.expectedCutsDraft.map((cut) => ({
      cutIndex: cut.partIndex - 1,
      blockIndex: cut.partIndex,
      status: 'pending',
      qualityGrade: cut.qualityGrade,
      clipRange: {
        startMs: cut.clipStartMs,
        endMs: cut.clipEndMs
      },
      sourceRange: {
        startMs: cut.sourceStartMs,
        endMs: cut.sourceEndMs
      },
      note: ''
    })),
    readyForFreeze: false
  };
}

function buildReport(packet, resultPath, decisionPath) {
  const lines = [
    '# 部分fixture 凍結前確認パケット',
    '',
    `- 対象: ${packet.targetId}`,
    `- タイトル: ${packet.title ?? 'unknown'}`,
    `- 元動画: ${packet.sourceId ?? 'unknown'}`,
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- 人間確認テンプレート: ${path.relative(evalRoot, decisionPath)}`,
    `- 境界確認HTML: ${packet.evidenceInputs.boundaryReviewPackage}`,
    '',
    '## 結論',
    '',
    '- 境界1・3・4・5は人間認定済みの素材切り替わりとして記録した。',
    '- 境界2を含むclip 0:33.504-0:51.810は、単一境界ではなく再分割が必要なunresolved区間として除外した。',
    '- fixture/expectedへの書き込みはしていない。人間確認待ちで停止する。',
    '',
    '## 境界定義',
    '',
    `- expectedCuts境界: ${packet.boundaryDefinition.expectedCutsBoundary}`,
    `- crossfade: ${packet.boundaryDefinition.crossfadeHandling}`,
    `- 未説明区間: ${packet.boundaryDefinition.unresolvedHandling}`,
    '',
    '## 除外区間',
    '',
    '| id | clip | source | 理由 |',
    '| --- | --- | --- | --- |'
  ];

  for (const range of packet.excludedRanges) {
    lines.push(`| ${range.id} | ${rangeLabel(range.clipStartMs, range.clipEndMs)} | ${rangeLabel(range.sourceStartMs, range.sourceEndMs)} | ${range.reason} |`);
  }

  lines.push('');
  lines.push('## 素材ブロック草案');
  lines.push('');
  lines.push('| block | clip | source | words | 品質 | 境界状態 | 注記 |');
  lines.push('| ---: | --- | --- | ---: | --- | --- | --- |');
  for (const cut of packet.expectedCutsDraft) {
    const statuses = [cut.boundaryStatus.leading.status, cut.boundaryStatus.trailing.status].join(' / ');
    const notes = [
      cut.internalGapMs?.sourceExtraInsideMs ? `source内部詰め候補 ${cut.internalGapMs.sourceExtraInsideMs}ms` : undefined,
      cut.internalGapMs?.clipExtraInsideMs ? `clip内部詰め候補 ${cut.internalGapMs.clipExtraInsideMs}ms` : undefined,
      cut.highPrecisionSamples ? '高精度サンプルあり' : undefined,
      ...(cut.notes ?? [])
    ].filter(Boolean).join('。');
    lines.push(`| ${cut.partIndex} | ${rangeLabel(cut.clipStartMs, cut.clipEndMs)} | ${rangeLabel(cut.sourceStartMs, cut.sourceEndMs)} | ${cut.matchedWordPairCount} | ${cut.qualityGrade} | ${statuses} | ${notes || '-'} |`);
  }

  lines.push('');
  lines.push('## 人間確認チェック');
  lines.push('');
  for (const item of packet.humanReviewChecklist) {
    lines.push(`- ${item}`);
  }

  lines.push('');
  lines.push('## 品質等級');
  lines.push('');
  lines.push(`- 素材ブロック粒度: ${packet.boundaryDefinition.qualityGrades.material_block_granularity}`);
  lines.push(`- 高精度サンプル: ${packet.boundaryDefinition.qualityGrades.high_precision_sample}`);
  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  lines.push('- fixture/expected への書き込みなし');
  lines.push('- confirmedペアの変更なし');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function buildDecisionReport(packet, decisionPath) {
  const lines = [
    '# 部分fixture 人間確認テンプレート',
    '',
    `- テンプレートJSON: ${path.relative(evalRoot, decisionPath)}`,
    `- fixtureId: ${packet.draftExpectedFixtureId}`,
    '',
    '## 入力すること',
    '',
    '- `humanConfirmation.partialFixtureConfirmed` を true にするかどうか。',
    '- `checkedBy` と `checkedAt`。',
    '- 除外区間を unresolved として外す判断を受け入れるか。',
    '- 各素材ブロックを部分fixture草案として採用するか。',
    '- 正解区間から逆算した固定テーマ。',
    '',
    'このテンプレートはまだ未記入なので、readyForFreeze は false のまま。'
  ];
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const [materialBlocks, target, confirmedPairs] = await Promise.all([
    readJson(options.materialBlocksPath),
    readJson(options.targetPath),
    readJson(options.confirmedPairsPath)
  ]);
  const packet = buildPacket({ options, materialBlocks, target, confirmedPairs });

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const baseName = `partial-fixture-review-${sanitizePathPart(packet.targetId)}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  const decisionPath = path.join(outputDir, `partial-fixture-human-decision-template-${sanitizePathPart(packet.draftExpectedFixtureId)}-${options.outputId}.json`);
  const decisionReportPath = path.join(reportDir, `partial-fixture-human-decision-template-${sanitizePathPart(packet.draftExpectedFixtureId)}-${options.outputId}.md`);

  const decisionTemplate = buildDecisionTemplate(packet);
  decisionTemplate.reviewPath = relativeWorkspacePath(resultPath);

  await writeFile(resultPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(packet, resultPath, decisionPath), 'utf8');
  await writeFile(decisionPath, `${JSON.stringify(decisionTemplate, null, 2)}\n`, 'utf8');
  await writeFile(decisionReportPath, buildDecisionReport(packet, decisionPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`decisionTemplate: ${decisionPath}`);
  console.log(`decisionReport: ${decisionReportPath}`);
  console.log(packet.freezeReadiness.reason);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

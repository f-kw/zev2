import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const clipId = 'r_ztjHaHmcg';
const sourceVideoId = '-DwSCDMCWDQ';
const outputId = '20260706-material-boundaries-v001';
const materialJumpThresholdMs = 10000;
const dpResultRelativePath = 'evals/clip_composition/outputs/global-dp-word-alignment-r_ztjHaHmcg-20260706-offset-jump-v001.json';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const dpResultPath = path.join(root, dpResultRelativePath);
const confirmedPairPath = path.join(evalRoot, 'confirmed_pairs', `${clipId}.json`);
const clipMedia = path.join(evalRoot, 'research', 'downloads', clipId, `${clipId}.mp4`);
const sourceMedia = path.join(evalRoot, 'research', 'downloads', clipId, 'sources', sourceVideoId, `${sourceVideoId}.mp4`);
const outputJsonPath = path.join(evalRoot, 'outputs', `material-blocks-${clipId}-20260706-v001.json`);
const reportPath = path.join(evalRoot, 'reports', `material-blocks-${clipId}-20260706-v001.md`);
const packageDir = path.join(evalRoot, 'outputs', 'boundary-check', clipId, outputId);
const stillDir = path.join(packageDir, 'stills');
const audioDir = path.join(packageDir, 'audio');
const videoDir = path.join(packageDir, 'videos');
const indexPath = path.join(packageDir, 'index.html');

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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function seconds(ms) {
  return (Math.max(0, ms) / 1000).toFixed(3);
}

function msText(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${String(secondsPart).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function signedMs(ms) {
  return `${ms >= 0 ? '+' : ''}${ms}ms`;
}

function relativeFromReport(filePath) {
  return path.relative(path.dirname(reportPath), filePath);
}

function relativeFromPackage(filePath) {
  return path.relative(packageDir, filePath);
}

function runProcess(command, args) {
  const stdout = [];
  const stderr = [];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout));
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
  });
}

function sourceJumpBetweenRuns(previousRun, currentRun) {
  const clipGapMs = currentRun.clipStartMs - previousRun.clipEndMs;
  const sourceGapMs = currentRun.sourceStartMs - previousRun.sourceEndMs;
  return {
    clipGapMs,
    sourceGapMs,
    materialJumpMs: sourceGapMs - clipGapMs
  };
}

function blockFromRuns(index, runs) {
  const first = runs[0];
  const last = runs.at(-1);
  let sourceExtraInsideMs = 0;
  let clipExtraInsideMs = 0;
  const internalTransitions = [];
  for (let runIndex = 1; runIndex < runs.length; runIndex += 1) {
    const previousRun = runs[runIndex - 1];
    const currentRun = runs[runIndex];
    const gap = sourceJumpBetweenRuns(previousRun, currentRun);
    if (gap.materialJumpMs > 0) {
      sourceExtraInsideMs += gap.materialJumpMs;
    } else if (gap.materialJumpMs < 0) {
      clipExtraInsideMs += Math.abs(gap.materialJumpMs);
    }
    internalTransitions.push({
      fromRun: previousRun.index + 1,
      toRun: currentRun.index + 1,
      ...gap
    });
  }
  return {
    blockIndex: index,
    runIndexes: runs.map((run) => run.index + 1),
    clipStartMs: first.clipStartMs,
    clipEndMs: last.clipEndMs,
    sourceStartMs: first.sourceStartMs,
    sourceEndMs: last.sourceEndMs,
    matchedWordPairCount: runs.reduce((sum, run) => sum + run.matchedWordPairCount, 0),
    clipDurationMs: last.clipEndMs - first.clipStartMs,
    sourceDurationMs: last.sourceEndMs - first.sourceStartMs,
    sourceMinusClipDurationMs: (last.sourceEndMs - first.sourceStartMs) - (last.clipEndMs - first.clipStartMs),
    internalGapMs: {
      sourceExtraInsideMs,
      clipExtraInsideMs,
      note: '同一素材ブロック内でsource側の進みがclip側より大きい分は、切り抜き内部の詰め候補として扱う。境界にはしない。'
    },
    internalTransitions
  };
}

function reconstructBlocks(candidateRuns, offsetJumpCandidates) {
  const blocks = [];
  const boundaries = [];
  let currentRuns = [candidateRuns[0]];
  for (let index = 1; index < candidateRuns.length; index += 1) {
    const previousRun = candidateRuns[index - 1];
    const currentRun = candidateRuns[index];
    const gap = sourceJumpBetweenRuns(previousRun, currentRun);
    if (Math.abs(gap.materialJumpMs) >= materialJumpThresholdMs) {
      const beforeBlock = blockFromRuns(blocks.length + 1, currentRuns);
      blocks.push(beforeBlock);
      const supportingOffsetJumps = offsetJumpCandidates
        .filter((candidate) => (
          candidate.pairIndex > previousRun.lastPairIndex &&
          candidate.pairIndex <= currentRun.firstPairIndex
        ))
        .map((candidate) => ({
          pairIndex: candidate.pairIndex,
          clipMs: candidate.clipMs,
          sourceMs: candidate.sourceMs,
          offsetJumpMs: candidate.offsetJumpMs,
          clipText: candidate.clipText,
          sourceText: candidate.sourceText
        }));
      boundaries.push({
        boundaryIndex: boundaries.length + 1,
        beforeBlockIndex: beforeBlock.blockIndex,
        afterBlockIndex: beforeBlock.blockIndex + 1,
        beforeRun: previousRun.index + 1,
        afterRun: currentRun.index + 1,
        clipBeforeEndMs: previousRun.clipEndMs,
        clipAfterStartMs: currentRun.clipStartMs,
        sourceBeforeEndMs: previousRun.sourceEndMs,
        sourceAfterStartMs: currentRun.sourceStartMs,
        ...gap,
        supportingOffsetJumps
      });
      currentRuns = [currentRun];
      continue;
    }
    currentRuns.push(currentRun);
  }
  blocks.push(blockFromRuns(blocks.length + 1, currentRuns));
  return { blocks, boundaries };
}

function confirmedRelation(blocks, confirmedPair) {
  const pair = confirmedPair.activePair;
  const toleranceMs = pair.toleranceMs ?? 500;
  const containing = blocks.find((block) => (
    block.sourceStartMs <= pair.sourceStartMs + toleranceMs &&
    block.sourceEndMs >= pair.sourceEndMs - toleranceMs
  ));
  if (!containing) {
    return {
      status: 'not_contained',
      message: '確定済み最終ブロックを包含する素材ブロックは見つからなかった。'
    };
  }
  return {
    status: 'contained',
    blockIndex: containing.blockIndex,
    sourceStartDeltaMs: containing.sourceStartMs - pair.sourceStartMs,
    sourceEndDeltaMs: containing.sourceEndMs - pair.sourceEndMs,
    clipStartDeltaMs: containing.clipStartMs - pair.clipStartMs,
    clipEndDeltaMs: containing.clipEndMs - pair.clipEndMs,
    message: '確定ペアは素材対応ブロックの内側に含まれる。素材としては手前から連続し、確定ペアは人間確認済みの使用範囲として残るため矛盾ではない。'
  };
}

async function extractStill(mediaPath, pointMs, outPath) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(pointMs),
    '-i',
    mediaPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    outPath
  ]);
}

async function extractAudio(mediaPath, centerMs, outPath) {
  const startMs = Math.max(0, centerMs - 2000);
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(startMs),
    '-t',
    '4.000',
    '-i',
    mediaPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ac',
    '1',
    '-ar',
    '16000',
    outPath
  ]);
}

async function buildTransitionVideo(input) {
  const beforeStartMs = Math.max(0, input.beforeCenterMs - 2000);
  const afterStartMs = Math.max(0, input.afterCenterMs);
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(beforeStartMs),
    '-t',
    '2.000',
    '-i',
    input.beforeMediaPath,
    '-ss',
    seconds(afterStartMs),
    '-t',
    '2.000',
    '-i',
    input.afterMediaPath,
    '-filter_complex',
    [
      '[0:v]scale=640:360,setpts=PTS-STARTPTS[leftv]',
      '[1:v]scale=640:360,setpts=PTS-STARTPTS[rightv]',
      '[leftv][rightv]hstack=inputs=2[v]',
      '[0:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[lefta]',
      '[1:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[righta]',
      '[lefta][righta]amerge=inputs=2[a]'
    ].join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-ac',
    '2',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-shortest',
    input.outPath
  ]);
}

async function buildMatchVideo(input) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(input.clipStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    clipMedia,
    '-ss',
    seconds(input.sourceStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    sourceMedia,
    '-filter_complex',
    [
      '[0:v]scale=640:360,setpts=PTS-STARTPTS[leftv]',
      '[1:v]scale=640:360,setpts=PTS-STARTPTS[rightv]',
      '[leftv][rightv]hstack=inputs=2[v]',
      '[0:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[lefta]',
      '[1:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[righta]',
      '[lefta][righta]amerge=inputs=2[a]'
    ].join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-ac',
    '2',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-shortest',
    input.outPath
  ]);
}

async function buildSingleClipVideo(input) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(input.startMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    clipMedia,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    input.outPath
  ]);
}

async function buildSourceSequenceVideo(input) {
  await runProcess('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    seconds(input.beforeStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    sourceMedia,
    '-ss',
    seconds(input.afterStartMs),
    '-t',
    seconds(input.durationMs),
    '-i',
    sourceMedia,
    '-filter_complex',
    [
      '[0:v]scale=640:360,setpts=PTS-STARTPTS[v0]',
      '[1:v]scale=640:360,setpts=PTS-STARTPTS[v1]',
      '[0:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[a0]',
      '[1:a]aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[a1]',
      '[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]'
    ].join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    input.outPath
  ]);
}

async function buildBoundaryAssets(boundary) {
  const boundaryDir = path.join(stillDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}`);
  await mkdir(boundaryDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(videoDir, { recursive: true });
  const strips = [
    {
      id: 'clip_before',
      label: 'clip前素材終端',
      mediaPath: clipMedia,
      centerMs: boundary.clipBeforeEndMs
    },
    {
      id: 'clip_after',
      label: 'clip後素材開始',
      mediaPath: clipMedia,
      centerMs: boundary.clipAfterStartMs
    },
    {
      id: 'source_before',
      label: 'source前素材終端',
      mediaPath: sourceMedia,
      centerMs: boundary.sourceBeforeEndMs
    },
    {
      id: 'source_after',
      label: 'source後素材開始',
      mediaPath: sourceMedia,
      centerMs: boundary.sourceAfterStartMs
    }
  ];
  const offsets = [-1000, -500, 0, 500, 1000];
  const builtStrips = [];
  for (const strip of strips) {
    const stripDir = path.join(boundaryDir, strip.id);
    await mkdir(stripDir, { recursive: true });
    const stills = [];
    for (const offsetMs of offsets) {
      const timeMs = Math.max(0, strip.centerMs + offsetMs);
      const offsetLabel = offsetMs === 0 ? 'exact' : `${offsetMs > 0 ? 'plus' : 'minus'}${Math.abs(offsetMs)}ms`;
      const stillPath = path.join(stripDir, `${strip.id}_${offsetLabel}.jpg`);
      await extractStill(strip.mediaPath, timeMs, stillPath);
      stills.push({ offsetMs, offsetLabel, timeMs, path: stillPath });
    }
    const audioPath = path.join(audioDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_${strip.id}_pm2s.wav`);
    await extractAudio(strip.mediaPath, strip.centerMs, audioPath);
    builtStrips.push({ ...strip, stills, audioPath });
  }
  const clipTransitionVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_clip_transition.mp4`);
  const sourceTransitionVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_source_transition.mp4`);
  const beforeMatchVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_before_match.mp4`);
  const afterMatchVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_after_match.mp4`);
  const clipContextVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_clip_context.mp4`);
  const sourceSequenceVideoPath = path.join(videoDir, `boundary_${String(boundary.boundaryIndex).padStart(2, '0')}_source_sequence.mp4`);
  await buildTransitionVideo({
    beforeMediaPath: clipMedia,
    afterMediaPath: clipMedia,
    beforeCenterMs: boundary.clipBeforeEndMs,
    afterCenterMs: boundary.clipAfterStartMs,
    outPath: clipTransitionVideoPath
  });
  await buildTransitionVideo({
    beforeMediaPath: sourceMedia,
    afterMediaPath: sourceMedia,
    beforeCenterMs: boundary.sourceBeforeEndMs,
    afterCenterMs: boundary.sourceAfterStartMs,
    outPath: sourceTransitionVideoPath
  });
  const matchDurationMs = 2000;
  const beforeClipStartMs = Math.max(0, boundary.clipBeforeEndMs - matchDurationMs);
  const beforeSourceStartMs = Math.max(0, boundary.sourceBeforeEndMs - matchDurationMs);
  const afterClipStartMs = boundary.clipAfterStartMs;
  const afterSourceStartMs = boundary.sourceAfterStartMs;
  const clipContextStartMs = Math.max(0, boundary.clipBeforeEndMs - 2000);
  const clipContextDurationMs = Math.max(1000, boundary.clipAfterStartMs - boundary.clipBeforeEndMs + 4000);
  const sourceSequenceBeforeStartMs = Math.max(0, boundary.sourceBeforeEndMs - matchDurationMs);
  const sourceSequenceAfterStartMs = boundary.sourceAfterStartMs;
  await buildMatchVideo({
    clipStartMs: beforeClipStartMs,
    sourceStartMs: beforeSourceStartMs,
    durationMs: matchDurationMs,
    outPath: beforeMatchVideoPath
  });
  await buildMatchVideo({
    clipStartMs: afterClipStartMs,
    sourceStartMs: afterSourceStartMs,
    durationMs: matchDurationMs,
    outPath: afterMatchVideoPath
  });
  await buildSingleClipVideo({
    startMs: clipContextStartMs,
    durationMs: clipContextDurationMs,
    outPath: clipContextVideoPath
  });
  await buildSourceSequenceVideo({
    beforeStartMs: sourceSequenceBeforeStartMs,
    afterStartMs: sourceSequenceAfterStartMs,
    durationMs: matchDurationMs,
    outPath: sourceSequenceVideoPath
  });
  return {
    ...boundary,
    strips: builtStrips,
    videos: {
      beforeMatch: {
        path: beforeMatchVideoPath,
        clipStartMs: beforeClipStartMs,
        sourceStartMs: beforeSourceStartMs,
        durationMs: matchDurationMs
      },
      afterMatch: {
        path: afterMatchVideoPath,
        clipStartMs: afterClipStartMs,
        sourceStartMs: afterSourceStartMs,
        durationMs: matchDurationMs
      },
      clipContext: {
        path: clipContextVideoPath,
        startMs: clipContextStartMs,
        durationMs: clipContextDurationMs
      },
      sourceSequence: {
        path: sourceSequenceVideoPath,
        beforeStartMs: sourceSequenceBeforeStartMs,
        afterStartMs: sourceSequenceAfterStartMs,
        durationMs: matchDurationMs
      },
      clipTransition: {
        path: clipTransitionVideoPath,
        beforeStartMs: Math.max(0, boundary.clipBeforeEndMs - 2000),
        afterStartMs: boundary.clipAfterStartMs
      },
      sourceTransition: {
        path: sourceTransitionVideoPath,
        beforeStartMs: Math.max(0, boundary.sourceBeforeEndMs - 2000),
        afterStartMs: boundary.sourceAfterStartMs
      }
    }
  };
}

function decisionsProposal() {
  return [
    '- expectedCutsの開始・終了境界は「素材対応の切り替わり点」、つまり元動画の別位置へ飛ぶ点として扱う。同一素材対応の内部で間・沈黙・フィラーを詰めた箇所はexpectedCuts境界にしない。',
    '- 同一素材ブロック内のジャンプカットや詰めは `internalGapMs` 系の注記として保持する。境界採点では「別素材への飛び」と「同一素材内の編集詰め」を分ける。',
    '- 人間確認済みの使用範囲が、より粗い素材対応ブロックの内側に入る場合は矛盾ではない。境界を書き換える前に、素材切り替わり点と編集上の使用開始・終了を分けて確認する。'
  ];
}

function reportMarkdown(result) {
  const blockRows = result.blocks.map((block) => (
    `| ${block.blockIndex} | ${block.runIndexes.join(', ')} | ${msText(block.clipStartMs)}-${msText(block.clipEndMs)} | ${msText(block.sourceStartMs)}-${msText(block.sourceEndMs)} | ${block.matchedWordPairCount} | ${signedMs(block.internalGapMs.sourceExtraInsideMs)} | ${signedMs(block.internalGapMs.clipExtraInsideMs)} | ${signedMs(block.sourceMinusClipDurationMs)} |`
  ));
  const boundaryRows = result.boundaries.map((boundary) => (
    `| ${boundary.boundaryIndex} | ${boundary.beforeBlockIndex}->${boundary.afterBlockIndex} | ${msText(boundary.clipBeforeEndMs)} -> ${msText(boundary.clipAfterStartMs)} | ${signedMs(boundary.clipGapMs)} | ${msText(boundary.sourceBeforeEndMs)} -> ${msText(boundary.sourceAfterStartMs)} | ${signedMs(boundary.sourceGapMs)} | ${signedMs(boundary.materialJumpMs)} | ${boundary.supportingOffsetJumps.length} |`
  ));
  const packageSections = result.boundaryAssets.map((boundary) => {
    const stripLines = boundary.strips.map((strip) => {
      const images = strip.stills.map((still) => `![${strip.id} ${still.offsetLabel}](${relativeFromReport(still.path)})`).join('\n');
      return [
        `#### ${strip.label} ${msText(strip.centerMs)}`,
        '',
        `- 音声: \`${relativeFromReport(strip.audioPath)}\``,
        '',
        images
      ].join('\n');
    });
    return [
      `### 境界${boundary.boundaryIndex}: block ${boundary.beforeBlockIndex} -> ${boundary.afterBlockIndex}`,
      '',
      `- clip: ${msText(boundary.clipBeforeEndMs)} -> ${msText(boundary.clipAfterStartMs)} (${signedMs(boundary.clipGapMs)})`,
      `- source: ${msText(boundary.sourceBeforeEndMs)} -> ${msText(boundary.sourceAfterStartMs)} (${signedMs(boundary.sourceGapMs)})`,
      `- 素材飛び量: ${signedMs(boundary.materialJumpMs)}`,
      `- clip連続再生: \`${relativeFromReport(boundary.videos.clipContext.path)}\``,
      `- source前後連続再生: \`${relativeFromReport(boundary.videos.sourceSequence.path)}\``,
      `- 前側対応確認: \`${relativeFromReport(boundary.videos.beforeMatch.path)}\``,
      `- 後側対応確認: \`${relativeFromReport(boundary.videos.afterMatch.path)}\``,
      '',
      ...stripLines
    ].join('\n');
  });
  return [
    '# 素材対応ブロック再構成',
    '',
    `- 対象: ${clipId}`,
    `- DP入力: \`${path.relative(evalRoot, dpResultPath)}\``,
    `- HTML確認パッケージ: \`${path.relative(evalRoot, indexPath)}\``,
    `- 素材境界の判定: source側の進みとclip側の進みの差が ${materialJumpThresholdMs}ms 以上の点`,
    '- fixture/expected作成: なし',
    '- confirmedペア変更: なし',
    '- 本体側変更: なし',
    '',
    '## DECISIONS.md 追記案',
    '',
    ...decisionsProposal(),
    '',
    '## ブロック表',
    '',
    '| block | 対応run | clip範囲 | source範囲 | 対応語 | source側内部詰め候補 | clip側内部余り候補 | source範囲長 - clip範囲長 |',
    '| ---: | --- | --- | --- | ---: | ---: | ---: | ---: |',
    ...blockRows,
    '',
    '## 素材境界表',
    '',
    '| 境界 | block | clip前後 | clip間隔 | source前後 | source間隔 | 素材飛び量 | offset跳び根拠 |',
    '| ---: | --- | --- | ---: | --- | ---: | ---: | ---: |',
    ...boundaryRows,
    '',
    '## 確定済み最終ブロックとの関係',
    '',
    `- 確定ペア: clip ${msText(result.confirmedPair.activePair.clipStartMs)}-${msText(result.confirmedPair.activePair.clipEndMs)} / source ${msText(result.confirmedPair.activePair.sourceStartMs)}-${msText(result.confirmedPair.activePair.sourceEndMs)}`,
    `- 判定: ${result.confirmedRelation.status}`,
    `- 関係: ${result.confirmedRelation.message}`,
    result.confirmedRelation.blockIndex
      ? `- 対応ブロック: block ${result.confirmedRelation.blockIndex}`
      : '- 対応ブロック: none',
    result.confirmedRelation.blockIndex
      ? `- ブロック境界との差: clip開始 ${signedMs(result.confirmedRelation.clipStartDeltaMs)}, clip終了 ${signedMs(result.confirmedRelation.clipEndDeltaMs)}, source開始 ${signedMs(result.confirmedRelation.sourceStartDeltaMs)}, source終了 ${signedMs(result.confirmedRelation.sourceEndDeltaMs)}`
      : '- ブロック境界との差: n/a',
    '',
    '## 確認パッケージの見方',
    '',
    '- `clip連続再生`: 切り抜き単体。境界前から境界後まで実際の順番で見る。ここで切り替わりが起きているか、未対応部分が挟まるかを見る。',
    '- `source前後連続再生`: 元動画の前側対応2秒、後側対応2秒を順番につないだ確認動画。これは人工連結で、元動画の実連続ではない。前側と後側が別位置に見えるかを見る。',
    '- `前側対応確認` / `後側対応確認`: 左が切り抜き、右が元動画。前後それぞれの対応が正しそうかを補助確認する。',
    '- 静止画は補助。切り替わり判定は連続再生動画で判断する。',
    '- 見ないこと: 同一素材内の細かい詰め、口元の完全同期、expectedCutsの最終開始・終了秒の確定。',
    '- 同一素材内の詰めや細かいジャンプカットは、ここでは境界にしない。',
    '',
    '## 境界別素材',
    '',
    ...packageSections
  ].join('\n') + '\n';
}

function htmlIndex(result) {
  const cards = result.boundaryAssets.map((boundary) => {
    const strips = boundary.strips.map((strip) => {
      const figures = strip.stills.map((still) => `<figure><img src="${relativeFromPackage(still.path)}" alt="${strip.id} ${still.offsetLabel}"><figcaption>${strip.label}<br>${still.offsetLabel}<br>${msText(still.timeMs)}</figcaption></figure>`).join('\n');
      return `<section class="strip">
  <h3>${strip.label} ${msText(strip.centerMs)}</h3>
  <audio controls src="${relativeFromPackage(strip.audioPath)}"></audio>
  <div class="frames">${figures}</div>
</section>`;
    }).join('\n');
    return `<article>
  <h2>境界${boundary.boundaryIndex}: block ${boundary.beforeBlockIndex} -> ${boundary.afterBlockIndex}</h2>
  <table>
    <tr><th>clip</th><td>${msText(boundary.clipBeforeEndMs)} -> ${msText(boundary.clipAfterStartMs)}</td><td>${signedMs(boundary.clipGapMs)}</td></tr>
    <tr><th>source</th><td>${msText(boundary.sourceBeforeEndMs)} -> ${msText(boundary.sourceAfterStartMs)}</td><td>${signedMs(boundary.sourceGapMs)}</td></tr>
    <tr><th>素材飛び量</th><td colspan="2">${signedMs(boundary.materialJumpMs)}</td></tr>
  </table>
  <section class="watch">
    <h3>最初に見る動画</h3>
    <div class="videos primary-videos">
      <figure>
        <video controls src="${relativeFromPackage(boundary.videos.clipContext.path)}"></video>
        <figcaption>clip連続再生。切り抜き単体で、境界前から境界後まで実際の順番で見る。</figcaption>
      </figure>
      <figure>
        <video controls src="${relativeFromPackage(boundary.videos.sourceSequence.path)}"></video>
        <figcaption>source前後連続再生。元動画の前側対応2秒、後側対応2秒を順番につないだ人工連結。別位置に飛んでいるかを見る。</figcaption>
      </figure>
    </div>
    <h3>対応確認の補助</h3>
    <div class="videos support-videos">
      <figure>
        <video controls src="${relativeFromPackage(boundary.videos.beforeMatch.path)}"></video>
        <figcaption>前側対応確認。左が切り抜き、右が元動画。境界前の対応が合っているかを見る。</figcaption>
      </figure>
      <figure>
        <video controls src="${relativeFromPackage(boundary.videos.afterMatch.path)}"></video>
        <figcaption>後側対応確認。左が切り抜き、右が元動画。境界後の対応が合っているかを見る。</figcaption>
      </figure>
    </div>
  </section>
  ${strips}
</article>`;
  }).join('\n');
  const blockRows = result.blocks.map((block) => `<tr><td>${block.blockIndex}</td><td>${block.runIndexes.join(', ')}</td><td>${msText(block.clipStartMs)}-${msText(block.clipEndMs)}</td><td>${msText(block.sourceStartMs)}-${msText(block.sourceEndMs)}</td><td>${block.matchedWordPairCount}</td><td>${signedMs(block.internalGapMs.sourceExtraInsideMs)}</td></tr>`).join('\n');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>Material boundary check ${clipId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #111827; }
    table { border-collapse: collapse; margin: 12px 0 20px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 9px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    article { border-top: 1px solid #cbd5e1; padding-top: 20px; margin-top: 24px; }
    .strip { margin: 18px 0; }
    audio { display: block; width: 520px; max-width: 100%; margin: 6px 0 10px; }
    video { display: block; width: 100%; background: #0f172a; }
    .instructions { max-width: 980px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px 16px; margin: 12px 0 18px; }
    .instructions h2 { margin-top: 0; }
    .instructions li { margin: 6px 0; }
    .videos { display: grid; gap: 16px; align-items: start; }
    .primary-videos { grid-template-columns: repeat(2, minmax(280px, 1fr)); margin-bottom: 18px; }
    .support-videos { grid-template-columns: repeat(2, minmax(260px, 1fr)); }
    .videos figure { margin: 0; }
    .videos figcaption { font-size: 13px; line-height: 1.45; color: #374151; margin-top: 6px; }
    .frames { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)); gap: 10px; align-items: start; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #d1d5db; background: #f9fafb; }
    figcaption { font-size: 12px; color: #4b5563; line-height: 1.35; margin-top: 3px; }
    @media (max-width: 900px) {
      .primary-videos, .support-videos { grid-template-columns: 1fr; }
      .frames { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
    }
  </style>
</head>
<body>
  <h1>素材境界確認 ${clipId}</h1>
  <section class="instructions">
    <h2>何を見るか</h2>
    <ol>
      <li><strong>clip連続再生</strong>を見る。切り抜き単体で、境界前から境界後まで実際の順番で見る。ここで切り替わりが起きているかを見る。</li>
      <li><strong>source前後連続再生</strong>を見る。元動画の前側対応2秒、後側対応2秒を順番につないだ人工連結。前後が別位置に見えるかを見る。</li>
      <li><strong>前側対応確認</strong>と<strong>後側対応確認</strong>は補助。左が切り抜き、右が元動画。対応が合っていそうかを見る。</li>
      <li>静止画は補助。切り替わり判定は連続再生動画で判断する。</li>
      <li>見ないこと: 同一素材内の細かい詰め、口元の完全同期、expectedCutsの最終開始・終了秒の確定。</li>
    </ol>
  </section>
  <h2>ブロック表</h2>
  <table>
    <thead><tr><th>block</th><th>run</th><th>clip</th><th>source</th><th>対応語</th><th>内部詰め候補</th></tr></thead>
    <tbody>${blockRows}</tbody>
  </table>
  ${cards}
</body>
</html>
`;
}

async function main() {
  const dpResult = await readJson(dpResultPath);
  const confirmedPair = await readJson(confirmedPairPath);
  const candidateRuns = dpResult.alignment.candidateRuns ?? [];
  const offsetJumpCandidates = dpResult.alignment.boundaryCandidates?.offsetJumpCandidates ?? [];
  if (candidateRuns.length === 0) {
    throw new Error('DP候補直線分が空のため素材ブロックを再構成できません');
  }
  const { blocks, boundaries } = reconstructBlocks(candidateRuns, offsetJumpCandidates);
  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await mkdir(packageDir, { recursive: true });
  await mkdir(stillDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });

  const boundaryAssets = [];
  for (const boundary of boundaries) {
    boundaryAssets.push(await buildBoundaryAssets(boundary));
  }
  const result = {
    kind: 'clip_composition_material_blocks',
    runAt: new Date().toISOString(),
    clipId,
    sourceVideoId,
    input: {
      dpResultPath: dpResultRelativePath,
      candidateRunCount: candidateRuns.length,
      allLinearRunCount: dpResult.alignment.allRuns?.length ?? 0,
      offsetJumpCandidateCount: offsetJumpCandidates.length
    },
    definition: {
      expectedCutsBoundary: '素材対応の切り替わり点。元動画の別位置へ飛ぶ点だけを境界とし、同一素材内の詰めはinternalGapMs系の注記にする。',
      materialJumpThresholdMs,
      thresholdSource: 'ユーザー指定の「10秒以上」を使用'
    },
    confirmedPair,
    blocks,
    boundaries,
    confirmedRelation: confirmedRelation(blocks, confirmedPair),
    decisionsProposal: decisionsProposal(),
    outputs: {
      report: path.relative(root, reportPath),
      htmlPackage: path.relative(root, indexPath)
    },
    productionImpact: {
      fixtureCreated: false,
      expectedCreated: false,
      confirmedPairChanged: false,
      runtimeWrites: false,
      productionCodeChanged: false
    }
  };
  result.boundaryAssets = boundaryAssets.map((boundary) => ({
    boundaryIndex: boundary.boundaryIndex,
    beforeBlockIndex: boundary.beforeBlockIndex,
    afterBlockIndex: boundary.afterBlockIndex,
    videos: {
      beforeMatch: {
        path: path.relative(root, boundary.videos.beforeMatch.path),
        clipStartMs: boundary.videos.beforeMatch.clipStartMs,
        sourceStartMs: boundary.videos.beforeMatch.sourceStartMs,
        durationMs: boundary.videos.beforeMatch.durationMs
      },
      afterMatch: {
        path: path.relative(root, boundary.videos.afterMatch.path),
        clipStartMs: boundary.videos.afterMatch.clipStartMs,
        sourceStartMs: boundary.videos.afterMatch.sourceStartMs,
        durationMs: boundary.videos.afterMatch.durationMs
      },
      clipContext: {
        path: path.relative(root, boundary.videos.clipContext.path),
        startMs: boundary.videos.clipContext.startMs,
        durationMs: boundary.videos.clipContext.durationMs
      },
      sourceSequence: {
        path: path.relative(root, boundary.videos.sourceSequence.path),
        beforeStartMs: boundary.videos.sourceSequence.beforeStartMs,
        afterStartMs: boundary.videos.sourceSequence.afterStartMs,
        durationMs: boundary.videos.sourceSequence.durationMs
      }
    },
    strips: boundary.strips.map((strip) => ({
      id: strip.id,
      label: strip.label,
      centerMs: strip.centerMs,
      audioPath: path.relative(root, strip.audioPath),
      stills: strip.stills.map((still) => ({
        offsetMs: still.offsetMs,
        timeMs: still.timeMs,
        path: path.relative(root, still.path)
      }))
    }))
  }));

  await writeFile(outputJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown({ ...result, boundaryAssets }), 'utf8');
  await writeFile(indexPath, htmlIndex({ ...result, boundaryAssets }), 'utf8');

  console.log(`blocks: ${blocks.length}`);
  console.log(`boundaries: ${boundaries.length}`);
  console.log(`result: ${outputJsonPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`index: ${indexPath}`);
  console.log(`confirmed relation: ${result.confirmedRelation.status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

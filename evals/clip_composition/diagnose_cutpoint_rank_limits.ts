import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  targetPath: string;
  clipId: string;
  sourceId: string;
  outputId: string;
  currentMaxAudioCutpoints: number;
  currentMaxVideoCutpoints: number;
  minSegmentMs: number;
  confirmedCutMs: number;
  candidateWindowMs: number;
  targetAudioRank?: number;
  targetVideoRank?: number;
  ffmpegCommand: string;
};

type SttTarget = {
  clip?: {
    localVideoPath?: string;
  };
  sourceCandidates?: Array<{
    id?: string;
    sttId?: string;
    localVideoPath?: string;
  }>;
};

type RankedCutpoint = {
  timeMs: number;
  kind: 'audio_discontinuity' | 'video_scene_change';
  rank: number;
  value: number;
};

type WordTimestampFile = {
  words?: Array<{
    startMs?: number;
    endMs?: number;
  }>;
};

type SettingEvaluation = {
  label: string;
  maxAudioCutpoints: number;
  maxVideoCutpoints: number;
  selectedCutpointCount: number;
  segmentCount: number;
  extraSelectedCutpointCount: number;
  targetCandidateSelected: boolean;
  selectedTargetCandidate?: RankedCutpoint;
  blockingCutpointsForTarget: RankedCutpoint[];
  extraSelectedCutpoints: RankedCutpoint[];
};

const sampleRate = 16000;
const audioFrameMs = 20;
const audioHopMs = 10;
const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
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

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
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

  const targetPath = values.get('target')?.trim();
  const clipId = values.get('clipId')?.trim();
  const sourceId = values.get('sourceId')?.trim();
  if (!targetPath) {
    throw new Error('--target を指定してください');
  }
  if (!clipId) {
    throw new Error('--clipId を指定してください');
  }
  if (!sourceId) {
    throw new Error('--sourceId を指定してください');
  }

  return {
    targetPath: resolveWorkspacePath(targetPath),
    clipId: sanitizePathPart(clipId),
    sourceId: sanitizePathPart(sourceId),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    currentMaxAudioCutpoints: positiveInteger(values.get('currentMaxAudioCutpoints'), 12, '--currentMaxAudioCutpoints'),
    currentMaxVideoCutpoints: positiveInteger(values.get('currentMaxVideoCutpoints'), 8, '--currentMaxVideoCutpoints'),
    minSegmentMs: positiveInteger(values.get('minSegmentMs'), 1500, '--minSegmentMs'),
    confirmedCutMs: positiveInteger(values.get('confirmedCutMs'), 92555, '--confirmedCutMs'),
    candidateWindowMs: positiveInteger(values.get('candidateWindowMs'), 3000, '--candidateWindowMs'),
    targetAudioRank: optionalPositiveInteger(values.get('targetAudioRank'), '--targetAudioRank'),
    targetVideoRank: optionalPositiveInteger(values.get('targetVideoRank'), '--targetVideoRank'),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg'
  };
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function positiveInteger(value: string | undefined, fallback: number, label: string): number {
  if (!value?.trim()) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} は1以上の整数で指定してください`);
  }
  return parsed;
}

function optionalPositiveInteger(value: string | undefined, label: string): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} は1以上の整数で指定してください`);
  }
  return parsed;
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function targetVideoPath(target: SttTarget, sourceId: string): string {
  const clipVideoPath = target.clip?.localVideoPath;
  const source = target.sourceCandidates?.find((item) => (
    item.sttId === sourceId ||
    item.id === sourceId ||
    (item.sttId && sourceId.startsWith(`${item.sttId}_`))
  ));
  if (!clipVideoPath) {
    throw new Error('targetに切り抜き動画パスがありません');
  }
  if (!source?.localVideoPath) {
    throw new Error(`targetに元動画パスがありません: ${sourceId}`);
  }
  return resolveWorkspacePath(clipVideoPath);
}

async function clipSpeechBounds(clipId: string): Promise<{ firstStartMs: number; lastEndMs: number }> {
  const filePath = path.join(evalRoot, 'stt', clipId, 'clip', 'word-timestamps.json');
  const payload = await readJson<WordTimestampFile>(filePath);
  const words = (payload.words ?? [])
    .filter((word) => typeof word.startMs === 'number' && typeof word.endMs === 'number')
    .sort((left, right) => left.startMs! - right.startMs!);
  const first = words[0];
  const last = words.at(-1);
  if (!first || !last || typeof first.startMs !== 'number' || typeof last.endMs !== 'number') {
    throw new Error(`切り抜き側STTの単語時刻がありません: ${filePath}`);
  }
  return {
    firstStartMs: first.startMs,
    lastEndMs: last.endMs
  };
}

async function spawnCapture(command: string, args: string[], input?: Buffer): Promise<Buffer> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${Buffer.concat(stderr).toString('utf8')}`));
    });
    if (input) {
      child.stdin.end(input);
    }
  });
  return Buffer.concat(stdout.length > 0 ? stdout : stderr);
}

async function readAudio(ffmpegCommand: string, inputPath: string): Promise<Float32Array> {
  const buffer = await spawnCapture(ffmpegCommand, [
    '-v',
    'error',
    '-i',
    inputPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(sampleRate),
    '-f',
    'f32le',
    'pipe:1'
  ]);
  const samples = new Float32Array(buffer.byteLength / 4);
  for (let offset = 0; offset < samples.length; offset += 1) {
    samples[offset] = buffer.readFloatLE(offset * 4);
  }
  return samples;
}

function rmsEnvelope(samples: Float32Array): Float32Array {
  const frameSamples = Math.max(1, Math.round(sampleRate * audioFrameMs / 1000));
  const hopSamples = Math.max(1, Math.round(sampleRate * audioHopMs / 1000));
  if (samples.length < frameSamples) {
    return new Float32Array();
  }
  const frameCount = Math.floor((samples.length - frameSamples) / hopSamples) + 1;
  const result = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hopSamples;
    let energy = 0;
    for (let index = 0; index < frameSamples; index += 1) {
      const value = samples[start + index] ?? 0;
      energy += value * value;
    }
    result[frame] = Math.sqrt(energy / frameSamples);
  }
  return result;
}

function rankedAudioCutpoints(samples: Float32Array): RankedCutpoint[] {
  const envelope = rmsEnvelope(samples);
  const deltas: Array<{ timeMs: number; value: number }> = [];
  for (let index = 1; index < envelope.length; index += 1) {
    const value = Math.abs((envelope[index] ?? 0) - (envelope[index - 1] ?? 0));
    deltas.push({ timeMs: index * audioHopMs, value });
  }
  return localMaxima(deltas)
    .sort((left, right) => right.value - left.value || left.timeMs - right.timeMs)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'audio_discontinuity'
    }));
}

async function rankedVideoCutpoints(ffmpegCommand: string, inputPath: string): Promise<RankedCutpoint[]> {
  const output = await spawnCapture(ffmpegCommand, [
    '-hide_banner',
    '-v',
    'error',
    '-i',
    inputPath,
    '-vf',
    'scdet,metadata=print:file=-',
    '-an',
    '-f',
    'null',
    '-'
  ]);
  const rows: Array<{ timeMs: number; value: number }> = [];
  let currentTimeMs: number | undefined;
  for (const line of output.toString('utf8').split(/\r?\n/)) {
    const timeMatch = line.match(/pts_time:([0-9.]+)/);
    if (timeMatch) {
      currentTimeMs = Math.round(Number.parseFloat(timeMatch[1] ?? '0') * 1000);
      continue;
    }
    const scoreMatch = line.match(/lavfi\.scd\.score=([0-9.]+)/);
    if (scoreMatch && currentTimeMs !== undefined) {
      rows.push({ timeMs: currentTimeMs, value: Number.parseFloat(scoreMatch[1] ?? '0') });
    }
  }
  return localMaxima(rows)
    .sort((left, right) => right.value - left.value || left.timeMs - right.timeMs)
    .map((item, index) => ({
      timeMs: item.timeMs,
      value: roundMetric(item.value),
      rank: index + 1,
      kind: 'video_scene_change'
    }));
}

function localMaxima(rows: Array<{ timeMs: number; value: number }>): Array<{ timeMs: number; value: number }> {
  const result: Array<{ timeMs: number; value: number }> = [];
  for (let index = 1; index < rows.length - 1; index += 1) {
    const previous = rows[index - 1]?.value ?? 0;
    const current = rows[index]?.value ?? 0;
    const next = rows[index + 1]?.value ?? 0;
    if (current >= previous && current >= next && current > 0) {
      result.push(rows[index]!);
    }
  }
  return result;
}

function mergeCutpoints(input: {
  audioCutpoints: RankedCutpoint[];
  videoCutpoints: RankedCutpoint[];
  startMs: number;
  endMs: number;
  minSegmentMs: number;
}): RankedCutpoint[] {
  const result: RankedCutpoint[] = [];
  for (const item of [...input.audioCutpoints].sort((left, right) => left.rank - right.rank)) {
    addIfUseful(result, item, input);
  }
  for (const item of [...input.videoCutpoints].sort((left, right) => left.rank - right.rank)) {
    addIfUseful(result, item, input);
  }
  return result.sort((left, right) => left.timeMs - right.timeMs);
}

function addIfUseful(
  result: RankedCutpoint[],
  item: RankedCutpoint,
  bounds: { startMs: number; endMs: number; minSegmentMs: number }
): void {
  if (item.timeMs <= bounds.startMs + bounds.minSegmentMs || item.timeMs >= bounds.endMs - bounds.minSegmentMs) {
    return;
  }
  if (result.some((current) => Math.abs(current.timeMs - item.timeMs) < bounds.minSegmentMs)) {
    return;
  }
  result.push(item);
}

function evaluateSetting(input: {
  label: string;
  allAudio: RankedCutpoint[];
  allVideo: RankedCutpoint[];
  baselineSelected: RankedCutpoint[];
  maxAudioCutpoints: number;
  maxVideoCutpoints: number;
  targetAudio?: RankedCutpoint;
  targetVideo?: RankedCutpoint;
  startMs: number;
  endMs: number;
  minSegmentMs: number;
}): SettingEvaluation {
  const selected = mergeCutpoints({
    audioCutpoints: input.allAudio.slice(0, input.maxAudioCutpoints),
    videoCutpoints: input.allVideo.slice(0, input.maxVideoCutpoints),
    startMs: input.startMs,
    endMs: input.endMs,
    minSegmentMs: input.minSegmentMs
  });
  const selectedTargetCandidate = selected.find((item) =>
    (input.targetAudio && sameCutpoint(item, input.targetAudio)) ||
    (input.targetVideo && sameCutpoint(item, input.targetVideo))
  );
  const targetCandidates = [input.targetAudio, input.targetVideo].filter((item): item is RankedCutpoint => item !== undefined);
  const blockingCutpointsForTarget = selectedTargetCandidate
    ? []
    : selected.filter((item) => targetCandidates.some((target) => Math.abs(item.timeMs - target.timeMs) < input.minSegmentMs));
  const extraSelectedCutpoints = selected.filter((item) =>
    !input.baselineSelected.some((current) => sameCutpoint(current, item))
  );

  return {
    label: input.label,
    maxAudioCutpoints: input.maxAudioCutpoints,
    maxVideoCutpoints: input.maxVideoCutpoints,
    selectedCutpointCount: selected.length,
    segmentCount: selected.length + 1,
    extraSelectedCutpointCount: extraSelectedCutpoints.length,
    targetCandidateSelected: selectedTargetCandidate !== undefined,
    ...(selectedTargetCandidate ? { selectedTargetCandidate } : {}),
    blockingCutpointsForTarget,
    extraSelectedCutpoints
  };
}

function sameCutpoint(left: RankedCutpoint, right: RankedCutpoint): boolean {
  return left.kind === right.kind && left.timeMs === right.timeMs && left.rank === right.rank;
}

function nearest(candidates: RankedCutpoint[], targetMs: number): RankedCutpoint | undefined {
  return [...candidates].sort((left, right) =>
    Math.abs(left.timeMs - targetMs) - Math.abs(right.timeMs - targetMs) ||
    left.rank - right.rank
  )[0];
}

function bestRankedAround(candidates: RankedCutpoint[], targetMs: number, windowMs: number): RankedCutpoint | undefined {
  return candidates
    .filter((item) => Math.abs(item.timeMs - targetMs) <= windowMs)
    .sort((left, right) => left.rank - right.rank || Math.abs(left.timeMs - targetMs) - Math.abs(right.timeMs - targetMs))[0];
}

function candidateByRank(candidates: RankedCutpoint[], rank: number | undefined): RankedCutpoint | undefined {
  return rank === undefined ? undefined : candidates.find((item) => item.rank === rank);
}

function roundMetric(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function msText(ms: number | undefined): string {
  if (ms === undefined) {
    return 'unknown';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function rankText(candidate: RankedCutpoint | undefined, targetMs: number): string {
  if (!candidate) {
    return 'none';
  }
  const delta = candidate.timeMs - targetMs;
  return `${candidate.kind} ${msText(candidate.timeMs)} rank ${candidate.rank} delta ${delta >= 0 ? '+' : ''}${delta}ms`;
}

function reportMarkdown(input: {
  resultPath: string;
  targetMs: number;
  candidateWindowMs: number;
  current: SettingEvaluation;
  nearestAudioCandidate?: RankedCutpoint;
  nearestVideoCandidate?: RankedCutpoint;
  rankedAudioCandidate?: RankedCutpoint;
  rankedVideoCandidate?: RankedCutpoint;
  targetAudioCandidate?: RankedCutpoint;
  targetVideoCandidate?: RankedCutpoint;
  evaluations: SettingEvaluation[];
}): string {
  const successfulEvaluations = input.evaluations
    .filter((item) => item.label !== 'current' && item.targetCandidateSelected)
    .sort((left, right) =>
      left.extraSelectedCutpointCount - right.extraSelectedCutpointCount ||
      left.selectedCutpointCount - right.selectedCutpointCount
    );
  const smallestSuccessful = successfulEvaluations[0];
  const lines = [
    '# カット点rank上限診断',
    '',
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 確認済みカット点: ${msText(input.targetMs)}`,
    `- 近傍候補の探索幅: ±${input.candidateWindowMs}ms`,
    '- fixture凍結: no',
    '- readyForFreeze: false',
    '',
    '## raw候補',
    '',
    `- 最近傍の音声不連続候補: ${rankText(input.nearestAudioCandidate, input.targetMs)}`,
    `- 最近傍の映像シーンチェンジ候補: ${rankText(input.nearestVideoCandidate, input.targetMs)}`,
    `- 近傍内でrankが最も良い音声候補: ${rankText(input.rankedAudioCandidate, input.targetMs)}`,
    `- 近傍内でrankが最も良い映像候補: ${rankText(input.rankedVideoCandidate, input.targetMs)}`,
    `- 検算対象の音声候補: ${rankText(input.targetAudioCandidate, input.targetMs)}`,
    `- 検算対象の映像候補: ${rankText(input.targetVideoCandidate, input.targetMs)}`,
    '',
    '## 設定別の採用結果',
    '',
    '| 設定 | 音声rank上限 | 映像rank上限 | 対象カット採用 | カット数 | セグメント数 | 追加カット数 |',
    '| --- | ---: | ---: | --- | ---: | ---: | ---: |'
  ];
  for (const item of input.evaluations) {
    lines.push(`| ${item.label} | ${item.maxAudioCutpoints} | ${item.maxVideoCutpoints} | ${item.targetCandidateSelected ? 'yes' : 'no'} | ${item.selectedCutpointCount} | ${item.segmentCount} | ${item.extraSelectedCutpointCount} |`);
  }

  lines.push(
    '',
    '## 最小設定の見立て',
    '',
    '- 現行設定では確認済みカット点は採用されない。',
    smallestSuccessful
      ? `- 検算対象の候補が採用された設定のうち、追加カット数が最小だったのは ${smallestSuccessful.label} (音声${smallestSuccessful.maxAudioCutpoints} / 映像${smallestSuccessful.maxVideoCutpoints})。追加カットは${smallestSuccessful.extraSelectedCutpointCount}件、セグメント数は${smallestSuccessful.segmentCount}。`
      : '- 検算対象の候補が採用された設定は、この診断範囲では見つからなかった。',
    '- 音声rank上限だけで拾う場合は、検算対象の音声候補rankまで広げた設定を確認する。',
    '- 映像rank上限だけで拾う場合は、検算対象の映像候補rankまで広げた設定を確認する。',
    '- どちらを採用するかはこの診断では決めない。増える分割数を見て人間が判断する。',
    '',
    '## 本体影響',
    '',
    '- runtime/ への書き込みなし',
    '- fixtures/ への書き込みなし',
    '- expected/ への書き込みなし',
    '- 本番UI/API/キュー/DBへの変更なし'
  );

  for (const item of input.evaluations.filter((evaluation) => evaluation.blockingCutpointsForTarget.length > 0)) {
    lines.push('', `## ${item.label} で対象候補を塞ぐ選択済みカット点`);
    for (const cutpoint of item.blockingCutpointsForTarget) {
      lines.push(`- ${cutpoint.kind} ${msText(cutpoint.timeMs)} rank ${cutpoint.rank} value ${cutpoint.value}`);
    }
  }

  for (const item of input.evaluations.filter((evaluation) => evaluation.extraSelectedCutpoints.length > 0)) {
    lines.push('', `## ${item.label} で増えるカット点`);
    for (const cutpoint of item.extraSelectedCutpoints) {
      lines.push(`- ${cutpoint.kind} ${msText(cutpoint.timeMs)} rank ${cutpoint.rank} value ${cutpoint.value}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<SttTarget>(options.targetPath);
  const clipVideoPath = targetVideoPath(target, options.sourceId);
  const clipAudio = await readAudio(options.ffmpegCommand, clipVideoPath);
  const allAudio = rankedAudioCutpoints(clipAudio);
  const allVideo = await rankedVideoCutpoints(options.ffmpegCommand, clipVideoPath);
  const nearestAudioCandidate = nearest(allAudio, options.confirmedCutMs);
  const nearestVideoCandidate = nearest(allVideo, options.confirmedCutMs);
  const rankedAudioCandidate = bestRankedAround(allAudio, options.confirmedCutMs, options.candidateWindowMs);
  const rankedVideoCandidate = bestRankedAround(allVideo, options.confirmedCutMs, options.candidateWindowMs);
  const targetAudioCandidate = candidateByRank(allAudio, options.targetAudioRank) ?? rankedAudioCandidate;
  const targetVideoCandidate = candidateByRank(allVideo, options.targetVideoRank) ?? rankedVideoCandidate;
  const { firstStartMs, lastEndMs } = await clipSpeechBounds(options.clipId);

  const baselineSelected = mergeCutpoints({
    audioCutpoints: allAudio.slice(0, options.currentMaxAudioCutpoints),
    videoCutpoints: allVideo.slice(0, options.currentMaxVideoCutpoints),
    startMs: firstStartMs,
    endMs: lastEndMs,
    minSegmentMs: options.minSegmentMs
  });

  const evaluations = [
    evaluateSetting({
      label: 'current',
      allAudio,
      allVideo,
      baselineSelected,
      maxAudioCutpoints: options.currentMaxAudioCutpoints,
      maxVideoCutpoints: options.currentMaxVideoCutpoints,
      targetAudio: targetAudioCandidate,
      targetVideo: targetVideoCandidate,
      startMs: firstStartMs,
      endMs: lastEndMs,
      minSegmentMs: options.minSegmentMs
    }),
    evaluateSetting({
      label: 'audio-only-minimum',
      allAudio,
      allVideo,
      baselineSelected,
      maxAudioCutpoints: targetAudioCandidate?.rank ?? options.currentMaxAudioCutpoints,
      maxVideoCutpoints: options.currentMaxVideoCutpoints,
      targetAudio: targetAudioCandidate,
      targetVideo: targetVideoCandidate,
      startMs: firstStartMs,
      endMs: lastEndMs,
      minSegmentMs: options.minSegmentMs
    }),
    evaluateSetting({
      label: 'video-only-minimum',
      allAudio,
      allVideo,
      baselineSelected,
      maxAudioCutpoints: options.currentMaxAudioCutpoints,
      maxVideoCutpoints: targetVideoCandidate?.rank ?? options.currentMaxVideoCutpoints,
      targetAudio: targetAudioCandidate,
      targetVideo: targetVideoCandidate,
      startMs: firstStartMs,
      endMs: lastEndMs,
      minSegmentMs: options.minSegmentMs
    })
  ];

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const resultPath = path.join(outputDir, `cutpoint-rank-limit-diagnosis-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `cutpoint-rank-limit-diagnosis-${options.outputId}.md`);
  const result = {
    kind: 'clip_composition_cutpoint_rank_limit_diagnosis',
    runAt: new Date().toISOString(),
    targetPath: relativeWorkspacePath(options.targetPath),
    clipId: options.clipId,
    sourceId: options.sourceId,
    confirmedCutMs: options.confirmedCutMs,
    currentSettings: {
      maxAudioCutpoints: options.currentMaxAudioCutpoints,
      maxVideoCutpoints: options.currentMaxVideoCutpoints,
      minSegmentMs: options.minSegmentMs,
      candidateWindowMs: options.candidateWindowMs,
      targetAudioRank: options.targetAudioRank,
      targetVideoRank: options.targetVideoRank
    },
    rawCandidates: {
      nearestAudioCandidate,
      nearestVideoCandidate,
      rankedAudioCandidate,
      rankedVideoCandidate,
      targetAudioCandidate,
      targetVideoCandidate
    },
    evaluations,
    decision: {
      adoptionChanged: false,
      reason: 'rank上限の採否は人間判断に残すため、この診断では照合設定を変更しない。'
    },
    productionImpact: {
      runtimeWrites: false,
      fixtureWrites: false,
      expectedWrites: false,
      productionApiUiQueueDbChanged: false
    }
  };

  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, reportMarkdown({
    resultPath,
    targetMs: options.confirmedCutMs,
    candidateWindowMs: options.candidateWindowMs,
    current: evaluations[0]!,
    nearestAudioCandidate,
    nearestVideoCandidate,
    rankedAudioCandidate,
    rankedVideoCandidate,
    targetAudioCandidate,
    targetVideoCandidate,
    evaluations
  }), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  for (const item of evaluations) {
    console.log(`${item.label}: target=${item.targetCandidateSelected ? 'yes' : 'no'} segments=${item.segmentCount} extraCuts=${item.extraSelectedCutpointCount}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

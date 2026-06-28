import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentRequest, Zev2State } from '@zev2/shared';
import {
  SHORTS_RENDER_TARGET,
  buildDefaultScreenLayoutPlan,
  buildLayoutVideoFilter,
  type ShortsScreenLayoutPlan
} from '../screen-layout.js';
import { resolveTelopPlacementArea, type TelopPlacementArea } from '../telop-placement.js';
import { loadTelopStyleProfile, resolveTelopStyle, type ResolvedTelopStyle } from '../telop-style.js';
import { renderRemotionTelopPng } from '../telop-remotion.js';
import { breakTelopText } from '../telop/telop-line-break.js';
import { joinTelopSpeechText, millisecondsToSeconds, uniqueSpeechIds } from '../transcript-utils.js';
import type { ArtifactInfo, EditPlanArtifact, SpeechTimingRef } from '../workflow-artifacts.js';

export type RenderVideoArtifactContext = {
  ffmpegCommand: string;
  ffprobeCommand: string;
  confirmationVideoEncodingArgs: string[];
  outputVideoFileName: string;
  requestArtifactDir: (request: AgentRequest) => string;
  artifactUrl: (request: AgentRequest, fileName: string) => string;
  resolveSourceVideoPath: (state: Zev2State, request: AgentRequest) => string | undefined;
  probeVideoDimensions: (sourcePath: string) => Promise<{ width: number; height: number }>;
  runCommand: (command: string, args: string[]) => Promise<void>;
  runCommandWithOutput: (command: string, args: string[]) => Promise<string>;
  runCommandWithCombinedOutput: (command: string, args: string[]) => Promise<string>;
};

type RenderTelopEvent = {
  startMs: number;
  endMs: number;
  text: string;
  role: string;
  sourceSpeechIds: number[];
};

type RenderTelopOverlay = RenderTelopEvent & {
  fileName: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styleId: string;
  lineCount: number;
  maxLines?: number;
  placement: TelopPlacementArea;
};

type RenderSegmentForVideo = {
  sourceStartMs: number;
  sourceEndMs: number;
  caption: string;
  speechIds: number[];
  speechUnits: SpeechTimingRef[];
  screenLayout: ShortsScreenLayoutPlan;
};

async function sourceHasAudioTrack(
  sourcePath: string,
  context: RenderVideoArtifactContext
): Promise<boolean> {
  try {
    const output = await context.runCommandWithOutput(context.ffprobeCommand, [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      sourcePath
    ]);
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

async function assertOutputVideoHasAudibleAudio(
  outputPath: string,
  context: RenderVideoArtifactContext
): Promise<void> {
  const hasAudioTrack = await sourceHasAudioTrack(outputPath, context);
  if (!hasAudioTrack) {
    throw new Error('生成動画に音声トラックがありません');
  }

  const volumeOutput = await context.runCommandWithCombinedOutput(context.ffmpegCommand, [
    '-hide_banner',
    '-nostats',
    '-i',
    outputPath,
    '-map',
    '0:a:0',
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-'
  ]);
  const sampleCounts = [...volumeOutput.matchAll(/n_samples:\s*(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  const sampleCount = sampleCounts.length > 0 ? Math.max(...sampleCounts) : 0;
  const maxVolumeMatch = volumeOutput.match(/max_volume:\s*([-\d.]+|-\s*inf)\s*dB/i);
  const maxVolume = maxVolumeMatch?.[1]?.replace(/\s+/g, '') ?? '';

  if (sampleCount <= 0 || !maxVolume || maxVolume === '-inf') {
    throw new Error('生成動画の音声が無音です');
  }
}

function sanitizeTelopText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildRenderTelopEvents(
  editPlan: EditPlanArtifact,
  renderSegments: RenderSegmentForVideo[],
  durationMs: number
): RenderTelopEvent[] {
  const speechTimeline = buildRenderedSpeechTimeline(renderSegments);
  const telopRecords = editPlan.telopPlan
    .map((telop) => {
      const sourceSpeechIds = uniqueSpeechIds(telop.sourceSpeechIds);
      const speechRefs = sourceSpeechIds
        .map((speechId) => {
          const range = speechTimeline.get(speechId);
          return range ? { id: speechId, ...range } : undefined;
        })
        .filter((speech): speech is { id: number; startMs: number; endMs: number; text: string } => Boolean(speech))
        .sort((left, right) => left.startMs - right.startMs);

      if (speechRefs.length === 0) {
        return undefined;
      }

      const speechText = joinTelopSpeechText(speechRefs);
      return {
        startMs: Math.min(...speechRefs.map((speech) => speech.startMs)),
        speechEndMs: Math.max(...speechRefs.map((speech) => speech.endMs)),
        text: sanitizeTelopText(telop.text || speechText),
        role: sanitizeTelopText(telop.role),
        sourceSpeechIds: speechRefs.map((speech) => speech.id)
      };
    })
    .filter((telop): telop is {
      startMs: number;
      speechEndMs: number;
      text: string;
      role: string;
      sourceSpeechIds: number[];
    } => Boolean(telop))
    .filter((telop) => telop.startMs < durationMs && telop.text.length > 0)
    .sort((left, right) => left.startMs - right.startMs);

  const uniqueTelopRecords = telopRecords.filter((telop, index) => (
    index === 0 || telop.startMs > telopRecords[index - 1].startMs
  ));
  const events = uniqueTelopRecords
    .map((telop, index) => {
      const nextTelop = uniqueTelopRecords[index + 1];
      const speechEndMs = Math.min(durationMs, telop.speechEndMs);
      const nextBoundaryMs = nextTelop?.startMs ?? durationMs;
      const endMs = Math.min(durationMs, speechEndMs, nextBoundaryMs);
      return {
        startMs: telop.startMs,
        endMs,
        text: telop.text,
        role: telop.role || 'テロップ',
        sourceSpeechIds: telop.sourceSpeechIds
      };
    })
    .filter((telop) => telop.startMs < telop.endMs);

  if (events.length > 0) {
    return events;
  }

  let cursorMs = 0;
  return renderSegments
    .map((segment) => {
      const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
      const startMs = cursorMs;
      const endMs = Math.min(durationMs, cursorMs + segmentDurationMs);
      cursorMs = endMs;
      return {
        startMs,
        endMs,
        text: sanitizeTelopText(segment.caption || editPlan.hookText || editPlan.title),
        role: '本文',
        sourceSpeechIds: segment.speechIds
      };
    })
    .filter((telop) => telop.startMs < telop.endMs && telop.text.length > 0);
}

function buildRenderedSpeechTimeline(renderSegments: RenderSegmentForVideo[]): Map<number, { startMs: number; endMs: number; text: string }> {
  const timeline = new Map<number, { startMs: number; endMs: number; text: string }>();
  let cursorMs = 0;

  for (const segment of renderSegments) {
    const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
    for (const speech of segment.speechUnits) {
      const sourceStartMs = Math.max(segment.sourceStartMs, speech.sourceStartMs);
      const sourceEndMs = Math.min(segment.sourceEndMs, speech.sourceEndMs);
      if (sourceEndMs <= sourceStartMs) {
        continue;
      }
      if (timeline.has(speech.id)) {
        continue;
      }
      timeline.set(speech.id, {
        startMs: cursorMs + (sourceStartMs - segment.sourceStartMs),
        endMs: cursorMs + (sourceEndMs - segment.sourceStartMs),
        text: speech.text
      });
    }
    cursorMs += segmentDurationMs;
  }

  return timeline;
}

function findRenderSegmentAtTimelineMs(
  renderSegments: RenderSegmentForVideo[],
  timelineMs: number
): RenderSegmentForVideo {
  let cursorMs = 0;
  for (const segment of renderSegments) {
    const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
    if (timelineMs >= cursorMs && timelineMs < cursorMs + segmentDurationMs) {
      return segment;
    }
    cursorMs += segmentDurationMs;
  }

  return renderSegments[renderSegments.length - 1] ?? {
    sourceStartMs: 0,
    sourceEndMs: 1,
    caption: '',
    speechIds: [],
    speechUnits: [],
    screenLayout: buildDefaultScreenLayoutPlan()
  };
}

function requestedTelopStyleId(): string | undefined {
  const explicitStyle = process.env.ZEV2_TELOP_STYLE_ID?.trim();
  if (explicitStyle) {
    return explicitStyle;
  }

  return undefined;
}

async function resolveTelopStyleForRequest(): Promise<ResolvedTelopStyle> {
  const profile = await loadTelopStyleProfile();
  return resolveTelopStyle(profile, requestedTelopStyleId());
}

async function writeTelopOverlayImages(
  request: AgentRequest,
  renderSegments: RenderSegmentForVideo[],
  telops: RenderTelopEvent[],
  style: ResolvedTelopStyle,
  context: RenderVideoArtifactContext
): Promise<RenderTelopOverlay[]> {
  const directory = context.requestArtifactDir(request);
  const overlays: RenderTelopOverlay[] = [];

  await mkdir(directory, { recursive: true });

  for (const [index, telop] of telops.entries()) {
    const fileName = `telop-${String(index + 1).padStart(3, '0')}.png`;
    const overlayPath = path.join(directory, fileName);
    const activeSegment = findRenderSegmentAtTimelineMs(renderSegments, telop.startMs);
    const placement = resolveTelopPlacementArea(activeSegment.screenLayout);
    const lineCount = breakTelopText(telop.text, style.maxCharsPerLine).length;
    if (style.maxLines && lineCount > style.maxLines) {
      throw new Error(
        `テロップが画面を埋めるため動画生成を止めました。${index + 1}件目が${lineCount}行で、設定上限${style.maxLines}行を超えています。演出案のテロップを短く分けてください。`
      );
    }

    await renderRemotionTelopPng({
      text: telop.text,
      style,
      position: style.position,
      background: style.background,
      maxCharsPerLine: style.maxCharsPerLine,
      width: placement.width,
      height: placement.height,
      glowSeedHint: [
        style.styleId,
        telop.role,
        telop.sourceSpeechIds.join(','),
        telop.text,
        String(telop.startMs),
        String(telop.endMs)
      ].join('|')
    }, overlayPath);

    overlays.push({
      ...telop,
      fileName,
      path: overlayPath,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      styleId: style.styleId,
      lineCount,
      ...(style.maxLines ? { maxLines: style.maxLines } : {}),
      placement
    });
  }

  return overlays;
}

function buildTelopOverlayInputArgs(telops: RenderTelopOverlay[]): string[] {
  return telops.flatMap((telop) => ['-loop', '1', '-i', telop.path]);
}

function appendTelopOverlayFilters(
  baseFilter: string,
  inputLabel: string,
  outputLabel: string,
  telops: RenderTelopOverlay[],
  firstTelopInputIndex: number
): string {
  if (telops.length === 0) {
    return `${baseFilter};[${inputLabel}]null[${outputLabel}]`;
  }

  const filters = [baseFilter];
  let currentLabel = inputLabel;
  telops.forEach((telop, index) => {
    const nextLabel = index === telops.length - 1 ? outputLabel : `${outputLabel}_telop_${index}`;
    filters.push(
      `[${currentLabel}][${firstTelopInputIndex + index}:v]overlay=${telop.x}:${telop.y}:enable='between(t,${millisecondsToSeconds(telop.startMs)},${millisecondsToSeconds(telop.endMs)})'[${nextLabel}]`
    );
    currentLabel = nextLabel;
  });

  return filters.join(';');
}

function selectRenderRange(editPlan: EditPlanArtifact): { sourceStartMs: number; sourceEndMs: number } {
  const sortedSegments = [...editPlan.renderSegments].sort((left, right) => left.sourceStartMs - right.sourceStartMs);
  const firstSegment = sortedSegments[0];
  const lastSegment = sortedSegments[sortedSegments.length - 1];

  if (firstSegment && lastSegment && firstSegment.sourceStartMs < lastSegment.sourceEndMs) {
    return {
      sourceStartMs: firstSegment.sourceStartMs,
      sourceEndMs: lastSegment.sourceEndMs
    };
  }

  return {
    sourceStartMs: editPlan.sourceStartMs,
    sourceEndMs: editPlan.sourceEndMs
  };
}

function selectRenderSegments(editPlan: EditPlanArtifact): RenderSegmentForVideo[] {
  const segments = editPlan.renderSegments
    .filter((segment) => segment.sourceStartMs < segment.sourceEndMs)
    .map((segment) => ({
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      caption: segment.caption,
      speechIds: segment.speechIds,
      speechUnits: segment.speechUnits,
      screenLayout: segment.screenLayout ?? buildDefaultScreenLayoutPlan()
    }));

  return segments.length > 0
    ? segments
    : [{
        ...selectRenderRange(editPlan),
        caption: editPlan.hookText,
        speechIds: [],
        speechUnits: [],
        screenLayout: buildDefaultScreenLayoutPlan()
      }];
}

async function writeRenderPlan(
  request: AgentRequest,
  payload: {
    mode: 'source-file-trim' | 'fixture-pattern';
    sourceUri: string;
    sourcePath?: string;
    sourceStartMs: number;
    sourceEndMs: number;
    segments: Array<{
      sourceStartMs: number;
      sourceEndMs: number;
      speechIds: number[];
      speechUnits: SpeechTimingRef[];
      screenLayout: ShortsScreenLayoutPlan;
    }>;
    telops: RenderTelopEvent[];
    telopOverlayImages: Array<{
      fileName: string;
      startMs: number;
      endMs: number;
      text: string;
      sourceSpeechIds: number[];
      styleId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      target: 'screen' | 'speaker_safe_area';
      placementReason: string;
      lineCount: number;
      maxLines?: number;
    }>;
    target: typeof SHORTS_RENDER_TARGET;
    fallbackReason?: string;
  },
  context: RenderVideoArtifactContext
): Promise<void> {
  const directory = context.requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'render-plan.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function renderVideoArtifact(
  request: AgentRequest,
  editPlan: EditPlanArtifact,
  state: Zev2State,
  context: RenderVideoArtifactContext
): Promise<ArtifactInfo> {
  const directory = context.requestArtifactDir(request);
  const outputPath = path.join(directory, context.outputVideoFileName);
  const titleFile = path.join(directory, 'output-title.txt');
  await mkdir(directory, { recursive: true });
  await writeFile(titleFile, `${editPlan.title}\n${editPlan.hookText}`, 'utf8');
  const renderSegments = selectRenderSegments(editPlan);
  const renderRange = selectRenderRange(editPlan);
  const durationMs = renderSegments.reduce(
    (total, segment) => total + Math.max(1, segment.sourceEndMs - segment.sourceStartMs),
    0
  );
  const durationSeconds = millisecondsToSeconds(durationMs);
  const telopStyle = await resolveTelopStyleForRequest();
  const telops = buildRenderTelopEvents(editPlan, renderSegments, durationMs);
  const telopOverlays = await writeTelopOverlayImages(request, renderSegments, telops, telopStyle, context);
  const telopOverlayImages = telopOverlays.map((telop) => ({
    fileName: telop.fileName,
    startMs: telop.startMs,
    endMs: telop.endMs,
    text: telop.text,
    sourceSpeechIds: telop.sourceSpeechIds,
    styleId: telop.styleId,
    x: telop.x,
    y: telop.y,
    width: telop.width,
    height: telop.height,
    lineCount: telop.lineCount,
    ...(telop.maxLines ? { maxLines: telop.maxLines } : {}),
    target: telop.placement.target,
    placementReason: telop.placement.reason
  }));
  const sourcePath = context.resolveSourceVideoPath(state, request);

  if (sourcePath) {
    const sourceDimensions = await context.probeVideoDimensions(sourcePath);
    await writeRenderPlan(request, {
      mode: 'source-file-trim',
      sourceUri: request.target.sourceUri,
      sourcePath,
      sourceStartMs: renderRange.sourceStartMs,
      sourceEndMs: renderRange.sourceEndMs,
      segments: renderSegments,
      telops,
      telopOverlayImages,
      target: SHORTS_RENDER_TARGET
    }, context);

    if (renderSegments.length === 1) {
      const segment = renderSegments[0];
      const layoutFilter = buildLayoutVideoFilter({
        inputLabel: '[0:v]',
        outputLabel: 'layoutv',
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        durationSeconds: Number(millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs)),
        screenLayout: segment.screenLayout
      });
      const videoFilter = appendTelopOverlayFilters(layoutFilter, 'layoutv', 'outv', telopOverlays, 1);
      await context.runCommand(context.ffmpegCommand, [
        '-y',
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath,
        ...buildTelopOverlayInputArgs(telopOverlays),
        '-filter_complex',
        videoFilter,
        '-map',
        '[outv]',
        '-map',
        '0:a?',
        ...context.confirmationVideoEncodingArgs,
        '-c:a',
        'aac',
        '-disposition:a:0',
        'default',
        '-shortest',
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-movflags',
        '+faststart',
        outputPath
      ]);
    } else {
      const hasAudioTrack = await sourceHasAudioTrack(sourcePath, context);
      const inputArgs = renderSegments.flatMap((segment) => [
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath
      ]);
      const layoutFilters = renderSegments
        .map((segment, index) => buildLayoutVideoFilter({
          inputLabel: `[${index}:v]`,
          outputLabel: `v${index}`,
          sourceWidth: sourceDimensions.width,
          sourceHeight: sourceDimensions.height,
          durationSeconds: Number(millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs)),
          screenLayout: segment.screenLayout
        }))
        .join(';');
      const audioInputs = renderSegments
        .map((_, index) => `[${index}:a]asetpts=PTS-STARTPTS[a${index}]`)
        .join(';');
      const concatInputs = hasAudioTrack
        ? renderSegments.map((_, index) => `[v${index}][a${index}]`).join('')
        : renderSegments.map((_, index) => `[v${index}]`).join('');
      const rawConcatFilter = hasAudioTrack
        ? `${layoutFilters};${audioInputs};${concatInputs}concat=n=${renderSegments.length}:v=1:a=1[rawv][outa]`
        : `${layoutFilters};${concatInputs}concat=n=${renderSegments.length}:v=1:a=0[rawv]`;
      const concatFilter = appendTelopOverlayFilters(rawConcatFilter, 'rawv', 'outv', telopOverlays, renderSegments.length);
      const outputMaps = hasAudioTrack ? ['-map', '[outv]', '-map', '[outa]'] : ['-map', '[outv]'];
      const audioCodecArgs = hasAudioTrack
        ? ['-c:a', 'aac', '-disposition:a:0', 'default', '-shortest']
        : [];

      await context.runCommand(context.ffmpegCommand, [
        '-y',
        ...inputArgs,
        ...buildTelopOverlayInputArgs(telopOverlays),
        '-filter_complex',
        concatFilter,
        ...outputMaps,
        ...context.confirmationVideoEncodingArgs,
        ...audioCodecArgs,
        '-t',
        durationSeconds,
        '-movflags',
        '+faststart',
        outputPath
      ]);
    }

    await assertOutputVideoHasAudibleAudio(outputPath, context);
    return {
      path: outputPath,
      uri: context.artifactUrl(request, context.outputVideoFileName),
      mimeType: 'video/mp4',
      access: 'internal'
    };
  }

  await writeRenderPlan(request, {
    mode: 'fixture-pattern',
    sourceUri: request.target.sourceUri,
    sourceStartMs: renderRange.sourceStartMs,
    sourceEndMs: renderRange.sourceEndMs,
    segments: renderSegments,
    telops,
    telopOverlayImages,
    target: SHORTS_RENDER_TARGET,
    fallbackReason: '入力動画をローカルファイルとして読めないため、音声付き動画を生成できない'
  }, context);

  throw new Error('入力動画を読めないため、音声付き動画を生成できません');
}

#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  buildDistantConnectionVideoPrototypePlanV001,
  serializeDistantConnectionVideoPrototypePlanV001,
  type DistantConnectionVideoCandidatePlanV001
} from '../../runner/src/distant-connection-video-prototype-v001.ts';
import {buildPresentationInstructionCommonCorePlanV001}
  from './run_presentation_instruction_renderer_job_v001.ts';
import {
  buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002,
  executeValidatedPresentationDrawAndQcV001
} from './render_presentation_v002.mjs';
import {inspectPresentationRenderLayoutV001}
  from './inspect_presentation_render_layout_v001.ts';
import {
  codePointWeightV001,
  frameBoundaryV001,
  layoutUnicodeCodePointsV001
} from './presentation_renderer_text_layout_v001.mjs';
import {
  evaluatePresentationRendererQcWithProfileV001,
  fileSha256V002,
  inspectRenderedMediaWithToolsV001
} from './presentation_renderer_qc_v002.mjs';
import {createPresentationRendererProcessObserverV001}
  from './presentation_renderer_process_observation_v001.mjs';

const workspaceRoot = path.resolve(import.meta.dirname, '../..');
const relative = (absolutePath: string) => path.relative(workspaceRoot, absolutePath);
const buildMode = process.argv[2] ?? 'intervalization-improvement';
if (!['intervalization-improvement', 'short-form-viability'].includes(buildMode)) {
  throw new Error(`unknown build mode: ${buildMode}`);
}
const isShortFormViability = buildMode === 'short-form-viability';
const candidateResponsePath = path.join(
  workspaceRoot,
  isShortFormViability
    ? 'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-short-form-viability-ymUsGrT6EaA-v001/candidate-response-v001.json'
    : 'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticUtterancePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);
const sourcePackagePath = path.join(
  workspaceRoot,
  isShortFormViability
    ? 'evals/clip_composition/outputs/work-distant-connection-luna-source-package-short-form-viability-ymUsGrT6EaA-v001/source-package-v001.json'
    : 'evals/clip_composition/outputs/work-distant-connection-luna-source-package-quality-increment-ymUsGrT6EaA-v001/source-package-v001.json'
);
const sourceVideoPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4'
);
const rendererJobPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/a-v002-voice-013-v006/renderer-job-v001.json'
);
const presetRegistryPath = path.join(
  workspaceRoot,
  'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'
);
const rendererTrustPath = path.join(
  workspaceRoot,
  'evals/clip_composition/registries/presentation/presentation-renderer-trust-v002/trust.json'
);
const outputRoot = path.join(
  workspaceRoot,
  isShortFormViability
    ? 'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-short-form-viability-ymUsGrT6EaA-v001'
    : 'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001'
);
const temporaryRoot = path.join(
  workspaceRoot,
  isShortFormViability
    ? 'evals/clip_composition/outputs/presentation/.distant-connection-video-prototype-short-form-viability-ymUsGrT6EaA-v001.work'
    : 'evals/clip_composition/outputs/presentation/.distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001.work'
);

const expectedCandidateSha = isShortFormViability
  ? 'a73fef9ac2c1d12b46b49b0d0dab9eb6f0293aa34b89425296717fc1334b8d49'
  : '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d';
const expectedSemanticSha = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const expectedSourceVideoSha = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const styleProfileId = 'normal-landscape-readable-pop-v001';
const visualStateId = 'caption-core-v001';

type SemanticRow = {
  ordinal: number;
  utteranceId: string;
  text: string;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceSegmentIds: number[];
};

const intervalizationImprovementDecisions = {
  'camera-fear-escalation': {
    formalSecondStartMs: 1_412_798,
    formalSecondEndMs: 1_426_409,
    improvedSecondStartMs: 1_377_918,
    improvedSecondEndMs: 1_426_649,
    semanticStartOrdinal: 2_766,
    semanticEndOrdinal: 2_809,
    classification: 'B_INTERVALIZATION_DEFECT_CONFIRMED',
    observedCause: '正式発話の約32秒前に白い人物が出現する恐怖映像があり、無言反応を経て「今年一怖すぎて」という正式発話へつながる。旧区間は原因となる映像を全て落としていた。',
    boundaryReason: '直前発話が終わり恐怖イベントへの接近が始まる時点から、正式発話の「夜中になんか映るようなやつ」が完結する時点まで。'
  },
  'medicine-effect-payoff': {
    formalSecondStartMs: 4_398_688,
    formalSecondEndMs: 4_400_430,
    improvedSecondStartMs: 4_389_098,
    improvedSecondEndMs: 4_412_003,
    semanticStartOrdinal: 7_316,
    semanticEndOrdinal: 7_480,
    classification: 'B_INTERVALIZATION_DEFECT_CONFIRMED_SEMANTIC_STRENGTH_REMAINS_HUMAN_DECISION',
    observedCause: '「薬の効き目も切れかけている」は画面内文書を読み上げる一続きの段落中の一文であり、旧区間は1.742秒だけを抜いて導入・対象・読後反応を落としていた。',
    boundaryReason: '文書の読み上げが始まる「ここから出られない」から、読み上げ内容への反応「バケモノ肯定派がいるん?」が終わりゲーム操作へ戻る直前まで。'
  }
} as const;

const shortFormViabilityDecisions = {
  'distant-connection-001': {
    formalSecondStartMs: 963_664,
    formalSecondEndMs: 964_925,
    improvedSecondStartMs: 958_000,
    improvedSecondEndMs: 967_666,
    semanticStartOrdinal: 2_003,
    semanticEndOrdinal: 2_026,
    classification: 'SHORT_FORM_INTERVALIZATION_LIMIT_POSSIBLE',
    observedCause: '正式後半の直前約5.7秒から映像を確認したが、赤い女が明確に出現する決定的な映像は確認できず、暗い通路から赤みのある区域へ進む場面だった。発話だけを切る問題は補えるが、Lunaが説明した強い回収が映像に存在するかは人間判断が必要。',
    boundaryReason: '暗い通路から該当区域へ接近する時点を開始とし、「サムネにも顔赤いやついたわ」の自然な終端までを含める。無関係な探索を追加せず、区間化だけで約束した回収を作らない。'
  },
  'distant-connection-002': {
    formalSecondStartMs: 5_681_391,
    formalSecondEndMs: 5_694_838,
    improvedSecondStartMs: 5_681_391,
    improvedSecondEndMs: 5_698_719,
    semanticStartOrdinal: 9_109,
    semanticEndOrdinal: 9_177,
    classification: 'NATURAL_SENTENCE_END_EXTENSION',
    observedCause: '正式後半は画面内の物語文を読み上げる一続きの場面だが、「可哀想な子供」で文が途中終了していた。映像上の原因イベントは別に存在せず、必要なのは読み上げ文の自然な終端だった。',
    boundaryReason: '開始は正式候補のまま維持し、事故に遭った子供について「若くして命を落とした」まで読了する時点へ約3.9秒だけ延長する。後続の長い怪異説明までは含めない。'
  },
  'distant-connection-003': {
    formalSecondStartMs: 1_029_974,
    formalSecondEndMs: 1_032_976,
    improvedSecondStartMs: 1_028_000,
    improvedSecondEndMs: 1_033_336,
    semanticStartOrdinal: 2_076,
    semanticEndOrdinal: 2_096,
    classification: 'MINIMAL_VISUAL_LEAD_AND_REACTION_EXTENSION',
    observedCause: '正式後半は赤い照明の通路を探索中の発話で、直前約2秒の映像が場所と移動方向を示していた。発話直後の「また風船」までが同じ反応単位で、それより後の怪物反応は別の出来事だった。',
    boundaryReason: '赤い通路へ入った直後を開始とし、正式発話と直後の「また風船」が完結する時点で終了する。後続の別の怪物反応は追加しない。'
  }
} as const;

const intervalizationDecisions = isShortFormViability
  ? shortFormViabilityDecisions
  : intervalizationImprovementDecisions;

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fileSha256Streaming(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

async function readJson(filePath: string): Promise<any> {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {encoding: 'utf8', flag: 'wx'});
}

function formatClock(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    + `:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function formatGap(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${minutes}分${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}秒`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildContextCaptions(
  candidateId: string,
  rows: SemanticRow[],
  maxCueWidth: number,
  characterWidthRule: string
) {
  const groups: SemanticRow[][] = [];
  let group: SemanticRow[] = [];
  let width = 0;
  const flush = () => {
    if (group.length > 0) groups.push(group);
    group = [];
    width = 0;
  };
  for (const row of rows) {
    const nextWidth = Array.from(row.text).reduce(
      (total, character) => total + codePointWeightV001(character, characterWidthRule),
      0
    );
    if (nextWidth > maxCueWidth) {
      throw new Error(`${candidateId}の周辺文脈1件が既存字幕の最大論理幅を超えています`);
    }
    const previous = group.at(-1);
    const hasSourcePause = previous !== undefined && row.sourceStartMs > previous.sourceEndMs;
    if (group.length > 0 && (width + nextWidth > maxCueWidth || hasSourcePause)) flush();
    group.push(row);
    width += nextWidth;
  }
  flush();
  return groups.map((rowsInCue, index) => ({
    cueId: `${candidateId}-second-intervalization-caption-${String(index + 1).padStart(3, '0')}`,
    part: 'second' as const,
    text: rowsInCue.map((row) => row.text).join(''),
    semanticUtteranceIds: rowsInCue.map((row) => row.utteranceId),
    sourceUnits: rowsInCue.map((row) => ({
      semanticUtteranceId: row.utteranceId,
      text: row.text
    })),
    sourceStartMs: rowsInCue[0].sourceStartMs,
    sourceEndMs: rowsInCue.at(-1)!.sourceEndMs
  }));
}

function applyIntervalizationImprovement(
  plan: any,
  semanticRows: SemanticRow[],
  maxLogicalWidthPerLine: number,
  maxLines: number,
  characterWidthRule: string
) {
  const byCandidate = intervalizationDecisions as Record<string, typeof intervalizationDecisions[keyof typeof intervalizationDecisions]>;
  const candidates = plan.candidates.map((candidate: DistantConnectionVideoCandidatePlanV001) => {
    const decision = byCandidate[candidate.candidateId];
    if (!decision) throw new Error(`${candidate.candidateId}の区間化改善判断がありません`);
    if (candidate.secondPart.sourceStartMs !== decision.formalSecondStartMs
      || candidate.secondPart.sourceEndMs !== decision.formalSecondEndMs) {
      throw new Error(`${candidate.candidateId}の正式後半区間が調査対象と一致しません`);
    }
    const rows = semanticRows.filter((row) =>
      row.ordinal >= decision.semanticStartOrdinal && row.ordinal <= decision.semanticEndOrdinal);
    if (rows.length !== decision.semanticEndOrdinal - decision.semanticStartOrdinal + 1
      || rows[0]?.ordinal !== decision.semanticStartOrdinal
      || rows.at(-1)?.ordinal !== decision.semanticEndOrdinal) {
      throw new Error(`${candidate.candidateId}の周辺文脈が正式意味発話で連続していません`);
    }
    if (rows[0].sourceStartMs < decision.improvedSecondStartMs
      || rows.at(-1)!.sourceEndMs !== decision.improvedSecondEndMs) {
      throw new Error(`${candidate.candidateId}の区間化境界と正式意味発話が一致しません`);
    }
    const formalSecondPart = candidate.secondPart;
    const secondPart = {
      sourceStartMs: decision.improvedSecondStartMs,
      sourceEndMs: decision.improvedSecondEndMs,
      text: rows.map((row) => row.text).join(''),
      semanticUtteranceIds: rows.map((row) => row.utteranceId),
      sourceSegmentIds: rows.flatMap((row) => row.sourceSegmentIds),
      boundaryDecision: 'human-reviewed-local-intervalization-evidence-v001'
    };
    const formalSecondIds = new Set(formalSecondPart.semanticUtteranceIds);
    if (!formalSecondPart.semanticUtteranceIds.every((id) =>
      secondPart.semanticUtteranceIds.includes(id))) {
      throw new Error(`${candidate.candidateId}の改善後区間がLunaの正式後半発話を包含していません`);
    }
    const addedContextIds = secondPart.semanticUtteranceIds.filter((id) => !formalSecondIds.has(id));
    return {
      ...candidate,
      formalSecondPart,
      secondPart,
      gapMs: secondPart.sourceStartMs - candidate.firstPart.sourceEndMs,
      outputDurationMs:
        (candidate.firstPart.sourceEndMs - candidate.firstPart.sourceStartMs)
        + (secondPart.sourceEndMs - secondPart.sourceStartMs),
      captions: [
        ...candidate.captions.filter((cue) => cue.part === 'first'),
        ...buildContextCaptions(
          candidate.candidateId,
          rows,
          maxLogicalWidthPerLine * maxLines,
          characterWidthRule
        )
      ],
      intervalizationDecision: {
        ...decision,
        addedContextSemanticUtteranceIds: addedContextIds,
        formalCandidateChanged: false,
        firstPartChanged: false,
        secondPartOnlyExpanded: true
      }
    };
  });
  return {
    ...plan,
    schemaVersion: 'distant-connection-video-intervalization-improvement-plan-v001',
    intervalPolicy: {
      selection: 'local-evidence-guided-second-part-expansion',
      expansionApplied: true,
      formalCandidateChanged: false,
      reason: 'Lunaの正式発話IDは意味探索の正本として不変保持し、映像イベント・導入文脈・自然な終端を動画区間にのみ追加する。'
    },
    candidates
  };
}

function captionOutputFrames(
  cue: DistantConnectionVideoCandidatePlanV001['captions'][number],
  candidate: DistantConnectionVideoCandidatePlanV001,
  firstFrameCount: number
) {
  const part = cue.part === 'first' ? candidate.firstPart : candidate.secondPart;
  const offset = cue.part === 'first' ? 0 : firstFrameCount;
  const partFrameCount = frameBoundaryV001(part.sourceEndMs - part.sourceStartMs);
  const startFrame = offset + Math.max(
    0,
    Math.min(partFrameCount - 1, frameBoundaryV001(cue.sourceStartMs - part.sourceStartMs))
  );
  const endFrameExclusive = offset + Math.max(
    startFrame - offset + 1,
    Math.min(partFrameCount, frameBoundaryV001(cue.sourceEndMs - part.sourceStartMs))
  );
  return {startFrame, endFrameExclusive};
}

function buildInstructionAndLayout(
  candidate: DistantConnectionVideoCandidatePlanV001,
  visualState: any,
  characterWidthRule: string,
  effectiveMaxLogicalWidthPerLine: number
) {
  const firstFrameCount = frameBoundaryV001(
    candidate.firstPart.sourceEndMs - candidate.firstPart.sourceStartMs
  );
  const secondFrameCount = frameBoundaryV001(
    candidate.secondPart.sourceEndMs - candidate.secondPart.sourceStartMs
  );
  const instructions: any[] = [];
  const entries: any[] = [];
  for (const [index, cue] of candidate.captions.entries()) {
    const instructionId = `${candidate.candidateId}-presentation-instruction-${String(index + 1).padStart(3, '0')}`;
    const layout = layoutUnicodeCodePointsV001(cue.text, {
      ...visualState.layout,
      maxCharsPerLine: effectiveMaxLogicalWidthPerLine
    }, characterWidthRule);
    if (layout.status !== 'passed') {
      throw new Error(`${cue.cueId} cannot be represented by the approved caption layout`);
    }
    const sourceIdByCodePoint = cue.sourceUnits.flatMap((unit) =>
      Array.from(unit.text).map(() => unit.semanticUtteranceId));
    if (sourceIdByCodePoint.length !== Array.from(cue.text).length) {
      throw new Error(`${cue.cueId} source-unit/code-point mapping mismatch`);
    }
    const frames = captionOutputFrames(cue, candidate, firstFrameCount);
    instructions.push({
      instructionId,
      semanticKind: 'speech-caption',
      content: {text: cue.text},
      outputTime: frames,
      targetProvenance: {
        targetRefId: cue.cueId,
        targetType: 'semantic-caption',
        atomOccurrenceIds: cue.semanticUtteranceIds
      },
      materialRefs: []
    });
    entries.push({
      instructionId,
      lineLayoutRuleId: 'existing-normal-landscape-logical-width-v001',
      lines: layout.indexedLines.map((line: any) => {
        const touched = [...new Set(line.codePointIndices.map(
          (codePointIndex: number) => sourceIdByCodePoint[codePointIndex]
        ))];
        return {
          lineIndex: line.lineIndex,
          sourceUnitIds: touched.length > 0 ? touched : cue.semanticUtteranceIds,
          text: line.text,
          logicalWidth: Array.from(line.text).reduce(
            (sum, character) => sum + codePointWeightV001(character, characterWidthRule),
            0
          )
        };
      })
    });
  }
  return {
    expectedFrameCount: firstFrameCount + secondFrameCount,
    firstFrameCount,
    secondFrameCount,
    instructionArtifact: {
      schemaVersion: 'distant-connection-video-prototype-instruction-v001',
      artifactId: `${candidate.candidateId}-video-prototype-instruction-v001`,
      artifactKind: 'caption',
      sourceBindings: {},
      styleProfileId,
      instructions
    },
    lineLayout: {
      schemaVersion: 'distant-connection-video-prototype-line-layout-v001',
      layoutId: `${candidate.candidateId}-video-prototype-line-layout-v001`,
      instructionArtifactBinding: null,
      entries
    }
  };
}

async function runObserved(
  observer: ReturnType<typeof createPresentationRendererProcessObserverV001>,
  command: string,
  args: string[],
  label: string
) {
  const result = await observer.run(command, args, {
    allowedExitCodes: [0],
    observationLabel: label
  });
  await Promise.all([
    writeJson(path.join(result.observationDirectory, 'command.json'), {command, args}),
    writeFile(path.join(result.observationDirectory, 'stdout.txt'), result.stdout, {flag: 'wx'})
  ]);
  return result;
}

async function manufactureBaseMedia(
  candidate: DistantConnectionVideoCandidatePlanV001,
  candidateTemporaryRoot: string,
  observer: ReturnType<typeof createPresentationRendererProcessObserverV001>,
  ffmpegPath: string
) {
  await mkdir(candidateTemporaryRoot, {recursive: false});
  const parts = [candidate.firstPart, candidate.secondPart];
  const frameCounts = parts.map((part) => frameBoundaryV001(part.sourceEndMs - part.sourceStartMs));
  const segmentPaths: string[] = [];
  for (const [index, part] of parts.entries()) {
    const frameCount = frameCounts[index];
    const exactDurationSeconds = frameCount / 30;
    const segmentPath = path.join(candidateTemporaryRoot, `segment-${index + 1}.mp4`);
    await runObserved(observer, ffmpegPath, [
      '-hide_banner', '-loglevel', 'verbose', '-y',
      '-ss', (part.sourceStartMs / 1000).toFixed(3),
      '-t', ((part.sourceEndMs - part.sourceStartMs) / 1000).toFixed(3),
      '-i', sourceVideoPath,
      '-map', '0:v:0', '-map', '0:a:0',
      '-vf', 'fps=30',
      '-af', `asetpts=PTS-STARTPTS,apad,atrim=duration=${exactDurationSeconds.toFixed(6)},asetpts=PTS-STARTPTS`,
      '-frames:v', String(frameCount), '-t', exactDurationSeconds.toFixed(6),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-movflags', '+faststart', segmentPath
    ], `source-segment-${index + 1}-manufacture`);
    segmentPaths.push(segmentPath);
  }
  const baseMediaPath = path.join(candidateTemporaryRoot, 'concatenated-base-media.mp4');
  const totalFrames = frameCounts.reduce((sum, value) => sum + value, 0);
  const exactTotalDurationSeconds = totalFrames / 30;
  await runObserved(observer, ffmpegPath, [
    '-hide_banner', '-loglevel', 'verbose', '-y',
    '-i', segmentPaths[0], '-i', segmentPaths[1],
    '-filter_complex',
    `[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v0][a0];`
      + `[v0]trim=end_frame=${totalFrames},setpts=N/(30*TB)[v];`
      + `[a0]atrim=duration=${exactTotalDurationSeconds.toFixed(6)},asetpts=PTS-STARTPTS[a]`,
    '-map', '[v]', '-map', '[a]', '-frames:v', String(totalFrames),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-movflags', '+faststart', baseMediaPath
  ], 'two-part-base-media-concatenation');
  return {baseMediaPath, frameCounts, totalFrames};
}

function buildReviewHtml(results: any[]): string {
  const cards = results.map((result) => `<article>
    <header><span class="candidate">${escapeHtml(result.candidateId)}</span><span class="passed">✓ QC合格</span></header>
    <video controls preload="metadata" src="${escapeHtml(result.videoRelativePath)}"></video>
    <div class="times"><strong>前半（不変）</strong> ${escapeHtml(formatClock(result.firstPart.sourceStartMs))}–${escapeHtml(formatClock(result.firstPart.sourceEndMs))}<br>
    <strong>旧後半</strong> ${escapeHtml(formatClock(result.formalSecondPart.sourceStartMs))}–${escapeHtml(formatClock(result.formalSecondPart.sourceEndMs))}<br>
    <strong>改善後半</strong> ${escapeHtml(formatClock(result.secondPart.sourceStartMs))}–${escapeHtml(formatClock(result.secondPart.sourceEndMs))}<br>
    <strong>距離</strong> ${escapeHtml(formatGap(result.gapMs))}</div>
    <section class="speech"><h2>前半の実際の発話</h2><p>${escapeHtml(result.firstPart.text)}</p></section>
    <section class="speech"><h2>Lunaが選んだ後半発話（不変）</h2><p>${escapeHtml(result.formalSecondPart.text)}</p></section>
    <section class="speech improved"><h2>動画用に追加した周辺文脈</h2><p>${escapeHtml(result.secondPart.text)}</p></section>
    <section><h2>現物調査で分かったこと</h2><p>${escapeHtml(result.intervalizationDecision.observedCause)}</p></section>
    <section><h2>改善境界の理由</h2><p>${escapeHtml(result.intervalizationDecision.boundaryReason)}</p></section>
    <section><h2>前を付けることで分かること</h2><p>${escapeHtml(result.addedUnderstanding)}</p></section>
    <p class="sha">video SHA-256 ${escapeHtml(result.video.fileSha256)}</p>
  </article>`).join('\n');
  const pageTitle = isShortFormViability
    ? 'ymUsGrT6EaA 遠方接続 短尺成立条件3候補'
    : 'ymUsGrT6EaA 遠方接続 区間化改善版';
  const heading = isShortFormViability
    ? '遠方接続 — 短尺成立条件反映後の3候補'
    : '遠方接続 — 区間化改善版2件';
  const lead = isShortFormViability
    ? '短尺成立条件を追加したLuna候補を、原因映像・導入文脈・自然な終端を落とさない最小区間で動画化しました。正式候補の発話IDは変更していません。'
    : 'Lunaが選んだ意味上の発話は変えず、実際の映像イベント・導入文脈・自然な終端を後半動画へ補いました。旧動画は保持されています。';
  const reviewPoints = isShortFormViability
    ? '①前→後だけで接続を理解できるか　②前半で後半の理解・回収感・面白さが増えるか　③余計な説明を必要としないか　④短尺としてテンポを壊していないか'
    : '重要場面を含めたことで接続が成立したか／それでも接続自体が弱いか。候補の正式採否はまだ行いません。';
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(pageTitle)}</title><style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080b13;color:#eef3ff}
body{margin:0;padding:32px;background:linear-gradient(145deg,#080b13,#111b33)}main{max-width:1320px;margin:auto}
h1{margin:0 0 8px;font-size:32px}.lead{color:#bdc9e3;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(500px,1fr));gap:22px}
article{background:#10182a;border:1px solid #334363;border-radius:16px;padding:18px;box-shadow:0 14px 44px #0007}header{display:flex;justify-content:space-between;align-items:center}
.candidate{font:700 18px ui-monospace,SFMono-Regular,Menlo,monospace}.passed{color:#78e7aa}video{display:block;width:100%;aspect-ratio:16/9;background:#000;border-radius:10px;margin:16px 0}
.times{line-height:1.8;color:#d6e1f7}h2{font-size:15px;color:#9db6e8;margin:16px 0 6px}.speech{padding:10px 12px;background:#0b1221;border-radius:8px}.speech.improved{border-left:4px solid #78a6ff}.speech p{line-height:1.7}.sha{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8393b5;word-break:break-all}
.check{margin-top:24px;padding:16px 20px;border-left:4px solid #78a6ff;background:#0d1528;border-radius:8px}
</style></head><body><main><h1>${escapeHtml(heading)}</h1>
<p class="lead">${escapeHtml(lead)}</p>
<section class="grid">${cards}</section><section class="check"><strong>見る点</strong>：${escapeHtml(reviewPoints)}</section>
</main></body></html>\n`;
}

async function main() {
  const [candidateBytes, semanticBytes, sourcePackageBytes, rendererJob, presetRegistry, rendererTrust]
    = await Promise.all([
      readFile(candidateResponsePath),
      readFile(semanticUtterancePath),
      readFile(sourcePackagePath),
      readJson(rendererJobPath),
      readJson(presetRegistryPath),
      readJson(rendererTrustPath)
    ]);
  const sourceVideoSha = await fileSha256Streaming(sourceVideoPath);
  const semanticArtifact = JSON.parse(semanticBytes.toString('utf8')) as {utterances: SemanticRow[]};
  const profile = presetRegistry.presets.find((row: any) => row.presetId === styleProfileId);
  const visualState = profile?.visualStates?.find((row: any) => row.stateId === visualStateId);
  if (!profile || !visualState) throw new Error('approved normal landscape caption state is unavailable');
  const buildPlanAtWidth = (maxLogicalWidthPerLine: number) => {
    const formalPlan = buildDistantConnectionVideoPrototypePlanV001({
      candidateResponsePath: relative(candidateResponsePath),
      candidateResponseBytes: candidateBytes,
      expectedCandidateResponseSha256: expectedCandidateSha,
      semanticUtterancePath: relative(semanticUtterancePath),
      semanticUtteranceBytes: semanticBytes,
      expectedSemanticUtteranceSha256: expectedSemanticSha,
      sourcePackagePath: relative(sourcePackagePath),
      sourcePackageBytes,
      sourceVideoPath,
      sourceVideoSha256: sourceVideoSha,
      expectedSourceVideoSha256: expectedSourceVideoSha,
      maxLogicalWidthPerLine,
      maxLines: visualState.layout.maxLines,
      characterWidthRule: rendererTrust.layoutRules.characterWidthRule
    });
    return applyIntervalizationImprovement(
      formalPlan,
      semanticArtifact.utterances,
      maxLogicalWidthPerLine,
      visualState.layout.maxLines,
      rendererTrust.layoutRules.characterWidthRule
    );
  };
  const selectionObserver = createPresentationRendererProcessObserverV001({
    observationDirectory: path.join(temporaryRoot, 'unused-layout-selection-observations')
  });
  const selectionOverlayAdapter = buildPresentationRendererOverlayAdapterV001({
    remotionPath: rendererJob.runtimeBindings.remotion.path,
    chromiumPath: rendererJob.runtimeBindings.chromium.path,
    processObserver: selectionObserver
  });
  let plan: ReturnType<typeof buildPlanAtWidth> | null = null;
  let physicalLayoutSelection: any = null;
  for (let width = visualState.layout.maxCharsPerLine; width >= 1; width -= 1) {
    const proposedPlan = buildPlanAtWidth(width);
    const inspections = proposedPlan.candidates.map((candidate) => {
      try {
        const built = buildInstructionAndLayout(
          candidate,
          visualState,
          rendererTrust.layoutRules.characterWidthRule,
          width
        );
        const common = buildPresentationInstructionCommonCorePlanV001({
          job: {executionInputs: {format: 'normal-landscape', canvas: {width: 1920, height: 1080, fps: 30}}},
          visualStateId,
          instructionArtifact: built.instructionArtifact,
          lineLayout: built.lineLayout,
          styleProfileRegistry: presetRegistry,
          rendererTrust
        });
        if (common.status !== 'built') {
          return {candidateId: candidate.candidateId, status: 'failed', violations: [common]};
        }
        return {
          candidateId: candidate.candidateId,
          ...inspectPresentationRenderLayoutV001({
            canvas: common.plan.canvas,
            overlays: common.plan.elements.map((element: any) =>
              selectionOverlayAdapter.buildProps(element, common.plan, presetRegistry))
          })
        };
      } catch (error) {
        return {
          candidateId: candidate.candidateId,
          status: 'failed',
          violations: [{
            code: 'LOGICAL_LAYOUT_NOT_REPRESENTABLE',
            message: error instanceof Error ? error.message : String(error)
          }]
        };
      }
    });
    if (inspections.every((row) => row.status === 'passed')) {
      plan = proposedPlan;
      physicalLayoutSelection = {
        method: 'highest-integer-logical-width-passing-existing-physical-layout-preflight',
        registryMaximum: visualState.layout.maxCharsPerLine,
        selectedMaximum: width,
        candidateInspections: inspections
      };
      break;
    }
  }
  if (plan === null || physicalLayoutSelection === null) {
    throw new Error('no logical width accepted by the existing physical layout preflight');
  }

  await mkdir(outputRoot, {recursive: false});
  await mkdir(temporaryRoot, {recursive: false});
  const planPath = path.join(outputRoot, 'video-intervalization-improvement-plan-v001.json');
  await writeFile(planPath, serializeDistantConnectionVideoPrototypePlanV001(plan), {flag: 'wx'});
  const runtime = rendererJob.runtimeBindings;
  const results: any[] = [];

  for (const candidate of plan.candidates) {
    const candidateRoot = path.join(outputRoot, 'candidates', candidate.candidateId);
    const renderOutput = path.join(candidateRoot, 'render');
    const observationDirectory = path.join(candidateRoot, 'process-observations-v001');
    const candidateTemporaryRoot = path.join(temporaryRoot, candidate.candidateId);
    await mkdir(candidateRoot, {recursive: true});
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory});
    const base = await manufactureBaseMedia(
      candidate,
      candidateTemporaryRoot,
      processObserver,
      runtime.ffmpeg.path
    );
    const baseInspection = await inspectRenderedMediaWithToolsV001(base.baseMediaPath, {
      ffprobePath: runtime.ffprobe.path,
      ffmpegPath: runtime.ffmpeg.path,
      processObserver,
      observationLabelPrefix: 'base-media-inspection'
    });
    if (baseInspection.video?.frameCount !== base.totalFrames
      || baseInspection.video?.width !== 1920
      || baseInspection.video?.height !== 1080
      || baseInspection.video?.fps !== 30
      || baseInspection.audio === null) {
      throw new Error(`${candidate.candidateId} base media inspection failed: ${JSON.stringify(baseInspection)}`);
    }

    const built = buildInstructionAndLayout(
      candidate,
      visualState,
      rendererTrust.layoutRules.characterWidthRule,
      plan.captionLayoutPolicy.maxLogicalWidthPerLine
    );
    if (built.expectedFrameCount !== base.totalFrames) {
      throw new Error(`${candidate.candidateId} interval/frame mapping mismatch`);
    }
    const common = buildPresentationInstructionCommonCorePlanV001({
      job: {executionInputs: {format: 'normal-landscape', canvas: {width: 1920, height: 1080, fps: 30}}},
      visualStateId,
      instructionArtifact: built.instructionArtifact,
      lineLayout: built.lineLayout,
      styleProfileRegistry: presetRegistry,
      rendererTrust
    });
    if (common.status !== 'built') {
      throw new Error(`${candidate.candidateId} common renderer plan failed: ${JSON.stringify(common)}`);
    }
    const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: runtime.remotion.path,
      chromiumPath: runtime.chromium.path,
      processObserver
    });
    const preflight = inspectPresentationRenderLayoutV001({
      canvas: common.plan.canvas,
      overlays: common.plan.elements.map((element: any) =>
        overlayAdapter.buildProps(element, common.plan, presetRegistry))
    });
    await writeJson(path.join(candidateRoot, 'layout-preflight-v001.json'), preflight);
    if (preflight.status !== 'passed') {
      throw new Error(`${candidate.candidateId} layout preflight failed: ${JSON.stringify(preflight.violations)}`);
    }
    const draw = await executeValidatedPresentationDrawAndQcV001({
      outputDirectory: renderOutput,
      plan: common.plan,
      presetRegistry,
      baseMediaPath: base.baseMediaPath,
      baseMediaInspection: {media: baseInspection},
      expectedFrameCount: base.totalFrames,
      evaluateQc: (input: any) => evaluatePresentationRendererQcWithProfileV001(input, {
        schemaVersion: 'distant-connection-video-prototype-qc-v001',
        planFile: 'presentation-render-plan-v002.json'
      }),
      toolPaths: {
        ffmpegPath: runtime.ffmpeg.path,
        ffprobePath: runtime.ffprobe.path,
        imageMagickPath: runtime.imageMagick.path,
        tsxPath: runtime.tsx.path,
        layoutInspectorPath: path.join(
          workspaceRoot,
          'evals/clip_composition/inspect_presentation_render_layout_v001.ts'
        )
      },
      overlayAdapter,
      processObserver,
      validatedLayoutInspection: preflight
    });
    if (draw.exitCode !== 0 || draw.finalQc?.status !== 'passed') {
      await writeJson(path.join(candidateRoot, 'render-failure-v001.json'), draw);
      throw new Error(`${candidate.candidateId} render/QC failed`);
    }
    const candidateManifest = {
      schemaVersion: 'distant-connection-video-intervalization-improvement-candidate-v001',
      candidateId: candidate.candidateId,
      sourceVideoBinding: plan.sourceVideoBinding,
      candidateResponseBinding: plan.candidateResponseBinding,
      semanticUtteranceBinding: plan.semanticUtteranceBinding,
      firstPart: candidate.firstPart,
      formalSecondPart: candidate.formalSecondPart,
      secondPart: candidate.secondPart,
      intervalizationDecision: candidate.intervalizationDecision,
      gapMs: candidate.gapMs,
      outputFrameMapping: {
        fps: 30,
        firstPartFrameCount: built.firstFrameCount,
        secondPartFrameCount: built.secondFrameCount,
        totalFrameCount: built.expectedFrameCount
      },
      captionCueCount: candidate.captions.length,
      captionCues: candidate.captions,
      qc: draw.finalQc
    };
    await Promise.all([
      writeJson(path.join(draw.stagingDirectory, 'video-intervalization-improvement-candidate-v001.json'), candidateManifest),
      writeJson(path.join(draw.stagingDirectory, 'presentation-instruction-v001.json'), built.instructionArtifact),
      writeJson(path.join(draw.stagingDirectory, 'line-layout-v001.json'), built.lineLayout),
      writeJson(path.join(draw.stagingDirectory, 'presentation-render-plan-v002.json'), common.plan),
      writeJson(
        path.join(draw.stagingDirectory, 'presentation-render-application-results-v002.json'),
        draw.applicationResults
      ),
      writeJson(path.join(draw.stagingDirectory, 'presentation-render-qc-v002.json'), draw.finalQc)
    ]);
    await commitValidatedPresentationArtifactsV002({
      stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory,
      reservation: draw.reservation
    });
    const videoPath = path.join(renderOutput, 'presentation-rendered-v002.mp4');
    const publishedInspection = await inspectRenderedMediaWithToolsV001(videoPath, {
      ffprobePath: runtime.ffprobe.path,
      ffmpegPath: runtime.ffmpeg.path,
      processObserver,
      observationLabelPrefix: 'published-video-inspection'
    });
    if (publishedInspection.video?.frameCount !== base.totalFrames
      || publishedInspection.audio === null
      || publishedInspection.audio.packetPayloadSha256
        !== baseInspection.audio.packetPayloadSha256) {
      throw new Error(`${candidate.candidateId} published media verification failed`);
    }
    results.push({
      candidateId: candidate.candidateId,
      anchorId: candidate.anchorId,
      direction: candidate.direction,
      addedUnderstanding: candidate.addedUnderstanding,
      firstPart: candidate.firstPart,
      formalSecondPart: candidate.formalSecondPart,
      secondPart: candidate.secondPart,
      intervalizationDecision: candidate.intervalizationDecision,
      gapMs: candidate.gapMs,
      videoRelativePath: path.posix.join(
        'candidates', candidate.candidateId, 'render', 'presentation-rendered-v002.mp4'
      ),
      video: {path: relative(videoPath), fileSha256: await fileSha256V002(videoPath)},
      media: publishedInspection,
      qc: {
        path: relative(path.join(renderOutput, 'presentation-render-qc-v002.json')),
        fileSha256: await fileSha256V002(path.join(renderOutput, 'presentation-render-qc-v002.json')),
        status: draw.finalQc.status
      },
      processObservations: relative(observationDirectory)
    });
  }

  const reviewHtml = buildReviewHtml(results);
  const reviewPath = path.join(outputRoot, 'review.html');
  await writeFile(reviewPath, reviewHtml, {encoding: 'utf8', flag: 'wx'});
  const finalManifest = {
    schemaVersion: 'distant-connection-video-intervalization-improvement-result-v001',
    sourceVideoId: plan.sourceVideoId,
    sourceBindings: {
      sourceVideo: plan.sourceVideoBinding,
      candidateResponse: plan.candidateResponseBinding,
      semanticUtterance: plan.semanticUtteranceBinding,
      sourcePackage: plan.sourcePackageBinding,
      intervalizationImprovementPlan: {path: relative(planPath), fileSha256: await fileSha256V002(planPath)}
    },
    intervalPolicy: plan.intervalPolicy,
    physicalLayoutSelection,
    candidateCount: results.length,
    candidates: results,
    reviewPage: {path: relative(reviewPath), fileSha256: sha256(reviewHtml)},
    qc: {
      status: results.length === plan.candidates.length
        && results.every((row) => row.qc.status === 'passed')
        ? 'passed' : 'failed',
      candidateOrderMatchesFormalResponse: results.map((row) => row.candidateId).join(',')
        === plan.candidates.map((row) => row.candidateId).join(','),
      sourceVideoShaMatches: await fileSha256Streaming(sourceVideoPath) === expectedSourceVideoSha,
      candidateResponseShaMatches: sha256(await readFile(candidateResponsePath)) === expectedCandidateSha,
      semanticUtteranceShaMatches: sha256(await readFile(semanticUtterancePath)) === expectedSemanticSha,
      unrelatedMiddleIntervalsIncluded: false,
      formalCandidatesChanged: false,
      firstPartsChanged: false,
      secondPartsContainFormalSelections: results.every((row) =>
        row.formalSecondPart.semanticUtteranceIds.every((id: string) =>
          row.secondPart.semanticUtteranceIds.includes(id))),
      subtitlesUseApprovedExistingProfile: styleProfileId,
      apiCalls: 0,
      costUsd: 0,
      remoteOperations: 0
    }
  };
  if (finalManifest.qc.status !== 'passed'
    || !finalManifest.qc.candidateOrderMatchesFormalResponse
    || !finalManifest.qc.sourceVideoShaMatches
    || !finalManifest.qc.candidateResponseShaMatches
    || !finalManifest.qc.semanticUtteranceShaMatches
    || !finalManifest.qc.secondPartsContainFormalSelections) {
    throw new Error('final prototype QC failed');
  }
  const manifestPath = path.join(outputRoot, 'video-intervalization-improvement-result-v001.json');
  await writeJson(manifestPath, finalManifest);
  await rm(temporaryRoot, {recursive: true, force: false});
  process.stdout.write(`${JSON.stringify({
    status: 'completed',
    outputRoot: relative(outputRoot),
    reviewPage: {path: relative(reviewPath), fileSha256: await fileSha256V002(reviewPath)},
    resultManifest: {path: relative(manifestPath), fileSha256: await fileSha256V002(manifestPath)},
    candidates: results.map((row) => ({
      candidateId: row.candidateId,
      video: row.video,
      durationMs: row.media.durationMs,
      frameCount: row.media.video.frameCount,
      qc: row.qc.status
    }))
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

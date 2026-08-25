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
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticUtterancePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);
const sourcePackagePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-quality-increment-ymUsGrT6EaA-v001/source-package-v001.json'
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
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-quality-increment-ymUsGrT6EaA-v001'
);
const temporaryRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/.distant-connection-video-prototype-quality-increment-ymUsGrT6EaA-v001.work'
);

const expectedCandidateSha = '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d';
const expectedSemanticSha = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const expectedSourceVideoSha = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const styleProfileId = 'normal-landscape-readable-pop-v001';
const visualStateId = 'caption-core-v001';

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
    <div class="times"><strong>前半</strong> ${escapeHtml(formatClock(result.firstPart.sourceStartMs))}–${escapeHtml(formatClock(result.firstPart.sourceEndMs))}<br>
    <strong>後半</strong> ${escapeHtml(formatClock(result.secondPart.sourceStartMs))}–${escapeHtml(formatClock(result.secondPart.sourceEndMs))}<br>
    <strong>距離</strong> ${escapeHtml(formatGap(result.gapMs))}</div>
    <section class="speech"><h2>前半の実際の発話</h2><p>${escapeHtml(result.firstPart.text)}</p></section>
    <section class="speech"><h2>後半の実際の発話</h2><p>${escapeHtml(result.secondPart.text)}</p></section>
    <section><h2>前を付けることで分かること</h2><p>${escapeHtml(result.addedUnderstanding)}</p></section>
    <p class="sha">video SHA-256 ${escapeHtml(result.video.fileSha256)}</p>
  </article>`).join('\n');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ymUsGrT6EaA 遠方接続 探索品質改訂後の動画試作</title><style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#080b13;color:#eef3ff}
body{margin:0;padding:32px;background:linear-gradient(145deg,#080b13,#111b33)}main{max-width:1320px;margin:auto}
h1{margin:0 0 8px;font-size:32px}.lead{color:#bdc9e3;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(500px,1fr));gap:22px}
article{background:#10182a;border:1px solid #334363;border-radius:16px;padding:18px;box-shadow:0 14px 44px #0007}header{display:flex;justify-content:space-between;align-items:center}
.candidate{font:700 18px ui-monospace,SFMono-Regular,Menlo,monospace}.passed{color:#78e7aa}video{display:block;width:100%;aspect-ratio:16/9;background:#000;border-radius:10px;margin:16px 0}
.times{line-height:1.8;color:#d6e1f7}h2{font-size:15px;color:#9db6e8;margin:16px 0 6px}.speech{padding:10px 12px;background:#0b1221;border-radius:8px}.speech p{line-height:1.7}.sha{font:11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#8393b5;word-break:break-all}
.check{margin-top:24px;padding:16px 20px;border-left:4px solid #78a6ff;background:#0d1528;border-radius:8px}
</style></head><body><main><h1>探索品質改訂後の遠方接続 — 動画試作2件</h1>
<p class="lead">前の場面を見てから後の場面を見ると、後の理解・回収感・面白さが本当に増えるかを確認してください。正式採否はまだ行いません。</p>
<section class="grid">${cards}</section><section class="check"><strong>見る点</strong>：前後が意味的につながるか／前半が後半の理解を増やすか／単なる同一テーマではなく先に見せる価値があるか。</section>
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
  const profile = presetRegistry.presets.find((row: any) => row.presetId === styleProfileId);
  const visualState = profile?.visualStates?.find((row: any) => row.stateId === visualStateId);
  if (!profile || !visualState) throw new Error('approved normal landscape caption state is unavailable');
  const buildPlanAtWidth = (maxLogicalWidthPerLine: number) =>
    buildDistantConnectionVideoPrototypePlanV001({
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
  const planPath = path.join(outputRoot, 'video-prototype-plan-v001.json');
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
      schemaVersion: 'distant-connection-video-prototype-candidate-v001',
      candidateId: candidate.candidateId,
      sourceVideoBinding: plan.sourceVideoBinding,
      candidateResponseBinding: plan.candidateResponseBinding,
      semanticUtteranceBinding: plan.semanticUtteranceBinding,
      firstPart: candidate.firstPart,
      secondPart: candidate.secondPart,
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
      writeJson(path.join(draw.stagingDirectory, 'video-prototype-candidate-v001.json'), candidateManifest),
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
      secondPart: candidate.secondPart,
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
    schemaVersion: 'distant-connection-video-prototype-result-v001',
    sourceVideoId: plan.sourceVideoId,
    sourceBindings: {
      sourceVideo: plan.sourceVideoBinding,
      candidateResponse: plan.candidateResponseBinding,
      semanticUtterance: plan.semanticUtteranceBinding,
      sourcePackage: plan.sourcePackageBinding,
      prototypePlan: {path: relative(planPath), fileSha256: await fileSha256V002(planPath)}
    },
    intervalPolicy: plan.intervalPolicy,
    physicalLayoutSelection,
    candidateCount: results.length,
    candidates: results,
    reviewPage: {path: relative(reviewPath), fileSha256: sha256(reviewHtml)},
    qc: {
      status: results.length === 2 && results.every((row) => row.qc.status === 'passed')
        ? 'passed' : 'failed',
      candidateOrderMatchesFormalResponse: results.map((row) => row.candidateId).join(',')
        === plan.candidates.map((row) => row.candidateId).join(','),
      sourceVideoShaMatches: await fileSha256Streaming(sourceVideoPath) === expectedSourceVideoSha,
      candidateResponseShaMatches: sha256(await readFile(candidateResponsePath)) === expectedCandidateSha,
      semanticUtteranceShaMatches: sha256(await readFile(semanticUtterancePath)) === expectedSemanticSha,
      unrelatedMiddleIntervalsIncluded: false,
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
    || !finalManifest.qc.semanticUtteranceShaMatches) {
    throw new Error('final prototype QC failed');
  }
  const manifestPath = path.join(outputRoot, 'video-prototype-result-v001.json');
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

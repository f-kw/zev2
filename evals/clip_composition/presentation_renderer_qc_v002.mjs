import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';

export const PRESENTATION_RENDERER_QC_SCHEMA_VERSION = 'presentation-render-qc-v002';
export const PRESENTATION_REVIEW_RENDERER_QC_SCHEMA_VERSION_V003 =
  'presentation-review-render-qc-v003';
export const PRESENTATION_VERTICAL_REVIEW_RENDERER_QC_SCHEMA_VERSION_V001 =
  'presentation-vertical-review-renderer-qc-v001';

export const PRESENTATION_RENDERER_QC_VIOLATION_CODES = Object.freeze([
  'LAYOUT_LINE_COUNT_EXCEEDED',
  'LAYOUT_LINE_POSITIVE_INTERSECTION',
  'LAYOUT_SAFE_AREA_VIOLATION',
  'OVERLAY_ALPHA_EMPTY',
  'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION',
  'INSTRUCTION_RENDER_MISSING',
  'INSTRUCTION_RENDER_DUPLICATED',
  'OVERLAY_RENDER_ARTIFACT_MISMATCH',
  'OVERLAY_RENDER_PATH_DUPLICATED',
  'APPLIED_PRESET_MISMATCH',
  'OUTPUT_VIDEO_STREAM_MISSING',
  'OUTPUT_AUDIO_STREAM_MISSING',
  'OUTPUT_AUDIO_PACKET_HASH_MISMATCH',
  'OUTPUT_FORMAT_MISMATCH',
  'OUTPUT_ELEMENT_NOT_VISIBLE',
]);

const CODE_ORDER = new Map(PRESENTATION_RENDERER_QC_VIOLATION_CODES.map((code, index) => [code, index]));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
};
const sha256Canonical = (value) => createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex');
const makeViolation = (code, relatedIds = [], details = undefined) => ({
  code,
  relatedIds: [...new Set(relatedIds.filter(isNonEmptyString))].sort(),
  ...(details === undefined ? {} : {details: canonicalize(details)}),
});
const sortViolations = (violations) => violations.sort((left, right) => {
  const order = (CODE_ORDER.get(left.code) ?? Number.MAX_SAFE_INTEGER) - (CODE_ORDER.get(right.code) ?? Number.MAX_SAFE_INTEGER);
  if (order !== 0) return order;
  return JSON.stringify(left).localeCompare(JSON.stringify(right), 'en');
});

const runBufferUnobserved = (command, args) => new Promise((resolve, reject) => {
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  child.on('error', reject);
  child.on('close', (code) => {
    if (code === 0) resolve({stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)});
    else reject(new Error(`${command} failed (${code ?? 'unknown'}): ${Buffer.concat(stderr).toString()}`));
  });
});

const runBuffer = (command, args, {
  processObserver = null,
  observationLabel = 'renderer-qc-process',
} = {}) => processObserver === null
  ? runBufferUnobserved(command, args)
  : processObserver.run(command, args, {
    allowedExitCodes: [0],
    observationLabel,
  });

const overlap = (left, right) => ({
  width: Math.min(left.right, right.right) - Math.max(left.left, right.left),
  height: Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
});
const timeOverlap = (left, right) => Math.min(left.endFrameExclusive, right.endFrameExclusive)
  - Math.max(left.startFrame, right.startFrame);

const QC_OUTPUT_PROFILE_V002 = Object.freeze({
  schemaVersion: PRESENTATION_RENDERER_QC_SCHEMA_VERSION,
  planFile: 'presentation-render-plan-v002.json',
});
const QC_OUTPUT_PROFILE_V003 = Object.freeze({
  schemaVersion: PRESENTATION_REVIEW_RENDERER_QC_SCHEMA_VERSION_V003,
  planFile: 'presentation-review-render-plan-v003.json',
});
const QC_OUTPUT_PROFILE_VERTICAL_V001 = Object.freeze({
  schemaVersion: PRESENTATION_VERTICAL_REVIEW_RENDERER_QC_SCHEMA_VERSION_V001,
  planFile: 'presentation-vertical-review-render-plan-v001.json',
});

function evaluatePresentationRendererQc({
  plan,
  applicationResults,
  overlayInspections,
  mediaInspection,
  expectedAudio,
  expectedFrameCount,
  canvas,
  requireFinalVisibility = true,
}, outputProfile) {
  const violations = [];
  const instructionIds = (plan?.elements ?? []).map((element) => element.instructionId);
  const resultsByInstruction = new Map();
  for (const result of applicationResults ?? []) {
    const entries = resultsByInstruction.get(result?.instructionId) ?? [];
    entries.push(result);
    resultsByInstruction.set(result?.instructionId, entries);
  }
  const inspectionByInstruction = new Map();
  for (const inspection of overlayInspections ?? []) {
    const entries = inspectionByInstruction.get(inspection?.instructionId) ?? [];
    entries.push(inspection);
    inspectionByInstruction.set(inspection?.instructionId, entries);
  }
  const instructionIdSet = new Set(instructionIds);
  for (const [instructionId, results] of resultsByInstruction) {
    if (!instructionIdSet.has(instructionId)) {
      violations.push(makeViolation('INSTRUCTION_RENDER_DUPLICATED', [instructionId], {
        undeclaredInstructionId: true,
        count: results.length,
      }));
    }
  }
  for (const [instructionId, inspections] of inspectionByInstruction) {
    if (!instructionIdSet.has(instructionId)) {
      violations.push(makeViolation('INSTRUCTION_RENDER_DUPLICATED', [instructionId], {
        undeclaredInspection: true,
        count: inspections.length,
      }));
    }
  }

  const overlayPaths = new Map();
  for (const result of applicationResults ?? []) {
    if (!isNonEmptyString(result?.overlayFile)) continue;
    const owners = overlayPaths.get(result.overlayFile) ?? [];
    owners.push(result.instructionId);
    overlayPaths.set(result.overlayFile, owners);
  }
  for (const [overlayFile, owners] of overlayPaths) {
    if (owners.length > 1) {
      violations.push(makeViolation('OVERLAY_RENDER_PATH_DUPLICATED', owners, {
        overlayFile,
        count: owners.length,
      }));
    }
  }

  for (const element of plan?.elements ?? []) {
    const results = resultsByInstruction.get(element.instructionId) ?? [];
    if (results.length === 0) violations.push(makeViolation('INSTRUCTION_RENDER_MISSING', [element.instructionId]));
    if (results.length > 1) {
      violations.push(makeViolation('INSTRUCTION_RENDER_DUPLICATED', [element.instructionId], {count: results.length}));
    }
    for (const result of results) {
      if (
        result.requestedPresetId !== element.presetId
        || result.appliedPresetId !== element.presetId
        || result.appliedPresetRegistryVersion !== element.registryVersion
      ) {
        violations.push(makeViolation('APPLIED_PRESET_MISMATCH', [element.instructionId], {
          expectedPresetId: element.presetId,
          expectedRegistryVersion: element.registryVersion,
          requestedPresetId: result.requestedPresetId,
          appliedPresetId: result.appliedPresetId,
          appliedPresetRegistryVersion: result.appliedPresetRegistryVersion,
        }));
      }
    }

    const inspections = inspectionByInstruction.get(element.instructionId) ?? [];
    if (inspections.length === 0) {
      violations.push(makeViolation('INSTRUCTION_RENDER_MISSING', [element.instructionId], {
        missingOverlayInspection: true,
      }));
      continue;
    }
    if (inspections.length > 1) {
      violations.push(makeViolation('INSTRUCTION_RENDER_DUPLICATED', [element.instructionId], {
        duplicateOverlayInspections: true,
        count: inspections.length,
      }));
      continue;
    }
    const inspection = inspections[0];
    if (
      results.length === 1
      && (
        !isNonEmptyString(results[0].overlayFile)
        || results[0].overlayFile !== inspection.overlayFile
        || !isNonEmptyString(results[0].overlaySha256)
        || results[0].overlaySha256 !== inspection.overlaySha256
      )
    ) {
      violations.push(makeViolation('OVERLAY_RENDER_ARTIFACT_MISMATCH', [element.instructionId], {
        applicationOverlayFile: results[0].overlayFile ?? null,
        inspectedOverlayFile: inspection.overlayFile ?? null,
        applicationOverlaySha256: results[0].overlaySha256 ?? null,
        inspectedOverlaySha256: inspection.overlaySha256 ?? null,
      }));
    }
    if (
      results.length === 1
      && (
        !isNonEmptyString(results[0].appliedOverlayPropsCanonicalSha256)
        || results[0].appliedOverlayPropsCanonicalSha256
          !== inspection.appliedOverlayPropsCanonicalSha256
      )
    ) {
      violations.push(makeViolation('APPLIED_PRESET_MISMATCH', [element.instructionId], {
        applicationOverlayPropsCanonicalSha256:
          results[0].appliedOverlayPropsCanonicalSha256 ?? null,
        renderedOverlayPropsCanonicalSha256:
          inspection.appliedOverlayPropsCanonicalSha256 ?? null,
      }));
    }
    if (results.length === 1 && isNonEmptyString(inspection.overlaySha256)) {
      const expectedFinalElementHash = sha256Canonical({
        ...element,
        overlaySha256: inspection.overlaySha256,
      });
      if (
        results[0].finalPlanElementReference?.planFile
          !== outputProfile.planFile
        || results[0].finalPlanElementReference?.instructionId !== element.instructionId
        || results[0].finalPlanElementReference?.canonicalSha256 !== expectedFinalElementHash
      ) {
        violations.push(makeViolation('INSTRUCTION_RENDER_MISSING', [element.instructionId], {
          finalPlanElementReference: results[0].finalPlanElementReference ?? null,
          expectedFinalElementCanonicalSha256: expectedFinalElementHash,
        }));
      }
    }
    if (!inspection.alphaBounds || !(inspection.alphaMax > 0)) {
      violations.push(makeViolation('OVERLAY_ALPHA_EMPTY', [element.instructionId]));
      continue;
    }
    const bounds = inspection.alphaBounds;
    const safe = canvas.safeAreaPx;
    const isTopBand = element.visualState?.position?.preset === 'top-band';
    if (inspection.lineCount > element.visualState.layout.maxLines) {
      violations.push(makeViolation('LAYOUT_LINE_COUNT_EXCEEDED', [element.instructionId], {
        actual: inspection.lineCount,
        allowed: element.visualState.layout.maxLines,
      }));
    }
    const lineAlphaBounds = Array.isArray(inspection.lineAlphaBounds)
      ? inspection.lineAlphaBounds
      : [];
    const lineAlphaBoundsInvalid = (
      lineAlphaBounds.length !== element.indexedLines.length
      || lineAlphaBounds.some((entry, index) => (
        entry?.lineIndex !== index
        || ![entry.left, entry.top, entry.right, entry.bottom].every(Number.isFinite)
        || entry.right <= entry.left
        || entry.bottom <= entry.top
      ))
    );
    if (lineAlphaBoundsInvalid) {
      violations.push(makeViolation('OVERLAY_ALPHA_EMPTY', [element.instructionId], {
        expectedLineCount: element.indexedLines.length,
        observedLineAlphaBounds: lineAlphaBounds,
      }));
    }
    const topBandBoundsInvalid = isTopBand && (
      bounds.left !== 0
      || bounds.top !== 0
      || bounds.right !== canvas.width
      || bounds.bottom > canvas.height
    );
    const topBandVisibleCenterInvalid = isTopBand
      && !lineAlphaBoundsInvalid
      && (
        lineAlphaBounds.some(entry => (
          Math.abs(
            (entry.left + entry.right) - (bounds.left + bounds.right)
          ) > 1
        ))
        || Math.abs(
          (
            Math.min(...lineAlphaBounds.map(entry => entry.top))
            + Math.max(...lineAlphaBounds.map(entry => entry.bottom))
          ) - (bounds.top + bounds.bottom)
        ) > 1
      );
    const lineSafeAreaInvalid = lineAlphaBounds.some(entry => (
      !entry
      || ![entry.left, entry.top, entry.right, entry.bottom].every(Number.isFinite)
      || entry.left < safe.left
      || entry.top < safe.top
      || entry.right > canvas.width - safe.right
      || entry.bottom > canvas.height - safe.bottom
    ));
    const regularBoundsInvalid = !isTopBand && (
      bounds.left < safe.left
      || bounds.top < safe.top
      || bounds.right > canvas.width - safe.right
      || bounds.bottom > canvas.height - safe.bottom
    );
    if (
      topBandBoundsInvalid
      || topBandVisibleCenterInvalid
      || lineSafeAreaInvalid
      || regularBoundsInvalid
    ) {
      violations.push(makeViolation('LAYOUT_SAFE_AREA_VIOLATION', [element.instructionId], {
        bounds,
        lineAlphaBounds,
        safeAreaPx: safe,
        geometryPolicy: isTopBand
          ? 'canvas-top-band-with-visible-text-centered-and-safe'
          : 'full-overlay-safe-area',
      }));
    }
    for (let leftIndex = 0; leftIndex < lineAlphaBounds.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < lineAlphaBounds.length; rightIndex += 1) {
        const intersection = overlap(lineAlphaBounds[leftIndex], lineAlphaBounds[rightIndex]);
        if (intersection.width > 0 && intersection.height > 0) {
          violations.push(makeViolation('LAYOUT_LINE_POSITIVE_INTERSECTION', [element.instructionId], {
            leftIndex,
            rightIndex,
            ...intersection,
          }));
        }
      }
    }
    if (
      requireFinalVisibility
      && (
      inspection.visibilityComparisonBasis !== 'same-composite-with-instruction-omitted'
      || !(inspection.changedPixelsAgainstInstructionOmittedFrame > 0)
      )
    ) {
      violations.push(makeViolation('OUTPUT_ELEMENT_NOT_VISIBLE', [element.instructionId]));
    }
  }

  const elements = plan?.elements ?? [];
  for (let leftIndex = 0; leftIndex < elements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < elements.length; rightIndex += 1) {
      const left = elements[leftIndex];
      const right = elements[rightIndex];
      if (timeOverlap(left, right) <= 0) continue;
      const leftInspection = inspectionByInstruction.get(left.instructionId)?.[0];
      const rightInspection = inspectionByInstruction.get(right.instructionId)?.[0];
      if (!leftInspection?.alphaBounds || !rightInspection?.alphaBounds) continue;
      const intersection = overlap(leftInspection.alphaBounds, rightInspection.alphaBounds);
      if (intersection.width > 0 && intersection.height > 0) {
        violations.push(makeViolation('INSTRUCTION_TEMPORAL_SPATIAL_COLLISION', [left.instructionId, right.instructionId], {
          overlappingFrames: timeOverlap(left, right),
          ...intersection,
        }));
      }
    }
  }

  if (!mediaInspection?.video) {
    violations.push(makeViolation('OUTPUT_VIDEO_STREAM_MISSING'));
  } else if (
    mediaInspection.video.width !== canvas.width
    || mediaInspection.video.height !== canvas.height
    || mediaInspection.video.fps !== canvas.fps
    || (
      Number.isInteger(expectedFrameCount)
      && mediaInspection.video.frameCount !== expectedFrameCount
    )
    || !(mediaInspection.durationMs > 0)
  ) {
    violations.push(makeViolation('OUTPUT_FORMAT_MISMATCH', [], {
      actual: mediaInspection.video,
      durationMs: mediaInspection.durationMs,
      expected: {
        width: canvas.width,
        height: canvas.height,
        fps: canvas.fps,
        ...(Number.isInteger(expectedFrameCount) ? {frameCount: expectedFrameCount} : {}),
      },
    }));
  }
  if (expectedAudio?.present) {
    if (!mediaInspection?.audio) {
      violations.push(makeViolation('OUTPUT_AUDIO_STREAM_MISSING'));
    } else if (
      mediaInspection.audio.codecName !== expectedAudio.codecName
      || mediaInspection.audio.packetPayloadSha256 !== expectedAudio.packetPayloadSha256
    ) {
      violations.push(makeViolation('OUTPUT_AUDIO_PACKET_HASH_MISMATCH', [], {
        expected: expectedAudio,
        actual: mediaInspection.audio,
      }));
    }
  } else if (expectedAudio?.present === false && mediaInspection?.audio) {
    violations.push(makeViolation('OUTPUT_FORMAT_MISMATCH', [], {
      expectedAudio: {present: false},
      actualAudio: mediaInspection.audio,
    }));
  }

  sortViolations(violations);
  const instructionEvidence = (plan?.elements ?? []).map((element) => {
    const inspection = inspectionByInstruction.get(element.instructionId)?.[0] ?? null;
    const application = resultsByInstruction.get(element.instructionId)?.[0] ?? null;
    return {
      instructionId: element.instructionId,
      requestedPresetId: application?.requestedPresetId ?? null,
      appliedPresetId: application?.appliedPresetId ?? null,
      appliedPresetRegistryVersion: application?.appliedPresetRegistryVersion ?? null,
      alphaMax: inspection?.alphaMax ?? null,
      alphaBounds: inspection?.alphaBounds ?? null,
      lineCount: inspection?.lineCount ?? null,
      lineAlphaBounds: structuredClone(inspection?.lineAlphaBounds ?? []),
      visibilityComparisonBasis: inspection?.visibilityComparisonBasis ?? null,
      representativeFrame: inspection?.representativeFrame ?? null,
      changedPixelsAgainstInstructionOmittedFrame:
        inspection?.changedPixelsAgainstInstructionOmittedFrame ?? null,
      appliedOverlayPropsCanonicalSha256:
        inspection?.appliedOverlayPropsCanonicalSha256 ?? null,
      applicationOverlayFile: application?.overlayFile ?? null,
      inspectedOverlayFile: inspection?.overlayFile ?? null,
      applicationOverlaySha256: application?.overlaySha256 ?? null,
      overlaySha256: inspection?.overlaySha256 ?? null,
    };
  });
  return {
    schemaVersion: outputProfile.schemaVersion,
    status: violations.length === 0 ? 'passed' : 'failed',
    instructionCount: instructionIds.length,
    checks: {
      instructionApplication: {status: violations.some((item) => [
        'INSTRUCTION_RENDER_MISSING',
        'INSTRUCTION_RENDER_DUPLICATED',
        'OVERLAY_RENDER_ARTIFACT_MISMATCH',
        'OVERLAY_RENDER_PATH_DUPLICATED',
        'APPLIED_PRESET_MISMATCH',
      ].includes(item.code)) ? 'failed' : 'passed'},
      layoutAndVisibility: {status: violations.some((item) => [
        'LAYOUT_LINE_COUNT_EXCEEDED',
        'LAYOUT_LINE_POSITIVE_INTERSECTION',
        'LAYOUT_SAFE_AREA_VIOLATION',
        'OVERLAY_ALPHA_EMPTY',
        'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION',
        'OUTPUT_ELEMENT_NOT_VISIBLE',
      ].includes(item.code)) ? 'failed' : 'passed'},
      media: {status: violations.some((item) => item.code.startsWith('OUTPUT_') && item.code !== 'OUTPUT_ELEMENT_NOT_VISIBLE')
        ? 'failed'
        : 'passed'},
    },
    instructionEvidence,
    mediaEvidence: {
      observed: structuredClone(mediaInspection ?? null),
      expectedAudio: structuredClone(expectedAudio ?? null),
      expectedFrameCount: Number.isInteger(expectedFrameCount) ? expectedFrameCount : null,
    },
    violations,
  };
}

export function evaluatePresentationRendererQcV002(input) {
  return evaluatePresentationRendererQc(input, QC_OUTPUT_PROFILE_V002);
}

export function evaluatePresentationReviewRendererQcV003(input) {
  return evaluatePresentationRendererQc(input, QC_OUTPUT_PROFILE_V003);
}

export function evaluatePresentationVerticalReviewRendererQcV001(input) {
  return evaluatePresentationRendererQc(input, QC_OUTPUT_PROFILE_VERTICAL_V001);
}

export function evaluatePresentationRendererQcWithProfileV001(input, outputProfile) {
  if (
    !isObject(outputProfile)
    || !isNonEmptyString(outputProfile.schemaVersion)
    || !isNonEmptyString(outputProfile.planFile)
    || Object.keys(outputProfile).sort().join('\u0000') !== ['planFile', 'schemaVersion'].join('\u0000')
  ) {
    throw new TypeError('renderer QC output profile is invalid');
  }
  return evaluatePresentationRendererQc(input, outputProfile);
}

async function inspectOverlayPngWithCommand({
  instructionId,
  pngPath,
  lineRects = [],
  lineAlphaBounds = [],
  visibilityComparisonBasis = null,
  representativeFrame = null,
  changedPixelsAgainstInstructionOmittedFrame = null,
  appliedOverlayPropsCanonicalSha256 = null,
  overlayFile = null,
  overlaySha256 = null,
  processObserver = null,
  observationLabelPrefix = 'overlay-inspection',
}, imageMagickPath) {
  const alpha = await runBuffer(
    imageMagickPath,
    [pngPath, '-alpha', 'extract', '-format', '%[fx:maxima]', 'info:'],
    {processObserver, observationLabel: `${observationLabelPrefix}-alpha`},
  );
  const alphaMax = Number(alpha.stdout.toString().trim());
  if (!(alphaMax > 0)) {
    return {
      instructionId,
      alphaMax: 0,
      alphaBounds: null,
      lineCount: lineRects.length,
      lineRects,
      lineAlphaBounds,
      visibilityComparisonBasis,
      representativeFrame,
      changedPixelsAgainstInstructionOmittedFrame,
      appliedOverlayPropsCanonicalSha256,
      overlayFile,
      overlaySha256,
    };
  }
  // `-trim` compares against the corner pixel.  A full-width translucent band
  // legitimately occupies that corner, so trimming the source image directly
  // would mistake the band for background and retain only the opaque text.
  // Extract alpha, turn every non-zero alpha into foreground, and add a known
  // transparent border before trimming.  The artificial border makes the
  // reference background independent of the overlay's corner pixels.
  const geometry = await runBuffer(
    imageMagickPath,
    [
      pngPath,
      '-alpha', 'extract',
      '-threshold', '0',
      '-bordercolor', 'black',
      '-border', '1',
      '-trim',
      '-format', '%w %h %X %Y',
      'info:',
    ],
    {processObserver, observationLabel: `${observationLabelPrefix}-bounds`},
  );
  const match = geometry.stdout.toString().trim().match(/^(\d+) (\d+) ([+-]\d+) ([+-]\d+)$/);
  if (!match) throw new Error(`alpha bounds could not be parsed: ${geometry.stdout.toString().trim()}`);
  const width = Number(match[1]);
  const height = Number(match[2]);
  const left = Number(match[3]) - 1;
  const top = Number(match[4]) - 1;
  return {
    instructionId,
    alphaMax,
    alphaBounds: {left, top, right: left + width, bottom: top + height, width, height},
    lineCount: lineRects.length,
    lineRects,
    lineAlphaBounds,
    visibilityComparisonBasis,
    representativeFrame,
    changedPixelsAgainstInstructionOmittedFrame,
    appliedOverlayPropsCanonicalSha256,
    overlayFile,
    overlaySha256,
  };
}

export async function inspectOverlayPngV002(input) {
  return inspectOverlayPngWithCommand(input, 'magick');
}

export async function inspectOverlayPngWithToolV001(input) {
  if (!isNonEmptyString(input?.imageMagickPath)) {
    throw new TypeError('imageMagickPath is required');
  }
  const {imageMagickPath, ...inspectionInput} = input;
  return inspectOverlayPngWithCommand(inspectionInput, imageMagickPath);
}

async function audioPacketPayloadSha256WithCommand(
  filePath,
  ffmpegPath,
  processObserver = null,
  observationLabel = 'audio-payload-inspection',
) {
  const result = await runBuffer(
    ffmpegPath,
    [
      '-hide_banner', '-loglevel', 'error', '-i', filePath,
      '-map', '0:a:0', '-c:a', 'copy', '-f', 'data', '-',
    ],
    {processObserver, observationLabel},
  );
  return createHash('sha256').update(result.stdout).digest('hex');
}

export async function audioPacketPayloadSha256V002(filePath) {
  return audioPacketPayloadSha256WithCommand(filePath, 'ffmpeg');
}

export async function audioPacketPayloadSha256WithToolV001(filePath, ffmpegPath) {
  if (!isNonEmptyString(ffmpegPath)) throw new TypeError('ffmpegPath is required');
  return audioPacketPayloadSha256WithCommand(filePath, ffmpegPath);
}

async function inspectRenderedMediaWithCommands(filePath, {
  ffprobePath,
  ffmpegPath,
  processObserver = null,
  observationLabelPrefix = 'media-inspection',
}) {
  const result = await runBuffer(
    ffprobePath,
    [
      '-v', 'error', '-count_frames',
      '-show_entries', 'format=duration:stream=index,codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames',
      '-of', 'json',
      filePath,
    ],
    {processObserver, observationLabel: `${observationLabelPrefix}-ffprobe`},
  );
  const probe = JSON.parse(result.stdout.toString());
  const videoStream = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audioStream = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const parseRate = (value) => {
    const [numerator, denominator] = String(value ?? '').split('/').map(Number);
    return denominator > 0 ? numerator / denominator : Number(value);
  };
  return {
    durationMs: Math.round(Number(probe.format?.duration ?? 0) * 1000),
    video: videoStream ? {
      codecName: videoStream.codec_name,
      width: videoStream.width,
      height: videoStream.height,
      fps: parseRate(videoStream.avg_frame_rate),
      frameCount: Number(videoStream.nb_read_frames),
    } : null,
    audio: audioStream ? {
      codecName: audioStream.codec_name,
      packetPayloadSha256: await audioPacketPayloadSha256WithCommand(
        filePath,
        ffmpegPath,
        processObserver,
        `${observationLabelPrefix}-audio-payload`,
      ),
    } : null,
  };
}

export async function inspectRenderedMediaV002(filePath) {
  return inspectRenderedMediaWithCommands(filePath, {
    ffprobePath: 'ffprobe',
    ffmpegPath: 'ffmpeg',
  });
}

export async function inspectRenderedMediaWithToolsV001(filePath, tools) {
  if (!isNonEmptyString(tools?.ffprobePath) || !isNonEmptyString(tools?.ffmpegPath)) {
    throw new TypeError('ffprobePath and ffmpegPath are required');
  }
  return inspectRenderedMediaWithCommands(filePath, tools);
}

export async function fileSha256V002(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

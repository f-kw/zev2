export type ShortsScreenLayoutId =
  | 'speaker_only'
  | 'screen_speaker'
  | 'speaker_pair';

export type ShortsViewportKey = 'screen' | 'speaker' | 'speaker1' | 'speaker2';

export type ViewportCoords = [number, number, number, number];

export type ScreenRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type ShortsRawScreenDetectionKey = 'screen' | 'speaker' | 'speaker1' | 'speaker2';

type ShortsRawSpeakerDetection = {
  face: number[];
  body: number[];
};

export type ShortsRawScreenDetections = {
  screen?: number[];
  speaker?: ShortsRawSpeakerDetection;
  speaker1?: ShortsRawSpeakerDetection;
  speaker2?: ShortsRawSpeakerDetection;
};

export type ShortsScreenLayoutPlan = {
  screenLayoutId: ShortsScreenLayoutId;
  detections: ShortsRawScreenDetections;
  viewports: Partial<Record<ShortsViewportKey, ViewportCoords>>;
  displaySummary: string;
  selectedCandidateId?: string;
  candidateSummary?: string;
  selectionReason?: string;
  candidateOptions?: ShortsScreenLayoutCandidate[];
};

export type ShortsScreenLayoutCandidate = {
  id: string;
  label: string;
  reason: string;
  viewports: Partial<Record<ShortsViewportKey, ViewportCoords>>;
};

export type ShortsScreenLayoutCandidateSet = {
  screenLayoutId: ShortsScreenLayoutId;
  detections: ShortsRawScreenDetections;
  displaySummary: string;
  candidates: ShortsScreenLayoutCandidate[];
};

type ShortsScreenLayoutDefinition = {
  id: ShortsScreenLayoutId;
  label: string;
  requiredViewportKeys: ShortsViewportKey[];
  viewportRects: Partial<Record<ShortsViewportKey, ScreenRect>>;
};

export const SHORTS_RENDER_TARGET = {
  width: 1080,
  height: 1920
} as const;

const HALF_HEIGHT = SHORTS_RENDER_TARGET.height / 2;

const SCREEN_LAYOUT_DEFINITIONS: Record<ShortsScreenLayoutId, ShortsScreenLayoutDefinition> = {
  speaker_only: {
    id: 'speaker_only',
    label: '話者のみ',
    requiredViewportKeys: ['speaker'],
    viewportRects: {
      speaker: { x: 0, y: 0, w: SHORTS_RENDER_TARGET.width, h: SHORTS_RENDER_TARGET.height }
    }
  },
  screen_speaker: {
    id: 'screen_speaker',
    label: '画面と話者',
    requiredViewportKeys: ['screen', 'speaker'],
    viewportRects: {
      screen: { x: 0, y: 0, w: SHORTS_RENDER_TARGET.width, h: HALF_HEIGHT },
      speaker: { x: 0, y: HALF_HEIGHT, w: SHORTS_RENDER_TARGET.width, h: HALF_HEIGHT }
    }
  },
  speaker_pair: {
    id: 'speaker_pair',
    label: '話者2人',
    requiredViewportKeys: ['speaker1', 'speaker2'],
    viewportRects: {
      speaker1: { x: 0, y: 0, w: SHORTS_RENDER_TARGET.width, h: HALF_HEIGHT },
      speaker2: { x: 0, y: HALF_HEIGHT, w: SHORTS_RENDER_TARGET.width, h: HALF_HEIGHT }
    }
  }
};

function recordFrom(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeShortsScreenLayoutId(value: unknown, label: string): ShortsScreenLayoutId {
  if (
    value === 'speaker_only' ||
    value === 'screen_speaker' ||
    value === 'speaker_pair'
  ) {
    return value;
  }

  throw new Error(`${label}の画面枠が不正です`);
}

function resolveShortsScreenLayoutDefinition(layoutId: ShortsScreenLayoutId): ShortsScreenLayoutDefinition {
  return SCREEN_LAYOUT_DEFINITIONS[layoutId];
}

function resolveShortsViewportKeysForLayout(layoutId: ShortsScreenLayoutId): ShortsViewportKey[] {
  return [...resolveShortsScreenLayoutDefinition(layoutId).requiredViewportKeys];
}

export function resolveShortsViewportRect(
  layoutId: ShortsScreenLayoutId,
  viewportKey: ShortsViewportKey
): ScreenRect {
  const rect = resolveShortsScreenLayoutDefinition(layoutId).viewportRects[viewportKey];
  if (!rect) {
    throw new Error(`${layoutId}に${viewportKey}の表示枠がありません`);
  }

  return rect;
}

function resolveViewportRatioForLayout(
  layoutId: ShortsScreenLayoutId,
  viewportKey: ShortsViewportKey
): number {
  const rect = resolveShortsViewportRect(layoutId, viewportKey);
  return rect.w / rect.h;
}

function normalizeRawDetectionBox(rawBox: unknown, label: string): [number, number, number, number] {
  if (!Array.isArray(rawBox) || rawBox.length < 4) {
    throw new Error(`${label}の検出範囲がありません`);
  }

  const values = rawBox.slice(0, 4).map((value) => Number(value));
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label}の検出範囲に数値以外が含まれています`);
  }

  const rounded = values.map((value) => Math.round(value)) as [number, number, number, number];
  const [ymin, xmin, ymax, xmax] = rounded;
  if (
    ymin < 0 ||
    xmin < 0 ||
    ymax > 1000 ||
    xmax > 1000 ||
    ymax <= ymin ||
    xmax <= xmin
  ) {
    throw new Error(`${label}の検出範囲が動画内に収まっていません`);
  }

  return rounded;
}

function sanitizeViewportCandidate(coords: number[]): ViewportCoords {
  const left = clampNumber(Number(coords[0] ?? 0), 0, 1);
  const top = clampNumber(Number(coords[1] ?? 0), 0, 1);
  const right = clampNumber(Number(coords[2] ?? 1), 0, 1);
  const bottom = clampNumber(Number(coords[3] ?? 1), 0, 1);

  const safeRight = right > left ? right : Math.min(1, left + 0.01);
  const safeBottom = bottom > top ? bottom : Math.min(1, top + 0.01);

  return [left, top, safeRight, safeBottom];
}

function normalizeDetectionViewportCoords(coords: number[], label: string): ViewportCoords {
  const box = normalizeRawDetectionBox(coords, label);
  const maxValue = Math.max(...box.map((value) => Math.abs(value)));
  const scale = maxValue > 1.2 ? 1000 : 1;
  return sanitizeViewportCandidate([
    box[1] / scale,
    box[0] / scale,
    box[3] / scale,
    box[2] / scale
  ]);
}

function serializeViewportCoordsToRawYxyx(coords: ViewportCoords): number[] {
  return [
    Math.round(clampNumber(coords[1], 0, 1) * 1000),
    Math.round(clampNumber(coords[0], 0, 1) * 1000),
    Math.round(clampNumber(coords[3], 0, 1) * 1000),
    Math.round(clampNumber(coords[2], 0, 1) * 1000)
  ];
}

function shiftViewportRectIntoFrame(
  left: number,
  top: number,
  width: number,
  height: number
): ViewportCoords {
  const safeWidth = clampNumber(width, 0.01, 1);
  const safeHeight = clampNumber(height, 0.01, 1);
  const maxLeft = Math.max(0, 1 - safeWidth);
  const maxTop = Math.max(0, 1 - safeHeight);
  const safeLeft = clampNumber(left, 0, maxLeft);
  const safeTop = clampNumber(top, 0, maxTop);
  return [
    safeLeft,
    safeTop,
    safeLeft + safeWidth,
    safeTop + safeHeight
  ];
}

function convertViewportRatioToCropAspectRatio(expectedRatio16x9: number): number {
  return (expectedRatio16x9 * 9) / 16;
}

function buildAspectCropContainingBox(
  box: ViewportCoords,
  expectedRatio16x9: number
): ViewportCoords {
  const cropAspectRatio = convertViewportRatioToCropAspectRatio(expectedRatio16x9);
  const width = Math.max(0.01, box[2] - box[0]);
  const height = Math.max(0.01, box[3] - box[1]);
  let targetHeight = Math.max(height, width / cropAspectRatio);
  let targetWidth = targetHeight * cropAspectRatio;
  if (targetWidth > 1 || targetHeight > 1) {
    if (cropAspectRatio >= 1) {
      targetWidth = 1;
      targetHeight = Math.min(1, 1 / cropAspectRatio);
    } else {
      targetHeight = 1;
      targetWidth = Math.min(1, cropAspectRatio);
    }
  }
  const centerX = (box[0] + box[2]) / 2;
  const centerY = (box[1] + box[3]) / 2;

  return shiftViewportRectIntoFrame(
    centerX - targetWidth / 2,
    centerY - targetHeight / 2,
    targetWidth,
    targetHeight
  );
}

function boxFitsInsideViewport(box: ViewportCoords, crop: ViewportCoords): boolean {
  const rawBox = serializeViewportCoordsToRawYxyx(box);
  const rawCrop = serializeViewportCoordsToRawYxyx(crop);
  return (
    rawCrop[1] <= rawBox[1] &&
    rawCrop[0] <= rawBox[0] &&
    rawCrop[3] >= rawBox[3] &&
    rawCrop[2] >= rawBox[2]
  );
}

function shiftViewportRectToContainBox(crop: ViewportCoords, box: ViewportCoords): ViewportCoords {
  const width = crop[2] - crop[0];
  const height = crop[3] - crop[1];
  let left = crop[0];
  let top = crop[1];

  if (box[0] < left) {
    left = box[0];
  }
  if (box[2] > left + width) {
    left = box[2] - width;
  }
  if (box[1] < top) {
    top = box[1];
  }
  if (box[3] > top + height) {
    top = box[3] - height;
  }

  return shiftViewportRectIntoFrame(left, top, width, height);
}

function normalizeSpeakerDetection(rawDetection: unknown, label: string): ShortsRawSpeakerDetection {
  const detection = recordFrom(rawDetection);
  return {
    face: normalizeRawDetectionBox(detection.face, `${label}.face`),
    body: normalizeRawDetectionBox(detection.body, `${label}.body`)
  };
}

function buildSpeakerBodyViewportFromDetection(
  detection: ShortsRawSpeakerDetection,
  expectedRatio16x9: number,
  label: string
): ViewportCoords {
  const face = normalizeDetectionViewportCoords(detection.face, `${label}.face`);
  const body = normalizeDetectionViewportCoords(detection.body, `${label}.body`);
  if (face[0] < body[0] || face[1] < body[1] || face[2] > body[2] || face[3] > body[3]) {
    throw new Error(`${label}の顔検出が人物全体の範囲から外れています`);
  }

  const bodyCrop = buildAspectCropContainingBox(body, expectedRatio16x9);
  const crop = boxFitsInsideViewport(face, bodyCrop)
    ? bodyCrop
    : shiftViewportRectToContainBox(buildAspectCropContainingBox(face, expectedRatio16x9), face);
  if (!boxFitsInsideViewport(face, crop)) {
    throw new Error(`${label}から作った表示範囲に顔全体が入りません`);
  }

  return crop;
}

function buildSpeakerFaceViewportFromDetection(
  detection: ShortsRawSpeakerDetection,
  expectedRatio16x9: number,
  label: string
): ViewportCoords {
  const face = normalizeDetectionViewportCoords(detection.face, `${label}.face`);
  const crop = buildAspectCropContainingBox(face, expectedRatio16x9);
  if (!boxFitsInsideViewport(face, crop)) {
    throw new Error(`${label}から作った顔寄せ表示範囲に顔全体が入りません`);
  }

  return crop;
}

function buildScreenViewportFromDetection(
  rawBox: number[],
  expectedRatio16x9: number,
  label: string
): ViewportCoords {
  const normalizedBox = normalizeDetectionViewportCoords(rawBox, label);
  return buildAspectCropContainingBox(normalizedBox, expectedRatio16x9);
}

function requiredDetectionKeysForLayout(screenLayoutId: ShortsScreenLayoutId): ShortsRawScreenDetectionKey[] {
  if (screenLayoutId === 'screen_speaker') {
    return ['screen', 'speaker'];
  }
  if (screenLayoutId === 'speaker_pair') {
    return ['speaker1', 'speaker2'];
  }

  return ['speaker'];
}

function validateRawDetectionsForLayout(
  screenLayoutId: ShortsScreenLayoutId,
  rawDetections: unknown,
  label: string
): ShortsRawScreenDetections {
  const detections = recordFrom(rawDetections);
  const requiredKeys = requiredDetectionKeysForLayout(screenLayoutId);
  const allowedKeys = new Set(requiredKeys);
  const normalizedDetections: ShortsRawScreenDetections = {};

  for (const rawKey of Object.keys(detections)) {
    if (!allowedKeys.has(rawKey as ShortsRawScreenDetectionKey)) {
      throw new Error(`${label}に不要な検出対象 ${rawKey} が含まれています`);
    }

    const detectionKey = rawKey as ShortsRawScreenDetectionKey;
    if (detectionKey === 'screen') {
      normalizedDetections.screen = normalizeRawDetectionBox(detections.screen, `${label}.screen`);
      continue;
    }

    normalizedDetections[detectionKey] = normalizeSpeakerDetection(detections[detectionKey], `${label}.${detectionKey}`);
  }

  for (const detectionKey of requiredKeys) {
    if (!normalizedDetections[detectionKey]) {
      throw new Error(`${label}に${detectionKey}の検出結果がありません`);
    }
  }

  return normalizedDetections;
}

function buildComputedViewportsFromDetections(
  screenLayoutId: ShortsScreenLayoutId,
  detections: ShortsRawScreenDetections,
  label: string
): Partial<Record<ShortsViewportKey, ViewportCoords>> {
  const viewports: Partial<Record<ShortsViewportKey, ViewportCoords>> = {};

  for (const viewportKey of resolveShortsViewportKeysForLayout(screenLayoutId)) {
    const expectedRatio = resolveViewportRatioForLayout(screenLayoutId, viewportKey);
    if (viewportKey === 'screen') {
      if (!detections.screen) {
        throw new Error(`${label}に画面の検出結果がありません`);
      }
      viewports.screen = buildScreenViewportFromDetection(detections.screen, expectedRatio, `${label}.screen`);
      continue;
    }

    const speakerDetection = detections[viewportKey];
    if (!speakerDetection) {
      throw new Error(`${label}に${viewportKey}の検出結果がありません`);
    }
    viewports[viewportKey] = buildSpeakerBodyViewportFromDetection(speakerDetection, expectedRatio, `${label}.${viewportKey}`);
  }

  return viewports;
}

function roundedViewportKey(coords: ViewportCoords | undefined): string {
  if (!coords) {
    return 'none';
  }

  return coords.map((value) => Math.round(value * 1000)).join(',');
}

function candidateSignature(candidate: ShortsScreenLayoutCandidate): string {
  return resolveShortsViewportKeysForLayout(
    candidate.id.startsWith('screen_speaker')
      ? 'screen_speaker'
      : candidate.id.startsWith('speaker_pair')
        ? 'speaker_pair'
        : 'speaker_only'
  )
    .map((viewportKey) => `${viewportKey}:${roundedViewportKey(candidate.viewports[viewportKey])}`)
    .join('|');
}

function pushUniqueCandidate(
  candidates: ShortsScreenLayoutCandidate[],
  candidate: ShortsScreenLayoutCandidate
) {
  const signature = candidateSignature(candidate);
  if (candidates.some((existing) => candidateSignature(existing) === signature)) {
    return;
  }

  candidates.push(candidate);
}

function buildSpeakerViewportCandidates(
  detection: ShortsRawSpeakerDetection,
  expectedRatio16x9: number,
  label: string
): { body: ViewportCoords; face: ViewportCoords } {
  return {
    body: buildSpeakerBodyViewportFromDetection(detection, expectedRatio16x9, label),
    face: buildSpeakerFaceViewportFromDetection(detection, expectedRatio16x9, label)
  };
}

function buildScreenLayoutCandidatesFromDetections(
  screenLayoutId: ShortsScreenLayoutId,
  detections: ShortsRawScreenDetections,
  label: string
): ShortsScreenLayoutCandidate[] {
  const candidates: ShortsScreenLayoutCandidate[] = [];

  if (screenLayoutId === 'speaker_only') {
    if (!detections.speaker) {
      throw new Error(`${label}に話者の検出結果がありません`);
    }

    const expectedRatio = resolveViewportRatioForLayout(screenLayoutId, 'speaker');
    const speaker = buildSpeakerViewportCandidates(detections.speaker, expectedRatio, `${label}.speaker`);
    pushUniqueCandidate(candidates, {
      id: 'speaker_only_body',
      label: '話者全体を優先',
      reason: '話者のみの縦長画面で、顔を入れたまま見えている人物全体をできるだけ入れる',
      viewports: { speaker: speaker.body }
    });
    pushUniqueCandidate(candidates, {
      id: 'speaker_only_face',
      label: '顔を優先',
      reason: '話者のみの縦長画面で、顔の見やすさを優先する',
      viewports: { speaker: speaker.face }
    });
    return candidates;
  }

  if (screenLayoutId === 'screen_speaker') {
    if (!detections.screen || !detections.speaker) {
      throw new Error(`${label}に画面または話者の検出結果がありません`);
    }

    const screen = buildScreenViewportFromDetection(
      detections.screen,
      resolveViewportRatioForLayout(screenLayoutId, 'screen'),
      `${label}.screen`
    );
    const speaker = buildSpeakerViewportCandidates(
      detections.speaker,
      resolveViewportRatioForLayout(screenLayoutId, 'speaker'),
      `${label}.speaker`
    );
    pushUniqueCandidate(candidates, {
      id: 'screen_speaker_body',
      label: '画面と話者全体',
      reason: '上に画面、下に顔を入れた話者全体を表示する',
      viewports: { screen, speaker: speaker.body }
    });
    pushUniqueCandidate(candidates, {
      id: 'screen_speaker_face',
      label: '画面と顔寄せ',
      reason: '上に画面、下に顔の見やすさを優先した話者を表示する',
      viewports: { screen, speaker: speaker.face }
    });
    return candidates;
  }

  if (!detections.speaker1 || !detections.speaker2) {
    throw new Error(`${label}に2人分の話者検出結果がありません`);
  }

  const speaker1 = buildSpeakerViewportCandidates(
    detections.speaker1,
    resolveViewportRatioForLayout(screenLayoutId, 'speaker1'),
    `${label}.speaker1`
  );
  const speaker2 = buildSpeakerViewportCandidates(
    detections.speaker2,
    resolveViewportRatioForLayout(screenLayoutId, 'speaker2'),
    `${label}.speaker2`
  );
  pushUniqueCandidate(candidates, {
    id: 'speaker_pair_body',
    label: '2人の話者全体',
    reason: '上下の横長枠に、2人それぞれの顔を入れたまま人物全体をできるだけ入れる',
    viewports: { speaker1: speaker1.body, speaker2: speaker2.body }
  });
  pushUniqueCandidate(candidates, {
    id: 'speaker_pair_face',
    label: '2人の顔寄せ',
    reason: '上下の横長枠に、2人それぞれの顔の見やすさを優先して入れる',
    viewports: { speaker1: speaker1.face, speaker2: speaker2.face }
  });

  return candidates;
}

function displaySummaryForLayout(screenLayoutId: ShortsScreenLayoutId): string {
  return resolveShortsScreenLayoutDefinition(screenLayoutId).label;
}

export function buildDefaultScreenLayoutPlan(): ShortsScreenLayoutPlan {
  return {
    screenLayoutId: 'speaker_only',
    detections: {
      speaker: {
        face: [0, 0, 1000, 1000],
        body: [0, 0, 1000, 1000]
      }
    },
    viewports: {
      speaker: [0, 0, 1, 1]
    },
    displaySummary: displaySummaryForLayout('speaker_only'),
    selectedCandidateId: 'speaker_only_full',
    candidateSummary: '話者のみ全体'
  };
}

export function buildScreenLayoutCandidateSetFromGemini(
  rawSegment: unknown,
  label: string
): ShortsScreenLayoutCandidateSet {
  const record = recordFrom(rawSegment);
  const screenLayoutId = normalizeShortsScreenLayoutId(record.screenLayoutId, label);
  const detections = validateRawDetectionsForLayout(screenLayoutId, record.detections, label);
  const candidates = buildScreenLayoutCandidatesFromDetections(screenLayoutId, detections, label);
  if (candidates.length === 0) {
    throw new Error(`${label}から表示候補を作れません`);
  }

  return {
    screenLayoutId,
    detections,
    displaySummary: displaySummaryForLayout(screenLayoutId),
    candidates
  };
}

export function selectScreenLayoutCandidate(
  candidateSet: ShortsScreenLayoutCandidateSet,
  selectedCandidateId: string | undefined,
  label: string,
  selectionReason?: string
): ShortsScreenLayoutPlan {
  const candidate = selectedCandidateId
    ? candidateSet.candidates.find((item) => item.id === selectedCandidateId)
    : candidateSet.candidates[0];
  if (!candidate) {
    throw new Error(`${label}で選ばれた表示候補が候補一覧にありません`);
  }

  return {
    screenLayoutId: candidateSet.screenLayoutId,
    detections: candidateSet.detections,
    viewports: candidate.viewports,
    displaySummary: candidateSet.displaySummary,
    selectedCandidateId: candidate.id,
    candidateSummary: candidate.label,
    selectionReason,
    candidateOptions: candidateSet.candidates
  };
}

export function buildScreenLayoutPlanFromGemini(
  rawSegment: unknown,
  label: string
): ShortsScreenLayoutPlan {
  const record = recordFrom(rawSegment);
  const candidateSet = buildScreenLayoutCandidateSetFromGemini(rawSegment, label);
  return selectScreenLayoutCandidate(
    candidateSet,
    typeof record.selectedCandidateId === 'string' ? record.selectedCandidateId : undefined,
    label,
    typeof record.selectionReason === 'string' ? record.selectionReason : undefined
  );
}

export function buildPrimaryScreenLayoutPlanFromGemini(
  rawSegment: unknown,
  label: string
): ShortsScreenLayoutPlan {
  const record = recordFrom(rawSegment);
  const screenLayoutId = normalizeShortsScreenLayoutId(record.screenLayoutId, label);
  const detections = validateRawDetectionsForLayout(screenLayoutId, record.detections, label);
  const viewports = buildComputedViewportsFromDetections(screenLayoutId, detections, label);

  return {
    screenLayoutId,
    detections,
    viewports,
    displaySummary: displaySummaryForLayout(screenLayoutId)
  };
}

function normalizeViewport(coords: ViewportCoords | undefined): ViewportCoords {
  if (!coords) {
    return [0, 0, 1, 1];
  }

  const left = clampNumber(Number(coords[0] ?? 0), 0, 1);
  const top = clampNumber(Number(coords[1] ?? 0), 0, 1);
  const right = clampNumber(Number(coords[2] ?? 1), 0, 1);
  const bottom = clampNumber(Number(coords[3] ?? 1), 0, 1);
  const safeRight = right > left ? right : Math.min(1, left + 0.01);
  const safeBottom = bottom > top ? bottom : Math.min(1, top + 0.01);

  return [left, top, safeRight, safeBottom];
}

function viewportToPixelCrop(
  coords: ViewportCoords | undefined,
  sourceWidth: number,
  sourceHeight: number
): { x: number; y: number; w: number; h: number } {
  const [x1, y1, x2, y2] = normalizeViewport(coords);
  const minCropWidth = Math.min(2, sourceWidth);
  const minCropHeight = Math.min(2, sourceHeight);
  const x = clampNumber(Math.floor(x1 * sourceWidth), 0, Math.max(0, sourceWidth - minCropWidth));
  const y = clampNumber(Math.floor(y1 * sourceHeight), 0, Math.max(0, sourceHeight - minCropHeight));
  const right = clampNumber(Math.ceil(x2 * sourceWidth), x + minCropWidth, sourceWidth);
  const bottom = clampNumber(Math.ceil(y2 * sourceHeight), y + minCropHeight, sourceHeight);

  return {
    x,
    y,
    w: Math.max(1, right - x),
    h: Math.max(1, bottom - y)
  };
}

export function buildLayoutVideoFilter(params: {
  inputLabel: string;
  outputLabel: string;
  sourceWidth: number;
  sourceHeight: number;
  durationSeconds: number;
  screenLayout: ShortsScreenLayoutPlan;
}): string {
  const { inputLabel, outputLabel, sourceWidth, sourceHeight, durationSeconds, screenLayout } = params;
  const viewportKeys = resolveShortsViewportKeysForLayout(screenLayout.screenLayoutId)
    .filter((viewportKey) => Boolean(screenLayout.viewports[viewportKey]));
  if (viewportKeys.length === 0) {
    throw new Error('動画生成に使う表示範囲がありません');
  }

  const sourceLabels = viewportKeys.map((_, index) => `${outputLabel}_src_${index}`);
  const filterParts: string[] = [];
  if (viewportKeys.length === 1) {
    filterParts.push(`${inputLabel}null[${sourceLabels[0]}]`);
  } else {
    filterParts.push(`${inputLabel}split=${viewportKeys.length}${sourceLabels.map((label) => `[${label}]`).join('')}`);
  }

  for (const [index, viewportKey] of viewportKeys.entries()) {
    const rect = resolveShortsViewportRect(screenLayout.screenLayoutId, viewportKey);
    const crop = viewportToPixelCrop(screenLayout.viewports[viewportKey], sourceWidth, sourceHeight);
    filterParts.push(
      `[${sourceLabels[index]}]crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` +
      `scale=${rect.w}:${rect.h}:force_original_aspect_ratio=increase,` +
      `crop=${rect.w}:${rect.h}:(iw-${rect.w})/2:(ih-${rect.h})/2[${outputLabel}_${viewportKey}]`
    );
  }

  const safeDurationSeconds = Math.max(0.001, durationSeconds);
  filterParts.push(
    `color=c=black:s=${SHORTS_RENDER_TARGET.width}x${SHORTS_RENDER_TARGET.height}:d=${safeDurationSeconds.toFixed(3)}[${outputLabel}_canvas]`
  );
  let currentLabel = `${outputLabel}_canvas`;
  for (const [index, viewportKey] of viewportKeys.entries()) {
    const rect = resolveShortsViewportRect(screenLayout.screenLayoutId, viewportKey);
    const nextLabel = index === viewportKeys.length - 1 ? `${outputLabel}_layout` : `${outputLabel}_layout_${index}`;
    filterParts.push(`[${currentLabel}][${outputLabel}_${viewportKey}]overlay=${rect.x}:${rect.y}[${nextLabel}]`);
    currentLabel = nextLabel;
  }

  filterParts.push(`[${currentLabel}]setsar=1,setpts=PTS-STARTPTS[${outputLabel}]`);
  return filterParts.join(';');
}

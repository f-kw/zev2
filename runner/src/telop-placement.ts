import {
  SHORTS_RENDER_TARGET,
  resolveShortsViewportRect,
  type ScreenRect,
  type ShortsRawScreenDetections,
  type ShortsScreenLayoutPlan,
  type ViewportCoords
} from './screen-layout.js';

export type TelopPlacementArea = {
  x: number;
  y: number;
  width: number;
  height: number;
  target: 'screen' | 'speaker_safe_area';
  reason: string;
};

type NormalizedBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRawYxyxBox(rawBox: number[] | undefined): NormalizedBox | undefined {
  if (!rawBox || rawBox.length < 4) {
    return undefined;
  }

  const values = rawBox.slice(0, 4).map((value) => Number(value));
  if (values.some((value) => !Number.isFinite(value))) {
    return undefined;
  }

  const scale = Math.max(...values.map((value) => Math.abs(value))) > 1.2 ? 1000 : 1;
  const top = clamp(values[0] / scale, 0, 1);
  const left = clamp(values[1] / scale, 0, 1);
  const bottom = clamp(values[2] / scale, 0, 1);
  const right = clamp(values[3] / scale, 0, 1);
  if (right <= left || bottom <= top) {
    return undefined;
  }

  return { left, top, right, bottom };
}

function mapSourceBoxToOutputRect(
  sourceBox: NormalizedBox,
  viewport: ViewportCoords | undefined,
  outputRect: ScreenRect
): ScreenRect | undefined {
  if (!viewport) {
    return undefined;
  }

  const [viewportLeft, viewportTop, viewportRight, viewportBottom] = viewport;
  const viewportWidth = viewportRight - viewportLeft;
  const viewportHeight = viewportBottom - viewportTop;
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return undefined;
  }

  const leftRatio = (sourceBox.left - viewportLeft) / viewportWidth;
  const topRatio = (sourceBox.top - viewportTop) / viewportHeight;
  const rightRatio = (sourceBox.right - viewportLeft) / viewportWidth;
  const bottomRatio = (sourceBox.bottom - viewportTop) / viewportHeight;
  const left = outputRect.x + clamp(leftRatio, 0, 1) * outputRect.w;
  const top = outputRect.y + clamp(topRatio, 0, 1) * outputRect.h;
  const right = outputRect.x + clamp(rightRatio, 0, 1) * outputRect.w;
  const bottom = outputRect.y + clamp(bottomRatio, 0, 1) * outputRect.h;
  if (right <= left || bottom <= top) {
    return undefined;
  }

  return {
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(right - left),
    h: Math.round(bottom - top)
  };
}

function speakerDetectionFace(
  detections: ShortsRawScreenDetections,
  speakerKey: 'speaker' | 'speaker1' | 'speaker2'
): NormalizedBox | undefined {
  return normalizeRawYxyxBox(detections[speakerKey]?.face);
}

function resolveSpeakerFaceRect(
  screenLayout: ShortsScreenLayoutPlan,
  speakerKey: 'speaker' | 'speaker1' | 'speaker2'
): ScreenRect | undefined {
  const face = speakerDetectionFace(screenLayout.detections, speakerKey);
  if (!face) {
    return undefined;
  }

  const outputRect = resolveShortsViewportRect(screenLayout.screenLayoutId, speakerKey);
  return mapSourceBoxToOutputRect(face, screenLayout.viewports[speakerKey], outputRect);
}

function areaFromRect(rect: ScreenRect): TelopPlacementArea {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.w,
    height: rect.h,
    target: 'speaker_safe_area',
    reason: '話者の顔検出範囲を避けた余白へ表示する'
  };
}

function resolveSpeakerSafeArea(
  screenLayout: ShortsScreenLayoutPlan,
  speakerKey: 'speaker' | 'speaker1' | 'speaker2'
): TelopPlacementArea {
  const speakerRect = resolveShortsViewportRect(screenLayout.screenLayoutId, speakerKey);
  const faceRect = resolveSpeakerFaceRect(screenLayout, speakerKey);
  if (!faceRect) {
    return areaFromRect({
      x: speakerRect.x,
      y: Math.round(speakerRect.y + speakerRect.h / 2),
      w: speakerRect.w,
      h: Math.round(speakerRect.h / 2)
    });
  }

  const belowFace: ScreenRect = {
    x: speakerRect.x,
    y: Math.min(speakerRect.y + speakerRect.h, faceRect.y + faceRect.h),
    w: speakerRect.w,
    h: Math.max(0, speakerRect.y + speakerRect.h - (faceRect.y + faceRect.h))
  };
  if (belowFace.h > 0) {
    return areaFromRect(belowFace);
  }

  const aboveFace: ScreenRect = {
    x: speakerRect.x,
    y: speakerRect.y,
    w: speakerRect.w,
    h: Math.max(0, faceRect.y - speakerRect.y)
  };
  if (aboveFace.h > 0) {
    return areaFromRect(aboveFace);
  }

  return areaFromRect(speakerRect);
}

export function resolveTelopPlacementArea(screenLayout: ShortsScreenLayoutPlan): TelopPlacementArea {
  if (screenLayout.screenLayoutId === 'screen_speaker' && screenLayout.viewports.screen) {
    const screenRect = resolveShortsViewportRect('screen_speaker', 'screen');
    return {
      x: screenRect.x,
      y: screenRect.y,
      width: screenRect.w,
      height: screenRect.h,
      target: 'screen',
      reason: '話者の顔を避けるため、サブ情報である画面枠へ表示する'
    };
  }

  if (screenLayout.screenLayoutId === 'speaker_only') {
    return resolveSpeakerSafeArea(screenLayout, 'speaker');
  }

  const speakerKeys: Array<'speaker1' | 'speaker2'> = ['speaker1', 'speaker2'];
  const safeAreas = speakerKeys
    .filter((speakerKey): speakerKey is 'speaker1' | 'speaker2' => Boolean(screenLayout.viewports[speakerKey]))
    .map((speakerKey) => resolveSpeakerSafeArea(screenLayout, speakerKey))
    .sort((left, right) => right.height - left.height);

  return safeAreas[0] ?? {
    x: 0,
    y: Math.round(SHORTS_RENDER_TARGET.height / 2),
    width: SHORTS_RENDER_TARGET.width,
    height: Math.round(SHORTS_RENDER_TARGET.height / 2),
    target: 'speaker_safe_area',
    reason: '話者枠の顔検出範囲が使えないため、下側の余白へ表示する'
  };
}

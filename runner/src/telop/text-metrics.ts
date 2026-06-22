import { getCharWeight } from './telop-line-break';

const ESTIMATED_LINE_HEIGHT_RATIO = 1.2;

let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

function estimateLineWidth(line: string, fontSize: number): number {
  let lineWeight = 0;
  for (const char of line) {
    lineWeight += getCharWeight(char);
  }
  return Math.max(1, lineWeight) * fontSize * 0.5;
}

function resolveMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') {
    return null;
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
}

// フォント設定に合わせて1行分の文字サイズを測定する
export function measureTextLine(
  line: string,
  fontSize: number,
  fontFamily?: string,
  fontWeight: number = 800
): { width: number; height: number } {
  const estimatedWidth = estimateLineWidth(line, fontSize);
  const estimatedHeight = fontSize * ESTIMATED_LINE_HEIGHT_RATIO;
  const context = resolveMeasureContext();
  if (!context) {
    return {
      width: Math.max(1, estimatedWidth),
      height: Math.max(1, estimatedHeight)
    };
  }

  const escapedFamily = fontFamily ? `'${fontFamily.replace(/'/g, "\\'")}'` : 'sans-serif';
  context.font = `${fontWeight} ${fontSize}px ${escapedFamily}, sans-serif`;
  const metrics = context.measureText(line || ' ');
  const actualBoundingWidth =
    Number.isFinite(metrics.actualBoundingBoxLeft) && Number.isFinite(metrics.actualBoundingBoxRight)
      ? metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight
      : 0;
  const measuredWidth = Math.max(
    Number.isFinite(metrics.width) ? metrics.width : 0,
    actualBoundingWidth
  );
  const measuredHeight = Number.isFinite(metrics.actualBoundingBoxAscent) && Number.isFinite(metrics.actualBoundingBoxDescent)
    ? metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    : 0;

  return {
    width: Math.max(1, estimatedWidth, measuredWidth),
    height: Math.max(1, estimatedHeight, measuredHeight)
  };
}

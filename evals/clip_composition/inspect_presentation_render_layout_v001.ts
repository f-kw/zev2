#!/usr/bin/env node

import {readFile, writeFile} from 'node:fs/promises';

import {
  buildExactTextModel,
  type PresentationRendererOverlayPropsV001,
} from './presentation_renderer_entry_v001';

type InspectionInput = {
  canvas: {
    width: number;
    height: number;
    safeAreaPx: {top: number; right: number; bottom: number; left: number};
  };
  overlays: PresentationRendererOverlayPropsV001[];
};

type Rect = {left: number; top: number; right: number; bottom: number};

const positiveIntersection = (left: Rect, right: Rect) => ({
  width: Math.min(left.right, right.right) - Math.max(left.left, right.left),
  height: Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top),
});

export const inspectPresentationRenderLayoutV001 = (input: InspectionInput) => {
  const violations: Array<{
    code: string;
    instructionId: string;
    details?: unknown;
  }> = [];
  const items = input.overlays.map((overlay) => {
    const exact = buildExactTextModel(overlay);
    const strokeExtent = Math.max(
      exact.textModel.borderStrokeWidth,
      exact.textModel.glowStrokeWidth,
    ) / 2;
    const lineRects = exact.textModel.lines.map((line) => ({
      left: exact.wrapper.left + exact.wrapper.contentOffsetX + line.x - strokeExtent,
      top: exact.wrapper.top + exact.wrapper.contentOffsetY + line.y - strokeExtent,
      right: exact.wrapper.left + exact.wrapper.contentOffsetX + line.x + line.width + strokeExtent,
      bottom: exact.wrapper.top + exact.wrapper.contentOffsetY + line.y + exact.textModel.fontSize + strokeExtent,
    }));

    if (lineRects.length > overlay.visualState.layout.maxLines) {
      violations.push({
        code: 'LAYOUT_LINE_COUNT_EXCEEDED',
        instructionId: overlay.instructionId,
        details: {actual: lineRects.length, allowed: overlay.visualState.layout.maxLines},
      });
    }
    for (let leftIndex = 0; leftIndex < lineRects.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < lineRects.length; rightIndex += 1) {
        const overlap = positiveIntersection(lineRects[leftIndex], lineRects[rightIndex]);
        if (overlap.width > 0 && overlap.height > 0) {
          violations.push({
            code: 'LAYOUT_LINE_POSITIVE_INTERSECTION',
            instructionId: overlay.instructionId,
            details: {leftIndex, rightIndex, ...overlap},
          });
        }
      }
    }
    const wrapperBounds = {
      left: exact.wrapper.left,
      top: exact.wrapper.top,
      right: exact.wrapper.left + exact.wrapper.width,
      bottom: exact.wrapper.top + exact.wrapper.height,
    };
    const safe = input.canvas.safeAreaPx;
    const isTopBand = overlay.visualState.position.preset === 'top-band';
    const topBandBoundsInvalid = isTopBand && (
      wrapperBounds.left !== 0
      || wrapperBounds.top !== 0
      || wrapperBounds.right !== input.canvas.width
      || wrapperBounds.bottom > input.canvas.height
    );
    const textBoundsInvalid = lineRects.some((bounds) => (
      bounds.left < safe.left
      || bounds.top < safe.top
      || bounds.right > input.canvas.width - safe.right
      || bounds.bottom > input.canvas.height - safe.bottom
    ));
    const regularBoundsInvalid = !isTopBand && (
      wrapperBounds.left < safe.left
      || wrapperBounds.top < safe.top
      || wrapperBounds.right > input.canvas.width - safe.right
      || wrapperBounds.bottom > input.canvas.height - safe.bottom
    );
    if (topBandBoundsInvalid || textBoundsInvalid || regularBoundsInvalid) {
      violations.push({
        code: 'LAYOUT_SAFE_AREA_VIOLATION',
        instructionId: overlay.instructionId,
        details: {
          bounds: wrapperBounds,
          lineRects,
          safeAreaPx: safe,
          geometryPolicy: isTopBand
            ? 'canvas-top-band-with-text-safe-area'
            : 'full-overlay-safe-area',
        },
      });
    }
    return {
      instructionId: overlay.instructionId,
      stateId: overlay.visualState.stateId,
      lineCount: lineRects.length,
      lineRects,
      wrapper: {
        top: exact.wrapper.top,
        left: exact.wrapper.left,
        width: exact.wrapper.width,
        height: exact.wrapper.height,
      },
    };
  });

  return {
    schemaVersion: 'presentation-render-layout-inspection-v001',
    status: violations.length === 0 ? 'passed' : 'failed',
    canvas: input.canvas,
    items,
    violations,
  };
};

const main = async () => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath || process.argv.length !== 4) {
    throw new Error('usage: inspect_presentation_render_layout_v001.ts <input.json> <output.json>');
  }
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as InspectionInput;
  const result = inspectPresentationRenderLayoutV001(input);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (result.status !== 'passed') process.exitCode = 1;
};

if (process.argv[1]?.endsWith('inspect_presentation_render_layout_v001.ts')) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}

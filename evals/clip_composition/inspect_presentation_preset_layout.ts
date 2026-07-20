#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { buildTelopRenderModel } from '../../runner/src/telop/telop-render-model';

type LayoutInput = {
  canvas: {
    width: number;
    height: number;
    safeAreaPx: { top: number; right: number; bottom: number; left: number };
  };
  items: Array<{
    layerId: string;
    stateId: string;
    text: string;
    maxLines: number;
    props: {
      style: {
        fontFamily: string;
        fontSize: number;
        fontColor: string;
        borderColor: string;
        borderWidth: number;
        lineSpacing: number;
        glowColor: string;
        glowColorMode: 'fixed';
        glowWidth: number;
        glowOpacity: number;
      };
      position: {
        preset: string;
        alignment: 'left' | 'center' | 'right';
        offsetX: number;
        offsetY: number;
      };
      maxCharsPerLine: number;
      singleLine: boolean;
      width: number;
      height: number;
      glowSeedHint: string;
    };
  }>;
};

const main = async () => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error('usage: inspect_presentation_preset_layout.ts <input.json> <output.json>');
  }

  const input = JSON.parse(await readFile(inputPath, 'utf8')) as LayoutInput;
  const violations: Array<{ layerId: string; code: string; details?: unknown }> = [];

  const items = input.items.map((item) => {
  const model = buildTelopRenderModel({
    text: item.text,
    style: item.props.style,
    position: item.props.position,
    maxCharsPerLine: item.props.maxCharsPerLine,
    singleLine: item.props.singleLine,
    width: item.props.width,
    height: item.props.height,
    glowSeedHint: item.props.glowSeedHint,
  });
  const strokeExtent = Math.max(model.text.borderStrokeWidth, model.text.glowStrokeWidth) / 2;
  const lineRects = model.text.lines.map((line) => ({
    left: model.wrapper.left + line.x - strokeExtent,
    top: model.wrapper.top + line.y - strokeExtent,
    right: model.wrapper.left + line.x + line.width + strokeExtent,
    bottom: model.wrapper.top + line.y + model.text.fontSize + strokeExtent,
  }));

  if (model.text.lines.length > item.maxLines) {
    violations.push({
      layerId: item.layerId,
      code: 'LINE_COUNT_EXCEEDS_CANDIDATE_LIMIT',
      details: { actual: model.text.lines.length, allowed: item.maxLines },
    });
  }

  for (let index = 0; index < lineRects.length; index += 1) {
    const rect = lineRects[index];
    const safe = input.canvas.safeAreaPx;
    if (
      rect.left < safe.left
      || rect.top < safe.top
      || rect.right > input.canvas.width - safe.right
      || rect.bottom > input.canvas.height - safe.bottom
    ) {
      violations.push({
        layerId: item.layerId,
        code: 'LINE_BOX_OUTSIDE_SAFE_AREA',
        details: { lineIndex: index, rect, safeAreaPx: safe },
      });
    }
  }

  for (let leftIndex = 0; leftIndex < lineRects.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < lineRects.length; rightIndex += 1) {
      const left = lineRects[leftIndex];
      const right = lineRects[rightIndex];
      const overlapWidth = Math.min(left.right, right.right) - Math.max(left.left, right.left);
      const overlapHeight = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
      if (overlapWidth > 0 && overlapHeight > 0) {
        violations.push({
          layerId: item.layerId,
          code: 'LINE_BOX_POSITIVE_INTERSECTION',
          details: { leftIndex, rightIndex, overlapWidth, overlapHeight },
        });
      }
    }
  }

  return {
    layerId: item.layerId,
    stateId: item.stateId,
    resolvedText: model.resolvedText,
    lineCount: model.text.lines.length,
    lineRects,
    wrapper: model.wrapper,
    fontSizePx: model.text.fontSize,
    lineHeightPx: model.text.lineHeight,
  };
  });

  await writeFile(outputPath, `${JSON.stringify({ status: violations.length === 0 ? 'passed' : 'failed', items, violations }, null, 2)}\n`);
  if (violations.length > 0) process.exitCode = 1;
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  serializePresentationCaptionReport,
  validatePresentationCaptionContract,
} from './presentation_caption_contract_v002.mjs';

const [, , inputArgument, outputArgument] = process.argv;

if (!inputArgument || process.argv.length > 4) {
  console.error('使い方: node validate_presentation_caption_contract_v002.mjs <input.json> [output.json]');
  process.exitCode = 2;
} else {
  try {
    const inputPath = resolve(inputArgument);
    const input = JSON.parse(await readFile(inputPath, 'utf8'));
    const report = validatePresentationCaptionContract(input);
    const serialized = serializePresentationCaptionReport(report);
    if (outputArgument) {
      await writeFile(resolve(outputArgument), serialized, 'utf8');
    } else {
      process.stdout.write(serialized);
    }
    if (report.overallStatus === 'failed') process.exitCode = 1;
  } catch (error) {
    console.error(`検査入力を処理できません: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}

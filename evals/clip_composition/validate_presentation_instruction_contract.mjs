#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  serializePresentationInstructionReport,
  validatePresentationInstructionContract,
} from './presentation_instruction_contract.mjs';

const [, , bundleArgument, trustBindingArgument, outputArgument] = process.argv;

if (!bundleArgument || !trustBindingArgument || process.argv.length > 5) {
  console.error(
    '使い方: node validate_presentation_instruction_contract.mjs <bundle.json> <trusted-registry-bindings.json> [output.json]',
  );
  process.exitCode = 2;
} else {
  try {
    const [bundleText, trustBindingText] = await Promise.all([
      readFile(resolve(bundleArgument), 'utf8'),
      readFile(resolve(trustBindingArgument), 'utf8'),
    ]);
    const report = validatePresentationInstructionContract(
      JSON.parse(bundleText),
      JSON.parse(trustBindingText),
    );
    const serialized = serializePresentationInstructionReport(report);
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

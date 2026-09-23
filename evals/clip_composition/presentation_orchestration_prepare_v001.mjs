/** Rebuild a fresh semantic input from verified existing observations only.
 * No previous AI reply, selected preset, or override enters the new judgment. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadAutoPresentationContextV001} from './presentation_auto_effects_io_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001}
  from './presentation_orchestration_v001.mjs';

async function bind(file) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) {hash.update(chunk); bytes += chunk.length;}
  return {path: file, fileSha256: hash.digest('hex'), bytes};
}
export async function buildOrchestrationInputFilesV001({inventoryPath, previousRequestPath}) {
  assert(path.isAbsolute(inventoryPath) && path.isAbsolute(previousRequestPath));
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8')), refs = inventory.refs;
  const inputBindings = [];
  for (const expected of Object.values(refs)) {
    const actual = await bind(expected.path); assert.deepEqual(actual, expected); inputBindings.push(actual);
  }
  const loaded = await loadAutoPresentationContextV001({baselinePath: refs.normalCaptionPlan.path,
    decisionInputPath: refs.stage1JudgmentInput.path});
  const ref = row => ({path: row.path, fileSha256: row.fileSha256});
  const source = {digestRef: {version: inventory.digestId, sha256: refs.canonicalEditPlan.fileSha256},
    planRef: ref(refs.normalCaptionPlan), timelineRef: ref(refs.canonicalTimeline), mediaRef: ref(refs.baseMedia),
    planBytes: await readFile(refs.normalCaptionPlan.path, 'utf8'),
    timelineBytes: await readFile(refs.canonicalTimeline.path, 'utf8'),
    playbackSampleRate: inventory.playbackClock.sampleRate,
    observationSampleRate: loaded.context.pulseTimingEvidence.sampleRate,
    captionContext: loaded.context, decisionInputBytes: await readFile(refs.stage1JudgmentInput.path, 'utf8')};
  const context = createOrchestrationContextV001(source);
  const previousRequest = JSON.parse(await readFile(previousRequestPath, 'utf8'));
  const evidence = Object.fromEntries(['productionPurpose', 'captions', 'contexts', 'observations',
    'audioEvidence', 'audioCandidates'].map(key => [key, previousRequest.input[key]]));
  const input = createOrchestrationJudgmentInputV001({context, evidence});
  return {source, input, provenance: {schemaVersion: 'presentation-orchestration-input-preparation-v001',
    inputBindings, previousRequestRef: await bind(previousRequestPath),
    whitelist: Object.keys(evidence), previousReplyOrPresetCopied: false,
    inputSha256: input.inputSha256, contextSha256: context.contextSha256}};
}
export async function prepareOrchestrationInputFilesV001({inventoryPath, previousRequestPath, outputDirectory}) {
  assert(path.isAbsolute(outputDirectory));
  const result = await buildOrchestrationInputFilesV001({inventoryPath, previousRequestPath});
  await mkdir(outputDirectory);
  for (const [name, value] of Object.entries(result)) {
    await writeFile(path.join(outputDirectory, name + '.json'), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
  }
  return result.provenance;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [inventoryPath, previousRequestPath, outputDirectory] = process.argv.slice(2);
  if (!outputDirectory) throw new Error('usage: orchestration-prepare inventory.json previous-request.json new-input-directory');
  console.log(JSON.stringify(await prepareOrchestrationInputFilesV001({inventoryPath, previousRequestPath, outputDirectory})));
}

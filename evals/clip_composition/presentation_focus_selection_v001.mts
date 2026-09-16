import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {assertPresentationFocusSelectionInputV001, assertPresentationFocusSelectionResultV001,
  assertPresentationFocusSelectionCoverageV001, runPresentationFocusSelectionV001}
  from '../../runner/src/skills/presentation-focus-selection-v001.js';
import {judgeThroughStdinV001} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {loadAutoPresentationContextV001, saveFixedAutoPresentationV001}
  from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';

type Json = Record<string, any>;
const formal = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const keys = (v: any, expected: string[]) => v !== null && typeof v === 'object' && !Array.isArray(v)
  && Object.keys(v).length === expected.length && expected.every(k => Object.hasOwn(v, k));
const promptPath = fileURLToPath(new URL('./prompts/presentation_focus_selection_v001.md', import.meta.url));
const binding = (p: string, bytes: string | Buffer) => ({path: path.resolve(p), fileSha256: hash(bytes)});
const save = async (p: string, value: unknown) => {
  const bytes = formal(value); await writeFile(p, bytes, {flag: 'wx'}); return binding(p, bytes);
};

/** The completed normal plan owns caption identity, text and order. Context supplies no replacements. */
export function buildPresentationFocusSelectionInputV001(baseline: Json, context: Json) {
  assert.equal(baseline.schemaVersion, 'presentation-output-common-core-plan-v001');
  assert(Array.isArray(baseline.elements), 'FOCUS_BASELINE_INVALID');
  assert(keys(context, ['digestId', 'productionPurpose', 'contexts', 'captionContextIds', 'observations']),
    'FOCUS_CONTEXT_INVALID');
  const captions = baseline.elements.filter((e: Json) => e.kind === 'speech-caption');
  assert(captions.length > 0 && captions.every((e: Json) => !Object.hasOwn(e, 'presentationColorRange')),
    'FOCUS_REQUIRES_NORMAL_BASELINE');
  assert(Array.isArray(context.captionContextIds) && context.captionContextIds.every((r: Json) =>
    keys(r, ['captionId', 'contextId'])), 'FOCUS_CONTEXT_MEMBERSHIP_INVALID');
  assert.deepEqual(context.captionContextIds.map((r: Json) => r.captionId),
    captions.map((e: Json) => e.instructionId), 'FOCUS_CONTEXT_MEMBERSHIP_CHANGED');
  const input = {schemaVersion: 'presentation-focus-selection-input-v001', digestId: context.digestId,
    productionPurpose: context.productionPurpose, captions: captions.map((e: Json, i: number) => ({
      captionId: e.instructionId, text: e.text, contextId: context.captionContextIds[i].contextId})),
    contexts: structuredClone(context.contexts), observations: structuredClone(context.observations)};
  assertPresentationFocusSelectionInputV001(input);
  return input;
}

export function validatePresentationFocusSelectionResponseV001(request: Json, response: Json, result: Json) {
  assertPresentationFocusSelectionInputV001(request.input);
  assertPresentationFocusSelectionResultV001(result);
  assert(keys(response, ['schemaVersion', 'requestFileSha256', 'answer', 'judgmentNote'])
    && response.schemaVersion === 'presentation-focus-selection-response-v001'
    && response.requestFileSha256 === hash(formal(request))
    && same(response.answer, result.answer)
    && typeof response.judgmentNote === 'string' && response.judgmentNote.trim()
    && request.inputCanonicalSha256 === hash(canonicalJson(request.input)), 'FOCUS_RESPONSE_BINDING_CHANGED');
  assert.equal(result.answer.status, 'complete', 'FOCUS_JUDGMENT_ABSTAINED');
  assertPresentationFocusSelectionCoverageV001(request.input, result.answer);
  return result.answer;
}

/** Projection never invents Normal for a missing decision and never accepts AI drawing values. */
export function projectPresentationFocusSelectionV001(input: any, answer: any, context: Json) {
  assertPresentationFocusSelectionCoverageV001(input, answer);
  assert.equal(answer.status, 'complete', 'FOCUS_JUDGMENT_ABSTAINED');
  return {schemaVersion: 'auto-presentation-proposal-v001', context,
    targetCaptionIds: input.captions.map((c: Json) => c.captionId), completion: 'complete',
    effects: answer.decisions.filter((d: Json) => d.decision === 'selected').map((d: Json) => ({
      captionId: d.captionId, role: 'Focus', presentation: 'provisional-focus', ...d.selection})),
    exceptions: answer.decisions.filter((d: Json) => ['unrepresentable', 'unresolved'].includes(d.decision))
      .map((d: Json) => ({captionId: d.captionId, status: d.decision, reason: d.reason}))};
}

/** Existing current-Codex transport; no new model API, media upload or rendering authority. */
export async function executePresentationFocusSelectionV001(options: {
  baselinePath: string; contextPath: string; outputDirectory: string;
  judge?: (request: Json) => Promise<Json>;
}) {
  const {baselinePath, contextPath} = options, out = path.resolve(options.outputDirectory);
  const [baseBytes, contextBytes, promptBytes] = await Promise.all([
    readFile(baselinePath), readFile(contextPath), readFile(promptPath),
  ]);
  const baseline = JSON.parse(baseBytes.toString('utf8'));
  const input = buildPresentationFocusSelectionInputV001(baseline, JSON.parse(contextBytes.toString('utf8')));
  const sources = {baseline: binding(baselinePath, baseBytes), context: binding(contextPath, contextBytes),
    prompt: binding(promptPath, promptBytes)};
  const request = {schemaVersion: 'presentation-focus-selection-request-v001',
    judgmentMethod: 'current-codex-stdin-v001', sources, prompt: promptBytes.toString('utf8'),
    input, inputCanonicalSha256: hash(canonicalJson(input))};
  await mkdir(out); // Existing attempts cannot be overwritten, including failed attempts.
  const requestRef = await save(path.join(out, 'request.json'), request);
  let response: Json | undefined;
  let responseRef: ReturnType<typeof binding> | undefined;
  try {
    const result = await runPresentationFocusSelectionV001(input, async seen => {
      assert(same(seen, input), 'FOCUS_SKILL_INPUT_CHANGED');
      response = await (options.judge ?? judgeThroughStdinV001)(structuredClone(request));
      responseRef = await save(path.join(out, 'response.json'), response);
      return response.answer;
    });
    const resultRef = await save(path.join(out, 'result.json'), result);
    const answer = validatePresentationFocusSelectionResponseV001(request, response!, result);
    for (const source of [...Object.values(sources), requestRef, responseRef!, resultRef]) {
      assert.equal(hash(await readFile(source.path)), source.fileSha256, 'FOCUS_SOURCE_CHANGED_DURING_JUDGMENT');
    }
    const decisionInputPath = path.join(out, 'decision-input.json');
    await save(decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v001', sources,
      requestRef, responseRef, resultRef,
      inputCanonicalSha256: request.inputCanonicalSha256, decisionMethod: request.judgmentMethod,
      humanQuality: 'not-evaluated', answer});
    const loaded = await loadAutoPresentationContextV001({baselinePath, decisionInputPath});
    assert(same(loaded.baselinePlan, baseline), 'FOCUS_BASELINE_CHANGED');
    const proposal = projectPresentationFocusSelectionV001(input, answer, loaded.context);
    const fixed = await saveFixedAutoPresentationV001({baselinePath, decisionInputPath, proposal,
      outputPath: path.join(out, 'fixed-auto.json')});
    const resolved = resolveAutoPresentationV001({...loaded, autoProposal: fixed});
    await save(path.join(out, 'resolution.json'), resolved.resolution);
    const counts = Object.fromEntries(['normal', 'selected', 'unrepresentable', 'unresolved']
      .map(s => [s, answer.decisions.filter((d: Json) => d.decision === s).length]));
    const validation = {schemaVersion: 'presentation-focus-selection-validation-v001', status: 'passed',
      requestRef, resultRef, proposalSha256: fixed.proposalSha256, captionCount: input.captions.length,
      counts, fullCaptionCoverage: 'passed', exactRangeValidation: 'passed', sourcesUnchanged: 'passed',
      humanQuality: 'not-evaluated', automaticSelectionQuality: 'not-evaluated',
      overridesApplied: false, normalOnlyIsQualitySuccess: false};
    await save(path.join(out, 'validation.json'), validation);
    return validation;
  } catch (error) {
    await save(path.join(out, 'rejection.json'), {status: 'rejected', reason: String(error), requestRef});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [baselinePath, contextPath, outputDirectory] = process.argv.slice(2);
  if (!baselinePath || !contextPath || !outputDirectory) {
    process.stderr.write('usage: presentation_focus_selection_v001.mts normal-plan.json context.json new-output-directory\n');
    process.exitCode = 1;
  } else {
    executePresentationFocusSelectionV001({baselinePath, contextPath, outputDirectory})
      .then(result => process.stdout.write(`${JSON.stringify(result)}\n`))
      .catch(error => {process.stderr.write(`${String(error)}\n`); process.exitCode = 1;});
  }
}

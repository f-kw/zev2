import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, lstat, readdir, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {assertCaptionDisplayInputV001, runCaptionDisplayBoundariesV001, assertCaptionDisplayResultV001} from '../../../runner/src/skills/caption-display-boundaries-v001.js';
import {readPreparedDigestCaptionJudgmentInputsV001, type DigestCaptionPreparationParametersV001} from '../../../runner/src/digest-caption-input-preparation-v001.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPORT = 'docs/reports/digest-caption-display-answers-20261003';
const PARENT = 'runtime/artifacts/digest-caption-display-answers-20261003-v001';
const OUT = `${PARENT}/attempt-001`;
const INPUT = 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002';
const MB = {path: `${INPUT}/bundle/manifest.json`, fileSha256: '83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75'};
const MEANING_SHA = '6e16d247d36f841783d59badc4c4a3f35c8cf4739b6acae29baccc32a7d061a3';
const SCOPE_PATH = 'docs/work-orders/ZEV_DIGEST_CAPTION_DISPLAY_ANSWERS_20261003_v001.md';
const RESPONSE_SCHEMA = 'digest-caption-judgment-display-response-v001';
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
function record(v: unknown): Obj {assert(object(v)); return v;}
function records(v: unknown): Obj[] {assert(Array.isArray(v)); return v.map(record);}
const load = (p: string) => import(path.join(ROOT, p));
const f = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
const stable = await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
const display = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
const layout = await load('evals/clip_composition/presentation_renderer_text_layout_v001.mjs');
const absolute = (p: string) => path.join(ROOT, p);
const read = async (p: string): Promise<Buffer> => {
  assert(p.endsWith('.json') || p.endsWith('.md') || p.endsWith('.mts') || p.endsWith('.ts') || p.endsWith('.mjs'), 'DISPLAY_JSON_SCOPE_AND_CODE_ONLY');
  return stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: ROOT, relativePath: p});
};
const json = async (p: string): Promise<Obj> => record(JSON.parse((await read(p)).toString()));
const bindBytes = async (p: string) => ({path: p, fileSha256: f.sha(await read(p))});
const names = ['evals/clip_composition/adopted_media_manufacturing_v001.mts', 'runner/src/skills/caption-display-boundaries-v001.ts',
  'runner/src/digest-caption-input-preparation-v001.ts', 'evals/clip_composition/adopted_caption_judgment_inputs_v001.mts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/presentation_renderer_text_layout_v001.mjs', `${REPORT}/run-display.mts`];
async function snapshot() {
  const params: DigestCaptionPreparationParametersV001 = JSON.parse((await read(`${INPUT}/parameters.json`)).toString());
  const paths = (await readdir(absolute(`${INPUT}/bundle`))).map(n => `${INPUT}/bundle/${n}`);
  paths.push(`${INPUT}/parameters.json`, params.stateBinding.path, params.scopeBinding.path,
    params.styleTemplateBinding.path, ...names.filter(n => n !== `${REPORT}/run-display.mts`));
  return Object.fromEntries(await Promise.all(paths.map(async p => [p, f.sha(await read(p))])));
}
async function input() {
  const params: DigestCaptionPreparationParametersV001 = JSON.parse((await read(`${INPUT}/parameters.json`)).toString());
  assert.equal(f.sha(await read(MB.path)), MB.fileSha256, 'DISPLAY_INPUT_MANIFEST_CHANGED');
  assert.equal(f.sha(await read(`${INPUT}/bundle/meaning-input.json`)), MEANING_SHA, 'DISPLAY_MEANING_CHANGED');
  const prepared = await readPreparedDigestCaptionJudgmentInputsV001(params, MB);
  return prepared;
}
async function preflight() {
  for (const fn of [readPreparedDigestCaptionJudgmentInputsV001, runCaptionDisplayBoundariesV001,
    assertCaptionDisplayResultV001, display.validateDisplayForAdoptionV001, display.readValidatedDisplayTracesV001]) assert.equal(typeof fn, 'function');
  assert.equal(f.sha(await read(MB.path)), MB.fileSha256);
  assert.equal(f.sha(await read(`${INPUT}/bundle/meaning-input.json`)), MEANING_SHA);
  assert.equal(await realpath(absolute('runtime/artifacts')), absolute('runtime/artifacts'));
  await assert.rejects(lstat(absolute(OUT)), {code: 'ENOENT'});
  const saved = await json(`${REPORT}/evidence.json`), scope = record(saved.scope);
  assert.equal(f.sha(await read(SCOPE_PATH)), scope.fileSha256, 'DISPLAY_SCOPE_CHANGED');
  return {exports: 'passed', inputHashes: 'passed', outputAbsent: true, scopeBinding: scope};
}
const save = async (name: string, value: unknown) => {
  const p = `${OUT}/${name}`, bytes: Buffer = f.formal(value);
  await writeFile(absolute(p), bytes, {flag: 'wx'});
  return {path: p, fileSha256: f.sha(bytes)};
};
async function run() {
  const pre = await preflight(), before = await snapshot(), start = performance.now();
  const prepared = await input(); // one JSON-only reconstruction for all nine callbacks
  await mkdir(absolute(PARENT), {recursive: true});
  assert.equal(await realpath(absolute(PARENT)), absolute(PARENT));
  await mkdir(absolute(OUT));
  await save('old-inputs-before.json', before);
  const metadata: Obj[] = [], tokens: object[] = [], requests = prepared.requests;
  const lines = createInterface({input: process.stdin, crlfDelay: Infinity});
  const iterator = lines[Symbol.asyncIterator]();
  const sourceOutputs = records(prepared.manifest.outputs);
  const receipts: Obj[] = [];
  let negative: Obj | null = null;
  try {
    for (const [i, req] of requests.entries()) {
      assertCaptionDisplayInputV001(req.input);
      const inputValue = req.input, source = sourceOutputs[i + 1]!;
      assert(typeof source.path === 'string');
      const requestBytes = await read(source.path);
      assert.equal(f.sha(requestBytes), source.fileSha256); assert.deepEqual(requestBytes, f.formal(req));
      const openedAt = Date.now(), parseStart = performance.now();
      const number = String(i + 1).padStart(4, '0');
      // Mechanical view: every original field/text/ID, local ordinal and existing logical width.
      console.log(JSON.stringify({event: 'display-judgment-required', ordinal: i + 1, requestBinding: {path: source.path, fileSha256: source.fileSha256},
        request: req, localBoundaryView: inputValue.captions[0]!.boundaryCandidates.map((b, j) => ({ordinal: j + 1,
          boundaryId: b.boundaryId, text: b.text, logicalWidth: [...b.text].reduce((sum, c) => sum + layout.codePointWeightV001(c, inputValue.styleLimits.characterWidthRule), 0)}))}));
      let response: Obj = {}, answerReadyAt = 0;
      const result = await runCaptionDisplayBoundariesV001(inputValue, async actualInput => {
        assert.deepEqual(actualInput, inputValue, 'DISPLAY_CALLBACK_INPUT_CHANGED');
        const line = await iterator.next(); assert(!line.done, 'DISPLAY_RESPONSE_NOT_PROVIDED');
        const fileName = line.value.trim();
        assert(new RegExp(`^response-${number}\\.json$`, 'u').test(fileName), 'DISPLAY_RESPONSE_FILE_INVALID');
        response = await json(`${OUT}/${fileName}`); answerReadyAt = Date.now();
        return response.answer;
      });
      const validateStart = performance.now();
      assertCaptionDisplayResultV001(result);
      const token: object = display.validateDisplayForAdoptionV001(req, response, result, RESPONSE_SCHEMA);
      tokens.push(token);
      const responseBinding = await bindBytes(`${OUT}/response-${number}.json`);
      const resultBinding = await save(`result-${number}.json`, result);
      const validationMs = performance.now() - validateStart;
      if (i === 0) {
        const wrong = structuredClone(response); wrong.requestFileSha256 = '0'.repeat(64);
        const filesBefore = await readdir(absolute(OUT)); let code = '';
        try {display.validateDisplayForAdoptionV001(req, wrong, result, RESPONSE_SCHEMA);} catch (e) {code = e instanceof Error ? e.message : String(e);}
        assert.equal(code, 'DISPLAY_PROVENANCE_MISMATCH'); assert.deepEqual(await readdir(absolute(OUT)), filesBefore);
        negative = {condition: 'request SHA substitution', expected: 'DISPLAY_PROVENANCE_MISMATCH', observed: code, outputIncrease: 0};
      }
      const answer = record(result.answer), caption = records(answer.captions)[0]!;
      const cues = records(caption.cues); // width admission is exclusively the existing validator above
      const trace = display.readValidatedDisplayTracesV001([req], [token]);
      const traceBinding = await save(`trace-${number}.json`, {schemaVersion: 'digest-caption-display-trace-v001', traces: trace});
      receipts.push({ordinal: i + 1, candidateId: req.candidateId, timelineSegmentId: req.timelineSegmentId,
        requestBinding: {path: source.path, fileSha256: source.fileSha256}, responseBinding, resultBinding, traceBinding,
        cueCount: cues.length, lineCount: cues.reduce((sum, c) => {assert(Array.isArray(c.lineEndBoundaryIds)); return sum + c.lineEndBoundaryIds.length;}, 0),
        atomCount: inputValue.captions[0]!.boundaryCandidates.length, judgmentNote: response.judgmentNote});
      metadata.push({ordinal: i + 1, inputPresentedAt: new Date(openedAt).toISOString(), answerReceivedAt: new Date(answerReadyAt).toISOString(),
        readJudgmentFormattingWallMs: answerReadyAt - openedAt, validationAndSaveMs: validationMs, totalCallbackElapsedMs: performance.now() - parseStart});
      await save(`receipt-${number}.json`, {receipt: receipts[i], metadata: metadata[i]});
      const evidence = await json(`${REPORT}/evidence.json`);
      await writeFile(absolute(`${REPORT}/evidence.json`), f.formal({...evidence, status: 'judging', history: {productFixes: 6, setupFixes: 21, setup21Applied: true},
        acceptedResponses: receipts, phaseMetadata: metadata, provenanceNegative: negative}));
      console.log(JSON.stringify({event: 'display-judgment-validated', ordinal: i + 1, cueCount: cues.length}));
    }
  } finally {lines.close();}
  const traces = display.readValidatedDisplayTracesV001(requests, tokens);
  const tracesBinding = await save('traces.json', {schemaVersion: 'digest-caption-display-traces-v001', traces});
  assert.deepEqual(await snapshot(), before, 'DISPLAY_ORIGINALS_CHANGED');
  const implementations = await Promise.all(names.map(bindBytes));
  const manifest = {schemaVersion: 'digest-caption-display-answers-bundle-v001', status: 'validated-display-for-review',
    receivedHead: 'c18ac0d6ec5591f4cffbcc9dbd91100ba788eac7', scopeBinding: pre.scopeBinding, inputManifestBinding: MB,
    meaningBinding: {path: `${INPUT}/bundle/meaning-input.json`, fileSha256: MEANING_SHA}, originalScope: prepared.manifest.scopeBinding,
    originalPurpose: prepared.manifest.originalPurpose, styleTemplateBinding: prepared.manifest.styleTemplateBinding,
    implementations, responses: receipts, tracesBinding, metadata, provenanceNegative: negative,
    admission: prepared.manifest.admission, effects: {mediaReadHashCopyPut: 0, normalHttp: 0, providers: 0, rendering: 0, costUsd: 0}};
  const manifestBinding = await save('manifest.json', manifest);
  const evidence = await json(`${REPORT}/evidence.json`);
  await writeFile(absolute(`${REPORT}/evidence.json`), f.formal({...evidence, status: 'validated-awaiting-readback', manifestBinding,
    originalInputsUnchanged: true, validatorElapsedMs: metadata.reduce((sum, r) => {assert(typeof r.validationAndSaveMs === 'number'); return sum + r.validationAndSaveMs;}, 0),
    totalProcessWallMs: performance.now() - start, effects: manifest.effects}));
  console.log(JSON.stringify({event: 'display-answers-saved', manifestBinding, requests: receipts.length}));
}
async function readback() {
  const start = performance.now(), prepared = await input(), before = await json(`${OUT}/old-inputs-before.json`);
  const evidence = await json(`${REPORT}/evidence.json`), mb = record(evidence.manifestBinding);
  assert(typeof mb.path === 'string'); assert.equal(f.sha(await read(mb.path)), mb.fileSha256);
  const manifest = await json(mb.path); assert.equal(manifest.schemaVersion, 'digest-caption-display-answers-bundle-v001');
  assert.deepEqual(manifest.inputManifestBinding, MB);
  for (const b of records(manifest.implementations)) {assert(typeof b.path === 'string'); assert.equal(f.sha(await read(b.path)), b.fileSha256);}
  const tokens: object[] = [], responses = records(manifest.responses);
  assert.equal(responses.length, prepared.requests.length);
  const get = async (v: unknown) => {const b = record(v); assert(typeof b.path === 'string'); const bytes = await read(b.path); assert.equal(f.sha(bytes), b.fileSha256); return record(JSON.parse(bytes.toString()));};
  for (const [i, r] of responses.entries()) {
    const req = prepared.requests[i]!, response = await get(r.responseBinding), result = await get(r.resultBinding);
    const requestBinding = record(r.requestBinding); assert(typeof requestBinding.path === 'string');
    assert.equal(f.sha(await read(requestBinding.path)), requestBinding.fileSha256); assert.equal(f.sha(f.formal(req)), requestBinding.fileSha256);
    assertCaptionDisplayResultV001(result);
    const token: object = display.validateDisplayForAdoptionV001(req, response, result, RESPONSE_SCHEMA); tokens.push(token);
    const expected = {schemaVersion: 'digest-caption-display-trace-v001', traces: display.readValidatedDisplayTracesV001([req], [token])};
    assert.deepEqual(await get(r.traceBinding), expected, 'DISPLAY_TRACE_RECONSTRUCTION_CHANGED');
  }
  const actualTraces = {schemaVersion: 'digest-caption-display-traces-v001', traces: display.readValidatedDisplayTracesV001(prepared.requests, tokens)};
  assert.deepEqual(await get(manifest.tracesBinding), actualTraces);
  const tb = record(manifest.tracesBinding); assert(typeof tb.path === 'string'); assert.deepEqual(await read(tb.path), f.formal(actualTraces));
  assert.deepEqual(await snapshot(), before, 'DISPLAY_ORIGINALS_CHANGED_AFTER_READBACK');
  const rb = {status: 'passed', processId: process.pid, requests: responses.length, tracesBytesEqual: true,
    oldInputsUnchanged: true, judgmentsCalled: 0, elapsedMs: performance.now() - start};
  await save('readback.json', rb);
  await writeFile(absolute(`${REPORT}/evidence.json`), f.formal({...evidence, status: 'passed', readback: rb, completedAt: new Date().toISOString()}));
  console.log(JSON.stringify(rb));
}
if (process.argv[2] === 'preflight') console.log(JSON.stringify(await preflight()));
else if (process.argv[2] === 'run') await run();
else if (process.argv[2] === 'readback') await readback();
else throw new Error('Explicit preflight/run/readback required');

import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, readdir, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareDigestCaptionJudgmentInputsV001, readPreparedDigestCaptionJudgmentInputsV001,
  type DigestCaptionPreparationParametersV001} from '../../../runner/src/digest-caption-input-preparation-v001.js';
import {buildAdoptedCaptionJudgmentInputsV001, type AdoptedCaptionJudgmentParametersV001} from '../../../evals/clip_composition/adopted_caption_judgment_inputs_v001.mts';
import type {Zev2State} from '../../../packages/shared/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPORT = 'docs/reports/digest-caption-input-preparation-20261003';
const NEW = 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002';
const OLD = 'runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001';
const DRAFT = 'draft_eCg3g-IMIzEWMtJuMyJWB', PLAN = 'agent_xKOu8eZKSNa5viNENtJ4L', EXECUTION = 'agent_wGiuVx5QiJvjGUxEW8Qxa';
const STT = 'agent_YchOWHe52hoa1T834AbZT';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
function record(v: unknown): Obj {assert(object(v)); return v;}
function records(v: unknown): Obj[] {assert(Array.isArray(v)); return v.map(record);}
const read = async (p: string) => readFile(path.join(ROOT, p));
const json = async (p: string): Promise<Obj> => record(JSON.parse((await read(p)).toString()));
const physical = (producer: string, file: string) => `${OLD}/artifacts/${DRAFT}/${producer}--${file}`;
const PARAMS: DigestCaptionPreparationParametersV001 = {
  workspaceRoot: ROOT, sourceRuntimeRoot: path.join(ROOT, OLD), outputRoot: path.join(ROOT, NEW, 'bundle'),
  preparationId: 'digest-caption-input-preparation-20261003-v001',
  stateBinding: {path: `${OLD}/state.json`, fileSha256: 'c62e3b38d00c8222f0918b52704e579f87a14346217fada6c9cd754fc6fccf3c'},
  scopeBinding: {path: 'docs/work-orders/ZEV_DIGEST_CAPTION_JUDGMENT_INPUT_PREPARATION_20261003_v001.md', fileSha256: 'c56aa5710696686778ac9cc5ab26787d35395b7c9d9b672db956f22ea09db209'},
  styleTemplateBinding: {path: 'evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/source-package-v001.json', fileSha256: 'b291ac0fa3802ec030cae376c2cee3e68929b12552141ccdd5538bab022a1e69'},
  expected: {requestDraftId: DRAFT, planRequestId: PLAN, executionRequestId: EXECUTION,
    planSha256: 'cd69dd7fccfab6b4d0f266e6dddf56d5eae4c670283cd7caf467b9fde2925ee3',
    executionSha256: '735d6763afe6fcfabeb4c103871ee3a65368b96c9fa9df1a01f37717ace08f37'},
};
const load = (p: string) => import(path.join(ROOT, p));
const formal = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
const files = async (dir: string): Promise<string[]> => {
  const result: string[] = [];
  for (const e of await readdir(path.join(ROOT, dir), {withFileTypes: true})) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) result.push(...await files(p)); else result.push(p);
  }
  return result.sort();
};
const save = async (name: string, value: unknown) => writeFile(path.join(ROOT, NEW, name), jsonBytes(value), {flag: 'wx'});
const preserved = ['evals/clip_composition/adopted_media_manufacturing_v001.mts',
  'runner/src/digest-plan-preparation-v001.ts', 'runner/src/digest-plan-consumption-v001.ts',
  'runner/src/skills/caption-display-boundaries-v001.ts',
  'runner/src/skills/candidate-discovery-v001.ts', 'runner/src/skills/candidate-selection-v001.ts',
  'runner/src/skills/candidate-internal-retention-v001.ts', 'packages/shared/src/digest-plan-artifacts-v001.ts'];

async function snapshot() {
  const paths = [...await files(OLD)].filter(p => p.endsWith('.json'));
  paths.push(...preserved);
  return Object.fromEntries(await Promise.all(paths.map(async p => [p, sha(await read(p))])));
}
async function preflight() {
  assert.equal(typeof prepareDigestCaptionJudgmentInputsV001, 'function');
  assert.equal(typeof readPreparedDigestCaptionJudgmentInputsV001, 'function');
  assert.equal(typeof buildAdoptedCaptionJudgmentInputsV001, 'function');
  assert((await lstat(path.join(ROOT, 'runtime/artifacts'))).isDirectory());
  await assert.rejects(lstat(PARAMS.outputRoot), {code: 'ENOENT'});
  for (const b of [PARAMS.stateBinding, PARAMS.scopeBinding, PARAMS.styleTemplateBinding]) assert.equal(sha(await read(b.path)), b.fileSha256);
  assert.equal(sha(await read(preserved[0]!)), 'd51415f7d223ce885bf2f208f66d06d295ffd3c2fc708ef26955ed14929a4f2f');
  return {exports: 'passed', parent: 'present', output: 'absent', fixedInputs: 'passed', normalHttpStarted: false};
}
async function currentPureParameters(): Promise<AdoptedCaptionJudgmentParametersV001> {
  const plan = await json(physical(PLAN, 'digest-plan.json')), adoption = await json(physical(EXECUTION, 'machine-adoption.json'));
  const retention = await json(physical(PLAN, 'retention-validation.json')), template = await json(PARAMS.styleTemplateBinding.path);
  const prompt = record(template.promptInput), segments = records(adoption.selectedCandidates);
  // Existing inputs were qualified by the runner; the clone tests reuse their exact typed values.
  const result: AdoptedCaptionJudgmentParametersV001 = {
    preparationId: PARAMS.preparationId, meaningPath: `${NEW}/bundle/meaning-input.json`,
    planBinding: {path: `artifacts/${DRAFT}/${PLAN}/digest-plan.json`, fileSha256: PARAMS.expected.planSha256},
    machineAdoptionBinding: formal.bind(`artifacts/${DRAFT}/${EXECUTION}/machine-adoption.json`, adoption),
    transcriptBinding: JSON.parse(JSON.stringify(plan.transcriptBinding)), utteranceBinding: JSON.parse(JSON.stringify(plan.utteranceBinding)),
    sourceVideoBinding: JSON.parse(JSON.stringify(plan.sourceVideoBinding)),
    parts: segments.map(s => JSON.parse(JSON.stringify({candidateId: s.candidateId, timelineSegmentId: s.segmentId,
      sourceSegmentIds: s.sourceSegmentIds, sourceInterval: {sourceStartMs: s.sourceStartMs, sourceEndMs: s.sourceEndMs}}))),
    retainedSourceSegmentIds: segments.flatMap(s => {assert(Array.isArray(s.sourceSegmentIds)); return s.sourceSegmentIds;}),
    droppedSourceSegmentIds: records(retention.candidates).flatMap(c => records(c.blocks).filter(b => b.action === 'drop').flatMap(b => {assert(Array.isArray(b.sourceSegmentIds)); return b.sourceSegmentIds;})),
    transcript: JSON.parse((await read(physical(STT, 'transcript.json'))).toString()),
    utterances: JSON.parse((await read(physical(PLAN, 'utterances.json'))).toString()),
    taskDescription: JSON.parse(JSON.stringify(prompt.taskDescription)), styleLimits: JSON.parse(JSON.stringify(prompt.styleLimits)),
  };
  return result;
}
async function equivalence() {
  const oldRoot = 'runtime/artifacts/digest-new-material-20260926-v001';
  const plan = await json(`${oldRoot}/selection-plan.json`), adoption = await json(`${oldRoot}/machine-adoption.json`), base = await json(`${oldRoot}/base-media-bindings.json`);
  const request = record(plan.request);
  const readJsonBinding = async (v: unknown) => {
    const b = record(v); assert(typeof b.path === 'string' && b.path.endsWith('.json'));
    const bytes = await read(b.path); assert.equal(sha(bytes), b.fileSha256);
    const value = record(JSON.parse(bytes.toString()));
    if (b.schemaVersion) {assert.equal(value.schemaVersion, b.schemaVersion); assert.equal(formal.canonicalSha(value), b.canonicalSha256);}
    return value;
  };
  const context = {plan, planBinding: formal.bind(`${oldRoot}/selection-plan.json`, plan),
    transcript: await readJsonBinding(request.transcript), utterances: await readJsonBinding(request.utterances),
    captionStyleTemplate: await readJsonBinding(request.captionStyleTemplate)};
  for (const k of ['timeline', 'generationManifest', 'validationReceipt']) await readJsonBinding(base[k]);
  assert(record(base.baseMedia).path && record(base.baseMedia).fileSha256); // metadata only
  const part = records(adoption.selectedCandidates)[0]; assert(part);
  const adoptionBinding = formal.bind(`${oldRoot}/machine-adoption.json`, adoption);
  const old = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const oldBuilt = old.buildAdoptedCaptionInputsV001(context, [part], adoptionBinding, base,
    {meaning: 'new-material-digest-caption-meaning-input-v001', displayRequest: 'new-material-digest-caption-display-request-v001', sourceRole: 'new-material-digest'});
  const parameters: AdoptedCaptionJudgmentParametersV001 = JSON.parse(JSON.stringify({
    preparationId: plan.planId, meaningPath: `${plan.outputRoot}/meaning-input.json`, planBinding: context.planBinding,
    machineAdoptionBinding: adoptionBinding, transcriptBinding: request.transcript, utteranceBinding: request.utterances,
    sourceVideoBinding: request.sourceVideo, parts: [part], retainedSourceSegmentIds: part.sourceSegmentIds, droppedSourceSegmentIds: [],
    transcript: context.transcript, utterances: context.utterances,
    taskDescription: record(context.captionStyleTemplate.promptInput).taskDescription,
    styleLimits: record(context.captionStyleTemplate.promptInput).styleLimits,
  }));
  const fresh = buildAdoptedCaptionJudgmentInputsV001(parameters);
  for (const k of ['artifactId', 'machineAdoptionBinding', 'transcriptBinding', 'utteranceBinding', 'sourceVideoBinding', 'orderedCandidates', 'atomOccurrences', 'captions'])
    assert.deepEqual(record(fresh.meaning)[k], oldBuilt.meaning[k], `EQUIVALENCE_MEANING_${k}`);
  assert.equal(fresh.requests.length, oldBuilt.requests.length);
  fresh.requests.forEach((r, i) => {
    for (const k of ['requestId', 'planBinding', 'machineAdoptionBinding', 'candidateId', 'timelineSegmentId', 'input', 'inputCanonicalSha256'])
      assert.deepEqual(record(r)[k], oldBuilt.requests[i][k], `EQUIVALENCE_REQUEST_${k}`);
  });
  return {status: 'passed', contextPlan: `${oldRoot}/selection-plan.json`, selectedPart: part.timelineSegmentId,
    atomCount: fresh.meaning.atomOccurrences.length, baseJsonReferencesVerified: 3, baseMediaBytesRead: 0,
    compared: ['raw text', 'source IDs/ms', 'common utterances', 'atom order', 'group order', 'caption/boundary IDs', 'taskDescription', 'styleLimits', 'request inputCanonicalSha256'],
    intentionalDifferences: ['preparation meaning/request schema names', 'meaning binding hashes changed by the new preparation schema', 'no sourcePackage, old approval/base/renderer provenance']};
}
async function run() {
  const startedAt = new Date().toISOString(), started = performance.now(), pre = await preflight(), before = await snapshot();
  await mkdir(path.join(ROOT, NEW));
  await save('old-inputs-before.json', before);
  await save('parameters.json', PARAMS);
  const eqStart = performance.now(), eq = await equivalence(), eqMs = performance.now() - eqStart;
  const prepStart = performance.now(), prepared = await prepareDigestCaptionJudgmentInputsV001(PARAMS), prepMs = performance.now() - prepStart;
  const p = await currentPureParameters(), built = buildAdoptedCaptionJudgmentInputsV001(p);
  assert.deepEqual(prepared.meaning, built.meaning); assert.deepEqual(prepared.requests, built.requests);
  assert.equal(built.meaning.atomOccurrences.length, 3613); assert.equal(built.requests.length, 9);
  assert.equal(built.meaning.orderedCandidates.filter(g => g.candidateId === 'candidate-0006').length, 3);
  assert.equal(new Set(built.meaning.atomOccurrences.map(a => a.sourceSegmentId)).size, 3613);
  assert.deepEqual(built.meaning.atomOccurrences.map(a => a.sourceSegmentId), p.retainedSourceSegmentIds);
  assert(built.meaning.atomOccurrences.every(a => !p.droppedSourceSegmentIds.includes(a.sourceSegmentId)));
  assert.equal(p.droppedSourceSegmentIds.length, 3460);
  const negatives: Array<{condition: string; expected: string; observed: string; savedOutputsIncreased: false}> = [];
  const count = async () => (await files(`${NEW}/bundle`)).length;
  async function reject(condition: string, expected: string, action: () => unknown | Promise<unknown>) {
    const beforeCount = await count(); let observed = '';
    try {await action();} catch (e) {observed = e instanceof Error ? e.message : String(e);}
    assert(observed.includes(expected), `${condition}: expected ${expected}, observed ${observed}`);
    assert.equal(await count(), beforeCount);
    negatives.push({condition, expected, observed: observed.split('\n')[0]!, savedOutputsIncreased: false});
  }
  const fixture = `${NEW}/negative-fixtures`; await mkdir(path.join(ROOT, fixture));
  const state: Zev2State = JSON.parse((await read(PARAMS.stateBinding.path)).toString());
  const stateCase = async (name: string, mutate: (s: Zev2State) => void, expected: string) => {
    const clone = structuredClone(state); mutate(clone); const bytes = jsonBytes(clone), file = `${fixture}/${name}.json`;
    await writeFile(path.join(ROOT, file), bytes, {flag: 'wx'});
    await reject(name, expected, () => prepareDigestCaptionJudgmentInputsV001({...PARAMS,
      outputRoot: path.join(ROOT, NEW, `rejected-${name}`), stateBinding: {path: file, fileSha256: sha(bytes)}}));
    await assert.rejects(lstat(path.join(ROOT, NEW, `rejected-${name}`)), {code: 'ENOENT'});
  };
  await reject('other-draft', 'CAPTION_PREPARATION_REQUEST_MISMATCH', () => prepareDigestCaptionJudgmentInputsV001({...PARAMS,
    expected: {...PARAMS.expected, requestDraftId: 'draft-unrelated'}}));
  await stateCase('owner', s => {const ref = s.fileRefs.find(f => f.id === s.agentRequests.find(r => r.id === PLAN)?.result?.fileRefId); assert(ref); ref.ownerId = 'output-unrelated';}, 'DIGEST_DEPENDENCY_REFERENCE_INVALID');
  await stateCase('reference-other-draft', s => {const ref = s.fileRefs.find(f => f.id === s.agentRequests.find(r => r.id === PLAN)?.result?.fileRefId); assert(ref); ref.uri = ref.uri.replace(DRAFT, 'draft-unrelated');}, 'DIGEST_DEPENDENCY_OTHER_DRAFT');
  await stateCase('incomplete', s => {const r = s.agentRequests.find(r => r.id === EXECUTION); assert(r); r.status = 'running';}, 'CAPTION_PREPARATION_REQUEST_INCOMPLETE');
  for (const [name, expected, mutate] of [
    ['missing-keep', 'CAPTION_KEEP_MEMBERSHIP_OR_ORDER_CHANGED', (x: AdoptedCaptionJudgmentParametersV001) => {x.parts[0]!.sourceSegmentIds.shift();}],
    ['duplicate-keep', 'CAPTION_KEEP_DUPLICATE', (x: AdoptedCaptionJudgmentParametersV001) => {x.parts[0]!.sourceSegmentIds.push(x.parts[0]!.sourceSegmentIds[0]!);}],
    ['drop-inclusion', 'CAPTION_DROP_INCLUDED', (x: AdoptedCaptionJudgmentParametersV001) => {x.parts[0]!.sourceSegmentIds[0] = x.droppedSourceSegmentIds[0]!;}],
  ] satisfies Array<[string, string, (x: AdoptedCaptionJudgmentParametersV001) => void]>) {
    const clone = structuredClone(p); mutate(clone); await reject(name, expected, () => buildAdoptedCaptionJudgmentInputsV001(clone));
  }
  const cloned = `${fixture}/source-runtime`, clonedDir = `${cloned}/artifacts/${DRAFT}`;
  await mkdir(path.join(ROOT, clonedDir), {recursive: true});
  for (const name of await readdir(path.join(ROOT, OLD, 'artifacts', DRAFT))) if (name.endsWith('.json'))
    await writeFile(path.join(ROOT, clonedDir, name), await read(`${OLD}/artifacts/${DRAFT}/${name}`), {flag: 'wx'});
  const transcriptPath = `${clonedDir}/${STT}--transcript.json`, raw: AdoptedCaptionJudgmentParametersV001['transcript'] = JSON.parse((await read(transcriptPath)).toString());
  raw.segments[68]!.text += '改変'; await writeFile(path.join(ROOT, transcriptPath), jsonBytes(raw));
  await reject('text-tamper', 'CAPTION_PREPARATION_SHA_MISMATCH', () => prepareDigestCaptionJudgmentInputsV001({...PARAMS, sourceRuntimeRoot: path.join(ROOT, cloned), outputRoot: path.join(ROOT, NEW, 'rejected-text')}));
  // The unknown version has coherent normal FileRef byte size/SHA, so version rejection is observed.
  const planPath = `${clonedDir}/${PLAN}--digest-plan.json`, altered = await json(planPath); altered.schemaVersion = 'unknown-plan-v999';
  const alteredBytes = jsonBytes(altered); await writeFile(path.join(ROOT, planPath), alteredBytes);
  const versionState = structuredClone(state), versionRef = versionState.fileRefs.find(f => f.id === versionState.agentRequests.find(r => r.id === PLAN)?.result?.fileRefId); assert(versionRef);
  versionRef.sha256 = sha(alteredBytes); versionRef.byteSize = alteredBytes.length;
  const versionStateBytes = jsonBytes(versionState), versionStatePath = `${fixture}/unknown-version-state.json`; await writeFile(path.join(ROOT, versionStatePath), versionStateBytes, {flag: 'wx'});
  await reject('unknown-version', 'DIGEST_PLAN_VERSION_OR_FIELDS_INVALID', () => prepareDigestCaptionJudgmentInputsV001({...PARAMS, sourceRuntimeRoot: path.join(ROOT, cloned),
    outputRoot: path.join(ROOT, NEW, 'rejected-version'), stateBinding: {path: versionStatePath, fileSha256: sha(versionStateBytes)},
    expected: {...PARAMS.expected, planSha256: versionRef.sha256}}));
  const style = await json(PARAMS.styleTemplateBinding.path); record(record(style.promptInput).styleLimits).maxLinesPerCue = 3;
  const stylePath = `${fixture}/changed-style.json`; await writeFile(path.join(ROOT, stylePath), jsonBytes(style), {flag: 'wx'});
  await reject('style-tamper', 'CAPTION_PREPARATION_SHA_MISMATCH', () => prepareDigestCaptionJudgmentInputsV001({...PARAMS,
    outputRoot: path.join(ROOT, NEW, 'rejected-style'), styleTemplateBinding: {...PARAMS.styleTemplateBinding, path: stylePath}}));
  // Clone the prepared small bundle, coherently rebase its logical paths, then tamper one output.
  const tamperedRoot = `${NEW}/negative-output`, rebasedParams = {...PARAMS, outputRoot: path.join(ROOT, tamperedRoot)};
  await mkdir(rebasedParams.outputRoot);
  const oldPrefix = `${NEW}/bundle`, rebase = (bytes: Buffer) => Buffer.from(bytes.toString().split(oldPrefix).join(tamperedRoot));
  const tamperedManifest = structuredClone(prepared.manifest);
  assert(Array.isArray(tamperedManifest.outputs));
  for (const entry of records(tamperedManifest.outputs)) {
    assert(typeof entry.fileName === 'string'); let value = record(JSON.parse(rebase(await read(`${oldPrefix}/${entry.fileName}`)).toString()));
    if (entry.fileName !== 'meaning-input.json') {
      const meaning = await json(`${oldPrefix}/meaning-input.json`); value.meaningInputBinding = formal.bind(`${tamperedRoot}/meaning-input.json`, meaning);
    }
    const b = formal.bind(`${tamperedRoot}/${entry.fileName}`, value); Object.assign(entry, b);
    await writeFile(path.join(ROOT, tamperedRoot, entry.fileName), formal.formal(value), {flag: 'wx'});
  }
  const tamperedManifestBytes = formal.formal(tamperedManifest);
  await writeFile(path.join(ROOT, tamperedRoot, 'manifest.json'), tamperedManifestBytes, {flag: 'wx'});
  const tamperedMeaningPath = `${tamperedRoot}/meaning-input.json`, tamperedMeaning = await json(tamperedMeaningPath);
  records(tamperedMeaning.atomOccurrences)[0]!.text = '出力改変'; await writeFile(path.join(ROOT, tamperedMeaningPath), jsonBytes(tamperedMeaning));
  await reject('saved-output-tamper', 'CAPTION_PREPARATION_SAVED_OUTPUT_CHANGED', () => readPreparedDigestCaptionJudgmentInputsV001(rebasedParams,
    {path: `${tamperedRoot}/manifest.json`, fileSha256: sha(tamperedManifestBytes)}));
  for (const name of ['rejected-text', 'rejected-version', 'rejected-style']) await assert.rejects(lstat(path.join(ROOT, NEW, name)), {code: 'ENOENT'});
  assert.deepEqual(await snapshot(), before, 'OLD_INPUTS_CHANGED');
  await save('manifest-binding.json', prepared.manifestBinding);
  const evidence = await json(`${REPORT}/evidence.json`);
  const result = {...evidence, status: 'prepared-awaiting-separate-readback', history: {productFixes: 6, setupFixes: 20, newImplementationPaths: 2, setup19Applied: true, setup20Applied: true},
    startedAt, preflight: pre, implementation: {limitedDerivation: {path: preserved[0], fileSha256: before[preserved[0]!], lines: '175–235'}, existingBytesUnchanged: preserved.map(p => ({path: p, fileSha256: before[p]}))},
    actualConnection: {retainedAtoms: built.meaning.atomOccurrences.length, requests: built.requests.length, groups: built.meaning.orderedCandidates.map(g => ({candidateId: g.candidateId, timelineSegmentId: g.timelineSegmentId, atoms: g.atomOccurrenceIds.length})),
      droppedAtoms: p.droppedSourceSegmentIds.length, dropIncluded: 0, originalClock: prepared.manifest.originalClockBinding, originalPurposePreserved: true,
      requestsSha: records(prepared.manifest.outputs).slice(1).map(b => ({path: b.path, fileSha256: b.fileSha256})), manifestBinding: prepared.manifestBinding},
    equivalence: eq, negatives, preserved: {snapshotPath: `${NEW}/old-inputs-before.json`, files: Object.keys(before).length, unchanged: true},
    phaseTimesMs: {equivalence: eqMs, preparation: prepMs, totalSoFar: performance.now() - started},
    effects: {mediaReadHashCopyPut: 0, normalHttp: 0, sourceSttInspectionExecution: 0, judgmentCalls: 0, rendering: 0, costUsd: 0},
    unresolved: ['completed base 4 references', 'display answers', 'final style/renderer binding', 'ROOT-based downstream readBound connection', 'video permission', 'human quality']};
  await writeFile(path.join(ROOT, REPORT, 'evidence.json'), jsonBytes(result));
  await save('checkpoint.json', result);
  console.log(JSON.stringify({status: result.status, atoms: 3613, requests: 9, equivalence: eq.status, negativeConditions: negatives.length, manifestBinding: prepared.manifestBinding}));
}
async function readback() {
  const started = performance.now(), params: DigestCaptionPreparationParametersV001 = JSON.parse((await read(`${NEW}/parameters.json`)).toString());
  const before = await json(`${NEW}/old-inputs-before.json`), manifestBinding = JSON.parse((await read(`${NEW}/manifest-binding.json`)).toString());
  const result = await readPreparedDigestCaptionJudgmentInputsV001(params, manifestBinding);
  assert.deepEqual(await snapshot(), before, 'OLD_INPUTS_CHANGED_AFTER_READBACK');
  const evidence = await json(`${REPORT}/evidence.json`);
  const rb = {status: 'passed', separateProcessPid: process.pid, reconstructedAtomCount: records(result.meaning.atomOccurrences).length,
    requestCount: result.requests.length, manifestBinding, allBytesReconstructedEqual: true, originalInputsUnchanged: true,
    judgmentCalls: 0, stateUpdates: 0, mediaReadHashCopyPut: 0, elapsedMs: performance.now() - started};
  await save('readback.json', rb);
  await writeFile(path.join(ROOT, REPORT, 'evidence.json'), jsonBytes({...evidence, status: 'passed', completedAt: new Date().toISOString(), separateProcessReadback: rb}));
  console.log(JSON.stringify(rb));
}
const mode = process.argv[2];
if (mode === 'preflight') console.log(JSON.stringify(await preflight()));
else if (mode === 'run') await run();
else if (mode === 'readback') await readback();
else throw new Error('Explicit preflight/run/readback mode required');

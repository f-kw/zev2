/** P2: rerun only finite-state QC against saved P1 media and native PNGs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import {buildPresentationNativeFrameQcRecipeV001, inspectPresentationNativeFrameQcV001}
  from '../../evals/clip_composition/presentation_native_frame_qc_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {createPresentationRendererProcessObserverV001}
  from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {comparePreviewNativeRgbBytesV001}
  from '../../evals/clip_composition/presentation_editing_preview_rgb_verification_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const filename = fileURLToPath(import.meta.url), repo = path.resolve(path.dirname(filename), '../..');
const node20 = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const hash = value => createHash('sha256').update(value).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
const progress = value => process.stdout.write(JSON.stringify(value) + '\n');
const specifications = [
  {name: 'panel', text: 'なんかグロいやつに捕まってる', startFrame: 1675, endFrameExclusive: 1866},
  {name: 'shake', text: 'いるやんいるやん', startFrame: 0, endFrameExclusive: 131},
];

async function readBound(ref) {
  const info = await lstat(ref.path);
  assert(info.isFile() && !info.isSymbolicLink(), 'bound input must be a regular file: ' + ref.path);
  const bytes = await readFile(ref.path);
  if (ref.bytes !== undefined) assert.equal(bytes.length, ref.bytes);
  assert.equal(hash(bytes), ref.fileSha256, 'bound input changed: ' + ref.path);
  return bytes;
}
const loadBound = async ref => JSON.parse(await readBound(ref));
async function bind(file) {
  assert(path.isAbsolute(file), 'an absolute input path is required');
  const info = await lstat(file); assert(info.isFile() && !info.isSymbolicLink());
  const bytes = await readFile(file);
  return {path: file, bytes: bytes.length, fileSha256: hash(bytes)};
}

function publishedPath(draw, file) {
  if (!file.startsWith(draw.stagingDirectory + path.sep)) return file;
  return path.join(draw.outputDirectory, path.relative(draw.stagingDirectory, file));
}
function relocatePaths(draw, value) {
  if (typeof value === 'string') return publishedPath(draw, value);
  if (Array.isArray(value)) return value.map(row => relocatePaths(draw, row));
  if (value !== null && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, row]) => [key, relocatePaths(draw, row)]));
  return value;
}
function finiteRelocations(draw) {
  const finite = draw.completedFrameQc.evidence.finiteState, mappings = new Map();
  for (const ref of [...finite.inputManifest.inputRefs, ...finite.outputArtifacts]) {
    const actual = publishedPath(draw, ref.path);
    if (actual === ref.path) continue;
    const row = {from: ref.path, to: actual, fileSha256: ref.fileSha256};
    if (mappings.has(ref.path)) assert.deepEqual(mappings.get(ref.path), row);
    mappings.set(ref.path, row);
  }
  return [...mappings.values()];
}
function recipeProjection(samples) {
  return structuredClone(samples.map(row => ({instructionId: row.instructionId, frame: row.frame,
    mediaFrame: row.mediaFrame, expectedState: row.expectedState, expectedOverlaySha256: row.expectedOverlaySha256,
    crop: row.crop, references: row.references.map(reference => ({id: reference.id,
      kind: reference.kind, layers: reference.layers}))})));
}
const sceneProjection = rows => rows.map(({states, alternates, ...row}) => ({...row,
  states: states.map(({pngPath: _path, ...state}) => state),
  alternates: alternates.map(({pngPath: _path, ...state}) => state)}));

/** Reads saved JSON only. No executable/media hashing, child execution or writes. */
async function inspectSourceCase(row, spec) {
  assert.equal(row.status, 'passed'); assert.equal(row.condition.text, spec.text);
  assert.equal(row.condition.range.startFrame, spec.startFrame);
  assert.equal(row.condition.range.endFrameExclusive, spec.endFrameExclusive);
  assert.equal(row.condition.selection, 'Reset');
  const draw = await json(row.nativeEvidence.drawResultRef.path);
  assert.equal(draw.completedFrameQc.status, 'passed');
  const finite = draw.completedFrameQc.evidence.finiteState;
  const preparationPath = path.join(draw.scratchDirectory, 'native-qc-preparation/preparation.json');
  const prepared = await json(preparationPath);
  const byRole = new Map(finite.inputManifest.inputRefs.map(ref => [ref.role, ref]));
  for (const ref of prepared.provenance.inputRefs) {
    assert.equal(byRole.get(ref.role)?.path, ref.path, 'prepared provenance differs from saved execution');
    assert.equal(byRole.get(ref.role)?.fileSha256, ref.fileSha256);
  }
  const get = role => {
    const ref = byRole.get(role); assert(ref, 'saved input role missing: ' + role);
    return {path: publishedPath(draw, ref.path), fileSha256: ref.fileSha256};
  };
  const input = {plan: draw.resolvedPlan, records: relocatePaths(draw, prepared.records),
    provenance: relocatePaths(draw, prepared.provenance), renderRange: draw.renderRange,
    media: {base: get('base-media'), completed: get('completed-media')},
    tools: {ffmpeg: get('tool-ffmpeg'), imageMagick: get('tool-imagemagick')}};
  assert.equal(input.renderRange.startFrame, spec.startFrame);
  assert.equal(input.renderRange.endFrameExclusive, spec.endFrameExclusive);
  assert.deepEqual(input.renderRange, finite.renderRange);
  assert.equal(input.provenance.planCanonicalSha256, hashJson(input.plan));
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan: input.plan, records: input.records,
    baselinePlan: finite.baselinePlan, autoPresentation: finite.autoPresentation,
    orchestrationDrawingView: finite.orchestrationInput === undefined ? undefined
      : restoreOrchestrationDrawingViewEvidenceV001(finite.orchestrationInput), renderRange: input.renderRange});
  assert.deepEqual(recipeProjection(recipe.samples), recipeProjection(finite.samples),
    'current recipe changed saved points or candidates');
  assert.deepEqual(sceneProjection(recipe.sceneBindings), sceneProjection(finite.sceneBindings),
    'current recipe changed native state bindings');
  const sourceInputRefs = finite.inputManifest.inputRefs.map(ref => ({...ref,
    path: publishedPath(draw, ref.path)}));
  const relocations = finiteRelocations(draw);
  return {draw, finite, input, preparationPath, sourceInputRefs, relocations,
    condition: {name: spec.name, text: spec.text, selection: 'Reset', range: row.condition.range,
      sampleCount: recipe.samples.length,
      logicalCandidateCount: recipe.samples.reduce((sum, sample) => sum + sample.references.length, 0),
      recipeCanonicalSha256: hashJson(recipeProjection(recipe.samples)),
      sceneCanonicalSha256: hashJson(sceneProjection(recipe.sceneBindings))}};
}

export async function inspectP2QcSourceV001(sourceResultPath) {
  assert(path.isAbsolute(sourceResultPath));
  const source = await json(sourceResultPath); assert.equal(source.status, 'passed');
  const cases = [];
  for (const spec of specifications) {
    const row = source.cases.find(item => item.name === spec.name); assert(row);
    const value = await inspectSourceCase(row, spec);
    const missing = [];
    for (const ref of value.sourceInputRefs) {
      try {const info = await lstat(ref.path); assert(info.isFile() && !info.isSymbolicLink());}
      catch (error) {missing.push({role: ref.role, path: ref.path, message: error.message});}
    }
    assert.equal(missing.length, 0, JSON.stringify(missing));
    cases.push({...value.condition, preparationPath: value.preparationPath,
      inputReferenceCount: value.sourceInputRefs.length, relocations: value.relocations,
      savedPerformance: value.draw.completedFrameQc.performance.finiteState});
  }
  return {status: 'passed', sourceResultPath, cases,
    scope: 'saved JSON recipe and file existence only; no QC, rendering, media hash or output writes'};
}

async function codeClosure() {
  const found = new Map();
  const visit = async file => {
    if (found.has(file)) return;
    const ref = await bind(file); found.set(file, ref);
    const source = (await readBound(ref)).toString('utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/gu)) {
      const dependency = path.resolve(path.dirname(file), match[1]);
      assert(dependency.startsWith(repo + path.sep));
      await visit(dependency);
    }
  };
  await visit(filename);
  return [...found.values()].sort((left, right) => left.path.localeCompare(right.path));
}
async function environment() {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(await realpath(process.execPath), await realpath(node20));
  assert.equal(process.env.PATH.split(path.delimiter)[0], path.dirname(node20));
  return {node: await bind(await realpath(process.execPath)), version: process.version, path: process.env.PATH,
    platform: process.platform, arch: process.arch, release: os.release(), cpuModel: os.cpus()[0]?.model};
}
async function newOutput(directory) {
  assert(path.isAbsolute(directory), 'an explicit absolute unused output directory is required');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory});
  await mkdir(path.dirname(directory), {recursive: true});
  await mkdir(directory);
}

export async function runP2QcPerformanceV001(sourceResultPath, outputDirectory, beforeResultPath) {
  assert(path.isAbsolute(sourceResultPath));
  const before = beforeResultPath ? await json(beforeResultPath) : null;
  if (before) assert.equal(before.status, 'passed');
  await newOutput(outputDirectory);
  const summary = {schemaVersion: 'p2-finite-qc-performance-v001', status: 'running', cases: [],
    boundary: 'inspectPresentationNativeFrameQcV001 only, including its native input hashing, executable versions, '
      + 'extraction, layer preparation, full candidate composition, exact RGB comparison and final verification. '
      + 'Source loading, harness binding, observer setup and result serialization are outside the measured call. '
      + 'No Remotion PNG preparation, main MP4 composition or strict replay is executed.',
    startingConditions: 'new output and scratch per execution; same saved P1 media, native PNGs and QC recipe'};
  try {
    summary.environment = await environment();
    summary.helperRef = await bind(filename);
    summary.sourceResult = await bind(sourceResultPath);
    summary.sourceBindings = await codeClosure();
    if (before) {
      assert.deepEqual(summary.environment, before.environment, 'measurement environment changed');
      assert.deepEqual(summary.helperRef, before.helperRef, 'measurement helper changed');
      assert.deepEqual(summary.sourceResult, before.sourceResult, 'saved P1 source changed');
    }
    const source = await loadBound(summary.sourceResult); assert.equal(source.status, 'passed');
    await save(path.join(outputDirectory, 'preflight.json'), summary);
    for (const spec of specifications) {
      const sourceCase = source.cases.find(row => row.name === spec.name); assert(sourceCase);
      await readBound(sourceCase.nativeEvidence.drawResultRef);
      const saved = await inspectSourceCase(sourceCase, spec);
      const directory = path.join(outputDirectory, spec.name); await mkdir(directory);
      const preparedRef = await bind(saved.preparationPath);
      const fixedInputs = {sourceDraw: sourceCase.nativeEvidence.drawResultRef,
        preparation: preparedRef, inputCanonicalSha256: hashJson(saved.input),
        sourceInputRefs: saved.sourceInputRefs, publicationRelocations: saved.relocations};
      const previous = before?.cases.find(row => row.name === spec.name);
      if (before) {assert(previous); assert.deepEqual(fixedInputs, previous.fixedInputs);
        assert.deepEqual(saved.condition, previous.condition);}
      await save(path.join(directory, 'input.json'), saved.input);
      await save(path.join(directory, 'input-bindings.json'), fixedInputs);
      const observer = createPresentationRendererProcessObserverV001({observationDirectory: path.join(directory, 'processes')});
      const started = performance.now();
      let qc;
      try {
        qc = await inspectPresentationNativeFrameQcV001({...saved.input,
          scratchDirectory: path.join(directory, 'scratch'), processObserver: observer});
      } catch (error) {
        await save(path.join(directory, 'failure.json'), {message: error.message,
          nativeFailure: error.nativeFrameQcFailure ?? null, processes: observer.getPerformance()});
        throw error;
      }
      const measuredCallMilliseconds = performance.now() - started;
      await save(path.join(directory, 'qc-result.json'), qc);
      const processTimings = observer.getPerformance();
      await save(path.join(directory, 'process-timings.json'), processTimings);
      assert.equal(qc.status, 'passed'); assert.deepEqual(qc.violations, []);
      assert.deepEqual(recipeProjection(qc.evidence.samples), recipeProjection(saved.finite.samples));
      assert.deepEqual(sceneProjection(qc.evidence.sceneBindings), sceneProjection(saved.finite.sceneBindings));
      assert.equal(qc.performance.logicalReferenceCount, saved.condition.logicalCandidateCount);
      assert.equal(qc.evidence.samples.length, saved.condition.sampleCount);
      await readBound(preparedRef); await readBound(sourceCase.nativeEvidence.drawResultRef);
      const row = {name: spec.name, status: 'passed', condition: saved.condition, fixedInputs,
        input: await bind(path.join(directory, 'input.json')),
        qcResult: await bind(path.join(directory, 'qc-result.json')),
        processTimings: await bind(path.join(directory, 'process-timings.json')),
        measuredCallMilliseconds, performance: qc.performance,
        recordedChildProcessCount: processTimings.records.length,
        comparisonPending: 'full RGB/candidate correspondence is performed by a separate compare command'};
      summary.cases.push(row);
      await save(path.join(directory, 'result.json'), row);
      progress({name: spec.name, status: row.status, measuredCallMilliseconds,
        samples: saved.condition.sampleCount, candidates: saved.condition.logicalCandidateCount});
    }
    await readBound(summary.sourceResult);
    for (const ref of summary.sourceBindings) await readBound(ref);
    summary.status = 'passed';
  } catch (error) {summary.status = 'failed'; summary.failure = {message: error.message, stack: error.stack};}
  await save(path.join(outputDirectory, 'result.json'), summary);
  return {status: summary.status, resultPath: path.join(outputDirectory, 'result.json'), failure: summary.failure ?? null};
}

export async function compareP2QcPerformanceV001(beforeResultPath, afterResultPath, outputDirectory) {
  const beforeRef = await bind(beforeResultPath), afterRef = await bind(afterResultPath);
  const before = await loadBound(beforeRef), after = await loadBound(afterRef);
  assert.equal(before.status, 'passed'); assert.equal(after.status, 'passed');
  assert.deepEqual(after.environment, before.environment); assert.deepEqual(after.helperRef, before.helperRef);
  assert.deepEqual(after.sourceResult, before.sourceResult);
  await newOutput(outputDirectory);
  const result = {schemaVersion: 'p2-finite-qc-comparison-v001', status: 'running', before: beforeRef,
    after: afterRef, cases: [], scope: 'all saved input bindings, all points and logical candidates; '
      + 'full completed/reference RGB bytes, exact distance/classification/visibility/verdict recalculation'};
  try {
    for (const spec of specifications) {
      const left = before.cases.find(row => row.name === spec.name), right = after.cases.find(row => row.name === spec.name);
      assert(left && right); assert.deepEqual(left.fixedInputs, right.fixedInputs); assert.deepEqual(left.condition, right.condition);
      const oldQc = await loadBound(left.qcResult), newQc = await loadBound(right.qcResult);
      assert.deepEqual(newQc.violations, oldQc.violations); assert.equal(newQc.status, oldQc.status);
      assert.deepEqual(sceneProjection(newQc.evidence.sceneBindings), sceneProjection(oldQc.evidence.sceneBindings));
      const rgb = await comparePreviewNativeRgbBytesV001({before: oldQc.evidence, after: newQc.evidence});
      const file = path.join(outputDirectory, spec.name + '-rgb-comparison.json'); await save(file, rgb);
      result.cases.push({name: spec.name, condition: left.condition, rgb: await bind(file), counts: rgb.counts,
        beforeMilliseconds: left.measuredCallMilliseconds, afterMilliseconds: right.measuredCallMilliseconds,
        savedMilliseconds: left.measuredCallMilliseconds - right.measuredCallMilliseconds,
        afterOverBefore: right.measuredCallMilliseconds / left.measuredCallMilliseconds,
        beforePerformance: left.performance, afterPerformance: right.performance});
      progress({name: spec.name, status: 'passed', ...rgb.counts});
    }
    await readBound(beforeRef); await readBound(afterRef); result.status = 'passed';
  } catch (error) {result.status = 'failed'; result.failure = {message: error.message, stack: error.stack};}
  await save(path.join(outputDirectory, 'result.json'), result);
  return {status: result.status, resultPath: path.join(outputDirectory, 'result.json'), failure: result.failure ?? null};
}

if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  const [command, ...args] = process.argv.slice(2);
  const action = command === 'inspect' && args.length === 1 ? () => inspectP2QcSourceV001(...args)
    : command === 'run' && [2, 3].includes(args.length) ? () => runP2QcPerformanceV001(...args)
    : command === 'compare' && args.length === 3 ? () => compareP2QcPerformanceV001(...args) : null;
  assert(action, 'usage: p2-qc-performance.mjs inspect source-result | run source-result output [before-result] '
    + '| compare before-result after-result output (all paths absolute)');
  action().then(result => {progress(result); if (result.status !== 'passed') process.exitCode = 1;})
    .catch(error => {console.error(error.stack); process.exitCode = 1;});
}

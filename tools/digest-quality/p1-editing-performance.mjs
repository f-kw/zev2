/** P1: two fixed real editing requests, isolated cold stores, unchanged HTTP/QC path. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {copyFile, lstat, mkdir, readFile, readdir, realpath, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startPresentationEditingServiceV001} from '../../evals/clip_composition/serve_presentation_editing_v001.mjs';
import {bindEditingFileV001, hashEditingValueV001, readEditingWorkspaceV001}
  from '../../evals/clip_composition/presentation_editing_state_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001}
  from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {deriveEditingPreviewRangeV001}
  from '../../evals/clip_composition/presentation_editing_navigation_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const filename = fileURLToPath(import.meta.url), repo = path.resolve(path.dirname(filename), '../..');
const stage4 = path.join(repo, 'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001');
const evidenceRoot = path.join(stage4, 'p1-overlay-startup-20260921-v001');
const sourceDirectory = path.join(stage4, 'review-reflection-r1-r3-20260921-v002/hrb-integrated-v001');
const baseConfigPath = path.join(path.dirname(repo), 'editing-service-config-v001.json');
const node20 = '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node';
const stateNames = ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord'];
const inputNames = ['source-bindings.json', 'fresh-input.json', 'raw-ai-response-v001.json',
  ...stateNames.map(name => name + '.json'), 'drawing-evidence.json', 'lineage.json'];
const cases = [
  {name: 'panel', suffix: '000014', text: 'なんかグロいやつに捕まってる', selection: 'Reset',
    expectedPreset: 'panel', expectedSelection: {role: 'Panel accent', presentation: 'provisional-panel',
      scope: 'whole-caption', paletteId: 'warm'}, expectedRange: {startFrame: 1675, endFrameExclusive: 1866}},
  {name: 'shake', suffix: '000003', text: 'いるやんいるやん', selection: 'Reset',
    expectedPreset: 'shake', expectedSelection: {role: 'Shake accent', presentation: 'provisional-shake', scope: 'whole-caption'},
    expectedRange: {startFrame: 0, endFrameExclusive: 131}},
];
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx', mode: 0o600});
const hashBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const clean = value => {const result = structuredClone(value); delete result.csrfToken; return result;};
const elapsed = start => performance.now() - start;
const progress = value => process.stdout.write(JSON.stringify(value) + '\n');
async function absent(file) {await assert.rejects(lstat(file), {code: 'ENOENT'});}
async function bindings(directory, names) {
  return Promise.all(names.map(async name => ({name, ...await bindEditingFileV001(path.join(directory, name))})));
}
const contentIdentity = refs => refs.map(({name, bytes, fileSha256}) => ({name, bytes, fileSha256}));
async function walk(directory) {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const file = path.join(directory, name), info = await lstat(file);
    assert(!info.isSymbolicLink(), 'owned evidence must not contain symlinks');
    if (info.isDirectory()) files.push(...await walk(file));
    else if (info.isFile()) files.push(file);
  }
  return files;
}
function spawnCaptured(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {cwd: repo, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], ...options});
    const out = [], err = [];
    child.stdout.on('data', bytes => out.push(bytes)); child.stderr.on('data', bytes => err.push(bytes));
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({code, signal, stdout: Buffer.concat(out).toString('utf8'),
      stderr: Buffer.concat(err).toString('utf8'), childPid: child.pid, parentPid: process.pid}));
  });
}
async function environment() {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(await realpath(process.execPath), await realpath(node20));
  assert.equal(process.env.PATH.split(path.delimiter)[0], path.dirname(node20), 'put Node20 first in PATH');
  const child = await spawnCaptured(['--input-type=module', '-e',
    'console.log(JSON.stringify({node:process.execPath,version:process.version,path:process.env.PATH,pid:process.pid}))']);
  assert.equal(child.code, 0, child.stderr); assert.equal(child.signal, null);
  const observed = JSON.parse(child.stdout);
  assert.equal(observed.version, process.version); assert.equal(observed.node, process.execPath);
  assert.equal(observed.path, process.env.PATH); assert.notEqual(observed.pid, process.pid);
  return {node: await bindEditingFileV001(process.execPath), version: process.version, path: process.env.PATH,
    platform: process.platform, arch: process.arch, release: os.release(), cpuModel: os.cpus()[0]?.model,
    chromium: await bindEditingFileV001(await realpath(path.join(repo,
      'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'))),
    remotion: await bindEditingFileV001(await realpath(path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'))),
    child};
}
async function protectedReferences(base) {
  const document = await json(path.join(base.directory, 'document.json'));
  const names = ['document.json', ...document.fixedFiles.map(row => row.name), 'captionOverrides.json', 'connectionOverrides.json',
    ...(await readdir(path.join(base.directory, 'media'))).map(name => path.join('media', name))];
  const reports = ['review-reflection-r1-r3-20260921-v002/review-v002.json',
    'human-review-batch-10-20260921-v001/answers-received-v003/session-answers.json',
    'digest-quality-q3-2-20260921-v001/candidate-record-v001.json',
    'digest-quality-q3-2-20260921-v001/review-data-v001.json',
    'digest-quality-q4-confirmed-transfer-20260921-v001/input-availability-v001.json'];
  return [...await bindings(base.directory, [...new Set(names)].sort()),
    ...await bindings(path.join(repo, 'docs/reports'), reports)];
}
function stateIdentity(snapshot) {
  return {revision: snapshot.revision, viewSha256: snapshot.view.viewSha256,
    projectionSha256: snapshot.view.projection.projectionSha256,
    state: Object.fromEntries(stateNames.map(name => [name, hashEditingValueV001(snapshot.state[name])]))};
}
async function reload(requestPath, resultPath) {
  const request = await json(requestPath), rules = await json(request.drawingRulesPath);
  const snapshot = await readEditingWorkspaceV001({directory: request.directory, drawingRulesRef: rules});
  const actual = stateIdentity(snapshot);
  assert.deepEqual(actual, request.expected); assert.notEqual(process.pid, request.parentPid);
  assert.equal(process.version, 'v20.19.6'); assert.equal(process.env.PATH, request.parentPath);
  const result = {status: 'passed', pid: process.pid, node: process.execPath, version: process.version,
    path: process.env.PATH, independentProcess: true, actual};
  await save(resultPath, result); return result;
}
async function nativeEvidence(config, caseDirectory, renderResult) {
  const all = await walk(config.generatedRoot), requests = [], proofs = [];
  const drawResultPath = path.join(path.dirname(renderResult.candidateVideo.path), '../evidence/draw-result.json');
  const draw = await json(drawResultPath);
  for (const file of all.filter(file => path.basename(file) === 'request.json')) {
    const request = await json(file);
    let props, outputPath;
    if (Array.isArray(request.args) && request.args.includes('--props')) {
      const index = request.args.indexOf('--props'); props = JSON.parse(request.args[index + 1]);
      const composition = request.args.indexOf('PresentationOverlayV001');
      assert(composition >= 0); outputPath = request.args[composition + 1];
    } else {
      const details = request.details ?? request.input ?? request;
      if (details.props && typeof details.outputPath === 'string') ({props, outputPath} = details);
    }
    if (!props) continue;
    assert(path.isAbsolute(outputPath));
    let actualPath = outputPath;
    try {await lstat(actualPath);} catch (error) {
      if (error.code !== 'ENOENT') throw error;
      assert(outputPath.startsWith(draw.stagingDirectory + path.sep), 'native output missing outside published staging');
      actualPath = path.join(draw.outputDirectory, path.relative(draw.stagingDirectory, outputPath));
    }
    requests.push({requestRef: await bindEditingFileV001(file), requestedOutputPath: outputPath,
      propsSha256: hashEditingValueV001(props), inspectionLineIndex: props.inspectionLineIndex ?? null,
      png: await bindEditingFileV001(actualPath)});
  }
  assert(requests.length > 0, 'native request/props observations must be preserved');
  const applicability = path.join(config.generatedRoot, 'applicability');
  for (const name of (await readdir(applicability)).filter(name => /^[a-f0-9]{64}\.json$/.test(name)).sort()) {
    const file = path.join(applicability, name), proof = await json(file);
    assert.equal(hashEditingValueV001(proof.body), proof.proofSha256);
    assert.equal(proof.body.result.status, 'passed');
    proofs.push({reference: await bindEditingFileV001(file), binding: proof.body.binding,
      result: proof.body.result, elapsedMilliseconds: proof.body.elapsedMilliseconds,
      processTimings: proof.body.processTimings ?? proof.body.result.processTimings ?? null,
      artifacts: proof.body.artifacts});
  }
  const cacheFiles = (await walk(config.nativeAssetReuse)).filter(file => /^[a-f0-9]{64}\.json$/.test(path.basename(file)));
  const output = {schemaVersion: 'p1-native-image-request-bindings-v001', requests,
    applicability: proofs, drawResultRef: await bindEditingFileV001(drawResultPath),
    cacheProofs: await Promise.all(cacheFiles.map(file => bindEditingFileV001(file))),
    drawingProcessObservations: path.join(path.dirname(drawResultPath), 'processes'),
    scope: 'successful native PNG requests, their original props observations, and published output bytes; cache reuse is reported separately'};
  const file = path.join(caseDirectory, 'native-evidence.json'); await save(file, output);
  return {reference: await bindEditingFileV001(file), requestCount: requests.length,
    distinctPropsCount: new Set(requests.map(row => row.propsSha256)).size,
    applicability: proofs.map(row => ({reference: row.reference, result: row.result,
      elapsedMilliseconds: row.elapsedMilliseconds, processTimings: row.processTimings})),
    drawResultRef: output.drawResultRef};
}
async function runCase({label, spec, runDirectory, base, sourceRefs, reference}) {
  const directory = path.join(runDirectory, spec.name); await mkdir(directory);
  const copiedInputs = path.join(directory, 'input'); await mkdir(copiedInputs);
  for (const name of inputNames) await copyFile(path.join(sourceDirectory, name), path.join(copiedInputs, name), constants.COPYFILE_EXCL);
  assert.deepEqual(contentIdentity(await bindings(copiedInputs, inputNames)), contentIdentity(sourceRefs));
  const generatedRoot = path.join(repo, 'evals/clip_composition/outputs/presentation', `stage4-editing-p1-20260921-${label}-${spec.name}`);
  const config = {...base, directory: path.join(repo, 'runtime/presentation-editing', `p1-20260921-${label}-${spec.name}`),
    generatedRoot, nativeAssetReuse: path.join(generatedRoot, 'native-assets'), savedInputDirectory: copiedInputs,
    title: `P1 ${label} ${spec.name} isolated measurement`, port: 0};
  await absent(config.directory); await absent(config.generatedRoot);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: config.generatedRoot});
  await save(path.join(directory, 'config.json'), config);
  const rules = await buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef: config.backgroundReuseDecoderRef});
  const drawingRulesPath = path.join(directory, 'drawing-rules.json'); await save(drawingRulesPath, rules);
  const sourceView = restoreOrchestrationDrawingViewEvidenceV001(await json(path.join(copiedInputs, 'drawing-evidence.json')));
  const target = sourceView.resolvedPlan.elements.find(row => row.instructionId.endsWith(spec.suffix));
  assert.equal(target?.text, spec.text);
  const targetId = target.instructionId;
  assert.deepEqual(deriveEditingPreviewRangeV001({view: sourceView, kind: 'caption', itemId: targetId, contextSeconds: 2}), spec.expectedRange);
  const fixedSelection = sourceView.resolution.caption.captions.find(row => row.captionId === targetId);
  assert.deepEqual(fixedSelection.effectiveSelection, spec.expectedSelection); assert.equal(fixedSelection.hasOverride, false);
  const condition = {sourceInputs: contentIdentity(sourceRefs), sourceViewSha256: sourceView.viewSha256,
    sourceRenderingRules: (await json(path.join(copiedInputs, 'source-bindings.json'))).captionContext.renderingRulesRef,
    targetId, text: spec.text, selection: spec.selection, effectiveSelection: spec.expectedSelection,
    range: spec.expectedRange, contextSeconds: 2,
    originalCompletion: await bindEditingFileV001(base.originalCompletionPath),
    backgroundProof: await bindEditingFileV001(base.backgroundProofPath), decoder: base.backgroundReuseDecoderRef,
    cacheStart: {nativeAssetEntries: 0, applicabilityEntries: 0, completedPreviewEntries: 0}};
  if (reference) assert.deepEqual(condition, reference.condition, 'baseline/changed input or cold conditions differ');
  await save(path.join(directory, 'condition.json'), condition);
  const result = {name: spec.name, status: 'running', condition, config, operations: [],
    drawingRulesRef: await bindEditingFileV001(drawingRulesPath), setupMilliseconds: null};
  let service, state;
  const record = (name, value) => save(path.join(directory, name + '.json'), value);
  async function request(name, route, input) {
    const origin = new URL(service.url).origin, start = performance.now();
    const response = await fetch(origin + '/api/editing' + route, input === undefined ? {} : {
      method: 'POST', headers: {'content-type': 'application/json', origin, 'x-zev-editing-token': state.csrfToken},
      body: JSON.stringify(input)});
    const value = await response.json();
    result.operations.push({name, route, input: input ?? null, httpStatus: response.status, elapsedMilliseconds: elapsed(start)});
    if (!name.endsWith('-poll')) await record(name, {input: input ?? null, httpStatus: response.status, response: clean(value)});
    assert(response.ok, JSON.stringify(value)); return value;
  }
  async function preview(name) {
    const start = performance.now(), target = {kind: 'caption', itemId: targetId};
    const job = await request(name + '-start', '/jobs', {expectedRevision: state.revision, kind: 'preview', target, contextSeconds: 2});
    let previousPhase;
    do {
      state = await request(name + '-poll', '/state'); assert.equal(state.job.id, job.id);
      if (previousPhase !== state.job.phase) {previousPhase = state.job.phase; progress({case: spec.name, operation: name, ...state.job});}
      if (state.job.status === 'running') await new Promise(resolve => setTimeout(resolve, 2000));
    } while (state.job.status === 'running');
    assert.equal(state.job.status, 'succeeded', state.job.error); await record(name + '-finish', clean(state));
    const media = state.media.find(row => row.id === state.job.mediaId); assert(media?.isCurrent && media.kind === 'preview');
    const registered = await json(path.join(config.directory, 'media', media.id + '.json'));
    assert.deepEqual(registered.range, spec.expectedRange);
    const receiveStart = performance.now(), response = await fetch(new URL(service.url).origin + media.url);
    assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, registered.bytes); assert.equal(hashBytes(bytes), registered.fileSha256);
    const observation = {jobId: job.id, reused: state.job.reused === true, mediaId: media.id,
      requestToCompleteMediaMilliseconds: elapsed(start), mediaTransferMilliseconds: elapsed(receiveStart),
      bytesReceived: bytes.length, fullHttpBodySha256: hashBytes(bytes), media: registered,
      jobRef: await bindEditingFileV001(path.join(config.directory, 'jobs', job.id, 'job.json'))};
    await record(name + '-media', observation); return observation;
  }
  try {
    const setupStart = performance.now(); service = await startPresentationEditingServiceV001(config);
    result.setupMilliseconds = elapsed(setupStart);
    state = await request('initial-state', '/state');
    assert(state.captions.every(row => !row.hasOverride) && state.connections.every(row => !row.hasOverride));
    assert.equal(state.captions.find(row => row.id === targetId)?.text, spec.text);
    const initial = await readEditingWorkspaceV001({directory: config.directory, drawingRulesRef: rules});
    assert.equal(initial.view.viewSha256, sourceView.viewSha256);
    const editStart = performance.now();
    const choice = () => ({expectedRevision: state.revision, kind: 'caption', itemId: targetId, selection: spec.selection});
    result.check = await request('selected-applicability', '/check', choice()); assert.equal(result.check.status, 'applicable');
    assert.equal(result.check.physicalCheck.reused, false);
    state = await request('selected-save', '/save', choice());
    assert.equal(state.captions.find(row => row.id === targetId).preset, spec.expectedPreset);
    assert(state.captions.every(row => !row.hasOverride) && state.connections.every(row => !row.hasOverride));
    result.firstPreview = await preview('first-preview'); assert.equal(result.firstPreview.reused, false);
    result.editRequestToCompleteMediaMilliseconds = elapsed(editStart);
    result.reusedCheck = await request('applicability-reuse', '/check', choice());
    assert.equal(result.reusedCheck.status, 'applicable'); assert.equal(result.reusedCheck.physicalCheck.reused, true);
    result.reusedPreview = await preview('completed-media-reuse');
    assert.equal(result.reusedPreview.reused, true); assert.equal(result.reusedPreview.mediaId, result.firstPreview.mediaId);
    const current = await readEditingWorkspaceV001({directory: config.directory, drawingRulesRef: rules});
    for (const name of stateNames) assert.deepEqual(current.state[name], initial.state[name]);
    assert.equal(current.state.captionOverrides.entries.length, 0); assert.equal(current.state.connectionOverrides.entries.length, 0);
    assert.deepEqual(current.view, initial.view); assert.deepEqual(stateIdentity(current), stateIdentity(initial));
    result.allSavedContentAndDrawingUnchanged = true;
    await service.close(); service = null;
    const reloadRequest = path.join(directory, 'reload-request.json'), reloadResult = path.join(directory, 'reload-result.json');
    await save(reloadRequest, {directory: config.directory, drawingRulesPath, expected: stateIdentity(current),
      parentPid: process.pid, parentPath: process.env.PATH});
    const reloadStart = performance.now(), child = await spawnCaptured([filename, 'reload', reloadRequest, reloadResult]);
    result.reloadMilliseconds = elapsed(reloadStart); await record('reload-command', child);
    assert.equal(child.code, 0, child.stderr); assert.equal(child.signal, null);
    result.independentReload = await json(reloadResult); result.reloadRef = await bindEditingFileV001(reloadResult);
    const render = await json(result.firstPreview.media.resultRef.path);
    assert.equal(render.status, 'passed'); assert.equal(render.finalQc.status, 'passed');
    assert.equal(render.completedFrameQc.status, 'passed');
    result.render = {resultRef: result.firstPreview.media.resultRef, timings: render.timings, nativeAssets: render.nativeAssets,
      processTimings: render.processTimings, finalQcStatus: render.finalQc.status,
      completedFrameQcStatus: render.completedFrameQc.status, finiteQcPerformance: render.completedFrameQc.performance,
      expectedFrameCount: render.expectedFrameCount, finalAudioClock: render.finalAudioClock};
    result.nativeEvidence = await nativeEvidence(config, directory, render);
    if (reference) {
      assert.equal(result.firstPreview.media.fileSha256, reference.firstPreview.media.fileSha256, 'completed MP4 bytes differ');
      assert.equal(result.firstPreview.media.bytes, reference.firstPreview.media.bytes);
      result.completedMp4ByteIdentity = true;
    }
    assert.deepEqual(contentIdentity(await bindings(copiedInputs, inputNames)), condition.sourceInputs);
    result.sourceInputsUnchanged = true; result.status = 'passed';
  } catch (error) {
    result.status = 'failed'; result.failure = {message: error.message, stack: error.stack};
  } finally {if (service) await service.close();}
  await record('result', result); progress({case: spec.name, status: result.status,
    resultPath: path.join(directory, 'result.json'), failure: result.failure ?? null});
  return result;
}
export async function runP1EditingPerformanceV001(label, referencePath) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(label ?? ''), 'a new explicit run label is required');
  const runDirectory = path.join(evidenceRoot, label);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: runDirectory});
  await absent(runDirectory); await mkdir(evidenceRoot, {recursive: true}); await mkdir(runDirectory);
  const result = {schemaVersion: 'p1-editing-performance-v001', label, status: 'running', cases: [],
    startingConditions: 'separate empty native image, applicability, and completed-preview stores per case',
    pollIntervalMilliseconds: 2000,
    timingMeaning: 'HTTP edit-to-full-media includes applicability, durable save, preview polling and full media transfer; renderer, QC and child times are nested, never added to that total',
    originalMediaPurpose: 'the existing registered HRB file is an initialization reference only; the measured previews come from the copied current v003 saved state',
    referencePath: referencePath ?? null};
  let protectedBefore, base;
  try {
    result.environment = await environment(); base = await json(baseConfigPath);
    result.helperRef = await bindEditingFileV001(filename);
    result.sourceRefs = await bindings(sourceDirectory, inputNames);
    const reference = referencePath ? await json(referencePath) : null;
    if (reference) {
      assert.equal(reference.status, 'passed'); assert.equal(reference.cases.length, cases.length);
      assert.deepEqual(result.helperRef, reference.helperRef, 'measurement helper changed between runs');
      for (const key of ['node', 'version', 'path', 'platform', 'arch', 'release', 'cpuModel', 'chromium', 'remotion'])
        assert.deepEqual(result.environment[key], reference.environment[key], 'runtime/environment differs: ' + key);
    }
    protectedBefore = await protectedReferences(base); result.protectedBefore = protectedBefore;
    await save(path.join(runDirectory, 'preflight.json'), result);
    for (const spec of cases) {
      const row = await runCase({label, spec, runDirectory, base, sourceRefs: result.sourceRefs,
        reference: reference?.cases.find(row => row.name === spec.name)});
      result.cases.push(row); assert.equal(row.status, 'passed', row.failure?.message);
    }
    result.status = 'passed';
  } catch (error) {result.status = 'failed'; result.failure = {message: error.message, stack: error.stack};}
  if (protectedBefore) {
    try {
      assert.deepEqual(await protectedReferences(base), protectedBefore);
      assert.deepEqual(await bindings(sourceDirectory, inputNames), result.sourceRefs);
      result.protectedInputsUnchanged = true;
    } catch (error) {result.status = 'failed'; result.preservationFailure = {message: error.message, stack: error.stack};}
  }
  const resultPath = path.join(runDirectory, 'result.json'); await save(resultPath, result);
  return {status: result.status, resultPath, cases: result.cases.map(row => ({name: row.name, status: row.status})),
    failure: result.failure ?? result.preservationFailure ?? null};
}
if (process.argv[1] && path.resolve(process.argv[1]) === filename) {
  const [command, first, second] = process.argv.slice(2);
  const action = command === 'run' ? () => runP1EditingPerformanceV001(first, second)
    : command === 'reload' && path.isAbsolute(first ?? '') && path.isAbsolute(second ?? '') ? () => reload(first, second) : null;
  assert(action, 'usage: p1-editing-performance.mjs run new-label [absolute-baseline-result] | reload request result');
  action().then(result => {progress(result); if (result.status !== 'passed') process.exitCode = 1;})
    .catch(error => {console.error(error.stack); process.exitCode = 1;});
}

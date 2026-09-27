/** 14.7: one current normal render from immutable saved decisions; no AI/STT calls. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {appendFile, lstat, mkdir, readFile, readdir, realpath, statfs, writeFile} from 'node:fs/promises';
import {execFileSync, spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {verifyFixedInputs} from './production_time_integration_inputs_20260927.mts';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001,
  renderEditedOrchestrationV001} from './presentation_orchestration_edited_render_v001.mjs';
import {inspectSavedOrchestrationBackgroundReuseV001} from './presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME = 'production-time-integration-20260927-v001';
const DIRECTORY = path.join(ROOT, 'runtime/artifacts', NAME);
const OUTPUT = path.join(ROOT, 'evals/clip_composition/outputs/presentation', NAME);
const EVIDENCE = path.join(DIRECTORY, 'render');
const OLD = path.join(ROOT, 'runtime/artifacts/digest-new-material-20260926-v001');
const BACKGROUND = path.join(OLD, 'presentation/background/proof.json');
const TOOLS = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe', imageMagickPath: '/opt/homebrew/bin/magick'};
const ORIGINAL_SHA = '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a';
const read = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const save = (file: string, value: unknown) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file: string) {
  const metadata = await lstat(file); assert(metadata.isFile() && !metadata.isSymbolicLink());
  const h = createHash('sha256'); for await (const part of createReadStream(file)) h.update(part);
  return {path: file, bytes: metadata.size, fileSha256: h.digest('hex')};
}
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
async function space() {const s = await statfs(ROOT); return {availableBytes: s.bavail * s.bsize, observedAt: new Date().toISOString()};}
async function workRoots() {
  return (await readdir(path.dirname(OUTPUT))).filter(n => n.startsWith('.' + NAME + '.presentation-renderer-v002-work-'))
    .map(n => path.join(path.dirname(OUTPUT), n));
}
async function footprint(directory: string): Promise<any> {
  const result = {files: 0, logicalBytes: 0, allocatedBytes: 0};
  try {for (const e of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) {const child = await footprint(file); for (const k of Object.keys(result)) result[k] += child[k];}
    else try {const s = await lstat(file); result.files++; result.logicalBytes += s.size; result.allocatedBytes += s.blocks * 512;}
    catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  }} catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  return result;
}

export async function preflight() {
  const began = performance.now(), startedAt = new Date().toISOString();
  assert.equal(execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim(), 'main');
  const guards = [DIRECTORY, OUTPUT].map(outputDirectory => assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: ROOT, outputDirectory}));
  const inputs = await verifyFixedInputs();
  const decoder = await bind(await realpath(TOOLS.ffmpegPath));
  const rules = await buildEditedOrchestrationDrawingRulesRefV001({backgroundReuseDecoderRef: decoder});
  const reuse = await inspectSavedOrchestrationBackgroundReuseV001({drawingView: inputs.view,
    range: {startFrame: 0, endFrameExclusive: 27949}, reuseProofPath: BACKGROUND,
    ffmpegPath: decoder.path, ffprobePath: TOOLS.ffprobePath});
  assert.equal(reuse.used, true, '14.7 requires verified background reuse before this capacity-bounded run');
  assert.equal(reuse.fullCoverage, true);
  const disk = await space();
  // These are measured retained sizes from the accepted 14.8.2 run, not a new policy limit.
  const previousFootprint = await footprint(path.join(ROOT, 'runtime/artifacts/qc-streaming-20260927-v001/full424-v001'));
  assert(previousFootprint.files > 0, 'accepted previous run footprint must be observed, not assumed empty');
  await mkdir(DIRECTORY);
  const value = {schemaVersion: 'production-integration-preflight-v001', status: 'passed', head: head(), startedAt,
    endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - began) / 1000,
    guards, fixedInputs: inputs.summary, protectedRefs: inputs.protectedRefs,
    drawingEvidenceRef: inputs.drawingEvidenceRef, drawingRulesRef: rules, backgroundReuseDecoderRef: decoder,
    backgroundProofRef: await bind(BACKGROUND), backgroundReuse: reuse, disk,
    previousFootprint, tools: await Promise.all(Object.values(TOOLS).map(async p => bind(await realpath(p)))),
    execution: {bodyComposites: 1, fullReplays: 1, nativeSamples: 424, logicalCandidates: 320439,
      aiCalls: 0, sttRuns: 0, originalOutputsWritable: false}};
  await save(path.join(DIRECTORY, 'preflight.json'), value);
  console.log(JSON.stringify({status: value.status, head: value.head, disk, backgroundReuse: reuse.used, elapsedSeconds: value.elapsedSeconds}));
}

export async function finish() {
  const pre = await read(path.join(DIRECTORY, 'preflight.json'));
  const {resolveAndPublishIntegration} = await import('./production_time_integration_resolution_20260927.mts');
  return resolveAndPublishIntegration({evidenceDirectory: EVIDENCE, outputDirectory: OUTPUT,
    drawingEvidenceRef: pre.drawingEvidenceRef, drawingRulesRef: pre.drawingRulesRef,
    backgroundProofRef: pre.backgroundProofRef, toolPaths: TOOLS});
}

export async function run() {
  const pre = await read(path.join(DIRECTORY, 'preflight.json'));
  assert.equal(pre.status, 'passed'); assert.equal(head(), pre.head);
  await verifyEditedOrchestrationDrawingRulesRefV001(pre.drawingRulesRef);
  const startedAt = new Date().toISOString(), began = performance.now();
  await save(path.join(DIRECTORY, 'integration-start.json'), {startedAt, pid: process.pid, head: head(), preflight: await bind(path.join(DIRECTORY, 'preflight.json'))});
  const events: any[] = [];
  try {
    const inputStarted = performance.now(), inputs = await verifyFixedInputs();
    assert.deepEqual(inputs.summary, pre.fixedInputs);
    await save(path.join(DIRECTORY, 'fixed-input-read.json'), {startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - inputStarted) / 1000, summary: inputs.summary});
    try {
      await renderEditedOrchestrationV001({drawingEvidenceRef: pre.drawingEvidenceRef, outputDirectory: OUTPUT,
        evidenceDirectory: EVIDENCE, range: null, backgroundReuseProofPath: BACKGROUND,
        backgroundReuseDecoderRef: pre.backgroundReuseDecoderRef, drawingRulesRef: pre.drawingRulesRef,
        nativeAssetReuse: path.join(DIRECTORY, 'native-assets'), onProgress: async event => {
          const row = {...event, observedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - began) / 1000};
          events.push(row); await appendFile(path.join(DIRECTORY, 'progress.jsonl'), JSON.stringify(row) + '\n');
          console.log(JSON.stringify(row));
          if (event.phase === 'range-qc') {
            const roots = await workRoots(); assert.equal(roots.length, 1);
            const current = await bind(path.join(roots[0], 'publish/presentation-rendered-v002.mp4'));
            await save(path.join(DIRECTORY, 'body-identity-before-qc.json'), {current, originalSha256: ORIGINAL_SHA,
              identical: current.fileSha256 === ORIGINAL_SHA, observedAt: new Date().toISOString(),
              note: 'Observed after normal output-media inspection; exact body end comes from its process timing.'});
            assert.equal(current.fileSha256, ORIGINAL_SHA, 'new body differs; diagnose before additional full processing');
          }
        }});
      throw new Error('Unexpected normal publication: the known raw native failure must remain visible');
    } catch (error) {
      // Only the normal gate's explicitly saved, expected raw QC failure can continue.
      const file = path.join(EVIDENCE, 'draw-result.json');
      const draw: any = await readPresentationQcEvidenceV001(file, {expectedFileSha256: (await bind(file)).fileSha256});
      assert.equal(draw.exitCode, 1); assert.equal(draw.failure.stage, 'post-render-qc');
      assert.equal(draw.failure.nested.violationCount, 1);
      assert(draw.failure.nested.failureFile, 'complete shared failure evidence is mandatory');
      await save(path.join(DIRECTORY, 'normal-gate-result.json'), {status: 'raw-native-failure-preserved',
        endedAt: new Date().toISOString(), elapsedSeconds: (performance.now() - began) / 1000,
        error: String(error), drawRef: await bind(file), failure: draw.failure});
    }
    const result = await finish();
    const endedAt = new Date().toISOString(), elapsedSeconds = (performance.now() - began) / 1000;
    await save(path.join(DIRECTORY, 'integration-execution.json'), {status: 'completed', startedAt, endedAt, elapsedSeconds,
      parentMaximumRssBytes: process.resourceUsage().maxRSS * 1024,
      memoryScope: 'Node self resourceUsage; no child RSS summed into this maximum', result,
      events, postRunSpace: await space()});
    console.log(JSON.stringify({status: 'completed', elapsedSeconds, result}));
  } catch (error) {
    await save(path.join(DIRECTORY, 'integration-failure.json'), {status: 'failed', startedAt, endedAt: new Date().toISOString(),
      elapsedSeconds: (performance.now() - began) / 1000, error: String(error), stack: (error as Error).stack, events,
      parentMaximumRssBytes: process.resourceUsage().maxRSS * 1024});
    throw error;
  }
}

/** Outside the measured Node: sampled RSS/storage only, never a claimed exact aggregate peak. */
export async function monitor(mode: 'run' | 'reread') {
  await save(path.join(DIRECTORY, mode + '-resource-start.json'), {mode, startedAt: new Date().toISOString(), monitorPid: process.pid});
  const child = spawn(process.execPath, ['--max-old-space-size=12288', '--import', path.join(ROOT, 'runner/node_modules/tsx/dist/loader.mjs'),
    fileURLToPath(import.meta.url), mode], {cwd: ROOT, stdio: 'inherit', env: process.env, detached: true});
  const observed: any = {parentSampledPeakBytes: 0, singleChildSampledPeakBytes: 0,
    simultaneousDescendantSumSampledPeakBytes: 0, newRunSampledPeakLogicalBytes: 0, newRunSampledPeakAllocatedBytes: 0,
    parentObservations: 0, childObservations: 0, storageObservations: 0, observationErrors: 0};
  let stopped = false, nextStorage = 0, observations = 0, observationFailure: string | null = null;
  const interrupt = () => {if (child.pid) try {process.kill(-child.pid, 'SIGTERM');}
    catch (error: any) {if (error.code !== 'ESRCH') throw error;}};
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  const loop = (async () => {
    while (!stopped) {
      const row: any = {observedAt: new Date().toISOString(), pid: child.pid};
      try {
        const ps = execFileSync('/bin/ps', ['-axo', 'pid=,ppid=,rss=,comm='], {encoding: 'utf8'}).trim().split('\n')
          .map(line => {const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/); return m ? {pid: +m[1], ppid: +m[2], rssBytes: +m[3] * 1024, command: m[4]} : null;}).filter(Boolean);
        const owned = new Set([child.pid]); let changed = true;
        while (changed) {changed = false; for (const p of ps) if (owned.has(p!.ppid) && !owned.has(p!.pid)) {owned.add(p!.pid); changed = true;}}
        const processes = ps.filter(p => owned.has(p!.pid));
        const parent = processes.find(p => p!.pid === child.pid), children = processes.filter(p => p!.pid !== child.pid);
        row.processes = processes;
        if (parent) observed.parentObservations++;
        if (children.length) observed.childObservations++;
        observed.parentSampledPeakBytes = Math.max(observed.parentSampledPeakBytes, parent?.rssBytes ?? 0);
        observed.singleChildSampledPeakBytes = Math.max(observed.singleChildSampledPeakBytes, ...children.map(p => p!.rssBytes));
        observed.simultaneousDescendantSumSampledPeakBytes = Math.max(observed.simultaneousDescendantSumSampledPeakBytes, processes.reduce((n, p) => n + p!.rssBytes, 0));
        if (Date.now() >= nextStorage) {
          const roots = [DIRECTORY, OUTPUT, ...await workRoots()];
          row.storage = await Promise.all(roots.map(async directory => ({directory, ...await footprint(directory)})));
          observed.storageObservations++;
          const logical = row.storage.reduce((n, s) => n + s.logicalBytes, 0), allocated = row.storage.reduce((n, s) => n + s.allocatedBytes, 0);
          observed.newRunSampledPeakLogicalBytes = Math.max(observed.newRunSampledPeakLogicalBytes, logical);
          observed.newRunSampledPeakAllocatedBytes = Math.max(observed.newRunSampledPeakAllocatedBytes, allocated);
          nextStorage = Date.now() + 30000;
        }
      } catch (error) {row.observationError = String(error); observed.observationErrors++;}
      observations++; await appendFile(path.join(DIRECTORY, mode + '-resource-samples.jsonl'), JSON.stringify(row) + '\n');
      if (!stopped) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  })().catch(error => {observationFailure = String(error); stopped = true; interrupt();
    console.error('Resource observation failed; stopping only this owned run: ' + observationFailure);});
  const exit: any = await new Promise(resolve => {child.on('error', error => resolve({error: String(error)})); child.on('close', (code, signal) => resolve({code, signal}));});
  stopped = true; await loop;
  process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  if (!observed.parentObservations) observed.parentSampledPeakBytes = null;
  if (!observed.childObservations) observed.singleChildSampledPeakBytes = null;
  if (!observed.parentObservations && !observed.childObservations) observed.simultaneousDescendantSumSampledPeakBytes = null;
  if (!observed.storageObservations) observed.newRunSampledPeakLogicalBytes = observed.newRunSampledPeakAllocatedBytes = null;
  await save(path.join(DIRECTORY, mode + '-resource-summary.json'), {...observed, observations, exit,
    observationFailure,
    scope: 'RSS sampled nominally every 2s; storage every 30s, scan is not atomic. st_blocks×512 excludes extent-sharing attribution. Parent/child peaks are separate. Exact aggregate peak and physical I/O unmeasured.'});
  assert.equal(exit.code, 0, JSON.stringify(exit));
  assert.equal(observationFailure, null);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const mode = process.argv[2];
  if (mode === 'preflight') await preflight();
  else if (mode === 'run') await run();
  else if (mode === 'finish') console.log(JSON.stringify(await finish()));
  else if (mode === 'monitor') {assert(['run', 'reread'].includes(process.argv[3])); await monitor(process.argv[3] as any);}
  else if (mode === 'reread') {
    const {rereadIntegrationCompletion} = await import('./production_time_integration_resolution_20260927.mts');
    console.log(JSON.stringify(await rereadIntegrationCompletion({completionPath: path.join(EVIDENCE, 'integration-completion.json')})));
  } else throw new Error('expected preflight | monitor run | monitor reread | finish');
}

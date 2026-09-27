/** Saved first-draft QC measurement. No video/STT/overlay rendering is performed. */
import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, readdir, stat, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {readPresentationQcEvidenceV001, writePresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';
import {validatePresentationNativeFrameQcInspectionsV001, verifyPresentationNativeInputRefV001} from './presentation_native_frame_qc_v001.mjs';
import {checkFiniteExecutionEvidence} from './presentation_integrity_state_qc_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = path.join(ROOT, 'runtime/artifacts/qc-evidence-common-20260927-v001/measurement-v003/shared-qc.json');
const SOURCE_SHA = '89a37d22c3d6ad66a8a12dda2dcdebaac86ee51a3bf3b3c2316417d3267e5d29';
const ORIGINAL_EVIDENCE = path.join(ROOT, 'runtime/artifacts/digest-new-material-20260926-v001/presentation/qc-resume-attempt-002/finite-result.json');
const ORIGINAL_EVIDENCE_SHA = '32534f5b909b1a91dbf2ed7cb098ef561c909d42650a086ca17b8d26fefc73c7';
const RETAINED = path.join(ROOT, 'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP');
const PREPARATION = path.join(RETAINED, 'scratch/native-qc-preparation/preparation.json');
const PLAN = path.join(RETAINED, 'scratch/native-qc-preparation/plan.json');
const DEFAULT_DIRECTORY = path.join(ROOT, 'runtime/artifacts/qc-streaming-20260927-v001');
const MP4 = path.join(ROOT, 'evals/clip_composition/outputs/presentation/new-material-digest-20260926-first-draft-qc-resume-v001/presentation-rendered-v002.mp4');
const MP4_SHA = '11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a';
const BEFORE_COMMIT = 'd65eba0a507218a5e2b3f6c606ec218cbe361344';
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
const seconds = (start: number) => (performance.now() - start) / 1000;
const save = (file: string, value: unknown) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function fileSha(file: string) {
  const hash = createHash('sha256');
  for await (const part of createReadStream(file)) hash.update(part);
  return hash.digest('hex');
}
async function boundFile(file: string) {
  const st = await lstat(file); assert(st.isFile() && !st.isSymbolicLink(), 'bound file must be a regular file');
  return {path: file, bytes: st.size, fileSha256: await fileSha(file)};
}

/** Current allocated blocks, not a historical maximum or unique APFS physical extents. */
async function directorySize(directory: string): Promise<{files: number; logicalBytes: number; allocatedBytes: number}> {
  const total = {files: 0, logicalBytes: 0, allocatedBytes: 0};
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    assert(!entry.isSymbolicLink(), 'measurement output may not contain symlinks');
    if (entry.isDirectory()) {
      const child = await directorySize(file);
      total.files += child.files; total.logicalBytes += child.logicalBytes; total.allocatedBytes += child.allocatedBytes;
    } else {
      const st = await lstat(file); assert(st.isFile());
      total.files++; total.logicalBytes += st.size; total.allocatedBytes += st.blocks * 512;
    }
  }
  return total;
}

// /usr/bin/time on macOS reports maximum RSS in bytes. It cannot read the
// required sysctl under the Codex sandbox; measurements must run natively.
function splitTimeOutput(stderr: Buffer) {
  const text = stderr.toString('utf8');
  const marker = /(?:^|\n)[ \t]+(\d+(?:\.\d+)?) real[ \t]+(\d+(?:\.\d+)?) user[ \t]+(\d+(?:\.\d+)?) sys\n/g;
  const matches = [...text.matchAll(marker)]; assert(matches.length > 0, 'native /usr/bin/time output is missing');
  const last = matches.at(-1)!; const start = last.index! + (last[0].startsWith('\n') ? 1 : 0);
  const timingText = text.slice(start);
  const number = (label: string) => {
    const found = timingText.match(new RegExp('^\\s*(\\d+)\\s+' + label + '$', 'm'));
    assert(found, 'native time counter missing: ' + label); return Number(found[1]);
  };
  return {stderr: Buffer.from(text.slice(0, start)), timingText, resources: {
    realSeconds: Number(last[1]), userSeconds: Number(last[2]), systemSeconds: Number(last[3]),
    maximumResidentSetBytes: number('maximum resident set size'),
    blockInputOperations: number('block input operations'), blockOutputOperations: number('block output operations'),
    ioMeaning: 'OS block-operation counters; not byte counts and not all cached I/O',
    memoryScope: 'one timed tool process including its descendants; excludes Node parent; peaks are not simultaneous',
  }};
}

function observer(directory: string) {
  const records: any[] = []; let active: ReturnType<typeof spawn> | null = null; let interrupted = false;
  const generatedDirectories = new Map<string, {files: number; logicalBytes: number; allocatedBytes: number}>();
  const interrupt = () => {
    interrupted = true;
    // The time wrapper and its tool share this newly created process group.
    // Target only that owned group so interruption does not orphan ffmpeg.
    if (active?.pid) try {process.kill(-active.pid, 'SIGTERM');}
    catch (error: any) {if (error.code !== 'ESRCH') throw error;}
  };
  process.on('SIGINT', interrupt); process.on('SIGTERM', interrupt);
  const run = async (command: string, args: string[], purpose: string) => {
    assert(!interrupted, 'measurement interrupted before tool execution');
    const index = records.length; const name = String(index).padStart(5, '0') + '-' + purpose;
    const record: any = {command, args, purpose, startedAt: new Date().toISOString(), argumentsSha256: digest(JSON.stringify(args))};
    records.push(record); const began = performance.now();
    await save(path.join(directory, name + '-request.json'), record);
    try {
      const result: any = await new Promise((resolve, reject) => {
        const stdout: Buffer[] = [], stderr: Buffer[] = [];
        const child = spawn('/usr/bin/time', ['-l', command, ...args], {stdio: ['ignore', 'pipe', 'pipe'], detached: true}); active = child;
        child.stdout.on('data', chunk => stdout.push(chunk)); child.stderr.on('data', chunk => stderr.push(chunk));
        child.on('error', reject); child.on('close', (code, signal) => {active = null; resolve({code, signal, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)});});
      });
      Object.assign(record, {code: result.code, signal: result.signal, interrupted});
      await writeFile(path.join(directory, name + '-native-time-stderr.txt'), result.stderr, {flag: 'wx'});
      const measured = splitTimeOutput(result.stderr);
      let referenceBatchStorage;
      if (purpose === 'native-reference-composite' && result.code === 0 && result.signal === null) {
        const files = args.filter(value => value.endsWith('.rgb') && path.isAbsolute(value));
        assert(files.length > 0 && new Set(files).size === files.length, 'comparison command has duplicate or missing outputs');
        const dir = path.dirname(files[0]); assert(files.every(file => path.dirname(file) === dir));
        const storage = generatedDirectories.get(dir) ?? {files: 0, logicalBytes: 0, allocatedBytes: 0};
        for (const file of files) {const s = await lstat(file); assert(s.isFile() && !s.isSymbolicLink());
          storage.files++; storage.logicalBytes += s.size; storage.allocatedBytes += s.blocks * 512;}
        generatedDirectories.set(dir, storage);
        referenceBatchStorage = {...storage, directory: dir,
          measurementScope: 'new comparison RGB files after child exit in this sample directory; st_blocks * 512 is allocated blocks, not unique APFS physical extents'};
      }
      Object.assign(record, {endedAt: new Date().toISOString(), elapsedSeconds: seconds(began), code: result.code,
        signal: result.signal, resources: measured.resources, referenceBatchStorage, stdoutBytes: result.stdout.length,
        stdoutSha256: digest(result.stdout), stderrSha256: digest(measured.stderr), interrupted});
      await writeFile(path.join(directory, name + '-resources.txt'), measured.timingText, {flag: 'wx'});
      await writeFile(path.join(directory, name + '-stderr.txt'), measured.stderr, {flag: 'wx'});
      await save(path.join(directory, name + '-result.json'), record);
      assert(!interrupted && result.code === 0 && result.signal === null, 'timed child failed or was interrupted');
      return {...result, stderr: measured.stderr};
    } catch (error) {
      record.error = String(error); record.elapsedSeconds = seconds(began); record.interrupted = interrupted;
      await save(path.join(directory, name + '-failure.json'), record); throw error;
    }
  };
  return {run, records, referenceStorage(directory: string) {return generatedDirectories.get(directory);},
    close() {process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);},
    summary() {return {childProcessCount: records.length,
      maximumTimedChildResidentSetBytes: Math.max(0, ...records.map(r => r.resources?.maximumResidentSetBytes ?? 0)),
      childBlockInputOperations: records.reduce((n, r) => n + (r.resources?.blockInputOperations ?? 0), 0),
      childBlockOutputOperations: records.reduce((n, r) => n + (r.resources?.blockOutputOperations ?? 0), 0),
      childResourcesMeaning: 'sequential /usr/bin/time -l tool calls; OS counters are not I/O byte estimates; not combined simultaneous parent+child peak'};}};
}

function cases(evidence: any) {
  const pick = (id: number, description: string, predicate = (_sample: any) => true) => {
    const index = evidence.samples.findIndex((sample: any) => sample.instructionId.endsWith(String(id).padStart(6, '0')) && predicate(sample));
    assert(index >= 0, 'small case missing: ' + id); return {index, description};
  };
  return [pick(1, 'Normal'), pick(2, 'partial yellow Color'), pick(19, 'Bounce moving state', s => !['static', 'stable'].includes(s.expectedState)),
    pick(46, 'Panel plain/dark'), pick(92, 'Shake moving state', s => !['static', 'stable'].includes(s.expectedState)),
    pick(102, 'same PNG as subtitle 000103, other background/time'), pick(103, 'original native failure')];
}

function sampleOutcome(sample: any) {
  const {instructionId, frame, mediaFrame, expectedState, expectedOverlaySha256, crop,
    expectedClassId, omittedClassId, completedRgbSha256, visible, references, classes} = sample;
  return {instructionId, frame, mediaFrame, expectedState, expectedOverlaySha256, crop, expectedClassId, omittedClassId,
    completedRgbSha256, visible, references: references.map(({rgbPath: _rgbPath, ...reference}: any) => reference), classes};
}

async function loadSource() {
  const start = performance.now();
  const finite: any = await readPresentationQcEvidenceV001(SOURCE, {expectedFileSha256: SOURCE_SHA});
  assert.equal(finite.evidence.samples.length, 424); assert.equal(finite.inspections.length, 326);
  const [preparation, plan] = await Promise.all([json(PREPARATION), json(PLAN)]);
  assert.equal(preparation.records.length, 326);
  const byRole = new Map(finite.evidence.inputManifest.inputRefs.map((ref: any) => [ref.role, ref]));
  const tools: any = {ffmpeg: byRole.get('tool-ffmpeg'), imageMagick: byRole.get('tool-imagemagick')};
  for (const tool of Object.values(tools) as any[]) assert.equal(await fileSha(tool.path), tool.fileSha256, 'tool changed');
  const video = await boundFile(MP4); assert.equal(video.fileSha256, MP4_SHA, 'fixed first draft changed');
  return {finite, preparation, plan, tools, readAndBindSeconds: seconds(start), source: {path: SOURCE, fileSha256: SOURCE_SHA},
    preparationRef: await boundFile(PREPARATION), planRef: await boundFile(PLAN), video};
}

function reusedPreparation(source: any) {
  const original = source.finite.evidence;
  const prefixCount = original.processes.findIndex((row: any) => row.purpose === 'completed-rgb-crop');
  assert(prefixCount > 0, 'saved native preparation process prefix missing');
  const processes = original.processes.slice(0, prefixCount);
  assert(processes.every((row: any) => ['tool-version', 'source-frames-extract', 'completed-frames-extract',
    'native-layer-prepare', 'native-layer-decode'].includes(row.purpose)), 'unexpected reused preparation process');
  const paths = new Set<string>(original.frameExtraction.frames.flatMap((row: any) => [row.basePath, row.completedPath]));
  for (const layer of original.nativeLayers.layers) {
    if (layer.generated) paths.add(layer.outputPath);
    paths.add(layer.decodedPath);
  }
  const artifacts = original.outputArtifacts.filter((ref: any) => paths.has(ref.path));
  assert.equal(artifacts.length, paths.size, 'saved preparation artifact coverage differs');
  return {processes, artifacts, descriptor: {schemaVersion: 'saved-native-preparation-reuse-v001',
    sourceEvidence: source.source, sourceExecutionMethod: original.executionMethod, reusedProcessCount: processes.length}};
}

async function verifyPreparation(source: any) {
  const began = performance.now(), reused = reusedPreparation(source);
  const checked = new Map<string, string>(); let bytes = 0;
  for (const ref of [...source.finite.evidence.inputManifest.inputRefs, ...reused.artifacts]) {
    const prior = checked.get(ref.path); assert(prior === undefined || prior === ref.fileSha256, 'conflicting prepared input');
    if (prior === undefined) {
      await verifyPresentationNativeInputRefV001(ref); checked.set(ref.path, ref.fileSha256); bytes += (await stat(ref.path)).size;
    }
  }
  assert.deepEqual(await boundFile(PREPARATION), source.preparationRef);
  assert.deepEqual(await boundFile(PLAN), source.planRef);
  return {elapsedSeconds: seconds(began), verifiedFileCount: checked.size, verifiedBytes: bytes};
}

function assembleFullFinite(source: any, outputs: any[], referenceDirectory: string, performance: any) {
  assert.equal(outputs.length, source.finite.evidence.samples.length);
  const original = source.finite.evidence, reused = reusedPreparation(source);
  const evidence = {...original, executionMethod: 'sample-batched-native-references-v003', referenceBatchSize: 32,
    referenceDirectory, preparationReuse: reused.descriptor, samples: outputs.map(result => result.sample),
    processes: [...reused.processes, ...outputs.flatMap(result => result.processes)],
    outputArtifacts: [...reused.artifacts, ...outputs.flatMap(result => result.outputArtifacts)]};
  const commonKeys = ['baselinePlan', 'autoPresentation', 'orchestrationInput', 'inputManifest', 'renderRange', 'sceneBindings'];
  const inspections = source.finite.inspections.map((old: any) => {
    const local: any = {...old.nativeFrameQc, samples: evidence.samples.filter((sample: any) => sample.instructionId === old.instructionId)};
    for (const key of commonKeys) if (Object.hasOwn(evidence, key)) local[key] = evidence[key];
    return {...old, nativeFrameQc: local};
  });
  const validation = validatePresentationNativeFrameQcInspectionsV001({plan: source.plan, inspections});
  assert.equal(validation.status, source.finite.status);
  assert.deepEqual(validation.violations, source.finite.violations, 'full native failure changed');
  checkFiniteExecutionEvidence(evidence, inspections, source.plan.canvas);
  return {status: validation.status, violations: validation.violations, inspections, evidence, performance};
}

export async function measureQcStreaming20260927({stage, directory, variant = 'stream32'}: {stage: 'small' | 'full'; directory: string; variant?: string}) {
  assert(['retain-all', 'stream32', 'stream64'].includes(variant), 'unknown measurement variant');
  assert(stage !== 'full' || variant === 'stream32', 'full run is the single approved new path only');
  await mkdir(path.dirname(directory), {recursive: true}); await mkdir(directory);
  const began = performance.now(), startedAt = new Date().toISOString();
  const processDirectory = path.join(directory, 'processes'); await mkdir(processDirectory); const observed = observer(processDirectory);
  try {
    const source = await loadSource(); const original = source.finite.evidence;
    const preparationVerificationBefore = stage === 'full' ? await verifyPreparation(source) : null;
    const selected = stage === 'small' ? (variant === 'stream64' ? cases(original).slice(0, 1) : cases(original))
      : original.samples.map((_s: any, index: number) => ({index, description: 'full saved first draft'}));
    // The full stage is invoked only after the instruction's GPT_DECISION audit.
    const streaming: any = await import('./presentation_native_qc_streaming_v001.mjs');
    const referenceRoot = stage === 'full' ? path.join(directory, 'reference-samples') : directory;
    if (stage === 'full') await mkdir(referenceRoot);
    const outputs: any[] = [], rows: any[] = []; let retainedReferenceBytes = 0, referencePeakBytes = 0;
    let retainedReferenceAllocatedBytes = 0, referenceAllocatedPeakBytes = 0;
    for (const selectedCase of selected) {
      const baseline = original.samples[selectedCase.index];
      const sampleDirectory = path.join(referenceRoot, 'sample-' + (stage === 'full' ? selectedCase.index : String(selectedCase.index).padStart(4, '0')));
      const sampleBegan = performance.now();
      const result = await streaming.processPresentationNativeSampleV001({sample: baseline,
        sceneBindings: original.sceneBindings, nativeLayers: original.nativeLayers, directory: sampleDirectory,
        preparedArtifacts: original.outputArtifacts,
        tools: source.tools, run: observed.run,
        batchSize: variant === 'retain-all' ? baseline.references.length : variant === 'stream64' ? 64 : 32,
        retention: variant === 'retain-all' ? 'retain-all' : 'verified-pass-regenerable-v001', baselineSample: baseline});
      assert.deepEqual(sampleOutcome(result.sample), sampleOutcome(baseline), 'whole candidate outcomes changed');
      const size = await directorySize(sampleDirectory);
      const observedStorage = observed.referenceStorage(path.join(sampleDirectory, 'references'));
      assert(observedStorage, 'reference batch storage measurement missing');
      const retainedStorage = await directorySize(path.join(sampleDirectory, 'references'));
      referenceAllocatedPeakBytes = Math.max(referenceAllocatedPeakBytes, retainedReferenceAllocatedBytes + observedStorage.allocatedBytes);
      retainedReferenceAllocatedBytes += retainedStorage.allocatedBytes;
      const row = {sampleIndex: selectedCase.index, description: selectedCase.description, instructionId: baseline.instructionId,
        frame: baseline.frame, expectedState: baseline.expectedState, logicalCandidates: baseline.references.length,
        classCount: baseline.classes.length, visible: baseline.visible, elapsedSeconds: seconds(sampleBegan),
        metrics: result.metrics, retainedDirectory: size, peakReferenceStorage: observedStorage, retainedReferenceStorage: retainedStorage};
      // Module metrics are operation-boundary measurements, not a final-directory guess.
      const localPeak = result.metrics?.peakReferenceBytes;
      assert.equal(typeof localPeak, 'number', 'module must measure reference peak at generation boundaries');
      assert.equal(typeof result.metrics?.retainedReferenceBytes, 'number', 'module must measure retained reference bytes');
      referencePeakBytes = Math.max(referencePeakBytes, retainedReferenceBytes + localPeak);
      retainedReferenceBytes += result.metrics.retainedReferenceBytes;
      rows.push(row); outputs.push(result);
      await save(path.join(directory, 'sample-' + String(selectedCase.index).padStart(4, '0') + '-measurement.json'), row);
      console.log(JSON.stringify({event: 'sample-complete', stage, variant, completed: rows.length, samples: selected.length,
        sampleIndex: selectedCase.index, frame: baseline.frame, visible: baseline.visible, elapsedSeconds: row.elapsedSeconds}));
    }
    const preparationVerificationAfter = stage === 'full' ? await verifyPreparation(source) : null;
    let protectedEvidenceVerification = null;
    if (stage === 'full') {
      const start = performance.now(), legacy = await boundFile(ORIGINAL_EVIDENCE);
      assert.equal(legacy.fileSha256, ORIGINAL_EVIDENCE_SHA, 'original expanded evidence changed');
      assert.equal(await fileSha(SOURCE), SOURCE_SHA, 'original shared evidence changed');
      protectedEvidenceVerification = {elapsedSeconds: seconds(start), legacy, shared: source.source};
    }
    let finiteReceipt: any = null;
    if (stage === 'full') {
      const finite = assembleFullFinite(source, outputs, referenceRoot, {sampleMeasurements: rows,
        phaseMeaning: 'new sample processing only; historical prepared frames/layers were verified and reused, never rerun'});
      const file = path.join(directory, 'finite-result.qc.json');
      finiteReceipt = {path: file, ...await writePresentationQcEvidenceV001(file, finite)};
      await save(path.join(directory, 'finite-result.receipt.json'), finiteReceipt);
    }
    const writeStart = performance.now();
    const bundlePath = path.join(directory, 'samples.qc.json');
    const receipt = await writePresentationQcEvidenceV001(bundlePath, {schemaVersion: 'qc-streaming-measurement-v001',
      source: source.source, preparation: source.preparationRef, plan: source.planRef, video: source.video,
      sceneBindings: original.sceneBindings, nativeLayers: original.nativeLayers, tools: source.tools,
      selectedSamples: selected, results: outputs, ...(finiteReceipt ? {finiteReceipt} : {})});
    const evidenceWriteSeconds = seconds(writeStart);
    await save(path.join(directory, 'samples.receipt.json'), {path: bundlePath, ...receipt});
    assert.equal(await fileSha(MP4), MP4_SHA, 'fixed first draft changed during measurement');
    const completedAt = new Date().toISOString();
    const measurement = {schemaVersion: 'qc-streaming-measurement-summary-v001', status: 'passed', stage, variant,
      startedAt, completedAt, elapsedSeconds: seconds(began), readAndBindSeconds: source.readAndBindSeconds, evidenceWriteSeconds,
      preparationVerificationBefore, preparationVerificationAfter, protectedEvidenceVerification, finiteReceipt,
      source: source.source, preparation: source.preparationRef, plan: source.planRef, video: source.video,
      environment: {node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model,
        totalMemoryBytes: os.totalmem(), cacheControl: 'OS cache and external process contention not controlled'},
      nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024,
      parentMemoryScope: 'Node measurement parent, includes one full saved shared evidence read; excludes external tools',
      ...observed.summary(), samples: rows, sampleCount: rows.length,
      logicalCandidateCount: rows.reduce((n, row) => n + row.logicalCandidates, 0),
      unchangedOutcomes: true, originalNativeFailurePreserved: rows.filter(row => !row.visible).map(row => row.instructionId),
      cumulativeNewReferencePeakLogicalBytes: referencePeakBytes,
      finalNewReferenceLogicalBytes: retainedReferenceBytes,
      cumulativeNewReferencePeakAllocatedBytes: referenceAllocatedPeakBytes,
      finalNewReferenceAllocatedBytes: retainedReferenceAllocatedBytes,
      cumulativePeakMeaning: 'sum of prior retained comparison RGB bytes plus current module-reported comparison RGB peak; completed RGB, proof JSON and retained prepared inputs are excluded and reported separately',
      finalDirectory: await directorySize(directory), bundle: {path: bundlePath, ...receipt},
      historicalInputsReused: 'saved base/completed PNGs and decoded native layers, excluded from newly generated comparison holding',
      actions: {videoEncodes: 0, subtitleRenders: 0, sttRuns: 0, paidApiCalls: 0}};
    await save(path.join(directory, 'measurement.json'), measurement); return measurement;
  } catch (error) {
    await save(path.join(directory, 'failure.json'), {status: 'failed', stage, variant, startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: seconds(began), error: String(error), ...observed.summary()});
    throw error;
  } finally {observed.close();}
}

export async function rereadQcStreaming20260927(directory: string) {
  const began = performance.now(), receipt = await json(path.join(directory, 'samples.receipt.json'));
  const evidence: any = await readPresentationQcEvidenceV001(receipt.path, {expectedFileSha256: receipt.fileSha256});
  assert.equal(evidence.schemaVersion, 'qc-streaming-measurement-v001');
  const readSeconds = seconds(began);
  const module: any = await import('./presentation_native_qc_streaming_v001.mjs');
  assert.equal(typeof module.revalidatePresentationNativeSampleV001, 'function', 'formal independent sample revalidator is required');
  assert.equal(typeof module.verifyPresentationNativeSampleReceiptsV001, 'function', 'formal saved receipt verifier is required');
  const output = path.join(directory, 'independent-reread'); await mkdir(output);
  const processDirectory = path.join(output, 'processes'); await mkdir(processDirectory); const observed = observer(processDirectory);
  try {
    const receiptStarted = performance.now();
    const receiptVerification = await module.verifyPresentationNativeSampleReceiptsV001({samples: evidence.results.map((row: any) => row.sample)});
    const receiptVerificationSeconds = seconds(receiptStarted);
    let fullFiniteVerification = null;
    if (evidence.finiteReceipt) {
      const start = performance.now();
      const finite: any = await readPresentationQcEvidenceV001(evidence.finiteReceipt.path,
        {expectedFileSha256: evidence.finiteReceipt.fileSha256});
      const source = await loadSource(), reused = reusedPreparation(source);
      assert.deepEqual(finite.evidence.preparationReuse, reused.descriptor);
      assert.deepEqual(finite.evidence.processes.slice(0, reused.processes.length), reused.processes);
      for (const key of ['baselinePlan', 'autoPresentation', 'orchestrationInput', 'inputManifest', 'renderRange',
        'sceneBindings', 'nativeLayers', 'frameExtraction', 'executableVersions'])
        assert.deepEqual(finite.evidence[key], source.finite.evidence[key], 'saved common preparation changed: ' + key);
      assert.deepEqual(finite.evidence.samples, evidence.results.map((row: any) => row.sample));
      const retained = await verifyPreparation(source);
      for (const ref of finite.evidence.outputArtifacts) assert.equal(await fileSha(ref.path), ref.fileSha256, 'retained finite evidence changed');
      const validation = validatePresentationNativeFrameQcInspectionsV001({plan: source.plan, inspections: finite.inspections});
      assert.equal(validation.status, source.finite.status); assert.deepEqual(validation.violations, source.finite.violations);
      checkFiniteExecutionEvidence(finite.evidence, finite.inspections, source.plan.canvas);
      fullFiniteVerification = {status: 'passed', nativeStatus: validation.status, violations: validation.violations,
        inspectionCount: finite.inspections.length, sampleCount: finite.evidence.samples.length,
        elapsedSeconds: seconds(start), retainedPreparationVerification: retained,
        meaning: 'saved full native bundle independently read, all retained artifacts checked, historical preparation source and new process chain verified'};
    }
    const selected = evidence.results.length > 7 ? cases({samples: evidence.results.map((row: any) => row.sample)})
      : evidence.results.map((_row: any, index: number) => ({index, description: 'saved small case'}));
    const results = [];
    for (const {index, description} of selected) {
      const row = evidence.results[index];
      const result = await module.revalidatePresentationNativeSampleV001({sample: row.sample,
        directory: path.join(output, 'sample-' + index), run: observed.run});
      assert.deepEqual(sampleOutcome(result.sample), sampleOutcome(row.sample), 'independent regeneration changed candidate outcomes');
      results.push({sampleIndex: index, description, instructionId: row.sample.instructionId, frame: row.sample.frame,
        visible: result.sample.visible, metrics: result.metrics, referenceRetention: result.sample.referenceRetention});
      console.log(JSON.stringify({event: 'independent-sample-regenerated', completed: results.length, samples: selected.length,
        frame: row.sample.frame, visible: result.sample.visible}));
    }
    const report = {status: 'passed', processId: process.pid, readSeconds, elapsedSeconds: seconds(began),
      source: receipt, receiptCount: evidence.results.length, receiptVerification, receiptVerificationSeconds, fullFiniteVerification,
      independentRegenerationSampleCount: results.length,
      independentRegenerationScope: 'named representative cases only; all saved samples receive receipt verification; no full regeneration accumulation',
      results, nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024,
      ...observed.summary(), finalDirectory: await directorySize(output)};
    await save(path.join(output, 'result.json'), report); return report;
  } catch (error) {await save(path.join(output, 'failure.json'), {status: 'failed', error: String(error)}); throw error;}
  finally {observed.close();}
}

/** Execute the actual pre-change builders/classifier on seven saved points, never all 424 again. */
export async function measureLegacySmall20260927(directory: string) {
  await mkdir(path.dirname(directory), {recursive: true}); await mkdir(directory);
  const began = performance.now(), startedAt = new Date().toISOString();
  const processDirectory = path.join(directory, 'processes'); await mkdir(processDirectory); const observed = observer(processDirectory);
  try {
    const source = await loadSource(), original = source.finite.evidence;
    const relativeModule = 'evals/clip_composition/presentation_native_frame_qc_v001.mjs';
    const historicalSource = execFileSync('git', ['show', BEFORE_COMMIT + ':' + relativeModule], {cwd: ROOT, encoding: 'utf8'});
    const importedFiles: any[] = [];
    const adapted = historicalSource.replace(/from (['"])(\.\/[^'"]+)\1/g, (_all, quote, relative) => {
      const file = path.resolve(path.dirname(path.join(ROOT, relativeModule)), relative);
      importedFiles.push({path: file}); return 'from ' + quote + pathToFileURL(file).href + quote;
    });
    assert(adapted !== historicalSource && importedFiles.length > 0);
    const originalPath = path.join(directory, 'historical-native-source.mjs');
    const adapterPath = path.join(directory, 'historical-native-import-adapter.mjs');
    await writeFile(originalPath, historicalSource, {flag: 'wx'}); await writeFile(adapterPath, adapted, {flag: 'wx'});
    for (const ref of importedFiles) ref.fileSha256 = await fileSha(ref.path);
    const historical = await import(pathToFileURL(adapterPath).href);
    assert.equal(typeof historical.buildPresentationNativeReferenceArgumentsV001, 'function');
    const historicalCode = {commit: BEFORE_COMMIT, repositoryPath: relativeModule,
      original: await boundFile(originalPath), adapter: await boundFile(adapterPath), importedFiles,
      transformation: 'Only relative static-import specifiers changed to absolute file URLs. All function bodies and existing exports are untouched.'};
    await save(path.join(directory, 'historical-code.json'), historicalCode);
    const preparationVerificationBefore = await verifyPreparation(source);
    const referenceDirectory = path.join(directory, 'references'); await mkdir(referenceDirectory);
    const referenceFiles = new Map(), distanceCache = new Map(), outputArtifacts: any[] = [], results: any[] = [], rows: any[] = [];
    const counts: any = {exactDistanceCalculations: 0, reusedExactDistances: 0};
    const phases: Record<string, number> = {};
    const timed = async <T,>(name: string, operation: () => Promise<T>): Promise<T> => {
      const start = performance.now(); try {return await operation();}
      finally {phases[name] = (phases[name] ?? 0) + seconds(start);}
    };
    for (const {index, description} of cases(original)) {
      const baseline = original.samples[index], sampleBegan = performance.now(), crop = baseline.crop;
      const completed = await timed('completedRgbCrop', () => observed.run(source.tools.imageMagick.path,
        [baseline.completedFrame.path, '-crop', crop.width + 'x' + crop.height + '+' + crop.left + '+' + crop.top,
          '+repage', '-alpha', 'off', '-depth', '8', 'rgb:-'], 'completed-rgb-crop'));
      assert.equal(completed.stdout.length, crop.width * crop.height * 3);
      const completedRgb = {path: path.join(directory, 'sample-' + index + '-completed.rgb'), fileSha256: digest(completed.stdout)};
      await timed('completedRgbWrite', () => writeFile(completedRgb.path, completed.stdout, {flag: 'wx'})); outputArtifacts.push(completedRgb);
      const executions = historical.buildPresentationNativeReferenceExecutionV001({sample: baseline,
        sceneBindings: original.sceneBindings, nativeLayers: original.nativeLayers, directory: referenceDirectory});
      const fresh: any[] = [...new Map(executions.filter((row: any) => !referenceFiles.has(row.key)).map((row: any) => [row.key, row])).values()];
      if (fresh.length) await timed('referenceComposition', () => observed.run(source.tools.ffmpeg.path,
        historical.buildPresentationNativeReferenceArgumentsV001({sample: {...baseline, references: fresh.map(row => row.reference)},
          sceneBindings: original.sceneBindings, baseFramePath: baseline.baseFrame.path,
          nativeLayers: original.nativeLayers, outputPaths: fresh.map(row => row.path)}), 'native-reference-composite'));
      await timed('referenceReadAndBind', async () => {for (const row of fresh) {
        const bytes = await readFile(row.path); assert.equal(bytes.length, completed.stdout.length);
        const ref = {path: row.path, fileSha256: digest(bytes)}; referenceFiles.set(row.key, ref); outputArtifacts.push(ref);
      }});
      const decision: any = await timed('rgbComparison', () => historical.classifyPresentationNativeReferenceFilesV001({
        completedRgb: completed.stdout, completedRgbRef: completedRgb,
        references: executions.map((row: any) => ({id: row.reference.id, ...referenceFiles.get(row.key)})), distanceCache, counts}));
      const sample = {...baseline, completedRgb, completedRgbSha256: completedRgb.fileSha256, ...decision,
        references: baseline.references.map((ref: any, n: number) => ({...ref, ...decision.references[n], rgbPath: executions[n].path}))};
      assert.deepEqual(sampleOutcome(sample), sampleOutcome(baseline));
      await timed('baselineByteComparison', async () => {
        for (const [n, ref] of sample.references.entries()) {
          const [a, b] = await Promise.all([readFile(ref.rgbPath), readFile(baseline.references[n].rgbPath)]);
          assert(a.equals(b), 'historical code produced different actual reference RGB bytes');
        }
      });
      const row = {sampleIndex: index, description, instructionId: baseline.instructionId, frame: baseline.frame,
        logicalCandidates: baseline.references.length, physicalReferencesGenerated: fresh.length,
        classCount: sample.classes.length, visible: sample.visible, elapsedSeconds: seconds(sampleBegan)};
      rows.push(row); results.push(sample);
      await save(path.join(directory, 'sample-' + index + '-measurement.json'), row);
      console.log(JSON.stringify({event: 'legacy-sample-complete', completed: rows.length, samples: 7, frame: sample.frame, elapsedSeconds: row.elapsedSeconds}));
    }
    await timed('generatedOutputFinalVerification', async () => {for (const ref of outputArtifacts) assert.equal(await fileSha(ref.path), ref.fileSha256);});
    const preparationVerificationAfter = await verifyPreparation(source);
    const file = path.join(directory, 'legacy-samples.qc.json');
    const receipt = await timed('evidenceSave', () => writePresentationQcEvidenceV001(file, {schemaVersion: 'historical-small-qc-measurement-v001',
      source: source.source, historicalCode, samples: results, outputArtifacts}));
    await save(path.join(directory, 'legacy-samples.receipt.json'), {path: file, ...receipt});
    assert.equal(await fileSha(MP4), MP4_SHA);
    const comparisonStorage = await directorySize(referenceDirectory);
    const measurement = {schemaVersion: 'historical-small-qc-measurement-summary-v001', status: 'passed', startedAt,
      endedAt: new Date().toISOString(), elapsedSeconds: seconds(began), readAndBindSeconds: source.readAndBindSeconds,
      historicalCode, source: source.source, phasesSeconds: phases, preparationVerificationBefore, preparationVerificationAfter,
      samples: rows, sampleCount: rows.length, counts, comparisonRgbPeakAndFinal: comparisonStorage,
      comparisonPeakMeaning: 'all newly generated reference RGB files retained; final size equals logical peak, final allocated blocks are measured separately',
      nodeParentPeakResidentSetBytes: process.resourceUsage().maxRSS * 1024, ...observed.summary(),
      baselineMeaning: 'actual pre-change reference builder and classifier; saved frame/layer preparation reused, no whole QC preparation or whole video rerun',
      equality: {allReferenceBytes: true, allCandidates: true, classesAndDistances: true, verdicts: true},
      video: source.video, actions: {videoEncodes: 0, subtitleRenders: 0, sttRuns: 0, paidApiCalls: 0}};
    await save(path.join(directory, 'measurement.json'), measurement); return measurement;
  } catch (error) {await save(path.join(directory, 'failure.json'), {status: 'failed', error: String(error), elapsedSeconds: seconds(began)}); throw error;}
  finally {observed.close();}
}

/** Compare independent regeneration to actual historical output, not only recorded hashes. */
export async function byteCheckQcStreaming20260927(legacyDirectory: string, streamDirectory: string) {
  const began = performance.now();
  const legacyReceiptPath = path.join(legacyDirectory, 'legacy-samples.receipt.json');
  const streamReceiptPath = path.join(streamDirectory, 'samples.receipt.json');
  const rereadPath = path.join(streamDirectory, 'independent-reread/result.json');
  const [legacyReceipt, streamReceipt, reread] = await Promise.all([json(legacyReceiptPath), json(streamReceiptPath), json(rereadPath)]);
  const [legacy, streamed]: any[] = await Promise.all([
    readPresentationQcEvidenceV001(legacyReceipt.path, {expectedFileSha256: legacyReceipt.fileSha256}),
    readPresentationQcEvidenceV001(streamReceipt.path, {expectedFileSha256: streamReceipt.fileSha256}),
  ]);
  assert.equal(legacy.schemaVersion, 'historical-small-qc-measurement-v001');
  assert.equal(streamed.schemaVersion, 'qc-streaming-measurement-v001');
  assert.equal(reread.status, 'passed'); assert.deepEqual(reread.source, streamReceipt);
  assert.deepEqual(legacy.source, streamed.source);
  assert.equal(legacy.samples.length, 7); assert.equal(streamed.results.length, 7); assert.equal(reread.results.length, 7);
  const rows: any[] = [], sourceProofs: any[] = [], regenerationProofs: any[] = [];
  const oldPhysical = new Set<string>(), newPhysical = new Set<string>();
  let referencePairs = 0, referenceBytesPerSide = 0, completedBytesPerSide = 0;
  for (const [index, original] of legacy.samples.entries()) {
    const saved = streamed.results[index].sample, replay = reread.results[index];
    assert.equal(replay.sampleIndex, index); assert.equal(replay.instructionId, original.instructionId); assert.equal(replay.frame, original.frame);
    const beforeProof = saved.referenceRetention.checkpoint, afterProof = replay.referenceRetention.checkpoint;
    const [sourceProof, regeneration]: any[] = await Promise.all([
      readPresentationQcEvidenceV001(beforeProof.path, {expectedFileSha256: beforeProof.fileSha256}),
      readPresentationQcEvidenceV001(afterProof.path, {expectedFileSha256: afterProof.fileSha256}),
    ]);
    assert.equal(sourceProof.schemaVersion, 'native-sample-proof-v001');
    assert.equal(regeneration.schemaVersion, 'native-sample-proof-v001');
    assert.deepEqual(sampleOutcome(saved), sampleOutcome(original));
    assert.deepEqual(sampleOutcome(sourceProof.sample), sampleOutcome(original));
    assert.deepEqual(sampleOutcome(regeneration.sample), sampleOutcome(original));
    sourceProofs.push(beforeProof); regenerationProofs.push(afterProof);
    const regenerated = regeneration.sample, expectedBytes = original.crop.width * original.crop.height * 3;
    const artifacts = new Map(regeneration.artifacts.map((ref: any) => [ref.path, ref]));
    const checkedPaths = new Set<string>();
    for (const [candidateIndex, oldRef] of original.references.entries()) {
      const newRef = regenerated.references[candidateIndex];
      assert.equal(oldRef.id, newRef.id, 'candidate identity or order changed');
      const artifact: any = artifacts.get(newRef.rgbPath); assert(artifact, 'regenerated reference missing from proof artifacts');
      assert.equal(artifact.fileSha256, newRef.rgbSha256); assert.equal(artifact.bytes, expectedBytes);
      const [a, b] = await Promise.all([readFile(oldRef.rgbPath), readFile(newRef.rgbPath)]);
      assert.equal(a.length, expectedBytes); assert.equal(b.length, expectedBytes);
      assert.equal(digest(a), oldRef.rgbSha256); assert.equal(digest(b), newRef.rgbSha256);
      assert(a.equals(b), 'independent regeneration differs from historical RGB bytes: ' + oldRef.id);
      referencePairs++; referenceBytesPerSide += a.length;
      oldPhysical.add(oldRef.rgbPath); newPhysical.add(newRef.rgbPath); checkedPaths.add(newRef.rgbPath);
    }
    assert.deepEqual([...checkedPaths].sort(), [...artifacts.keys()].sort(), 'regenerated artifact coverage differs');
    const [a, b] = await Promise.all([readFile(original.completedRgb.path), readFile(regenerated.completedRgb.path)]);
    assert.equal(digest(a), original.completedRgbSha256); assert.equal(digest(b), regenerated.completedRgbSha256);
    assert(a.equals(b), 'completed RGB bytes changed'); completedBytesPerSide += a.length;
    rows.push({instructionId: original.instructionId, frame: original.frame, logicalCandidateCount: original.references.length,
      regeneratedPhysicalReferenceCount: checkedPaths.size, classCount: original.classes.length, visible: original.visible,
      candidateOrderEqual: true, rgbBytesEqual: true, classesDistancesAndVerdictEqual: true});
  }
  const result = {schemaVersion: 'qc-streaming-independent-byte-check-v001', status: 'passed', processId: process.pid,
    elapsedSeconds: seconds(began), source: legacy.source,
    legacyReceipt: await boundFile(legacyReceiptPath), streamReceipt: await boundFile(streamReceiptPath),
    legacyBundle: legacyReceipt, streamBundle: streamReceipt, independentReread: await boundFile(rereadPath),
    sourceProofs, regenerationProofs, sampleCount: rows.length, referencePairs,
    legacyPhysicalReferenceFiles: oldPhysical.size, regeneratedPhysicalReferenceFiles: newPhysical.size,
    referenceBytesComparedPerSide: referenceBytesPerSide, completedBytesComparedPerSide: completedBytesPerSide,
    rgbBytesRead: 2 * (referenceBytesPerSide + completedBytesPerSide),
    byteCountMeaning: 'Actual Buffer.equals for every logical candidate pair, including repeated physical files, plus seven completed RGB pairs; metadata reads excluded',
    comparison: 'Historical-code output vs separate-process regenerated output; both bundles and each sample proof read using saved receipt SHA',
    samples: rows, actions: {imageGenerations: 0, oldEvidenceWrites: 0}};
  await save(path.join(streamDirectory, 'independent-reread/byte-check.json'), result); return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const stage = process.argv[2]; assert(['small', 'full', 'reread', 'legacy-small', 'byte-check'].includes(stage), 'usage: small|full|reread|legacy-small [directory] [retain-all|stream32|stream64], or byte-check <legacy-directory> <stream-directory>');
  const directory = path.resolve(process.argv[3] ?? path.join(DEFAULT_DIRECTORY, stage + '-' + (process.argv[4] ?? 'stream32') + '-v001'));
  if (stage === 'byte-check') assert(process.argv[3] && process.argv[4], 'byte-check requires both saved run directories');
  const result = stage === 'byte-check' ? await byteCheckQcStreaming20260927(directory, path.resolve(process.argv[4]))
    : stage === 'reread' ? await rereadQcStreaming20260927(directory)
    : stage === 'legacy-small' ? await measureLegacySmall20260927(directory)
    : await measureQcStreaming20260927({stage: stage as 'small' | 'full', directory, variant: process.argv[4]});
  console.log(JSON.stringify({status: result.status, directory, elapsedSeconds: result.elapsedSeconds}));
}

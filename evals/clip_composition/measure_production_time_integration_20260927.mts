/** Post-run measurement only. Does not render, regenerate QC, change saved results, or run before completion. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {readPresentationQcEvidenceV001} from './presentation_qc_evidence_store_v001.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME = 'production-time-integration-20260927-v001';
const RUN = path.join(ROOT, 'runtime/artifacts', NAME);
const OUTPUT = path.join(ROOT, 'evals/clip_composition/outputs/presentation', NAME);
const EVIDENCE = path.join(RUN, 'render');
const REPORT = path.join(ROOT, 'docs/reports/production-time-integration-20260927/measurement.json');
const BASELINE = path.join(ROOT, 'docs/reports/qc-evidence-common-20260927/timing-baseline.json');
const references: any[] = [];
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
async function json(file: string) {
  const metadata = await lstat(file); assert(metadata.isFile() && !metadata.isSymbolicLink());
  const bytes = await readFile(file);
  references.push({path: file, bytes: bytes.length, fileSha256: digest(bytes)});
  return JSON.parse(bytes.toString('utf8'));
}
const nonnegative = (value: any, label: string): number => {
  assert(Number.isFinite(value) && value >= 0, label + ' is unavailable or invalid'); return value;
};
const seconds = (value: any, label: string) => nonnegative(value, label) / 1000;
const iso = (value: any) => {assert.equal(new Date(value).toISOString(), value); return value as string;};
function interval(startedAt: string, endedAt: string) {
  return {startedAt: iso(startedAt), endedAt: iso(endedAt),
    elapsedSeconds: nonnegative(Date.parse(endedAt) - Date.parse(startedAt), 'observed interval') / 1000};
}
async function shared(ref: any) {
  assert(path.isAbsolute(ref?.path ?? '') && /^[0-9a-f]{64}$/.test(ref?.fileSha256 ?? ''));
  references.push(ref);
  return readPresentationQcEvidenceV001(ref.path, {expectedFileSha256: ref.fileSha256});
}
async function footprint(directory: string): Promise<any> {
  const result = {files: 0, logicalBytes: 0, allocatedBytes: 0, symlinkEntriesNotFollowed: 0};
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {result.symlinkEntriesNotFollowed++; continue;}
    if (entry.isDirectory()) {
      const child = await footprint(file);
      for (const key of Object.keys(result)) result[key] += child[key];
    } else {
      const metadata = await lstat(file); assert(metadata.isFile());
      result.files++; result.logicalBytes += metadata.size; result.allocatedBytes += metadata.blocks * 512;
    }
  }
  return result;
}
async function processRecords() {
  const processes: any[] = [], operations: any[] = [], directory = path.join(EVIDENCE, 'processes');
  const digestRows: any[] = [];
  for (const name of (await readdir(directory)).sort()) {
    const entry = path.join(directory, name); assert((await lstat(entry)).isDirectory());
    let file = path.join(entry, 'timing.json');
    try {await lstat(file);} catch (error: any) {if (error.code !== 'ENOENT') throw error; file = path.join(entry, 'operation.json');}
    const bytes = await readFile(file), row = JSON.parse(bytes.toString('utf8'));
    iso(row.startedAt); iso(row.endedAt); assert(Date.parse(row.startedAt) <= Date.parse(row.endedAt));
    if (path.basename(file) === 'timing.json') {
      assert.equal(row.code, 0, 'observed process failed'); assert.equal(row.signal, null); assert.equal(row.spawnFailed, false);
      nonnegative(row.childMilliseconds, 'child elapsed'); nonnegative(row.evidenceWriteMilliseconds, 'evidence write elapsed');
      processes.push({...row, evidencePath: file});
    } else {
      assert.equal(row.status, 'passed', 'observed renderer operation failed');
      nonnegative(row.elapsedMilliseconds, 'operation elapsed'); operations.push({...row, evidencePath: file});
    }
    digestRows.push({path: file, fileSha256: digest(bytes)});
  }
  references.push({directory, recordCount: digestRows.length,
    timingFileListCanonicalSha256: digest(JSON.stringify(digestRows)),
    meaning: 'SHA of sorted JSON array of timing/operation file path and SHA pairs; individual logs remain in the run.'});
  const grouped = (rows: any[], elapsedField: string) => {
    const groups: any = {};
    for (const row of rows) {
      const group = groups[row.label] ??= {count: 0, summedObservedSeconds: 0,
        summedEvidenceWriteSeconds: elapsedField === 'childMilliseconds' ? 0 : null,
        firstObservedStart: row.startedAt, lastObservedEnd: row.endedAt};
      group.count++; group.summedObservedSeconds += row[elapsedField] / 1000;
      if (elapsedField === 'childMilliseconds') group.summedEvidenceWriteSeconds += row.evidenceWriteMilliseconds / 1000;
      if (row.startedAt < group.firstObservedStart) group.firstObservedStart = row.startedAt;
      if (row.endedAt > group.lastObservedEnd) group.lastObservedEnd = row.endedAt;
    }
    return groups;
  };
  return {processes, operations, byProcessLabel: grouped(processes, 'childMilliseconds'),
    byOperationLabel: grouped(operations, 'elapsedMilliseconds')};
}
function resource(summary: any, ownMaximum: any) {
  assert.equal(summary.exit?.code, 0); assert.equal(summary.exit?.signal, null); assert.equal(summary.observationFailure, null);
  for (const key of ['observations', 'parentObservations', 'childObservations', 'storageObservations', 'observationErrors'])
    assert(Number.isSafeInteger(summary[key]) && summary[key] >= 0, 'resource observation count missing: ' + key);
  const observed = (count: number, value: any) => count > 0 ? nonnegative(value, 'sampled resource') : null;
  return {nodeProcessLifetimeMaximumRssBytes: nonnegative(ownMaximum, 'Node self maximum RSS'),
    sampledNodeMaximumRssBytes: observed(summary.parentObservations, summary.parentSampledPeakBytes),
    sampledLargestSingleDescendantRssBytes: observed(summary.childObservations, summary.singleChildSampledPeakBytes),
    sampledSimultaneousNodeAndDescendantsRssBytes: observed(summary.parentObservations + summary.childObservations,
      summary.simultaneousDescendantSumSampledPeakBytes),
    exactSimultaneousProcessTreeMaximumRssBytes: null,
    sampledNewRunPeakLogicalBytes: observed(summary.storageObservations, summary.newRunSampledPeakLogicalBytes),
    sampledNewRunPeakAllocatedBytes: observed(summary.storageObservations, summary.newRunSampledPeakAllocatedBytes),
    observations: summary.observations, validParentObservations: summary.parentObservations,
    validDescendantObservations: summary.childObservations, validStorageObservations: summary.storageObservations,
    observationErrors: summary.observationErrors,
    scope: 'Node self resourceUsage is the process-lifetime high-water mark, including startup. Descendants are those observed by current PPID ancestry; short-lived or reparented processes may be missed. Simultaneous RSS is the per-sample sum including Node, never the sum of separate peaks. RSS nominally 2s and storage 30s; scans are non-atomic. Storage covers the named run, work and output roots, not sibling ownership locks or external browser/system temporary directories. st_blocks*512 is allocated file blocks, not exclusive physical APFS extents. Atomic rename during a scan can temporarily omit or double-count a moved file.'};
}
function comparison(before: any, afterSeconds: number, baselinePointer: string) {
  const beforeSeconds = nonnegative(before.elapsedSeconds, 'historical elapsed'); assert(beforeSeconds > 0);
  return {beforeSeconds, afterSeconds, differenceSeconds: beforeSeconds - afterSeconds,
    reductionPercent: (beforeSeconds - afterSeconds) / beforeSeconds * 100,
    baseline: {path: BASELINE, jsonPointer: baselinePointer, sourceEvidence: before.evidence},
    historicalTimeBasis: before.timeBasis};
}

export async function measureProductionTimeIntegration() {
  // These completion gates run before the large QC graph is read or any output is written.
  const execution = await json(path.join(RUN, 'integration-execution.json'));
  assert.equal(execution.status, 'completed'); assert.equal(execution.result?.status, 'passed-with-resolved-codec-ambiguity');
  const completionPath = path.join(EVIDENCE, 'integration-completion.json');
  const reread = await json(completionPath + '.reread.json'); assert.equal(reread.status, 'passed');
  assert.equal(reread.nativeStatus, 'failed'); assert.equal(reread.finalQcStatus, 'failed');
  const rereadInvocation = await json(path.join(RUN, 'reread-invocation.json'));
  assert.equal(rereadInvocation.exitCode, 0);
  interval(rereadInvocation.startedAt, rereadInvocation.endedAt);
  assert(nonnegative(rereadInvocation.elapsedSeconds, 'reread invocation elapsed')
    >= nonnegative(reread.elapsedSeconds, 'independent reread elapsed'));
  assert(typeof rereadInvocation.command === 'string' && rereadInvocation.command.length > 0
    || Array.isArray(rereadInvocation.command) && rereadInvocation.command.length > 0
      && rereadInvocation.command.every((part: any) => typeof part === 'string'));
  assert.equal(rereadInvocation.scope,
    'monitor invocation including child startup, summary serialization and monitor sampling shutdown; encloses C verification');
  const runResource = await json(path.join(RUN, 'run-resource-summary.json'));
  const rereadResource = await json(path.join(RUN, 'reread-resource-summary.json'));
  const resources = {integration: resource(runResource, execution.parentMaximumRssBytes),
    independentReread: resource(rereadResource, reread.nodeParentPeakResidentSetBytes)};
  const receipt = await json(completionPath + '.receipt.json'); assert.equal(receipt.path, completionPath);
  assert.deepEqual(reread.completionReceipt, receipt);
  assert.deepEqual(execution.result.completionReceipt, receipt);
  const completion: any = await shared(receipt); assert.equal(completion.status, execution.result.status);
  const completed: any = await shared(completion.completedFrameQc);
  assert.equal(completed.status, 'failed'); assert.equal(completed.violations.length, 1);
  assert.equal(completed.violations[0].instructionId, 'new-material-digest-20260926-v001-instruction-instruction-000103');
  assert.equal(completed.violations[0].code, 'NATIVE_FRAME_QC_INVALID');
  assert.equal(completed.performance.finiteStateExecuted, true);
  const finite = completed.evidence.finiteState, samples = finite.sampleMeasurements, native = completed.performance.finiteState;
  assert.equal(finite.executionMethod, 'sample-batched-native-references-v003');
  assert.equal(finite.samples.length, 424); assert.equal(samples.length, finite.samples.length);
  assert.equal(completed.inspections.length, 326);
  const logicalCandidates = finite.samples.reduce((sum: number, sample: any) => sum + sample.references.length, 0);
  assert.equal(logicalCandidates, native.logicalReferenceCount); assert.equal(logicalCandidates, 320439);
  for (const key of ['referenceRgbOutputs', 'reusedReferenceRgbCount', 'exactDistanceCalculations', 'reusedExactDistances'])
    assert(Number.isSafeInteger(native[key]) && native[key] >= 0, 'native execution count missing: ' + key);
  for (const key of ['wallClockMs', 'preparationWallClockMs', 'finiteStateWallClockMs'])
    nonnegative(completed.performance[key], 'completed QC ' + key);
  assert(native.phasesMilliseconds && typeof native.phasesMilliseconds === 'object');
  for (const [key, value] of Object.entries(native.phasesMilliseconds)) nonnegative(value, 'native phase ' + key);
  let retained = 0, peak = 0;
  for (const row of samples) {
    peak = Math.max(peak, retained + nonnegative(row.peakReferenceBytes, 'sample peak'));
    retained += nonnegative(row.retainedReferenceBytes, 'sample retained');
  }
  assert.equal(peak, native.peakReferenceBytes); assert.equal(retained, native.retainedReferenceBytes);
  const sumSamples = (field: string) => samples.reduce((sum: number, row: any) => sum + nonnegative(row[field], field), 0);
  const preflight = await json(path.join(RUN, 'preflight.json')); assert.equal(preflight.status, 'passed');
  const start = await json(path.join(RUN, 'integration-start.json')); assert.equal(start.startedAt, execution.startedAt);
  assert.deepEqual(start.preflight, references.find(ref => ref.path === path.join(RUN, 'preflight.json')),
    'protected reference list differs from this execution preflight');
  const protectionStartedAt = new Date().toISOString(), protectionStarted = performance.now();
  let protectedBytes = 0;
  for (const ref of preflight.protectedRefs) {
    const metadata = await lstat(ref.path); assert(metadata.isFile() && !metadata.isSymbolicLink());
    assert.equal(metadata.size, ref.bytes, 'protected input size changed: ' + ref.path);
    const sha = createHash('sha256');
    for await (const bytes of createReadStream(ref.path)) sha.update(bytes);
    assert.equal(sha.digest('hex'), ref.fileSha256, 'protected input changed: ' + ref.path);
    protectedBytes += metadata.size;
  }
  const protectedInputReverification = {startedAt: protectionStartedAt, endedAt: new Date().toISOString(),
    elapsedSeconds: (performance.now() - protectionStarted) / 1000, fileCount: preflight.protectedRefs.length,
    bytesRead: protectedBytes, allHashesAndSizesUnchanged: true,
    scope: 'Post-save audit of every preflight-protected reference, including original source/STT/decisions/media and old evidence. No rendering or final-QC reconstruction. Outside A and the separate C reader; not added to either wall time.'};
  const fixed = await json(path.join(RUN, 'fixed-input-read.json'));
  const targetObservation = await json(path.join(RUN, 'native-target-observation.json'));
  interval(targetObservation.startedAt, targetObservation.endedAt);
  nonnegative(targetObservation.elapsedSeconds, 'parallel known-failure observation');
  assert.equal(targetObservation.instructionId, 'new-material-digest-20260926-v001-instruction-instruction-000103');
  assert.equal(targetObservation.frame, 7801); assert.equal(targetObservation.referenceCount, 757);
  assert.equal(targetObservation.classCount, 741); assert.equal(targetObservation.visible, false);
  assert.equal(targetObservation.expectedDistance, 1345125); assert.equal(targetObservation.duplicateDistance, 1344947);
  const observedTargets = finite.samples.filter((sample: any) => sample.instructionId === targetObservation.instructionId
    && sample.frame === targetObservation.frame);
  assert.equal(observedTargets.length, 1);
  assert.deepEqual(targetObservation.source, observedTargets[0].referenceRetention.checkpoint,
    'intermediate observation is not bound to this final native QC sample');
  const normal = await json(path.join(EVIDENCE, 'failure.json')); assert.equal(normal.status, 'failed');
  nonnegative(normal.elapsedMilliseconds, 'normal entry elapsed');
  for (const key of ['inputBindingMilliseconds', 'initialEvidenceWriteMilliseconds', 'backgroundMilliseconds',
    'preparationMilliseconds', 'drawAndQcMilliseconds', 'drawEvidenceWriteMilliseconds'])
    nonnegative(normal.timings?.[key], 'normal entry ' + key);
  nonnegative(execution.result.elapsedSeconds, 'resolution elapsed');
  for (const key of ['savedCurrentQcRead', 'currentInputsAndReceipts', 'savedFullBaselineReadAndCompare',
    'sameMediaAndDiagnosisVerification', 'currentMediaObservation', 'finalQcEvaluation', 'currentAudioClock',
    'finalQcSave', 'publicationAndReceiptVerification']) {
    nonnegative(execution.result.phasesSeconds?.[key], 'resolution phase ' + key);
    const boundary = execution.result.phaseIntervals?.[key]; assert(boundary, 'resolution phase interval missing: ' + key);
    interval(boundary.startedAt, boundary.endedAt);
  }
  const normalGate = await json(path.join(RUN, 'normal-gate-result.json')); assert.equal(normalGate.status, 'raw-native-failure-preserved');
  const identity = await json(path.join(RUN, 'body-identity-before-qc.json')); assert.equal(identity.identical, true);
  assert.equal(identity.current.fileSha256, completion.candidateVideo.fileSha256);
  const records = await processRecords();
  const bodyRecords = records.processes.filter(row => row.label === 'video-composite'); assert.equal(bodyRecords.length, 1);
  const body = bodyRecords[0];
  const replayRecords = records.processes.filter(row => row.label === 'exact-replay-encode'); assert.equal(replayRecords.length, 1);
  const replayEncode = replayRecords[0];
  const events = execution.events;
  const event = (phase: string) => {const found = events.filter((row: any) => row.phase === phase); assert.equal(found.length, 1); return found[0];};
  const nativeStart = event('native-assets'), compositeStart = event('composite');
  const baseline = await json(BASELINE);
  const oldStage = (name: string) => {const index = baseline.stages.findIndex((row: any) => row.stage === name); assert(index >= 0);
    return {row: baseline.stages[index], pointer: '/stages/' + index};};
  const oldBody = oldStage('processes/render-processes/video-composite'), oldReplay = oldStage('exact-replay');
  const workDirectory = path.dirname(path.dirname(completion.originalPlan.path));
  // plan is work/scratch/native-qc-preparation/plan.json; retain the exact owned work root.
  const work = path.dirname(workDirectory);
  assert.equal(path.dirname(work), path.dirname(OUTPUT));
  assert(path.basename(work).startsWith('.' + NAME + '.presentation-renderer-v002-work-'));
  const postRunFootprints = [];
  for (const directory of [RUN, OUTPUT, work]) postRunFootprints.push({directory, ...await footprint(directory)});
  const measurement = {
    schemaVersion: 'production-time-integration-measurement-v001', status: 'completed', measuredAt: new Date().toISOString(),
    sourceReferences: references,
    input: {savedSource: fixed.summary.source, savedStt: fixed.summary.stt, fixedSummary: fixed.summary,
      currentVideo: completion.candidateVideo, originalVideoUnchanged: completion.diagnosisReuse.originalVideo,
      protectedInputReverification,
      fullMp4ByteComparison: completion.diagnosisReuse, headAtStart: start.head,
      executionDeclaration: preflight.execution,
      executionDeclarationScope: 'Saved preflight scope declaration, not a new network/API telemetry measurement.'},
    boundaries: {
      A: {startedAt: iso(execution.startedAt), endedAt: iso(execution.endedAt),
        elapsedSeconds: nonnegative(execution.elapsedSeconds, 'integration elapsed'),
        scope: 'Outer normal integration from its start marker/fixed-input verification through verified publication and completion receipt. Includes reuse verification, new PNG work, body, new full replay, all native QC, failed-gate save, same-media diagnosis binding and publication verification. Excludes preflight/current-rules precheck, own execution summary write, independent reread, and this measurement.'},
      B: {...interval(execution.startedAt, body.endedAt),
        scope: 'Same outer start to observed body child close, before process-evidence serialization and later media inspection. Absolute ISO wall timestamps have millisecond precision; OS exit to close-notification latency is included.'},
      C: {startedAt: null, endedAt: null, elapsedSeconds: nonnegative(reread.elapsedSeconds, 'independent reread elapsed'),
        invocationBoundary: {...rereadInvocation, evidencePath: path.join(RUN, 'reread-invocation.json')},
        scope: 'Separate process independent verification from entry to completed checks, before its summary serialization. Absolute verification entry/end timestamps were not recorded. The independently timed enclosing invocation includes startup, summary serialization and monitor shutdown; its endpoints are not substituted for C.'},
      additivity: 'B is contained in A. C is separate. No sum of A, B, nested QC stages or parallel child/operation totals is a production wall time.',
    },
    timing: {
      preflightSecondsOutsideA: nonnegative(preflight.elapsedSeconds, 'preflight elapsed'),
      fixedInputVerificationSeconds: nonnegative(fixed.elapsedSeconds, 'fixed-input verification'),
      parallelKnownFailureObservation: targetObservation,
      parallelKnownFailureObservationScope: 'A one-time read of the retained sample during A to detect a new stop condition promptly. It is parallel monitoring, not an added production stage or post-save C time.',
      normalEntryMilliseconds: normal.timings, normalEntryElapsedMilliseconds: normal.elapsedMilliseconds,
      normalEntryTimingScope: 'Preparation is cumulative and includes input binding, start evidence, background reuse checks and initial media inspection. drawAndQc includes production preparation, body, post-media QC, raw failed-QC save and browser close. Do not add parents to child stages.',
      productionPngAndLayoutInterval: {...interval(nativeStart.observedAt, compositeStart.observedAt),
        monotonicSeconds: nonnegative(compositeStart.elapsedSeconds - nativeStart.elapsedSeconds, 'native preparation interval')},
      body: {...interval(body.startedAt, body.endedAt), childSeconds: seconds(body.childMilliseconds, 'body child'),
        evidenceWriteSeconds: seconds(body.evidenceWriteMilliseconds, 'body process evidence write'), evidencePath: body.evidencePath},
      completedFrameQc: completed.performance,
      completedFrameQcScope: 'QC total includes full replay, diagnostic PNG preparation, native QC and combination checks. finiteStateWallClockMs contains preparationWallClockMs and finiteState.wallClockMs. Native phase durations are measured disjoint suboperations, not additional wall time.',
      replayEncodeChild: {...interval(replayEncode.startedAt, replayEncode.endedAt),
        childSeconds: seconds(replayEncode.childMilliseconds, 'replay encode child'), evidencePath: replayEncode.evidencePath},
      failedQcSaveStandaloneSeconds: null,
      failedQcSaveScope: 'Included in normal drawAndQc; original failed-QC shared writer has no separate timer. drawEvidenceWriteMilliseconds times the bounded draw-result save, not the complete raw QC graph save.',
      resolutionPhasesSeconds: execution.result.phasesSeconds, resolutionPhaseIntervals: execution.result.phaseIntervals,
      resolutionElapsedSeconds: execution.result.elapsedSeconds,
      processGroups: records.byProcessLabel, rendererApiOperationGroups: records.byOperationLabel,
      observationScope: 'Process child time excludes observer evidence serialization; renderer API operations may enclose child or other operation work. Group sums are call-span work, not additive stage wall totals. Operation evidence serialization is not separately timed.',
    },
    beforeAfter: {
      body: comparison(oldBody.row, body.childMilliseconds / 1000, oldBody.pointer),
      fullReplay: comparison(oldReplay.row, seconds(completed.performance.exactReplay.wallClockMs, 'full replay wall'), oldReplay.pointer),
      scope: 'Body compares the same child-command scope; full replay compares the complete mandatory replay QC scope, not only its encoder. Old broad normal-path reconstruction, old QC-inclusive failures and STT/AI waiting are not speedup denominators for A.',
    },
    nativeQc: {instructionCount: completed.inspections.length, sampleCount: finite.samples.length, logicalCandidates,
      physicalReferenceRgbOutputs: native.referenceRgbOutputs, physicalReferenceReuses: native.reusedReferenceRgbCount,
      exactDistanceCalculations: native.exactDistanceCalculations, reusedExactDistances: native.reusedExactDistances,
      rawStatus: completed.status, violations: completed.violations,
      visibleSampleCount: finite.samples.filter((sample: any) => sample.visible === true).length,
      targetFailure: completion.nativeQc, independentResolution: completion.status,
      phaseMilliseconds: native.phasesMilliseconds},
    comparisonRgb: {peakLogicalBytes: peak, retainedAtNativeQcEndLogicalBytes: retained,
      generatedLogicalBytes: sumSamples('generatedReferenceBytes'),
      releasedSampleCount: finite.samples.filter((sample: any) => sample.referenceRetention.state === 'released-verified-pass').length,
      retainedSampleCount: finite.samples.filter((sample: any) => sample.referenceRetention.state === 'retained').length,
      scope: 'Only unique comparison-reference RGB files. Exact live logical-byte accounting accumulates earlier retained failed samples plus the current sample, before its cleanup. Excludes completed RGB, extracted source/completed frames, prepared planes, checkpoints, PNGs, MP4s and logs. Not Node memory or allocated disk blocks.',
      measuredReadSubsetsBytes: {referenceVerificationAndProofChecks: sumSamples('referenceReadBytes'),
        classifierFileReads: sumSamples('rgbReadBytes'), sampleInputVerification: sumSamples('inputVerificationBytes'),
        baselineImageComparison: sumSamples('baselineReadBytes')},
      physicalIoBytes: null, ioScope: 'Program-level counted read subsets only; repeated reads count repeatedly. These do not cover all hashing, decoding, receipt reads or OS cache/disk I/O.'},
    resources,
    postRunStorage: {measuredAt: new Date().toISOString(), roots: postRunFootprints,
      logicalBytes: postRunFootprints.reduce((n, row) => n + row.logicalBytes, 0),
      allocatedBytes: postRunFootprints.reduce((n, row) => n + row.allocatedBytes, 0),
      scope: 'Metadata scan after run and separate reread, before this report write. Includes their logs/receipts and the named new run cache/work/output roots only; excludes old reused background/source/evidence, sibling ownership locks and external browser/system temporary directories. Not an execution-time peak.'},
    unmeasured: ['Exact simultaneous process-tree peak RSS', 'Physical device I/O',
      'Standalone raw failed-QC shared serialization duration', 'Absolute C verification entry/end timestamps',
      'Peaks occurring between resource samples'],
  };
  await writeFile(REPORT, JSON.stringify(measurement, null, 2) + '\n', {flag: 'wx'});
  return {status: 'completed', measurementPath: REPORT, A: measurement.boundaries.A.elapsedSeconds,
    B: measurement.boundaries.B.elapsedSeconds, C: measurement.boundaries.C.elapsedSeconds};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await measureProductionTimeIntegration()));
}

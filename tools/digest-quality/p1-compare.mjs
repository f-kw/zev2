/** Compare fixed P1 executions from their saved requests and actual media bytes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import {comparePreviewNativeRgbBytesV001}
  from '../../evals/clip_composition/presentation_editing_preview_rgb_verification_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001}
  from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const exec = promisify(execFile), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashJson = value => hash(canonicalJson(value));
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
async function readBound(ref) {
  const stat = await lstat(ref.path); assert(stat.isFile() && !stat.isSymbolicLink());
  const bytes = await readFile(ref.path);
  if (ref.bytes !== undefined) assert.equal(bytes.length, ref.bytes);
  assert.equal(hash(bytes), ref.fileSha256, 'saved file bytes changed: ' + ref.path);
  return bytes;
}
const loadBound = async ref => JSON.parse(await readBound(ref));
async function bind(file) {
  const stat = await lstat(file); assert(stat.isFile() && !stat.isSymbolicLink());
  const bytes = await readFile(file); return {path: file, bytes: bytes.length, fileSha256: hash(bytes)};
}
function publishedRef(draw, ref) {
  assert(path.isAbsolute(ref.path));
  if (!ref.path.startsWith(draw.stagingDirectory + path.sep)) return ref;
  return {...ref, path: path.join(draw.outputDirectory, path.relative(draw.stagingDirectory, ref.path))};
}
function finiteRelocations(draw) {
  const finite = draw.completedFrameQc.evidence.finiteState, mappings = new Map();
  for (const ref of [...finite.inputManifest.inputRefs, ...finite.outputArtifacts]) {
    const actual = publishedRef(draw, ref);
    if (actual.path === ref.path) continue;
    const moved = {from: ref.path, to: actual.path, fileSha256: ref.fileSha256};
    if (mappings.has(ref.path)) assert.deepEqual(mappings.get(ref.path), moved);
    mappings.set(ref.path, moved);
  }
  return [...mappings.values()];
}
function requestProps(request) {
  if (request.kind === 'child-process') {
    const position = request.args.indexOf('--props'); assert(position >= 0);
    assert(request.args.includes('PresentationOverlayV001'));
    return JSON.parse(request.args[position + 1]);
  }
  assert.equal(request.kind, 'renderer-api-operation'); assert.equal(request.operationKind, 'render-still');
  return request.input.props;
}
async function requestsByProps(evidence) {
  const groups = new Map();
  for (const row of evidence.requests) {
    const request = await loadBound(row.requestRef), props = requestProps(request);
    assert.equal(hashJson(props), row.propsSha256);
    const rows = groups.get(row.propsSha256) ?? []; rows.push({...row, props}); groups.set(row.propsSha256, rows);
  }
  return groups;
}
function savedContent(actual) {
  return {viewSha256: actual.viewSha256, projectionSha256: actual.projectionSha256, state: actual.state};
}
const omitPngPath = ({pngPath: _path, ...row}) => row;
function sceneProjection(rows) {
  return rows.map(({states, alternates, ...row}) => ({...row, states: states.map(omitPngPath),
    ...(alternates === undefined ? {} : {alternates: alternates.map(omitPngPath)})}));
}
function qcProjection(draw) {
  const {completedFrameQcEvidence: _duplicated, currentCompletedMediaRef: _media,
    instructionEvidence, ...summary} = draw.finalQc;
  const completed = draw.completedFrameQc, finite = completed.evidence.finiteState;
  const replay = completed.evidence.exactReplay;
  return {finalQc: {...summary,
    instructionEvidence: instructionEvidence.map(({nativeFrameQc: _perInstructionCopy, ...row}) => row)},
  completed: {method: completed.method, status: completed.status, violations: completed.violations},
  finite: {schemaVersion: finite.schemaVersion, baselinePlan: finite.baselinePlan,
    orchestrationInput: finite.orchestrationInput, renderRange: finite.renderRange,
    sceneBindings: sceneProjection(finite.sceneBindings)},
  exactReplay: {schemaVersion: replay.schemaVersion, expectedFrameCount: replay.expectedFrameCount,
    planCanonicalSha256: replay.planCanonicalSha256, recordBindings: sceneProjection(replay.recordBindings),
    video: replay.video, mp4BytesIdentical: replay.mp4BytesIdentical, comparisonMethod: replay.comparisonMethod,
    encodeCompleted: replay.encodeProgress.completed, encodedFrames: replay.encodeProgress.encodedFrames}};
}
async function verifyReplay(draw, media) {
  const replay = draw.completedFrameQc.evidence.exactReplay;
  assert.equal(replay.mp4BytesIdentical, true); assert.equal(replay.comparisonMethod, 'mp4-byte-identical');
  assert.equal(replay.encodeProgress.completed, true); assert.equal(replay.encodeProgress.encodedFrames, replay.expectedFrameCount);
  const completed = publishedRef(draw, replay.completed), repeat = publishedRef(draw, replay.replay);
  const bytes = await readBound(completed), repeated = await readBound(repeat), registered = await readBound(media);
  assert(bytes.equals(repeated) && bytes.equals(registered), 'strict replay and registered preview differ');
  const qcMedia = publishedRef(draw, draw.finalQc.currentCompletedMediaRef);
  assert((await readBound(qcMedia)).equals(registered));
  return {completed, replay: repeat, expectedFrameCount: replay.expectedFrameCount, bytesExact: true};
}

/** Inventory actual adapter outputs as well as cache entries. Native requests
 * alone omit the copied production PNGs and their independent-check outputs. */
async function outputInventory(row, evidence, draw, groups) {
  const outputs = new Map(), cache = new Map(), applicability = [];
  const propsFor = sha => {const found = groups.get(sha); assert(found?.length, 'PNG props lack native request evidence'); return found[0].props;};
  async function add(ref, propsSha256, role) {
    const props = propsFor(propsSha256), actual = publishedRef(draw, ref);
    await readBound(actual);
    if (outputs.has(ref.path)) {
      const previous = outputs.get(ref.path);
      assert.equal(previous.propsSha256, propsSha256); assert.equal(previous.png.fileSha256, actual.fileSha256);
      if (!previous.roles.includes(role)) previous.roles.push(role);
      return;
    }
    outputs.set(ref.path, {recordedPath: ref.path, png: actual, propsSha256, props, roles: [role], native: false});
  }
  const requests = new Map();
  for (const request of evidence.requests) {
    assert(!requests.has(request.requestedOutputPath), 'native PNG output was overwritten');
    requests.set(request.requestedOutputPath, request);
    const actual = publishedRef(draw, {...request.png, path: request.requestedOutputPath});
    assert.equal(actual.path, request.png.path);
    await add({...request.png, path: request.requestedOutputPath}, request.propsSha256, 'native-request');
    outputs.get(request.requestedOutputPath).native = true;
  }
  for (const proofRef of evidence.cacheProofs) {
    const proof = await loadBound(proofRef), {proofSha256, ...body} = proof;
    assert.equal(hashJson(body), proofSha256); assert.equal(proof.schemaVersion, 'presentation-native-asset-cache-v001');
    assert.equal(proof.profileSha256, row.render.nativeAssets.profileSha256);
    assert.equal(proof.key, hashJson({profileSha256: proof.profileSha256, propsSha256: proof.propsSha256}));
    assert(!cache.has(proof.propsSha256), 'duplicate cache proof for identical props');
    propsFor(proof.propsSha256);
    assert.notEqual(proof.first.path, proof.repeat.path);
    for (const ref of [proof.first, proof.repeat]) {
      assert.equal(requests.get(ref.path)?.propsSha256, proof.propsSha256, 'cache pair was not independently rendered');
      assert.equal(ref.fileSha256, proof.png.fileSha256);
      assert((await readBound(publishedRef(draw, ref))).equals(await readBound(proof.png)));
    }
    cache.set(proof.propsSha256, {proofRef, propsSha256: proof.propsSha256,
      first: publishedRef(draw, proof.first), repeat: publishedRef(draw, proof.repeat), png: proof.png});
  }
  for (const item of evidence.applicability) {
    const proof = await loadBound(item.reference);
    assert.equal(hashJson(proof.body), proof.proofSha256);
    assert.deepEqual(proof.body.result, item.result); assert.deepEqual(proof.body.artifacts, item.artifacts);
    assert.equal(proof.body.result.nativeAssets.bitmapReuses, 0, 'cold applicability unexpectedly reused a bitmap');
    const {nativeAssets: _cache, processTimings: _time, ...result} = proof.body.result;
    applicability.push({binding: {targetId: proof.body.binding.targetId, planSha256: proof.body.binding.planSha256},
      result, layout: proof.body.layout});
    for (const artifact of item.artifacts) {
      await readBound(artifact);
      if (!artifact.path.endsWith('.png')) continue;
      const native = requests.get(artifact.path);
      assert(native, 'cold applicability PNG has no native request');
      await add(artifact, native.propsSha256, 'applicability');
    }
  }
  const stateRecords = draw.overlayRecords.flatMap(record => record.motionStates ?? record.pulseStates ?? [record]);
  for (const record of stateRecords) {
    const propsSha256 = hashJson(record.props), prefix = `production:${record.element.instructionId}:${record.state ?? 'static'}`;
    await add({path: record.pngPath, fileSha256: record.pngSha256}, propsSha256, prefix + ':image');
    await add({path: path.join(draw.scratchDirectory, 'frames', record.fileStem + '.repeat.png'),
      fileSha256: record.pngSha256}, propsSha256, prefix + ':repeat');
    for (const line of record.element.indexedLines) {
      const props = {...record.props, inspectionLineIndex: line.lineIndex}, sha = hashJson(props);
      assert.deepEqual(propsFor(sha), props);
      const file = path.join(draw.scratchDirectory, 'frames', record.fileStem + '-line-'
        + String(line.lineIndex + 1).padStart(2, '0') + '.png');
      const expected = requests.get(file)?.png ?? cache.get(sha)?.png;
      assert(expected, 'line mask lacks a native request or verified cache proof');
      await add({path: file, fileSha256: expected.fileSha256}, sha, prefix + ':line:' + line.lineIndex);
    }
    if (record.visibleCenterCalibration) {
      const {renderVisibleCenterCorrectionPx: _correction, ...uncorrected} = record.props;
      assert.equal(hashJson(uncorrected), record.visibleCenterCalibration.uncorrectedPropsCanonicalSha256);
      for (const line of record.visibleCenterCalibration.lineMasks) {
        const props = {...uncorrected, inspectionLineIndex: line.lineIndex}, sha = hashJson(props);
        assert.deepEqual(propsFor(sha), props);
        await add({path: line.pngPath, fileSha256: line.pngSha256}, sha, prefix + ':calibration:' + line.lineIndex);
      }
    }
  }
  for (const item of draw.completedFrameQc.preparation.drawingEvidence) {
    for (const role of ['png', 'repeat']) {
      if (item[role]) await add(item[role], item.propsCanonicalSha256,
        `diagnostic:${item.captionId}:${item.kind}:${role}`);
    }
  }
  const stats = [row.render.nativeAssets, ...evidence.applicability.map(item => item.result.nativeAssets)];
  const nativeCount = stats.reduce((total, item) => total + item.nativeDraws, 0);
  const reuseCount = stats.reduce((total, item) => total + item.bitmapReuses, 0);
  assert.equal(requests.size, nativeCount);
  assert.equal(outputs.size, nativeCount + reuseCount, 'actual PNG output inventory does not close');
  assert.equal([...outputs.values()].filter(item => !item.native).length, reuseCount);
  for (const item of outputs.values()) {
    assert(item.roles.some(role => role !== 'native-request'), 'native PNG has no declared drawing role');
    item.roles.sort();
    if (!item.native) {
      const proof = cache.get(item.propsSha256); assert(proof, 'copied PNG lacks a cache proof for its exact props');
      assert((await readBound(item.png)).equals(await readBound(proof.png)), 'cache copy differs from verified source');
      item.cacheProofRef = proof.proofRef;
    }
  }
  const byRole = new Map();
  for (const item of outputs.values()) {
    const key = canonicalJson({propsSha256: item.propsSha256, roles: item.roles, native: item.native});
    const rows = byRole.get(key) ?? []; rows.push(item); byRole.set(key, rows);
  }
  return {outputs, byRole, cache, applicability, nativeCount, reuseCount, stateCount: stateRecords.length};
}

function pngDimensions(bytes) {
  assert(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
  assert.equal(bytes.subarray(12, 16).toString('ascii'), 'IHDR');
  return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)};
}
async function comparePng({left, right, props, rgbaTool, decodedPairs}) {
  const oldBytes = await readBound(left), newBytes = await readBound(right);
  assert(oldBytes.equals(newBytes), 'PNG bytes differ for the same drawing request');
  const size = pngDimensions(oldBytes); assert.deepEqual(size, pngDimensions(newBytes));
  assert.deepEqual(size, {width: props.canvas.width, height: props.canvas.height}, 'native PNG canvas changed');
  const pairKey = left.fileSha256 + ':' + right.fileSha256;
  if (!decodedPairs.has(pairKey)) {
    const decode = async ref => {
      const decoded = await exec(rgbaTool.path, [ref.path, '-alpha', 'on', '-depth', '8', 'RGBA:-'],
        {encoding: 'buffer', maxBuffer: size.width * size.height * 4});
      assert.equal(decoded.stdout.length, size.width * size.height * 4); assert.equal(decoded.stderr.length, 0);
      await readBound(ref); return decoded.stdout;
    };
    const oldRgba = await decode(left), newRgba = await decode(right);
    assert(oldRgba.equals(newRgba), 'full RGBA differs');
    decodedPairs.set(pairKey, {old: left, current: right, ...size,
      byteCount: oldRgba.length, rgbaSha256: hash(oldRgba), exact: true});
  }
  return {old: left, current: right, pngByteExact: true, fullRgbaPairKey: pairKey};
}
const sum = (rows, fn) => rows.reduce((total, row) => total + fn(row), 0);
function measuredPhases(row, native) {
  const check = native.applicability.map(item => item.result);
  const allProcess = [row.render.processTimings, ...check.map(item => item.processTimings)];
  const operations = allProcess.flatMap(item => item.operations ?? []);
  const processes = allProcess.flatMap(item => item.records ?? []);
  const imageProcesses = processes.filter(item => ['overlay-still', 'overlay-line-mask'].includes(item.label));
  const imageOperations = operations.filter(item => item.operationKind === 'render-still');
  const preparation = operations.filter(item => ['bundle', 'browser-open'].includes(item.operationKind));
  const cache = [row.render.nativeAssets, ...check.map(item => item.nativeAssets)];
  return {
    editRequestToCompleteMediaMilliseconds: row.editRequestToCompleteMediaMilliseconds,
    applicabilityHttpMilliseconds: row.operations.find(item => item.name === 'selected-applicability').elapsedMilliseconds,
    durableSaveHttpMilliseconds: row.operations.find(item => item.name === 'selected-save').elapsedMilliseconds,
    previewRequestToCompleteMediaMilliseconds: row.firstPreview.requestToCompleteMediaMilliseconds,
    mediaAcquisitionMilliseconds: row.firstPreview.mediaTransferMilliseconds,
    completedMediaReuseMilliseconds: row.reusedPreview.requestToCompleteMediaMilliseconds,
    applicabilityReuseHttpMilliseconds: row.operations.find(item => item.name === 'applicability-reuse').elapsedMilliseconds,
    rendererPreparationMilliseconds: preparation.length ? sum(preparation, item => item.elapsedMilliseconds) : null,
    legacyPngWithPerImagePreparationMilliseconds: imageProcesses.length ? sum(imageProcesses, item => item.childMilliseconds) : null,
    freshPngApiMilliseconds: imageOperations.length ? sum(imageOperations, item => item.elapsedMilliseconds) : null,
    pngCacheReuseMilliseconds: sum(cache, item => item.bitmapReuseMilliseconds),
    freshPngCount: sum(cache, item => item.nativeDraws),
    pngCacheReuseCount: sum(cache, item => item.bitmapReuses),
    overlayCliLaunchCount: imageProcesses.length,
    overlayBrowserLaunchCount: imageProcesses.length + operations.filter(item => item.operationKind === 'browser-open').length,
    observedChildProcessCount: processes.length,
    cleanupMilliseconds: sum(operations.filter(item => ['browser-close', 'bundle-remove', 'browser-process-cleanup'].includes(item.operationKind)), item => item.elapsedMilliseconds),
    mainCompositionMilliseconds: row.render.processTimings.byLabel['video-composite'].childMilliseconds,
    strictRecompositionMilliseconds: row.render.finiteQcPerformance.exactReplay.wallClockMs,
    finiteStateQcMilliseconds: row.render.finiteQcPerformance.finiteState.wallClockMs,
    diagnosticImagePreparationMilliseconds: row.render.finiteQcPerformance.preparationWallClockMs,
    totalCompletedQcMilliseconds: row.render.finiteQcPerformance.wallClockMs,
    observedScope: 'PNG initialization counts only; layout/QC processes remain separate. Old CLI preparation and still pixels share one measured process and are not artificially split. Times include nested phases and must not be summed into end-to-end time.',
  };
}
export async function compareP1V001(beforePath, afterPath, outputDirectory) {
  const beforeRef = await bind(beforePath), afterRef = await bind(afterPath);
  const before = await loadBound(beforeRef), after = await loadBound(afterRef);
  assert.equal(before.status, 'passed'); assert.equal(after.status, 'passed');
  assert.deepEqual(before.cases.map(row => row.name), after.cases.map(row => row.name));
  assert.deepEqual(before.helperRef, after.helperRef);
  for (const key of ['node', 'version', 'path', 'platform', 'arch', 'release', 'cpuModel', 'chromium', 'remotion'])
    assert.deepEqual(before.environment[key], after.environment[key], 'comparison environments differ: ' + key);
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await mkdir(outputDirectory);
  const result = {schemaVersion: 'p1-byte-and-performance-comparison-v001', status: 'running',
    before: beforeRef, after: afterRef, cases: [], rgbaTool: await bind(await realpath('/opt/homebrew/bin/magick')),
    note: 'One fixed cold image-store run per implementation; no speed threshold or quality judgment.'};
  try {
    for (const [index, left] of before.cases.entries()) {
      const right = after.cases[index]; assert.deepEqual(left.condition, right.condition);
      for (const row of [left, right]) {
        assert.equal(row.status, 'passed'); assert.equal(row.allSavedContentAndDrawingUnchanged, true);
        assert.equal(row.sourceInputsUnchanged, true); assert.equal(row.independentReload.status, 'passed');
      }
      assert.deepEqual(savedContent(left.independentReload.actual), savedContent(right.independentReload.actual));
      const a = await loadBound(left.nativeEvidence.reference), b = await loadBound(right.nativeEvidence.reference);
      const oldDraw = await loadBound(a.drawResultRef), newDraw = await loadBound(b.drawResultRef);
      const oldGroups = await requestsByProps(a), newGroups = await requestsByProps(b);
      assert.deepEqual([...oldGroups.keys()].sort(), [...newGroups.keys()].sort(), 'PNG requests differ');
      for (const key of [...oldGroups.keys()].sort()) {
        assert.equal(oldGroups.get(key).length, newGroups.get(key).length,
          'native PNG request count differs for exact props');
        assert.deepEqual(oldGroups.get(key)[0].props, newGroups.get(key)[0].props);
      }
      const oldInventory = await outputInventory(left, a, oldDraw, oldGroups);
      const newInventory = await outputInventory(right, b, newDraw, newGroups);
      assert.deepEqual(oldInventory.applicability, newInventory.applicability, 'applicability or layout observations differ');
      assert.deepEqual([...oldInventory.byRole.keys()].sort(), [...newInventory.byRole.keys()].sort(),
        'native or cached PNG roles differ');
      assert.deepEqual([...oldInventory.cache.keys()].sort(), [...newInventory.cache.keys()].sort(),
        'verified native cache pairs differ');
      const pngPairs = [], cachePairs = [], rgbaPairs = new Map();
      for (const key of [...oldInventory.byRole.keys()].sort()) {
        const oldRows = oldInventory.byRole.get(key), newRows = newInventory.byRole.get(key);
        assert.equal(oldRows.length, newRows.length, 'PNG output count differs for a drawing role');
        for (const [n, old] of oldRows.entries()) {
          const current = newRows[n]; assert.deepEqual(old.props, current.props);
          const pair = await comparePng({left: old.png, right: current.png, props: old.props,
            rgbaTool: result.rgbaTool, decodedPairs: rgbaPairs});
          pngPairs.push({propsSha256: old.propsSha256, roles: old.roles, native: old.native,
            oldRecordedPath: old.recordedPath, currentRecordedPath: current.recordedPath,
            ...pair, inspectionLineIndex: old.props.inspectionLineIndex,
            ...(!old.native ? {oldCacheProof: old.cacheProofRef, currentCacheProof: current.cacheProofRef} : {})});
        }
      }
      for (const key of [...oldInventory.cache.keys()].sort()) {
        const old = oldInventory.cache.get(key), current = newInventory.cache.get(key);
        const pair = await comparePng({left: old.png, right: current.png, props: oldGroups.get(key)[0].props,
          rgbaTool: result.rgbaTool, decodedPairs: rgbaPairs});
        cachePairs.push({propsSha256: key, beforeProof: old.proofRef, afterProof: current.proofRef, ...pair});
      }
      const oldVideo = await readBound(left.firstPreview.media), newVideo = await readBound(right.firstPreview.media);
      assert(oldVideo.equals(newVideo), 'completed MP4 bytes differ');
      assert.deepEqual(oldDraw.resolvedPlan, newDraw.resolvedPlan);
      assert.deepEqual(oldDraw.applicationResults, newDraw.applicationResults);
      const oldQc = qcProjection(oldDraw), newQc = qcProjection(newDraw);
      assert.deepEqual(oldQc, newQc, 'QC states, positions, media properties, or verdicts differ');
      const replay = {before: await verifyReplay(oldDraw, left.firstPreview.media),
        after: await verifyReplay(newDraw, right.firstPreview.media)};
      const relocations = {before: finiteRelocations(oldDraw), after: finiteRelocations(newDraw)};
      const rgb = await comparePreviewNativeRgbBytesV001({before: oldDraw.completedFrameQc.evidence.finiteState,
        after: newDraw.completedFrameQc.evidence.finiteState, beforeRelocations: relocations.before,
        afterRelocations: relocations.after});
      assert.deepEqual(left.render.finalAudioClock, right.render.finalAudioClock);
      assert.deepEqual(left.render.finiteQcPerformance.finiteState.logicalReferenceCount,
        right.render.finiteQcPerformance.finiteState.logicalReferenceCount);
      assert.equal(rgb.counts.logicalReferenceCount, left.render.finiteQcPerformance.finiteState.logicalReferenceCount);
      assert.deepEqual(left.render.finiteQcPerformance.finiteState.sourceFrameOutputs,
        right.render.finiteQcPerformance.finiteState.sourceFrameOutputs);
      const oldTiming = measuredPhases(left, a), newTiming = measuredPhases(right, b);
      result.cases.push({name: left.name, condition: left.condition,
        nativePngRequestCount: oldInventory.nativeCount, cachedPngOutputCount: oldInventory.reuseCount,
        allAdapterPngOutputCount: pngPairs.length, productionStateCount: oldInventory.stateCount,
        distinctDecodedPngPairs: rgbaPairs.size, pngPairs, cachePairs,
        fullRgbaPairs: [...rgbaPairs].map(([key, value]) => ({key, ...value})),
        mp4: {before: left.firstPreview.media, after: right.firstPreview.media, bytesExact: true},
        savedContentExact: true, resolvedPlanExact: true, applicationResultsExact: true,
        qcObservationsExact: true, qcProjectionSha256: hashJson(oldQc), audioExact: true,
        replay, rgb, publicationRelocations: relocations,
        logicalFiniteCandidates: left.render.finiteQcPerformance.finiteState.logicalReferenceCount,
        finiteQcSelectedFrames: rgb.samples.map(sample => ({instructionId: sample.instructionId,
          frame: sample.frame, mediaFrame: sample.mediaFrame, expectedState: sample.expectedState})),
        before: oldTiming, after: newTiming,
        savedMilliseconds: oldTiming.editRequestToCompleteMediaMilliseconds - newTiming.editRequestToCompleteMediaMilliseconds,
        afterOverBefore: newTiming.editRequestToCompleteMediaMilliseconds / oldTiming.editRequestToCompleteMediaMilliseconds});
    }
    await readBound(beforeRef); await readBound(afterRef); await readBound(result.rgbaTool);
    result.status = 'passed';
  } catch (error) {result.status = 'failed'; result.failure = {message: error.message, stack: error.stack};}
  await writeFile(path.join(outputDirectory, 'result.json'), JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
  return {status: result.status, outputPath: path.join(outputDirectory, 'result.json'), failure: result.failure ?? null};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [before, after, output] = process.argv.slice(2);
  assert([before, after, output].every(value => typeof value === 'string' && path.isAbsolute(value)));
  const result = await compareP1V001(before, after, output); console.log(JSON.stringify(result));
  if (result.status !== 'passed') process.exitCode = 1;
}

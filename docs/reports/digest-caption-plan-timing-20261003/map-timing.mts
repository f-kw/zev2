import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {readFile, writeFile, mkdir, lstat, realpath} from 'node:fs/promises';
import {digestArtifactFileNameV001, digestArtifactPathFromUriV001, digestProducerRequestIdsV001, type Zev2State} from '../../../packages/shared/src/index.js';
import {registeredDigestDependencyV001} from '../../../runner/src/digest-plan-preparation-v001.js';
import {readPreparedDigestCaptionJudgmentInputsV001, type DigestCaptionPreparationParametersV001} from '../../../runner/src/digest-caption-input-preparation-v001.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REPORT = 'docs/reports/digest-caption-plan-timing-20261003';
const OUT = 'runtime/artifacts/digest-caption-plan-timing-20261003-v001/attempt-001';
const INPUT = 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002';
const DISPLAY = 'runtime/artifacts/digest-caption-display-answers-20261003-v001/attempt-004';
const SCOPE = 'docs/work-orders/ZEV_DIGEST_CAPTION_PLAN_TIMING_20261003_v001.md';
const inputBinding = {path: INPUT + '/bundle/manifest.json', fileSha256: '83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75'};
const displayBinding = {path: DISPLAY + '/manifest.json', fileSha256: 'bbf4536aaae9941a3142630b74a74db5638c570a731b33c03360770a32b6bc88'};
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
function record(v: unknown): Obj {assert(object(v)); return v;}
function records(v: unknown): Obj[] {assert(Array.isArray(v)); return v.map(record);}
function text(v: unknown): string {assert(typeof v === 'string' && v.length); return v;}
function texts(v: unknown): string[] {assert(Array.isArray(v)); return v.map(text);}
function integer(v: unknown): number {assert(typeof v === 'number' && Number.isSafeInteger(v)); return v;}
const abs = (p: string) => path.join(ROOT, p);
const load = (p: string) => import(pathToFileURL(abs(p)).href);
const [formal, stable, display, clock] = await Promise.all([
  load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'),
  load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'),
  load('evals/clip_composition/adopted_media_manufacturing_v001.mts'),
  load('evals/clip_composition/presentation_base_media_timeline_v004.mjs')]);
const observed = new Map<string, {path: string; fileSha256: string; sizeBytes: number}>();
const implementations = ['evals/clip_composition/presentation_base_media_timeline_v004.mjs',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts', 'packages/shared/src/digest-plan-artifacts-v001.ts',
  'runner/src/digest-plan-preparation-v001.ts', 'runner/src/digest-caption-input-preparation-v001.ts',
  'evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts',
  'evals/clip_composition/presentation_timeline_composition_decision_v001.mjs', REPORT + '/map-timing.mts'];
async function read(p: string): Promise<Buffer> {
  assert(/\.(json|md|mts|ts|mjs)$/u.test(p), 'TIMING_JSON_AND_CODE_ONLY');
  const bytes: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: ROOT, relativePath: p});
  const binding = {path: p, fileSha256: formal.sha(bytes), sizeBytes: bytes.length};
  const previous = observed.get(p);
  if (previous) assert.deepEqual(binding, previous, 'TIMING_INPUT_CHANGED_DURING_RUN');
  observed.set(p, binding); return bytes;
}
const json = async (p: string) => record(JSON.parse((await read(p)).toString('utf8')));
async function bound(b: unknown) {
  const binding = record(b), bytes = await read(text(binding.path));
  assert.equal(formal.sha(bytes), binding.fileSha256, 'TIMING_BOUND_SHA_MISMATCH');
  return record(JSON.parse(bytes.toString('utf8')));
}
async function main() {
  assert.equal(process.argv[2], 'run', 'Explicit run required');
  const start = performance.now(), report = record(JSON.parse((await readFile(abs(REPORT + '/evidence.json'))).toString('utf8')));
  assert.equal(formal.sha(await read(SCOPE)), record(report.scope).fileSha256);
  for (const fn of [readPreparedDigestCaptionJudgmentInputsV001, display.validateDisplayForAdoptionV001,
    display.readValidatedDisplayTracesV001, clock.frameBoundaryWithVideoOffsetV001,
    clock.sourceEndFrameBoundaryWithVideoOffsetV001, clock.logicalSourceFrameCountV002,
    clock.videoPresentationOffsetMsV001, digestArtifactFileNameV001]) assert.equal(typeof fn, 'function');
  assert.equal(await realpath(abs('runtime/artifacts')), abs('runtime/artifacts'));
  await assert.rejects(lstat(abs(OUT)), {code: 'ENOENT'});
  await bound(inputBinding);
  const dm = await bound(displayBinding);
  assert.deepEqual(dm.inputManifestBinding, inputBinding);
  for (const b of records(dm.implementations)) {
    assert.equal(formal.sha(await read(text(b.path))), b.fileSha256);
  }
  const params: DigestCaptionPreparationParametersV001 = JSON.parse((await read(INPUT + '/parameters.json')).toString());
  const prepared = await readPreparedDigestCaptionJudgmentInputsV001(params, inputBinding); // once, JSON-only
  for (const b of [...records(prepared.manifest.inputReferences), ...records(prepared.manifest.implementations)]) {
    assert.equal(formal.sha(await read(text(b.path))), b.fileSha256);
  }
  for (const p of implementations) await read(p);
  const state: Zev2State = JSON.parse((await read(params.stateBinding.path)).toString());
  const command = state.agentRequests.find(r => r.id === params.expected.executionRequestId);
  assert(command);
  const producers = digestProducerRequestIdsV001(state, command);
  const physical = (logical: string) => {
    const p = path.join(params.sourceRuntimeRoot, 'artifacts', params.expected.requestDraftId,
      digestArtifactFileNameV001(logical, params.expected.requestDraftId, producers));
    const relative = path.relative(ROOT, p).split(path.sep).join('/');
    assert(relative && !relative.startsWith('/') && !relative.split('/').includes('..'));
    return relative;
  };
  const exref = registeredDigestDependencyV001(state, command, 'digest_execution_input_json');
  const exlogical = digestArtifactPathFromUriV001(exref.uri, params.expected.requestDraftId, command.id);
  const execution = await bound({path: physical(exlogical), fileSha256: exref.sha256});
  const getLogical = async (b: unknown) => {
    const binding = record(b), logical = text(binding.path);
    const entries = records(prepared.manifest.logicalToPhysical).filter(v => v.path === logical);
    assert.equal(entries.length, 1);
    const declared = entries[0]!;
    assert.equal(declared.bytesVerified, true, 'TIMING_NO_MEDIA_BINDING_CONSUMPTION');
    assert.equal(declared.fileSha256, binding.fileSha256);
    assert.equal(declared.physicalPath, physical(logical), 'TIMING_RESOLVER_MISMATCH');
    return bound({path: text(declared.physicalPath), fileSha256: binding.fileSha256});
  };
  const savedClock = await getLogical(execution.clockResolutionBinding);
  const inspection = await getLogical(execution.sourceInspectionBinding);
  const media = record(inspection.media), video = record(record(media.source).video);
  const videoClock = record(media.videoClock);
  const sourceFrameClock = {inputFrameRate: text(video.frameRate), decodedFrameCount: integer(media.decodedFrameCount),
    videoPresentationOffsetMs: integer(videoClock.presentationOffsetMs)};
  assert.equal(sourceFrameClock.decodedFrameCount, video.decodedFrameCount);
  assert.equal(sourceFrameClock.videoPresentationOffsetMs, video.presentationOffsetMs);
  assert.equal(clock.logicalSourceFrameCountV002(sourceFrameClock.inputFrameRate, sourceFrameClock.decodedFrameCount), media.logicalFrameCount);
  assert.equal(clock.videoPresentationOffsetMsV001({firstPts: videoClock.firstPts, timeBase: videoClock.streamTimeBase,
    containerStartTimeMs: videoClock.containerStartTimeMs}), sourceFrameClock.videoPresentationOffsetMs);
  const mappings = records(savedClock.mappings);
  assert.equal(savedClock.status, 'passed');
  assert.equal(mappings.length, prepared.segments.length);
  for (const [i, mapping] of mappings.entries()) {
    const segment = prepared.segments[i]!;
    assert.equal(mapping.segmentId, segment.segmentId);
    assert.equal(mapping.sourceStartMs, segment.sourceStartMs); assert.equal(mapping.sourceEndMs, segment.sourceEndMs);
    assert.equal(clock.frameBoundaryWithVideoOffsetV001(mapping.sourceStartMs, sourceFrameClock.videoPresentationOffsetMs), mapping.sourceStartFrame30);
    assert.equal(clock.sourceEndFrameBoundaryWithVideoOffsetV001(mapping.sourceEndMs, sourceFrameClock), mapping.sourceEndFrame30);
    assert.equal(integer(mapping.outputEndFrame) - integer(mapping.outputStartFrame), integer(mapping.sourceEndFrame30) - integer(mapping.sourceStartFrame30));
    if (i > 0) assert.equal(mapping.outputStartFrame, mappings[i - 1]!.outputEndFrame);
  }
  const groups = records(prepared.meaning.orderedCandidates), atoms = records(prepared.meaning.atomOccurrences);
  const atomById = new Map(atoms.map(a => [text(a.atomOccurrenceId), a]));
  assert.equal(atomById.size, atoms.length);
  const receipts = records(dm.responses), rows: Obj[] = [], groupObservations: Obj[] = [], tokens: object[] = [], covered: string[] = [];
  assert.equal(receipts.length, prepared.requests.length); assert.equal(groups.length, receipts.length);
  let lineTotal = 0;
  const mappingStart = performance.now();
  for (const [i, req] of prepared.requests.entries()) {
    const group = groups[i]!, mapping = mappings[i]!, receipt = receipts[i]!;
    assert.equal(group.timelineSegmentId, req.timelineSegmentId); assert.equal(group.candidateId, req.candidateId);
    assert.equal(mapping.segmentId, req.timelineSegmentId);
    const request = await bound(receipt.requestBinding); assert.deepEqual(request, req);
    const response = await bound(receipt.responseBinding), result = await bound(receipt.resultBinding);
    const token: object = display.validateDisplayForAdoptionV001(req, response, result, 'digest-caption-judgment-display-response-v001');
    tokens.push(token);
    const cap = records(record(req.input).captions)[0]!, boundaries = records(cap.boundaryCandidates);
    const atomIds = texts(group.atomOccurrenceIds), groupAtoms = atomIds.map(id => {const a = atomById.get(id); assert(a); return a;});
    assert.equal(boundaries.length, groupAtoms.length);
    assert.deepEqual(groupAtoms.map(a => integer(a.sourceSegmentId)), prepared.segments[i]!.sourceSegmentIds);
    boundaries.forEach((b, j) => assert.equal(b.text, groupAtoms[j]!.text, 'TIMING_ATOM_TEXT_ORDER_MISMATCH'));
    const index = new Map(boundaries.map((b, j) => [text(b.boundaryId), j]));
    const cues = records(records(record(result.answer).captions)[0]!.cues);
    assert.equal(cues.length, receipt.cueCount);
    const groupRows: Obj[] = []; let previous = 0, groupLines = 0;
    for (const [j, cue] of cues.entries()) {
      const endIndex = index.get(text(cue.cueEndBoundaryId)); assert(endIndex !== undefined);
      const end = endIndex + 1; assert(end > previous);
      const ids = atomIds.slice(previous, end), cueAtoms = groupAtoms.slice(previous, end), issues: string[] = [];
      const spans = cueAtoms.map(a => {
        const entries = records(a.retainedSpans);
        assert.equal(entries.length, 1, 'TIMING_RETAINED_SPAN_AMBIGUOUS');
        const span = entries[0]!; assert.equal(span.timelineSegmentId, mapping.segmentId);
        return {sourceStartMs: integer(span.sourceStartMs), sourceEndMs: integer(span.sourceEndMs)};
      });
      for (const [k, span] of spans.entries()) {
        if (span.sourceStartMs >= span.sourceEndMs) issues.push('source-interval-invalid');
        if (k > 0 && (span.sourceStartMs < spans[k - 1]!.sourceStartMs || span.sourceEndMs < spans[k - 1]!.sourceEndMs)) issues.push('source-order-invalid');
      }
      const sourceStartMs = spans[0]!.sourceStartMs, sourceEndMs = spans[spans.length - 1]!.sourceEndMs;
      if (sourceStartMs < integer(mapping.sourceStartMs) || sourceEndMs > integer(mapping.sourceEndMs)) issues.push('outside-retained-segment');
      const sourceStartFrame30 = clock.frameBoundaryWithVideoOffsetV001(sourceStartMs, sourceFrameClock.videoPresentationOffsetMs);
      const sourceEndFrame30 = clock.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, sourceFrameClock);
      assert(typeof sourceStartFrame30 === 'number' && typeof sourceEndFrame30 === 'number');
      if (sourceStartFrame30 >= sourceEndFrame30) issues.push('zero-or-negative-frame-interval');
      if (sourceStartFrame30 < integer(mapping.sourceStartFrame30) || sourceEndFrame30 > integer(mapping.sourceEndFrame30)) issues.push('outside-source-frame-mapping');
      const startFrame = integer(mapping.outputStartFrame) + sourceStartFrame30 - integer(mapping.sourceStartFrame30);
      const endFrameExclusive = integer(mapping.outputStartFrame) + sourceEndFrame30 - integer(mapping.sourceStartFrame30);
      if (startFrame < integer(mapping.outputStartFrame) || endFrameExclusive > integer(mapping.outputEndFrame)) issues.push('outside-plan-frame-mapping');
      if (groupRows.length && startFrame < integer(groupRows[groupRows.length - 1]!.startFrame)) issues.push('plan-start-order-invalid');
      const lines: Obj[] = []; let lineStart = previous;
      for (const boundaryId of texts(cue.lineEndBoundaryIds)) {
        const lineEndIndex = index.get(boundaryId); assert(lineEndIndex !== undefined);
        const lineEnd = lineEndIndex + 1; assert(lineEnd > lineStart && lineEnd <= end);
        lines.push({lineEndBoundaryId: boundaryId, text: boundaries.slice(lineStart, lineEnd).map(b => text(b.text)).join(''),
          atomOccurrenceIds: atomIds.slice(lineStart, lineEnd), sourceSegmentIds: groupAtoms.slice(lineStart, lineEnd).map(a => integer(a.sourceSegmentId))});
        lineStart = lineEnd;
      }
      assert.equal(lineStart, end);
      assert.equal(lines.map(l => text(l.text)).join(''), cueAtoms.map(a => text(a.text)).join(''));
      const row = {groupOrdinal: i + 1, cueOrdinal: j + 1, candidateId: req.candidateId, timelineSegmentId: req.timelineSegmentId,
        requestBinding: receipt.requestBinding, responseBinding: receipt.responseBinding, resultBinding: receipt.resultBinding,
        groupReference: {meaningBinding: dm.meaningBinding, field: 'orderedCandidates', ordinal: i + 1},
        captionId: cap.captionId, cueEndBoundaryId: cue.cueEndBoundaryId, lineEndBoundaryIds: cue.lineEndBoundaryIds,
        atomOccurrenceIds: ids, sourceSegmentIds: cueAtoms.map(a => integer(a.sourceSegmentId)),
        semanticUtteranceIds: [...new Set(cueAtoms.map(a => text(a.semanticUtteranceId)))], lines,
        sourceStartMs, sourceEndMs, sourceStartFrame30, sourceEndFrame30,
        startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame,
        mappingStatus: issues.length ? 'unmapped' : 'mapped', issues: [...new Set(issues)]};
      rows.push(row); groupRows.push(row); covered.push(...ids); groupLines += lines.length; previous = end;
    }
    assert.equal(previous, boundaries.length); assert.equal(groupLines, receipt.lineCount); lineTotal += groupLines;
    const gaps = groupRows.slice(1).map((row, j) => integer(row.startFrame) - integer(groupRows[j]!.endFrameExclusive));
    groupObservations.push({groupOrdinal: i + 1, candidateId: req.candidateId, timelineSegmentId: req.timelineSegmentId,
      mapping, atomCount: atomIds.length, cueCount: groupRows.length, lineCount: groupLines,
      minDisplayFrames: Math.min(...groupRows.map(r => integer(r.displayFrameCount))),
      maxDisplayFrames: Math.max(...groupRows.map(r => integer(r.displayFrameCount))),
      adjacentGapFrames: gaps, positiveGapCount: gaps.filter(n => n > 0).length, overlapCount: gaps.filter(n => n < 0).length});
  }
  assert.deepEqual(covered, groups.flatMap(g => texts(g.atomOccurrenceIds)));
  assert.deepEqual(covered, atoms.map(a => text(a.atomOccurrenceId)));
  assert.equal(new Set(covered).size, covered.length);
  assert.equal(display.readValidatedDisplayTracesV001(prepared.requests, tokens).length, receipts.length);
  const mappingMs = performance.now() - mappingStart, unmapped = rows.filter(r => r.mappingStatus === 'unmapped');
  const map = {schemaVersion: 'digest-caption-plan-frame-correspondence-v001', status: unmapped.length ? 'diagnostic-with-unmapped' : 'mapped-plan-correspondence',
    scopeBinding: report.scope, inputManifestBinding: inputBinding, displayManifestBinding: displayBinding,
    originalClockBinding: execution.clockResolutionBinding, inspectionBinding: execution.sourceInspectionBinding,
    sourceFrameClock, originalMappings: mappings, groups: groupObservations, cues: rows,
    summary: {groups: groups.length, cues: rows.length, lines: lineTotal, atoms: covered.length, unmapped: unmapped.length,
      originalPlanEndFrame: mappings.at(-1)!.outputEndFrame, originalPlanEndSample: record(mappings.at(-1)!.audioSamples).outputEnd},
    admission: prepared.manifest.admission, mediaBytesVerifiedThisRun: false, isFormalTimeline: false, isRendererInput: false};
  await mkdir(abs(path.dirname(OUT)), {recursive: true});
  assert.equal(await realpath(abs(path.dirname(OUT))), abs(path.dirname(OUT)));
  await mkdir(abs(OUT)); // absent and exclusive, no overwrite
  const bytes: Buffer = formal.formal(map), outputPath = OUT + '/cue-time-map.json';
  await writeFile(abs(outputPath), bytes, {flag: 'wx'});
  const readbackStart = performance.now(), reread = await readFile(abs(outputPath));
  assert.deepEqual(reread, bytes); assert.equal(formal.sha(reread), formal.sha(bytes));
  assert.deepEqual(JSON.parse(reread.toString()), map);
  const readback = {status: 'passed', reads: 1, bytesEqual: true, objectEqual: true, shaEqual: true,
    elapsedMs: performance.now() - readbackStart, contentJudgments: 0};
  for (const b of observed.values()) {
    const after: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: ROOT, relativePath: b.path});
    assert.equal(after.length, b.sizeBytes); assert.equal(formal.sha(after), b.fileSha256, 'TIMING_OLD_INPUT_CHANGED');
  }
  const manifest = {schemaVersion: 'digest-caption-plan-timing-diagnostic-bundle-v001', receivedHead: '482245d38e98dfd155bd5826fbeeaefde6c909b9',
    scopeBinding: report.scope, inputManifestBinding: inputBinding, displayManifestBinding: displayBinding,
    outputBinding: {path: outputPath, fileSha256: formal.sha(bytes)}, outputSizeBytes: bytes.length, summary: map.summary,
    inputAndImplementationBindings: Array.from(observed.values()), readback, oldInputsUnchanged: true,
    history: {productFixes: 6, setupFixes: 25, setup25Applied: true},
    admission: map.admission, effects: report.prohibitedEffects, unresolvedFormalInputs: ['completed background media/timeline/manifest/receipt',
      'final style/renderer/font ledger', 'formal downstream ROOT-based reader', 'video permission and human quality']};
  const manifestBytes: Buffer = formal.formal(manifest);
  await writeFile(abs(OUT + '/manifest.json'), manifestBytes, {flag: 'wx'});
  await writeFile(abs(REPORT + '/evidence.json'), formal.formal({...report, status: unmapped.length ? 'unmapped' : 'passed',
    history: manifest.history, preflight: {exports: 'passed', inputSha: 'passed', outputAbsent: true},
    outputBinding: manifest.outputBinding, manifestBinding: {path: OUT + '/manifest.json', fileSha256: formal.sha(manifestBytes)},
    inputAndImplementationBindings: manifest.inputAndImplementationBindings, readback, summary: map.summary,
    groupObservations, unmapped, oldInputsUnchanged: true, mappingMs, totalProcessWallMs: performance.now() - start,
    completedAt: new Date().toISOString(), unresolvedFormalInputs: manifest.unresolvedFormalInputs}));
  console.log(JSON.stringify({status: unmapped.length ? 'unmapped' : 'passed', summary: map.summary, manifestSha: formal.sha(manifestBytes), readback}));
  if (unmapped.length) process.exitCode = 1;
}
await main();

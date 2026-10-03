/** One expressly approved saved Digest. This is not a general storage or trust override. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, lstat, realpath, statfs, chmod, readdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readPreparedDigestCaptionJudgmentInputsV001} from './digest-caption-input-preparation-v001.js';

type Json = Record<string, any>;
const exec = promisify(execFile);
const ROOT = '/Users/kawafmm/workspace/zev2';
const PLAN = 'digest-formal-handoff-20261003-v001';
const OUT = 'runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001';
const GUEST = '/Volumes/ZEV-Digest-20261003-01';
const HOST = '/Volumes/KIOXIA';
const IMAGE = HOST + '/zev2-digest-formal-handoff-20261003-v001/digest-100GB.sparsebundle';
const MANIFEST = 'runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/manifest.json';
const MANIFEST_SHA = '04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41';
const IMPLEMENTATIONS = Object.freeze([
  'runner/src/digest-formal-handoff-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
  'evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs',
  'tools/digest-quality/original-resolution-full-supervisor-v002.py',
]);
const contexts = new WeakSet<object>();
const sourceBundles = new WeakSet<object>();
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const load = (p: string): Promise<any> => import(pathToFileURL(path.join(ROOT, p)).href);
function safe(p: string) {
  assert(typeof p === 'string' && /^[A-Za-z0-9._\-/]+$/u.test(p) && !p.startsWith('/')
    && !p.split('/').some(s => !s || s === '.' || s === '..'), 'FORMAL_PATH_INVALID');
  return p;
}
function generated(p: string) {safe(p); return p === OUT || p.startsWith(OUT + '/');}
async function absent(p: string) {
  try {await lstat(p); assert.fail('FORMAL_DESTINATION_EXISTS: ' + p);}
  catch (error: any) {if (error.code !== 'ENOENT') throw error;}
}
async function disk(root: string) {
  const script = 'import json,plistlib,subprocess,sys; print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/sbin/diskutil","info","-plist",sys.argv[1]]))))';
  return JSON.parse((await exec('/usr/bin/python3', ['-c', script, root], {maxBuffer: 200000})).stdout);
}

/** Opaque qualification, never a caller-supplied resolver or compositor. */
export async function assertQualifiedDigestStorageContextV001(context: unknown): Promise<void> {
  assert(context !== null && typeof context === 'object' && contexts.has(context), 'QUALIFIED_DIGEST_STORAGE_REQUIRED');
  await (context as Json).assertCurrent();
}

async function storage(permitPath: string, permit: Json, m: any) {
  assert.equal(permit.status, 'verified-formal-handoff-v001');
  assert.equal(permit.bindings.planId, PLAN); assert.equal(permit.bindings.logicalPrefix, OUT);
  assert.equal(permit.bindings.commandPermitPath, permitPath);
  assert.equal(permit.bindings.planManifest.fileSha256, MANIFEST_SHA);
  assert.equal(permit.bindings.planManifest.path, path.join(ROOT, MANIFEST));
  const s = permit.storage;
  assert.equal(s.guestRoot, GUEST); assert.equal(s.hostRoot, HOST); assert.equal(s.imagePath, IMAGE);
  assert.equal(s.guestVolumeUuid, '7212F3BB-32FB-4F02-A71C-E570421FF2E0');
  assert.equal(s.guestDevice, 16777243);
  assert.equal(s.hostVolumeUuid, '0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1');
  assert.equal(s.hostDevice, 16777238);
  assert.equal(s.imageMaximumBytes, 100000000000); assert.equal(s.hostMetadataReserveBytes, 6254231552);
  assert.equal(s.internalRoot, ROOT);
  assert.deepEqual(permit.implementation.map((b: Json) => path.relative(ROOT, b.path)), IMPLEMENTATIONS);
  const approvalBytes = await readFile(permit.bindings.approvalRecord.path);
  assert.equal(sha(approvalBytes), permit.bindings.approvalRecord.fileSha256);
  const approval = JSON.parse(approvalBytes.toString());
  assert.equal(approval.schemaVersion, 'digest-formal-user-manufacturing-authorization-v001');
  assert.deepEqual(approval.userApproval, {at: '2026-10-03T07:06:03Z', text: 'いいよ',
    proposalAt: '2026-10-03T06:57:06Z', sourceThreadId: '01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6'});
  assert.equal(approval.planManifestSha256, MANIFEST_SHA); assert.equal(approval.planId, PLAN);
  assert.equal(approval.outputRoot, OUT); assert.deepEqual(approval.implementationPaths, IMPLEMENTATIONS);
  assert.deepEqual(approval.storage, s); assert.equal(approval.normalCandidates, 1);
  assert.equal(approval.humanQuality, 'pending'); assert.equal(approval.outlineChoice, null);
  assert.deepEqual(approval.guard, {startBytes: 50000000000, reserveBytes: 12000000000,
    maximumRssBytes: 17179869184, maximumPressure: 1, observationIntervalSeconds: 1,
    nextUnitPlusReserve: true, stopOwnProcessGroup: true, restartOnReconnect: false});
  assert.equal(process.version, 'v20.19.6', 'FORMAL_NODE_VERSION_REQUIRED');
  assert.equal(process.execPath, '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(approval.acceptedMain, 'f2ef22148e7e81d7057a3907f21cc3dbe256742b');
  assert.equal(process.env.ZEV_FULL_SUPERVISED, '1', 'SUPERVISOR_REQUIRED');
  assert.equal((await exec('git', ['rev-parse', 'HEAD'], {cwd: ROOT})).stdout.trim(), permit.bindings.implementationSha);
  assert.equal((await exec('git', ['status', '--porcelain=v1'], {cwd: ROOT})).stdout, '', 'CLEAN_IMPLEMENTATION_REQUIRED');
  for (const binding of permit.implementation) assert.equal(await m.fileSha(binding.path), binding.fileSha256);
  const imageStat = await lstat(IMAGE), imageInfo = await readFile(IMAGE + '/Info.plist');
  assert(imageStat.isDirectory() && !imageStat.isSymbolicLink());
  assert.equal(await realpath(IMAGE), IMAGE);
  const plist = JSON.parse((await exec('/usr/bin/python3', ['-c',
    'import plistlib,json,sys;print(json.dumps(plistlib.load(open(sys.argv[1],"rb"))))', IMAGE + '/Info.plist'])).stdout);
  assert.equal(plist.size, 99999547392);
  const identity = {ino: imageStat.ino, dev: imageStat.dev, infoSha: sha(imageInfo)};
  const permitSha = sha(await readFile(permitPath));
  let lastCheck = 0, resourceId = 0;
  async function current(force = false) {
    if (!force && Date.now() - lastCheck < 900) return;
    assert.equal(sha(await readFile(permitPath)), permitSha, 'PERMIT_CHANGED');
    assert.equal(sha(await readFile(permit.bindings.approvalRecord.path)), permit.bindings.approvalRecord.fileSha256, 'AUTHORIZATION_CHANGED');
    assert.equal((await exec('git', ['rev-parse', 'HEAD'], {cwd: ROOT})).stdout.trim(), permit.bindings.implementationSha);
    assert.equal((await exec('git', ['status', '--porcelain=v1'], {cwd: ROOT})).stdout, '', 'IMPLEMENTATION_CHANGED');
    for (const binding of permit.implementation) assert.equal(await m.fileSha(binding.path), binding.fileSha256);
    const [g, h, is] = await Promise.all([disk(GUEST), disk(HOST), lstat(IMAGE)]);
    assert.equal(g.VolumeUUID, s.guestVolumeUuid); assert.equal(g.DeviceNode, '/dev/disk6s1');
    assert.equal(g.FilesystemType, 'apfs'); assert.equal(g.GlobalPermissionsEnabled, true);
    assert.equal(g.WritableVolume, true); assert.equal(h.VolumeUUID, s.hostVolumeUuid);
    assert.equal(h.DeviceNode, '/dev/disk4s2'); assert.equal(h.FilesystemType, 'exfat');
    assert.equal((await lstat(GUEST)).dev, 16777243); assert.equal((await lstat(HOST)).dev, 16777238);
    assert.equal(is.ino, identity.ino); assert.equal(is.dev, identity.dev); assert(!is.isSymbolicLink());
    assert.equal(await realpath(GUEST), GUEST); assert.equal(await realpath(HOST), HOST);
    assert.equal(await realpath(IMAGE), IMAGE); assert.equal(sha(await readFile(IMAGE + '/Info.plist')), identity.infoSha);
    const [gf, internal] = await Promise.all([statfs(GUEST), statfs(ROOT)]);
    assert(gf.bavail * gf.bsize >= 12000000000, 'GUEST_RESERVE_EXHAUSTED');
    assert(internal.bavail * internal.bsize >= 12000000000, 'INTERNAL_OS_RESERVE_EXHAUSTED');
    lastCheck = Date.now();
  }
  await current(true);
  const generatedRoot = path.join(GUEST, OUT), tempDirectory = generatedRoot + '/temp';
  const resolve = (p: string) => path.join(generated(p) ? GUEST : ROOT, p);
  async function readJson(p: string) {
    await current(); const root = generated(p) ? GUEST : ROOT;
    const stable = await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    return JSON.parse((await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: root, relativePath: p})).toString());
  }
  async function readBound(binding: Json) {
    const value = await readJson(binding.path);
    assert.deepEqual(m.bind(binding.path, value), binding, 'FORMAL_BOUND_BYTES_MISMATCH'); return value;
  }
  async function publish(p: string, value: Json) {
    assert(generated(p) && p !== OUT, 'FORMAL_GENERATED_PREFIX_REQUIRED'); await current(true);
    const target = resolve(p), parent = path.dirname(target);
    await mkdir(parent, {recursive: true}); assert.equal(await realpath(parent), parent);
    const bytes: Buffer = m.formal(value); await writeFile(target, bytes, {flag: 'wx'});
    await chmod(target, 0o444); const observed = await readJson(p);
    assert.deepEqual(m.formal(observed), bytes); return m.bind(p, value);
  }
  async function resourceCheck({stage, newBytes}: {stage: string; newBytes: number}) {
    await current(true); assert(Number.isSafeInteger(newBytes) && newBytes >= 0);
    const f = await statfs(GUEST); assert(f.bavail * f.bsize >= newBytes + 12000000000, 'NEXT_UNIT_RESERVE');
    // Supervisor performs the independent host/image/RSS/pressure check and replies.
    const id = ++resourceId;
    process.stdout.write('@@RESOURCE_CHECK ' + JSON.stringify({id, stage, newBytes}) + '\n');
    const reply: string = await new Promise((accept, reject) => {
      const timer = setTimeout(() => {process.stdin.off('data', got); reject(Error('SUPERVISOR_REPLY_TIMEOUT'));}, 10000);
      let buffer = '';
      const got = (chunk: Buffer) => {buffer += chunk.toString(); if (!buffer.includes('\n')) return;
        clearTimeout(timer); process.stdin.off('data', got); process.stdin.pause(); accept(buffer.trim());};
      process.stdin.on('data', got);
    });
    const response = JSON.parse(reply); assert.equal(response.id, id, 'SUPERVISOR_REPLY_ID_MISMATCH');
    assert(response.sample && response.sample.guest && response.sample.host, 'SUPERVISOR_REPLY_INVALID');
  }
  const context = Object.freeze({outputRoot: OUT, storageRoot: GUEST, generatedRoot, tempDirectory,
    resolve, assertCurrent: current, publish, readBound, readJson, resourceCheck,
    composeMedia: async (args: Json) => {
      await current(true); assert.equal(args.expectedFrameCount, 27691);
      assert(args.outputPath.startsWith(generatedRoot + '/'));
      const composite = await load('tools/digest-quality/original-resolution-low-memory-composite.mjs');
      const evidence = await composite.runFormalLowMemoryCompositeV001({baseMediaPath: args.baseMediaPath,
        plan: args.plan, overlayRecords: args.overlayRecords, expectedFrameCount: args.expectedFrameCount,
        outputPath: args.outputPath, ffmpegPath: args.ffmpegPath, processObserver: args.processObserver, resourceCheck});
      await publish(OUT + '/low-memory-composite.json', evidence);
      return evidence;
    }});
  contexts.add(context); return {context, approval};
}

type DigestHandoffInputJsonV001 = Record<string, any>;
export type DigestFormalHandoffInputsV001 = {
  workspaceRoot: string;
  manifestBinding: DigestHandoffInputJsonV001;
  preparationManifestBinding: DigestHandoffInputJsonV001;
  manifest: DigestHandoffInputJsonV001;
  preparation: DigestHandoffInputJsonV001;
  meaning: DigestHandoffInputJsonV001;
  requests: DigestHandoffInputJsonV001[];
  responses: DigestHandoffInputJsonV001[];
  results: DigestHandoffInputJsonV001[];
  traces: DigestHandoffInputJsonV001[];
  correspondence: DigestHandoffInputJsonV001;
  cueTimeMap: DigestHandoffInputJsonV001;
  normalState: DigestHandoffInputJsonV001;
  normalPlan: DigestHandoffInputJsonV001;
  normalExecution: DigestHandoffInputJsonV001;
  consumption: DigestHandoffInputJsonV001;
  machineAdoption: DigestHandoffInputJsonV001;
  editPlan: DigestHandoffInputJsonV001;
  manufacturingValues: DigestHandoffInputJsonV001;
  originalClock: DigestHandoffInputJsonV001;
  savedInspection: DigestHandoffInputJsonV001;
  styleTemplate: DigestHandoffInputJsonV001;
  sourceMediaPhysicalBinding: DigestHandoffInputJsonV001;
  // Aggregate view only: original nine input caption IDs and requests remain unchanged.
  aggregateView: DigestHandoffInputJsonV001;
};

const DIGEST_HANDOFF_MANIFEST_BINDING_V001 = Object.freeze({
  path: 'runtime/artifacts/digest-caption-144px-reflow-20261003-v001/attempt-001/manifest.json',
  fileSha256: '04ad8b3f019d6afed4038f376e101d15e155cc7822a2527b46fcfbd5b5041e41',
});
const DIGEST_HANDOFF_PREPARATION_BINDING_V001 = Object.freeze({
  path: 'runtime/artifacts/digest-caption-input-preparation-20261003-v001/attempt-002/bundle/manifest.json',
  fileSha256: '83052a914317ae8b5a056ff641635ff061ebf59830df68a8090d180f2f0cfb75',
});

/** Qualifies the saved normal owners, unchanged meaning/clock, and actual nine response tokens. */
export async function readDigestFormalHandoffInputsV001(workspaceRoot: string = ROOT): Promise<Json> {
  const root = await realpath(workspaceRoot);
  assert.equal(root, await realpath('/Users/kawafmm/workspace/zev2'), 'DIGEST_HANDOFF_INPUT_ROOT_INVALID');
  const load = (p: string) => import(pathToFileURL(path.join(root, p)).href);
  const [wire, stable, display] = await Promise.all([
    load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'),
    load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'),
    load('evals/clip_composition/adopted_media_manufacturing_v001.mts'),
  ]);
  const read = async (b: DigestHandoffInputJsonV001): Promise<DigestHandoffInputJsonV001> => {
    assert(typeof b.path === 'string' && b.path.endsWith('.json')
      && /^[0-9a-f]{64}$/u.test(b.fileSha256), 'DIGEST_HANDOFF_JSON_BINDING_INVALID');
    const bytes: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: root, relativePath: b.path});
    assert.equal(wire.sha(bytes), b.fileSha256, 'DIGEST_HANDOFF_INPUT_SHA_CHANGED');
    if (b.sizeBytes !== undefined) assert.equal(bytes.length, b.sizeBytes, 'DIGEST_HANDOFF_INPUT_SIZE_CHANGED');
    const value = JSON.parse(bytes.toString('utf8'));
    assert(value && typeof value === 'object' && !Array.isArray(value), 'DIGEST_HANDOFF_INPUT_OBJECT_INVALID');
    if (b.schemaVersion !== undefined) assert.equal(value.schemaVersion, b.schemaVersion, 'DIGEST_HANDOFF_INPUT_SCHEMA_CHANGED');
    if (b.canonicalSha256 !== undefined) assert.equal(wire.canonicalSha(value), b.canonicalSha256, 'DIGEST_HANDOFF_INPUT_CANONICAL_SHA_CHANGED');
    // The saved normal store state has its own serializer; its exact binding is checked above.
    return value;
  };
  const manifest = await read(DIGEST_HANDOFF_MANIFEST_BINDING_V001);
  const preparation = await read(DIGEST_HANDOFF_PREPARATION_BINDING_V001);
  assert.equal(manifest.schemaVersion, 'digest-caption-144px-reflow-candidate-bundle-v001');
  const qualified = await readPreparedDigestCaptionJudgmentInputsV001({workspaceRoot: root,
    sourceRuntimeRoot: path.dirname(path.join(root, preparation.stateBinding.path)),
    outputRoot: path.dirname(path.join(root, DIGEST_HANDOFF_PREPARATION_BINDING_V001.path)),
    preparationId: preparation.preparationId, stateBinding: preparation.stateBinding,
    scopeBinding: preparation.scopeBinding, styleTemplateBinding: preparation.styleTemplateBinding,
    expected: preparation.expected}, DIGEST_HANDOFF_PREPARATION_BINDING_V001);
  assert.deepEqual(qualified.manifest, preparation);
  const meaning: Json = await read(manifest.meaningBinding);
  assert.deepEqual(meaning, qualified.meaning, 'DIGEST_HANDOFF_MEANING_CHANGED');
  const groups = meaning.orderedCandidates as DigestHandoffInputJsonV001[];
  const atoms = meaning.atomOccurrences as DigestHandoffInputJsonV001[];
  assert.equal(groups.length, 9); assert.equal(qualified.requests.length, 9); assert.equal(atoms.length, 3613);
  const atomById = new Map<string, DigestHandoffInputJsonV001>(atoms.map(a => [a.atomOccurrenceId, a]));
  assert.equal(atomById.size, atoms.length);
  assert.deepEqual(groups.flatMap(g => g.atomOccurrenceIds), atoms.map(a => a.atomOccurrenceId));
  assert.equal((meaning.captions as Json[]).length, 1);
  assert.deepEqual((meaning.captions as Json[])[0].atomOccurrenceIds, atoms.map(a => a.atomOccurrenceId));

  const cueTimeMap = await read(manifest.mapBinding);
  assert.deepEqual(cueTimeMap.inputManifestBinding, DIGEST_HANDOFF_PREPARATION_BINDING_V001);
  assert.equal(cueTimeMap.status, 'mapped-plan-correspondence');
  const physical = (binding: DigestHandoffInputJsonV001) => {
    const matches = preparation.logicalToPhysical.filter((b: DigestHandoffInputJsonV001) => b.path === binding.path);
    assert.equal(matches.length, 1, 'DIGEST_HANDOFF_PHYSICAL_REFERENCE_UNRESOLVED');
    const found = matches[0]; assert.equal(found.fileSha256, binding.fileSha256, 'DIGEST_HANDOFF_PHYSICAL_SHA_CHANGED');
    return {...binding, path: found.physicalPath, bytesVerified: found.bytesVerified};
  };
  const readLogical = async (binding: DigestHandoffInputJsonV001) => {
    const b = physical(binding); assert.equal(b.bytesVerified, true, 'DIGEST_HANDOFF_JSON_REFERENCE_UNVERIFIED');
    return read(b);
  };
  const byExpectedSha = (sha: string) => {
    const matches = preparation.inputReferences.filter((b: DigestHandoffInputJsonV001) => b.fileSha256 === sha);
    assert.equal(matches.length, 1, 'DIGEST_HANDOFF_NORMAL_REFERENCE_UNRESOLVED'); return matches[0];
  };
  const normalState = await read(preparation.stateBinding);
  const normalPlan = await read(byExpectedSha(preparation.expected.planSha256));
  const normalExecution = await read(byExpectedSha(preparation.expected.executionSha256));
  const consumption = await readLogical(normalExecution.consumptionBinding);
  const machineAdoption = await readLogical(consumption.outputs['machine-adoption.json']);
  const editPlan = await readLogical(normalExecution.editPlanBinding);
  const manufacturingValues = await readLogical(normalExecution.manufacturingInputBinding);
  const originalClock = await readLogical(normalExecution.clockResolutionBinding);
  const savedInspection = await readLogical(normalExecution.sourceInspectionBinding);
  const styleTemplate = await read(preparation.styleTemplateBinding);
  assert.deepEqual(cueTimeMap.originalClockBinding, normalExecution.clockResolutionBinding);
  assert.deepEqual(preparation.originalClockBinding, normalExecution.clockResolutionBinding);
  assert.deepEqual(cueTimeMap.inspectionBinding, normalExecution.sourceInspectionBinding);
  assert.deepEqual(cueTimeMap.originalMappings, originalClock.mappings, 'DIGEST_HANDOFF_CLOCK_CHANGED');
  assert.equal(originalClock.status, 'passed'); assert.equal(originalClock.mappings.length, 9);
  assert.equal(originalClock.mappings.at(-1).outputEndFrame, 27691);
  assert.equal(originalClock.mappings.at(-1).audioSamples.outputEnd, 40705770);
  assert.equal(savedInspection.media.source.video.frameRate, cueTimeMap.sourceFrameClock.inputFrameRate);
  assert.equal(savedInspection.media.decodedFrameCount, cueTimeMap.sourceFrameClock.decodedFrameCount);
  assert.equal(savedInspection.media.source.video.presentationOffsetMs, cueTimeMap.sourceFrameClock.videoPresentationOffsetMs);
  assert.deepEqual(manufacturingValues.assemblyDecision,
    {path: consumption.outputs['machine-adoption.json'].path, fileSha256: consumption.outputs['machine-adoption.json'].fileSha256});
  const sourceMediaPhysicalBinding = physical(normalPlan.sourceVideoBinding); // Metadata only; never opened.
  assert.equal(sourceMediaPhysicalBinding.bytesVerified, false);

  const requests: DigestHandoffInputJsonV001[] = [], responses: DigestHandoffInputJsonV001[] = [], results: DigestHandoffInputJsonV001[] = [];
  const tokens: object[] = [], groupedRows: DigestHandoffInputJsonV001[] = [], groupedChanges: DigestHandoffInputJsonV001[] = [];
  const receipts = manifest.responses as DigestHandoffInputJsonV001[];
  assert.equal(receipts.length, 9);
  for (const [i, receipt] of receipts.entries()) {
    assert.equal(receipt.ordinal, i + 1);
    const oldRequest = qualified.requests[i] as DigestHandoffInputJsonV001;
    const oldOutput = preparation.outputs.find((b: DigestHandoffInputJsonV001) => b.fileName === `display-request-${String(i + 1).padStart(4, '0')}.json`);
    assert(oldOutput); assert.deepEqual(receipt.oldRequestBinding, {path: oldOutput.path, fileSha256: oldOutput.fileSha256});
    const request = await read(receipt.requestBinding), response = await read(receipt.responseBinding), result = await read(receipt.resultBinding);
    assert.equal(request.requestId, `digest-caption-144px-reflow-20261003-v001-display-${i + 1}`);
    assert.equal(request.input.styleLimits.maxLogicalWidthPerLine, 26); assert.equal(request.input.styleLimits.maxLinesPerCue, 2);
    assert.equal(request.inputCanonicalSha256, wire.canonicalSha(request.input));
    const restored = structuredClone(request); restored.requestId = oldRequest.requestId;
    restored.input.styleLimits.maxLogicalWidthPerLine = 36; restored.inputCanonicalSha256 = oldRequest.inputCanonicalSha256;
    assert.deepEqual(restored, oldRequest, 'DIGEST_HANDOFF_REQUEST_SCOPE_CHANGED');
    const group = groups[i]; assert(group);
    assert.equal(request.candidateId, group.candidateId); assert.equal(request.timelineSegmentId, group.timelineSegmentId);
    const token = display.validateDisplayForAdoptionV001(request, response, result, 'digest-caption-judgment-display-response-v001');
    const trace = display.readValidatedDisplayTracesV001([request], [token]);
    assert.deepEqual(await read(receipt.traceBinding), {schemaVersion: 'digest-caption-144px-reflow-trace-v001', traces: trace});
    const perGroup = await read(receipt.correspondenceBinding), rows = perGroup.rows as DigestHandoffInputJsonV001[];
    assert.equal(perGroup.schemaVersion, 'digest-caption-144px-reflow-correspondence-v001');
    assert.equal(rows.length, receipt.cueCount); assert.equal(rows.length, trace[0].cues.length);
    assert.equal(rows.reduce((n, row) => n + row.lines.length, 0), receipt.lineCount);
    assert.equal(rows.reduce((n, row) => n + row.atomOccurrenceIds.length, 0), receipt.atomCount);
    assert.deepEqual(rows.flatMap(row => row.atomOccurrenceIds), group.atomOccurrenceIds, 'DIGEST_HANDOFF_ATOM_COVERAGE_CHANGED');
    const cap = request.input.captions[0], boundaries = cap.boundaryCandidates as DigestHandoffInputJsonV001[];
    const indices = new Map<string, number>(boundaries.map((b, j) => [b.boundaryId, j]));
    const mapping = originalClock.mappings[i]; assert.equal(mapping.segmentId, group.timelineSegmentId);
    let previousEnd = -1, previousFrameEnd = mapping.outputStartFrame;
    for (const [j, row] of rows.entries()) {
      const cue = trace[0].cues[j], end = indices.get(cue.cueEndBoundaryId); assert(end !== undefined);
      assert.equal(row.groupOrdinal, i + 1); assert.equal(row.cueOrdinal, j + 1);
      assert.equal(row.candidateId, group.candidateId); assert.equal(row.timelineSegmentId, group.timelineSegmentId);
      assert.equal(row.captionId, cap.captionId); assert.equal(row.cueEndBoundaryId, cue.cueEndBoundaryId);
      assert.deepEqual(row.lineEndBoundaryIds, cue.lineEndBoundaryIds);
      const expectedAtomIds = group.atomOccurrenceIds.slice(previousEnd + 1, end + 1);
      assert.deepEqual(row.atomOccurrenceIds, expectedAtomIds);
      const rowAtoms = expectedAtomIds.map((id: string) => {const a = atomById.get(id); assert(a); return a;});
      assert.deepEqual(row.sourceSegmentIds, rowAtoms.map((a: DigestHandoffInputJsonV001) => a.sourceSegmentId));
      assert.deepEqual(row.semanticUtteranceIds, [...new Set(rowAtoms.map((a: DigestHandoffInputJsonV001) => a.semanticUtteranceId))]);
      let previousLine = previousEnd;
      const expectedLines = cue.lineEndBoundaryIds.map((id: string) => {
        const lineEnd = indices.get(id); assert(lineEnd !== undefined);
        const lineAtoms = group.atomOccurrenceIds.slice(previousLine + 1, lineEnd + 1);
        const line = {lineEndBoundaryId: id, text: boundaries.slice(previousLine + 1, lineEnd + 1).map(b => b.text).join(''),
          atomOccurrenceIds: lineAtoms, sourceSegmentIds: lineAtoms.map((aid: string) => {const a = atomById.get(aid); assert(a); return a.sourceSegmentId;})};
        previousLine = lineEnd; return line;
      });
      assert.deepEqual(row.lines, expectedLines); assert.equal(previousLine, end);
      const firstSpan = rowAtoms[0].retainedSpans[0], lastSpan = rowAtoms.at(-1)!.retainedSpans[0];
      assert.equal(row.sourceStartMs, firstSpan.sourceStartMs); assert.equal(row.sourceEndMs, lastSpan.sourceEndMs);
      assert.equal(row.startFrame, mapping.outputStartFrame + row.sourceStartFrame30 - mapping.sourceStartFrame30);
      assert.equal(row.endFrameExclusive, mapping.outputStartFrame + row.sourceEndFrame30 - mapping.sourceStartFrame30);
      assert.equal(row.displayFrameCount, row.endFrameExclusive - row.startFrame);
      assert(Number.isSafeInteger(row.startFrame) && Number.isSafeInteger(row.endFrameExclusive)
        && row.startFrame >= previousFrameEnd && row.endFrameExclusive > row.startFrame
        && row.endFrameExclusive <= mapping.outputEndFrame, 'DIGEST_HANDOFF_CUE_CLOCK_CHANGED');
      previousEnd = end; previousFrameEnd = row.endFrameExclusive;
    }
    const oldRows = cueTimeMap.cues.filter((row: DigestHandoffInputJsonV001) => row.groupOrdinal === i + 1);
    assert.equal(perGroup.changes.length, oldRows.length);
    for (const [j, change] of perGroup.changes.entries()) {
      const old = oldRows[j], children = rows.filter(row => row.oldCueOrdinal === old.cueOrdinal);
      assert(children.length > 0 && children.length <= 2);
      assert.equal(change.oldCueOrdinal, old.cueOrdinal); assert.equal(change.timelineSegmentId, old.timelineSegmentId);
      assert.deepEqual(change.oldRequestBinding, old.requestBinding); assert.equal(change.oldCueEndBoundaryId, old.cueEndBoundaryId);
      assert.deepEqual(change.oldAtomOccurrenceIds, old.atomOccurrenceIds); assert.deepEqual(change.oldLineEndBoundaryIds, old.lineEndBoundaryIds);
      assert.deepEqual(change.newCueOrdinals, children.map(row => row.cueOrdinal));
      assert.deepEqual(change.newLineEndBoundaryIds, children.map(row => row.lineEndBoundaryIds)); assert.equal(change.outerFrameUnchanged, true);
      assert.deepEqual(children.flatMap(row => row.atomOccurrenceIds), old.atomOccurrenceIds);
      assert.equal(children[0].startFrame, old.startFrame); assert.equal(children.at(-1)!.endFrameExclusive, old.endFrameExclusive);
      assert.equal(children.at(-1)!.cueEndBoundaryId, old.cueEndBoundaryId);
      if (change.fixed) {
        assert.equal(children.length, 1);
        for (const key of ['cueEndBoundaryId', 'lineEndBoundaryIds', 'atomOccurrenceIds', 'sourceSegmentIds', 'semanticUtteranceIds', 'lines',
          'sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'startFrame', 'endFrameExclusive', 'displayFrameCount'])
          assert.deepEqual(children[0][key], old[key], 'DIGEST_HANDOFF_FIXED_CUE_CHANGED');
      }
    }
    requests.push(request); responses.push(response); results.push(result); tokens.push(token);
    groupedRows.push(...rows); groupedChanges.push(...perGroup.changes);
  }
  const traces = display.readValidatedDisplayTracesV001(requests, tokens);
  assert.deepEqual(await read(manifest.tracesBinding), {schemaVersion: 'digest-caption-144px-reflow-traces-v001', traces});
  const correspondence = await read(manifest.correspondenceBinding);
  assert.deepEqual(correspondence, {schemaVersion: 'digest-caption-144px-reflow-correspondence-v001', rows: groupedRows, changes: groupedChanges});
  assert.equal(groupedRows.length, 243); assert.equal(groupedRows.reduce((n, row) => n + row.lines.length, 0), 390);
  assert.deepEqual(groupedRows.flatMap(row => row.atomOccurrenceIds), atoms.map(a => a.atomOccurrenceId));
  assert.equal(groupedChanges.length, 218); assert.equal(groupedChanges.filter(c => c.fixed).length, 120);
  assert.equal(manifest.summary.groups, 9); assert.equal(manifest.summary.newCues, 243);
  assert.equal(manifest.summary.newLines, 390); assert.equal(manifest.summary.atoms, 3613);
  assert.deepEqual(manifest.summary.originalClockSummary, cueTimeMap.summary);
  assert.deepEqual(manifest.newStyleLimits, requests[0].input.styleLimits);
  const boundaryCandidates = requests.flatMap(r => r.input.captions[0].boundaryCandidates);
  assert.equal(boundaryCandidates.length, 3613); assert.equal(new Set(boundaryCandidates.map(b => b.boundaryId)).size, 3613);
  const aggregateView = {caseId: 'digest-formal-handoff-20261003-v001',
    inputCaptionId: 'digest-caption-input-preparation-20261003-v001-input-caption',
    semanticCaptionId: (meaning.captions as Json[])[0].captionId, boundaryCandidates,
    atomOccurrenceIds: atoms.map(a => a.atomOccurrenceId),
    boundaries: boundaryCandidates.map((b, i) => ({boundaryId: b.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId})),
    styleLimits: structuredClone(manifest.newStyleLimits), taskDescription: requests[0].input.taskDescription};
  const rendererTemplate = await wire.readBound({schemaVersion: "presentation-instruction-renderer-job-v002",
    path: "evals/clip_composition/outputs/presentation/distant-connection-existing-caption-selection/candidate-doctor-disappearance-to-ogre-mother-v001/renderer-template-v002.json",
    fileSha256: "cfdb4c6e18e47cde8ea9fe2302d35993a7795ad804586adc36ff601c8ddfca5e",
    canonicalSha256: "3b72513981982691439d1dcc2d7cb3f200c4ce04663316edcef35bf260185703"});
  const handoff = await read({path: "docs/reports/digest-formal-handoff-plan-20261003/handoff-plan.json",
    fileSha256: "e1a0f112f1961164abf616a98f49445c1bb1d0474a0ee3a85fc3ad07fd03423b"});
  const output = {rendererTemplate, handoff, workspaceRoot: root, manifestBinding: {...DIGEST_HANDOFF_MANIFEST_BINDING_V001},
    preparationManifestBinding: {...DIGEST_HANDOFF_PREPARATION_BINDING_V001}, manifest, preparation, meaning, requests, responses, results,
    traces, correspondence, cueTimeMap, normalState, normalPlan, normalExecution, consumption, machineAdoption, editPlan,
    manufacturingValues, originalClock, savedInspection, styleTemplate, sourceMediaPhysicalBinding, aggregateView, adoption: machineAdoption, edit: editPlan, manufacturing: manufacturingValues,
    clock: originalClock, inspection: savedInspection, sourcePhysicalPath: sourceMediaPhysicalBinding.path};
  function freeze(v: any) {if (v !== null && typeof v === "object" && !Object.isFrozen(v)) {Object.values(v).forEach(freeze);Object.freeze(v);}}
  freeze(output); sourceBundles.add(output); return output;
}


async function candidateStyle(context: Json, inputs: Json, m: any) {
  const old = inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings;
  const registry = await m.readBound(old.presetRegistry), baseline = await m.readBound(old.rendererTrust);
  assert.equal(m.canonicalSha(baseline), '9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2');
  const preset = structuredClone(registry);
  const profile = preset.presets.find((p: Json) => p.presetId === 'normal-landscape-readable-pop-v001');
  assert(profile); profile.maxLogicalWidth = 26; profile.maxLines = 2;
  const at = profile.visualStates.findIndex((v: Json) => v.stateId === 'caption-core-v001'); assert(at >= 0);
  profile.visualStates[at] = structuredClone(inputs.manifest.technicalCandidate.props.visualState);
  preset.canvas = structuredClone(inputs.manifest.technicalCandidate.props.canvas);
  assert.deepEqual(profile.visualStates[at].textStyle, {fontAssetId: 'line-seed-jp-extra-bold-v001', fontSizePx: 144,
    fontColor: '#FFFDF8', borderColor: '#2F4F4F', borderWidthPx: 8, lineSpacingPercent: 150,
    glowColor: '#2F4F4F', glowWidthPx: 4, glowOpacityPercent: 82});
  const root = OUT + '/candidate-style/';
  const registryBinding = await context.publish(root + 'preset-registry.json', preset);
  const validationBytes = await readFile(path.join(ROOT, safe(old.presetValidationIndex.path)));
  assert.equal(sha(validationBytes), old.presetValidationIndex.fileSha256);
  const validationValue = JSON.parse(validationBytes.toString());
  assert.equal(m.canonicalSha(validationValue), old.presetValidationIndex.canonicalSha256);
  const validation = await context.publish(root + 'preset-validation-index.json', {...validationValue,
    schemaVersion: validationValue.schemaVersion ?? validationValue.registryVersion});
  const registryTrust = await m.readBound(old.trustedRegistryBindings);
  registryTrust.presetValidationIndexSha256 = validation.canonicalSha256;
  const registryTrustBinding = await context.publish(root + 'trusted-registry-bindings.json', registryTrust);
  const trust = await m.readBound(inputs.rendererTemplate.registryBindings.rendererTrust);
  assert.deepEqual(trust.layoutRules, baseline.layoutRules, 'NO_GENERAL_LAYOUT_RULE_CHANGE');
  trust.presetRegistry = {registryVersion: preset.registryVersion, path: registryBinding.path,
    fileSha256: registryBinding.fileSha256, canonicalSha256: registryBinding.canonicalSha256};
  trust.registryBinding = registryTrustBinding;
  // These are dependencies of the unchanged renderer, not arbitrary candidate code.
  const dependencyDelta = [];
  for (const b of trust.rendererDependencies) {
    // Candidate-only bindings use bytes of the already accepted main. A changed
    // dependency outside the six authorized implementations is never admitted.
    const accepted = (await exec('git', ['show', 'f2ef22148e7e81d7057a3907f21cc3dbe256742b:' + safe(b.path)],
      {cwd: ROOT, encoding: 'buffer', maxBuffer: 4000000})).stdout as Buffer;
    const actual = await m.fileSha(path.join(ROOT, b.path)); assert.equal(actual, sha(accepted));
    dependencyDelta.push({path: b.path, historicalTrustSha256: b.fileSha256, acceptedMainSha256: actual});
    b.fileSha256 = actual;
  }
  for (const b of trust.fontAssets) assert.equal(await m.fileSha(path.join(ROOT, safe(b.path))), b.fileSha256);
  await context.publish(OUT + '/candidate-style-delta.json', {schemaVersion: 'digest-formal-candidate-style-delta-v001',
    baselineTrustBinding: old.rendererTrust, acceptedMain: 'f2ef22148e7e81d7057a3907f21cc3dbe256742b',
    dependencyDelta, profileWidth: 26, visualCapabilityWidth: 36, layoutRulesChanged: false,
    technicalCandidatePropsBinding: inputs.manifest.technicalCandidate.source, humanQuality: 'pending'});
  const trustBinding = await context.publish(root + 'trust.json', trust);
  const bindings = {trustedRegistryBindings: registryTrustBinding, presetRegistry: registryBinding,
    presetValidationIndex: validation, materialValidationIndex: old.materialValidationIndex, rendererTrust: trustBinding};
  const rendererTemplate = structuredClone(inputs.rendererTemplate);
  rendererTemplate.registryBindings.styleProfileRegistry = registryBinding;
  rendererTemplate.registryBindings.rendererTrust = trustBinding;
  rendererTemplate.registryBindings.fontLedger = {...trustBinding, jsonPointer: '/fontAssets', valueCanonicalSha256: m.canonicalSha(trust.fontAssets)};
  for (const b of rendererTemplate.rendererImplementationBindings) b.fileSha256 = await m.fileSha(path.join(ROOT, safe(b.path)));
  return {bindings, rendererTemplate, baselineBindings: old};
}

export async function prepareDigestFormalCandidateCoreV001(inputs: Json, c: Json, base: Json, style: Json, context: Json) {
  assert(sourceBundles.has(inputs), 'QUALIFIED_SAVED_INPUTS_REQUIRED');
  await assertQualifiedDigestStorageContextV001(context);
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const core = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const meaning = inputs.meaning, atoms = meaning.atomOccurrences;
  const boundaries = inputs.requests.flatMap((r: Json) => r.input.captions[0].boundaryCandidates);
  assert.equal(boundaries.length, 3613); assert.equal(atoms.length, boundaries.length);
  const inputCaptionId = 'digest-caption-input-preparation-20261003-v001-input-caption';
  const sourcePackage = structuredClone(inputs.styleTemplate);
  sourcePackage.packageId = PLAN + '-source-package';
  sourcePackage.promptInput = {...structuredClone(inputs.requests[0].input), captions: [{captionId: inputCaptionId, boundaryCandidates: boundaries}]};
  const meaningBinding = m.bind(OUT + '/meaning-input.json', meaning);
  const cc = structuredClone(sourcePackage.reconstructionMap.caseContexts[0]);
  cc.caseId = PLAN; cc.inputCaptionId = inputCaptionId; cc.meaningPackageBinding = meaningBinding; cc.baseMediaInput = base;
  cc.styleBindings = style.bindings; cc.horizontalStyleInput.presetBinding = {...style.bindings, presetId: cc.resolvedStyle.presetId};
  cc.horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine = 26; cc.resolvedStyle.maxLogicalWidthPerLine = 26;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding],
    captions: [{captionId: inputCaptionId, meaningPackageOrdinal: 1, semanticCaptionId: (meaning.captions as Json[])[0].captionId,
      atomOccurrenceIds: atoms.map((a: Json) => a.atomOccurrenceId), boundaries: boundaries.map((b: Json, i: number) => {
        assert.equal(b.text, atoms[i].text); return {boundaryId: b.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId};
      })}], caseContexts: [cc]};
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: c.plan.implementationBindings.map((b: Json, i: number) => ({role: 'formal-handoff-' + (i + 1), ...b})),
    approvedContractBindings: [c.plan.authorization]};
  const validator = await load('evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs');
  m.pass(validator.validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage), 'SAVED_SOURCE_PACKAGE_INVALID');
  const adoption = {schemaVersion: 'digest-formal-caption-adoption-v001', artifactId: PLAN + '-caption-adoption',
    acceptedManifestBinding: inputs.manifestBinding, originalMeaningBinding: inputs.manifest.meaningBinding,
    authorizationBinding: c.plan.authorization, originalRequests: inputs.manifest.responses, traces: inputs.traces,
    aggregateViewOnly: true, judgmentCount: 0, humanQuality: 'pending', outlineChoice: null};
  return core.assembleAdoptedCaptionCoreV001(c, {meaning, sourcePackage}, base, adoption, inputs.traces, context);
}

/** Cheap formal references/runtime/font/estimated layout checks. No media copy or decision. */
export async function inspectDigestFormalPreflightV001(inputs: Json) {
  assert(sourceBundles.has(inputs));
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const base = await load('evals/clip_composition/presentation_base_media_build_v003.mjs');
  const timeline = await load('evals/clip_composition/presentation_base_media_timeline_v004.mjs');
  assert.deepEqual(await base.inspectPresentationBaseMediaToolProfileV001(), base.PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE);
  for (const binding of timeline.PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES) assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256);
  const caller = await load('evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  await caller.observePresentationRendererRuntimeBindingsV001(inputs.rendererTemplate.runtimeBindings);
  const trust = await m.readBound(inputs.rendererTemplate.registryBindings.rendererTrust);
  for (const binding of trust.fontAssets) assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256);
  const entry = await load('evals/clip_composition/presentation_renderer_entry_v001.tsx');
  const inspector = await load('evals/clip_composition/inspect_presentation_render_layout_v001.ts');
  const indexer = await load('evals/clip_composition/presentation_renderer_text_layout_v001.mjs');
  for (const row of inputs.correspondence.rows) {
    const indexed = indexer.indexExplicitLinesV001(row.lines.map((line: Json) => line.text));
    assert.equal(indexed.status, 'passed');
    const props = {...structuredClone(inputs.manifest.technicalCandidate.props), layoutRules: trust.layoutRules,
      instructionId: PLAN + '-preflight-' + row.groupOrdinal + '-' + row.cueOrdinal,
      text: indexed.sourceText, indexedLines: indexed.indexedLines};
    entry.buildExactTextModel(props);
    const result = inspector.inspectPresentationRenderLayoutV001({canvas: props.canvas, overlays: [props]});
    assert.equal(result.status, 'passed', 'ESTIMATED_LAYOUT_REJECTED group=' + row.groupOrdinal +
      ' cue=' + row.cueOrdinal + ' frame=' + row.startFrame + ' detail=' + JSON.stringify(result.violations));
  }
  return {schemaVersion: 'digest-formal-cheap-preflight-v001', status: 'passed', checkedAt: new Date().toISOString(),
    clocks: {frames: 27691, audioSamples: 40705770}, exactSavedInputs: true, fontBytes: 'passed',
    runtimeBindings: 'passed', estimatedLayouts: 243, actualGlyph: 'not-yet-checked',
    toolBinaryDiagnostics: await base.inspectPresentationBaseMediaToolBinaryDiagnosticsV001()};
}

export async function runDigestFormalCandidateV001(permitPath: string) {
  const began = Date.now(), permit = JSON.parse(await readFile(permitPath, 'utf8'));
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const inputs = await readDigestFormalHandoffInputsV001();
  const preflight = await inspectDigestFormalPreflightV001(inputs);
  const {context, approval} = await storage(permitPath, permit, m);
  await absent(context.resolve(OUT + '/core-plan.json'));
  assert((await readdir(context.generatedRoot)).every(name => ['monitor', 'temp'].includes(name)), 'UNEXPECTED_GENERATED_ROOT_CONTENT');
  assert.equal(await realpath(context.generatedRoot), context.generatedRoot);
  assert.equal(await realpath(context.tempDirectory), context.tempDirectory); Object.assign(process.env, {TMPDIR: context.tempDirectory, TMP: context.tempDirectory,
    TEMP: context.tempDirectory, MAGICK_TEMPORARY_PATH: context.tempDirectory});
  await context.publish(OUT + '/cheap-preflight.json', preflight);
  await context.publish(OUT + '/authorization.json', approval);
  const authorizationBinding = m.bind(OUT + '/authorization.json', approval);
  await context.publish(OUT + '/storage-permit.json', {schemaVersion: 'digest-formal-storage-permit-v001', ...permit});
  const style = await candidateStyle(context, inputs, m);
  const plan = {schemaVersion: 'digest-formal-candidate-core-plan-v001', planId: PLAN, outputRoot: OUT,
    authorization: authorizationBinding, implementationBindings: permit.implementation.map((b: Json) => ({path: path.relative(ROOT, b.path), fileSha256: b.fileSha256})),
    acceptedManifestBinding: inputs.manifestBinding, originalNormalOwners: inputs.handoff.normalOwners,
    request: {sourceVideo: inputs.normalPlan.sourceVideoBinding, transcript: inputs.normalPlan.transcriptBinding,
      utterances: inputs.normalPlan.utteranceBinding}};
  const planBinding = await context.publish(OUT + '/core-plan.json', plan);
  const c = {plan, planBinding, authorization: approval, rendererTemplate: style.rendererTemplate};
  const adoption = inputs.adoption, edit = inputs.edit;
  await context.publish(OUT + '/machine-adoption.json', adoption); await context.publish(OUT + '/edit-plan.json', edit);
  const job = structuredClone(inputs.manufacturing);
  job.jobId = PLAN + '-base'; job.sourceArtifact.path = inputs.sourcePhysicalPath;
  job.assemblyDecision = {path: OUT + '/machine-adoption.json', fileSha256: m.bind(OUT + '/machine-adoption.json', adoption).fileSha256};
  job.outputDirectory = OUT + '/base-media';
  const core = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const baseModule = await load('evals/clip_composition/presentation_base_media_build_v003.mjs');
  m.pass(baseModule.validatePresentationBaseMediaBuildJobV001(job), 'FORMAL_DERIVED_JOB_INVALID');
  const mapping = core.projectAdoptedMediaRangesV001(edit, inputs.inspection.media);
  assert.equal(mapping.mappings.at(-1).outputEndFrame, 27691);
  assert.equal(mapping.mappings.at(-1).audioSamples.outputEnd, 40705770);
  assert.deepEqual(mapping.mappings, inputs.clock.mappings, 'SAVED_CLOCK_MISMATCH');
  const jobBinding = await context.publish(OUT + '/manufacturing-job.json', job);
  const invocation = await context.publish(OUT + '/core-invocation.json', {schemaVersion: 'digest-formal-core-invocation-v001',
    planBinding, jobBinding, authorizationBinding, acceptedManifestBinding: inputs.manifestBinding,
    sourceLogicalBinding: inputs.handoff.manufacturingProposal.material.logicalBinding,
    sourcePhysicalBinding: {path: inputs.sourcePhysicalPath, fileSha256: job.sourceArtifact.fileSha256},
    normalReferences: inputs.handoff.normalReferenceMap, storagePermitFileSha256: sha(await readFile(permitPath)),
    candidateStyleBindings: style.bindings, implementationSha: permit.bindings.implementationSha});
  // JSON/owner/clock/style/font checks precede the first large copy.
  assert.equal(await m.fileSha(path.join(ROOT, safe(inputs.sourcePhysicalPath))), job.sourceArtifact.fileSha256);
  await context.resourceCheck({stage: 'start', newBytes: 22800000000});
  const baseStarted = Date.now();
  const base = await core.buildAdoptedBaseMediaV001(c, adoption, edit, job, jobBinding, invocation,
    {inspection: 'digest-formal-source-inspection-v001', receipt: 'digest-formal-base-validation-v001'}, context);
  const baseMs = Date.now() - baseStarted;
  const artifacts = await prepareDigestFormalCandidateCoreV001(inputs, c, base, style, context);
  // New formal identifiers remain bound to the original cue clocks and lines.
  const instructions = artifacts.instruction.instructions;
  assert.equal(instructions.length, 243);
  const correspondence = inputs.correspondence.rows;
  instructions.forEach((v: Json, i: number) => {
    const row = correspondence[i]; assert.equal(v.outputTime.startFrame, row.startFrame);
    assert.equal(v.outputTime.endFrameExclusive, row.endFrameExclusive);
  });
  const artifactBindings: Json = {};
  for (const [key, name] of Object.entries(core.CORE_FILES) as [string, string][]) artifactBindings[key] = await context.publish(OUT + '/' + name, artifacts[key]);
  await context.resourceCheck({stage: 'body', newBytes: 22900000000});
  const renderStarted = Date.now();
  const result = await core.renderAdoptedVideoV001(c, artifactBindings, 'digest-formal-render-execution-v001', context);
  const receipt = {schemaVersion: 'digest-formal-manufacturing-result-v001', status: 'completed', planBinding,
    invocationBinding: invocation, result, timing: {initialPreparationMs: baseStarted - began, baseMediaMs: baseMs,
      renderAndQcMs: Date.now() - renderStarted, totalMs: Date.now() - began},
    implementationSha: permit.bindings.implementationSha, technicalQc: 'passed',
    humanQuality: 'not-evaluated', outlineChoice: null, originalJudgmentReruns: 0, completedAt: new Date().toISOString()};
  await context.publish(OUT + '/result.json', receipt); return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--inputs-only') {
      const v = await readDigestFormalHandoffInputsV001();
      process.stdout.write(JSON.stringify({status: 'saved-inputs-qualified', groups: v.traces.length,
        cues: v.correspondence.rows.length, atoms: v.meaning.atomOccurrences.length}) + '\n');
    } else {
      assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--permit');
      const result = await runDigestFormalCandidateV001(path.resolve(process.argv[3]));
      process.stdout.write(JSON.stringify({event: 'completed', result}) + '\n');
    }
  } catch (error) {process.stderr.write(String((error as Error).stack) + '\n'); process.exitCode = 1;}
}

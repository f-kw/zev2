/** One expressly approved saved Digest. This is not a general storage or trust override. */
import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
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
const BODY_OUT = OUT + '/body-continuation-v003';
const GUEST = '/Volumes/ZEV-Digest-20261003-01';
const HOST = '/Volumes/KIOXIA';
const IMAGE = HOST + '/zev2-digest-formal-handoff-20261003-v001/digest-100GB.sparsebundle';
const MANIFEST = 'runtime/artifacts/digest-caption-216px-reflow-20261003-v001/attempt-002/manifest.json';
const MANIFEST_SHA = '784775c621913ba263057671b580b34082a349e007b8c155ed4bb0bafe351444'; // Actual saved and read-back candidate, not an execution permit
const ACCEPTED_START_MAIN = 'becf6f69e67fc1afb0c910268a540fcc7f0179c4';
const TYPOGRAPHY_CONFIGURATION_SHA = 'a7e228fe5814b32cb168e737bcc23b7f287d43f3ee852546172e3c56ab6c67bf';
const TYPOGRAPHY_CONFIGURATION_PATH = 'docs/reports/digest-caption-216px-reflow-20261003/typography-settings-user-record.json';
const IMPLEMENTATIONS = Object.freeze([
  'runner/src/digest-formal-handoff-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
  'evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs',
  'tools/digest-quality/original-resolution-full-supervisor-v002.py',
  'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
]);
const contexts = new WeakSet<object>();
const sourceBundles = new WeakSet<object>();
const formal216Bundles = new WeakSet<object>();
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
export async function assertQualifiedDigestStorageContextV001(context: unknown, plan?: Json): Promise<void> {
  if (context !== null && typeof context === 'object' && contexts.has(context)) {
    await (context as Json).assertCurrent(); return;
  }
  const {assertQualifiedApprovedDigestStorageContextV001} = await import(pathToFileURL(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'digest-approved-job-runner-v001.ts')).href);
  await assertQualifiedApprovedDigestStorageContextV001(context, plan);
}

/** A byte parser, never a permission or source-package capability. */
export async function decodeDigestFormalBoundJsonBytesV001(binding: Json, bytes: Buffer): Promise<Json> {
  assert(Buffer.isBuffer(bytes)); safe(binding.path);
  assert(/^[0-9a-f]{64}$/u.test(binding.fileSha256));
  assert.equal(sha(bytes), binding.fileSha256, 'FORMAL_BOUND_ACTUAL_BYTES_MISMATCH');
  if (binding.sizeBytes !== undefined) assert.equal(bytes.length, binding.sizeBytes, 'FORMAL_BOUND_SIZE_MISMATCH');
  const value = JSON.parse(bytes.toString()); assert(value && typeof value === 'object' && !Array.isArray(value));
  if (binding.schemaVersion !== undefined) assert.equal(value.schemaVersion, binding.schemaVersion, 'FORMAL_BOUND_SCHEMA_MISMATCH');
  if (binding.canonicalSha256 !== undefined) {
    const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
    assert.equal(m.canonicalSha(value), binding.canonicalSha256, 'FORMAL_BOUND_CANONICAL_MISMATCH');
  }
  return value;
}

async function storage(permitPath: string, permit: Json, m: any, inputs: Json) {
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  assert(typeof MANIFEST_SHA === 'string' && /^[0-9a-f]{64}$/u.test(MANIFEST_SHA), 'FORMAL_216_MANIFEST_SHA_NOT_BOUND');
  assert.equal(permit.status, 'verified-formal-handoff-v001');
  assert.equal(permit.bindings.planId, PLAN); assert.equal(permit.bindings.logicalPrefix, OUT);
  assert.equal(permit.bindings.commandPermitPath, permitPath);
  assert.equal(permit.bindings.planManifest.fileSha256, MANIFEST_SHA);
  assert.equal(permit.bindings.planManifest.path, path.join(ROOT, MANIFEST));
  const s = permit.storage;
  assert.equal(s.guestRoot, GUEST); assert.equal(s.hostRoot, HOST); assert.equal(s.imagePath, IMAGE);
  assert.equal(s.guestVolumeUuid, '7212F3BB-32FB-4F02-A71C-E570421FF2E0');
  assert(Number.isSafeInteger(s.guestDevice) && s.guestDevice > 0, 'OBSERVED_GUEST_DEVICE_REQUIRED');
  assert.equal(s.hostVolumeUuid, '0E5DC84B-1E22-3C9B-9E3B-220EBA8607C1');
  assert(Number.isSafeInteger(s.hostDevice) && s.hostDevice > 0 && s.hostDevice !== s.guestDevice, 'OBSERVED_HOST_DEVICE_REQUIRED');
  assert.equal(s.imageMaximumBytes, 100000000000); assert.equal(s.hostMetadataReserveBytes, 6254231552);
  assert.equal(s.internalRoot, ROOT);
  assert.deepEqual(permit.implementation.map((b: Json) => path.relative(ROOT, b.path)), IMPLEMENTATIONS);
  const approvalBytes = await readFile(permit.bindings.approvalRecord.path);
  assert.equal(sha(approvalBytes), permit.bindings.approvalRecord.fileSha256);
  const approval = JSON.parse(approvalBytes.toString());
  assert.equal(approval.schemaVersion, 'digest-formal-user-manufacturing-authorization-v002');
  assert.equal(approval.recordId, ORIGINAL_MANUFACTURING_GRANT_ID_V001, 'FORMAL_ORIGINAL_MANUFACTURING_GRANT_ID_REQUIRED');
  assert.deepEqual(approval.userApproval, {atMinuteUtc: '2026-10-03T09:52Z', messageId: 'Sentinel_1e76075a886c8191aa441b21201f9b00',
    text: '調査したんだけど、フォントは１.５倍くらいが良い。左右には半文字分くらいのスペースが必要。それで進めて',
    sourceThreadId: '01a0ff1f-1ad3-70b5-bb7f-d0f3988a10e6'});
  assert.deepEqual(approval.candidateConditions, {fontSizePx: 216, actualInkMarginPx: 108, maxLogicalWidthPerLine: 15,
    maxLinesPerCue: 2, horizontalSafeMarginRatio: 0.05625, layoutRulesChanged: true});
  assert.equal(approval.originalCandidateManifestSha256, DIGEST_HANDOFF_MANIFEST_BINDING_V001.fileSha256);
  assert.equal(approval.planManifestSha256, MANIFEST_SHA); assert.equal(approval.planId, PLAN);
  assert.equal(approval.outputRoot, OUT); assert.deepEqual(approval.implementationPaths, IMPLEMENTATIONS);
  assert.deepEqual(approval.storage, s); assert.equal(approval.normalCandidates, 1);
  assert.equal(approval.humanQuality, 'pending'); assert.equal(approval.outlineChoice, null);
  assert.deepEqual(approval.guard, {startBytes: 50000000000, reserveBytes: 12000000000,
    maximumRssBytes: 17179869184, maximumPressure: 1, observationIntervalSeconds: 1,
    nextUnitPlusReserve: true, stopOwnProcessGroup: true, restartOnReconnect: false});
  for (const [key, relative] of [['originalManufacturingAuthorizationBinding', 'docs/reports/digest-formal-apfs-preflight-20261003/authorization-record.json'],
    ['captionAuthorizationBinding', AUTH216.path],
    ['typographyAdoptionBinding', 'docs/reports/digest-caption-216px-reflow-20261003/typography-adoption-record.json'],
    ['typographyConfigurationBinding', TYPOGRAPHY_CONFIGURATION_PATH],
    ['sourceConnectionDecisionBinding', SOURCE_CONNECTION_DECISION.path]]) {
    const binding = approval[key]; assert([relative, path.join(ROOT, relative)].includes(binding.path));
    assert(/^[0-9a-f]{64}$/u.test(binding.fileSha256)); const bytes = await readFile(path.join(ROOT, relative));
    assert.equal(sha(bytes), binding.fileSha256, 'SUPPORTING_AUTHORIZATION_CHANGED');
    if (binding.sizeBytes !== undefined) assert.equal(bytes.length, binding.sizeBytes);
    if (key === 'originalManufacturingAuthorizationBinding') assert.equal(JSON.parse(bytes.toString()).recordId, approval.recordId, 'FORMAL_ORIGINAL_GRANT_RECORD_ID_CHANGED');
    if (key === 'captionAuthorizationBinding') assert.equal(binding.fileSha256, AUTH216.fileSha256);
    if (key === 'typographyConfigurationBinding') {assert.equal(binding.fileSha256, TYPOGRAPHY_CONFIGURATION_SHA); assert.equal(bytes.length, 1832);}
    if (key === 'typographyAdoptionBinding') {assert.equal(binding.fileSha256, 'f0e1466475034e396478d7bfb3fef716050f0d17c6d53ab174bd1fc1666b3884'); assert.equal(bytes.length, 1451);}
    if (key === 'sourceConnectionDecisionBinding') {assert.equal(binding.fileSha256, SOURCE_CONNECTION_DECISION.fileSha256); assert.equal(bytes.length, SOURCE_CONNECTION_DECISION.sizeBytes);}
  }
  assert.equal(process.version, 'v20.19.6', 'FORMAL_NODE_VERSION_REQUIRED');
  assert.equal(process.execPath, '/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert.equal(approval.acceptedMain, ACCEPTED_START_MAIN);
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
  let publishedSourcePackageSha: string | undefined;
  let observedGuestNode: string | undefined, observedHostNode: string | undefined;
  async function current(force = false) {
    if (!force && Date.now() - lastCheck < 900) return;
    assert.equal(sha(await readFile(permitPath)), permitSha, 'PERMIT_CHANGED');
    if (Object.hasOwn(permit, 'bodyContinuation')) {
      assert.equal(permit.bodyContinuation.ownerBinding.path, path.join(GUEST, BODY_OUT, 'ownership-retry-clean-v001.json'));
      await readDigestFormalEntryEvidenceBytesV001(permit.bodyContinuation.ownerBinding);
      process.kill(process.ppid, 0);
    }
    assert.equal(sha(await readFile(permit.bindings.approvalRecord.path)), permit.bindings.approvalRecord.fileSha256, 'AUTHORIZATION_CHANGED');
    assert.equal((await exec('git', ['rev-parse', 'HEAD'], {cwd: ROOT})).stdout.trim(), permit.bindings.implementationSha);
    assert.equal((await exec('git', ['status', '--porcelain=v1'], {cwd: ROOT})).stdout, '', 'IMPLEMENTATION_CHANGED');
    for (const binding of permit.implementation) assert.equal(await m.fileSha(binding.path), binding.fileSha256);
    const [g, h, is] = await Promise.all([disk(GUEST), disk(HOST), lstat(IMAGE)]);
    assert.equal(g.VolumeUUID, s.guestVolumeUuid); assert(/^\/dev\/disk[0-9]+s[0-9]+$/u.test(g.DeviceNode));
    if (observedGuestNode === undefined) observedGuestNode = g.DeviceNode; else assert.equal(g.DeviceNode, observedGuestNode);
    assert.equal(g.FilesystemType, 'apfs'); assert.equal(g.GlobalPermissionsEnabled, true);
    assert.equal(g.WritableVolume, true); assert.equal(h.VolumeUUID, s.hostVolumeUuid);
    assert(/^\/dev\/disk[0-9]+s[0-9]+$/u.test(h.DeviceNode));
    if (observedHostNode === undefined) observedHostNode = h.DeviceNode; else assert.equal(h.DeviceNode, observedHostNode);
    assert.equal(h.FilesystemType, 'exfat');
    assert.equal((await lstat(GUEST)).dev, s.guestDevice); assert.equal((await lstat(HOST)).dev, s.hostDevice);
    const mounted = JSON.parse((await exec('/usr/bin/python3', ['-c',
      'import json,plistlib,subprocess;print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/bin/hdiutil","info","-plist"]))))'])).stdout);
    const matching = mounted.images.filter((image: Json) => image['image-path'] === IMAGE); assert.equal(matching.length, 1);
    assert(matching[0]['system-entities'].some((entity: Json) => entity['dev-entry'] === g.DeviceNode), 'GUEST_BACKING_IMAGE_CHANGED');
    assert.equal(is.ino, identity.ino); assert.equal(is.dev, identity.dev); assert(!is.isSymbolicLink());
    assert.equal(await realpath(GUEST), GUEST); assert.equal(await realpath(HOST), HOST);
    assert.equal(await realpath(IMAGE), IMAGE); assert.equal(sha(await readFile(IMAGE + '/Info.plist')), identity.infoSha);
    const [gf, internal] = await Promise.all([statfs(GUEST), statfs(ROOT)]);
    assert(gf.bavail * gf.bsize >= 12000000000, 'GUEST_RESERVE_EXHAUSTED');
    assert(internal.bavail * internal.bsize >= 12000000000, 'INTERNAL_OS_RESERVE_EXHAUSTED');
    lastCheck = Date.now();
  }
  await current(true);
  const continuation = Object.hasOwn(permit, 'bodyContinuation')
    ? await inspectDigestFormalBodyContinuationV001(permit) : undefined;
  const outputRoot = continuation === undefined ? OUT : BODY_OUT;
  const generatedRoot = path.join(GUEST, outputRoot), tempDirectory = generatedRoot + '/temp';
  if (continuation !== undefined) {
    const owner = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(permit.bodyContinuation.ownerBinding)).toString());
    assert.equal(owner.controllerPid, process.ppid, 'BODY_CONTINUATION_CONTROLLER_CHANGED');
    const controller = (await exec('/bin/ps', ['-p', String(process.ppid), '-o', 'args='])).stdout;
    assert(controller.includes(ROOT + '/tools/digest-quality/original-resolution-full-supervisor-v002.py')
      && controller.includes(permitPath), 'BODY_CONTINUATION_SUPERVISOR_OWNER_REQUIRED');
    const owned = JSON.parse(await readFile(permit.monitorDirectory + '/owned-group.json', 'utf8'));
    assert.equal(owned.parentPid, process.pid); assert.equal(owned.group, process.pid);
    assert.deepEqual(owned.command, permit.command); assert.deepEqual(owned.bindings, permit.bindings);
  }
  const resolve = (p: string) => path.join(generated(p) ? GUEST : ROOT, p);
  async function readActualBytes(p: string): Promise<Buffer> {
    await current(); const root = generated(p) ? GUEST : ROOT;
    const stable = await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    return stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: root, relativePath: p});
  }
  async function qualifyReadValue(p: string, bytes: Buffer, value: Json) {
    if (p === outputRoot + '/source-package.json') {
      assert(publishedSourcePackageSha && sha(bytes) === publishedSourcePackageSha, 'FORMAL_SOURCE_PACKAGE_READBACK_CHANGED');
      await registerDigestFormalSourcePackageV001(value, inputs, 'manufacturing', context);
    }
    return value;
  }
  async function readJson(p: string) {
    const bytes = await readActualBytes(p);
    return qualifyReadValue(p, bytes, JSON.parse(bytes.toString()));
  }
  async function readBound(binding: Json) {
    const bytes = await readActualBytes(binding.path);
    const value = await decodeDigestFormalBoundJsonBytesV001(binding, bytes);
    return qualifyReadValue(binding.path, bytes, value);
  }
  async function publish(p: string, value: Json) {
    assert(generated(p) && p.startsWith(outputRoot + '/'), 'FORMAL_GENERATED_PREFIX_REQUIRED'); await current(true);
    const target = resolve(p), parent = path.dirname(target);
    await mkdir(parent, {recursive: true}); assert.equal(await realpath(parent), parent);
    const bytes: Buffer = m.formal(value);
    if (p === outputRoot + '/source-package.json') {
      const record = qualifiedSourcePackages.get(value);
      assert(record && record.inputs === inputs && record.mode === 'manufacturing' && record.context === context
        && record.bodySha256 === sha(bytes), 'FORMAL_QUALIFIED_SOURCE_PACKAGE_PUBLICATION_REQUIRED');
      await assertQualifiedDigestFormalSourcePackageTaskV001(value, inputs);
      publishedSourcePackageSha = sha(bytes);
    }
    await writeFile(target, bytes, {flag: 'wx'});
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
      process.stdin.on('data', got); process.stdin.resume();
    });
    const response = JSON.parse(reply); assert.equal(response.id, id, 'SUPERVISOR_REPLY_ID_MISMATCH');
    assert(response.sample && response.sample.guest && response.sample.host, 'SUPERVISOR_REPLY_INVALID');
  }
  const context = Object.freeze({outputRoot, continuation, storageRoot: GUEST, generatedRoot, tempDirectory,
    resolve, assertCurrent: current, publish, readBound, readJson, resourceCheck,
    composeMedia: async (args: Json) => {
      await current(true); assert.equal(args.expectedFrameCount, 27691);
      assert(args.outputPath.startsWith(generatedRoot + '/'));
      const composite = await load('tools/digest-quality/original-resolution-low-memory-composite.mjs');
      const evidence = await composite.runFormalLowMemoryCompositeV001({baseMediaPath: args.baseMediaPath,
        plan: args.plan, overlayRecords: args.overlayRecords, expectedFrameCount: args.expectedFrameCount, expectedOverlayCount: inputs.manifest.summary.newCues,
        outputPath: args.outputPath, ffmpegPath: args.ffmpegPath, processObserver: args.processObserver, resourceCheck});
      const result = {...evidence, typographySettingsBinding: inputs.typographySettingsBinding, derivedTypographyValues: inputs.typographyValues};
      await publish(outputRoot + '/low-memory-composite.json', result);
      return result;
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
    inputRoot: preparation.inputRoot, inputPrefix: preparation.inputPrefix,
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


export type DigestTypographySettingsV001 = {
  fontSizePx: number;
  horizontalMargin: {unit: 'font-character' | 'px'; value: number};
  maxLinesPerCue: number;
};
export type DigestTypographyGeometryV001 = {
  canvasWidthPx: number; borderWidthPx: number; glowWidthPx: number; textSafePaddingRatio: number;
};
/** Same stroke and inner padding as buildExactTextModel; this estimates capacity, not actual glyph ink. */
export function resolveDigestTypographySettingsV001(settings: DigestTypographySettingsV001,
  geometry: DigestTypographyGeometryV001 = {canvasWidthPx: 1920, borderWidthPx: 8, glowWidthPx: 4, textSafePaddingRatio: 0.04}) {
  assert(settings && typeof settings === 'object' && !Array.isArray(settings));
  assert.deepEqual(Object.keys(settings).sort(), ['fontSizePx', 'horizontalMargin', 'maxLinesPerCue']);
  assert(Number.isFinite(settings.fontSizePx) && settings.fontSizePx >= 12, 'TYPOGRAPHY_FONT_SIZE_INVALID');
  assert(settings.horizontalMargin && typeof settings.horizontalMargin === 'object' && !Array.isArray(settings.horizontalMargin));
  assert.deepEqual(Object.keys(settings.horizontalMargin).sort(), ['unit', 'value']);
  assert(['font-character', 'px'].includes(settings.horizontalMargin.unit)
    && Number.isFinite(settings.horizontalMargin.value) && settings.horizontalMargin.value >= 0, 'TYPOGRAPHY_MARGIN_INVALID');
  assert(Number.isSafeInteger(settings.maxLinesPerCue) && settings.maxLinesPerCue > 0 && settings.maxLinesPerCue <= 99, 'TYPOGRAPHY_LINE_LIMIT_INVALID');
  assert(geometry && typeof geometry === 'object' && !Array.isArray(geometry));
  assert.deepEqual(Object.keys(geometry).sort(), ['borderWidthPx', 'canvasWidthPx', 'glowWidthPx', 'textSafePaddingRatio']);
  assert(Number.isFinite(geometry.canvasWidthPx) && geometry.canvasWidthPx > 0);
  assert([geometry.borderWidthPx, geometry.glowWidthPx, geometry.textSafePaddingRatio].every(value => Number.isFinite(value) && value >= 0));
  assert(geometry.textSafePaddingRatio <= 1);
  const fontSizePx = settings.fontSizePx;
  const horizontalMarginPx = settings.horizontalMargin.unit === 'font-character'
    ? fontSizePx * settings.horizontalMargin.value : settings.horizontalMargin.value;
  const strokeExtentPx = Math.max(geometry.glowWidthPx * 2 + geometry.borderWidthPx * 2, geometry.borderWidthPx * 2) / 2;
  const textSafePaddingPx = Math.max(2, Math.ceil(fontSizePx * geometry.textSafePaddingRatio));
  const availableTextWidthPx = geometry.canvasWidthPx - horizontalMarginPx * 2 - strokeExtentPx * 2 - textSafePaddingPx * 2;
  const logicalWidthUnitPx = fontSizePx / 2;
  const maxLogicalWidthPerLine = Math.floor(availableTextWidthPx / logicalWidthUnitPx);
  assert(Number.isSafeInteger(maxLogicalWidthPerLine) && maxLogicalWidthPerLine > 0, 'TYPOGRAPHY_NO_TEXT_CAPACITY');
  return Object.freeze({schemaVersion: 'digest-typography-derived-values-v001', fontSizePx, horizontalMarginPx,
    horizontalSafeMarginRatio: horizontalMarginPx / geometry.canvasWidthPx, maxLogicalWidthPerLine,
    maxLinesPerCue: settings.maxLinesPerCue, canvasWidthPx: geometry.canvasWidthPx, borderWidthPx: geometry.borderWidthPx,
    glowWidthPx: geometry.glowWidthPx, textSafePaddingPx, strokeExtentPx, availableTextWidthPx, logicalWidthUnitPx});
}
function typographyGeometryFromProps(props: Json): DigestTypographyGeometryV001 {
  return {canvasWidthPx: props.canvas.width, borderWidthPx: props.visualState.textStyle.borderWidthPx,
    glowWidthPx: props.visualState.textStyle.glowWidthPx, textSafePaddingRatio: props.layoutRules.textSafePaddingRatio};
}

/** The old public reader remains the qualification for already accepted source owners. */
export type DigestFormal216HandoffInputsV002 = DigestFormalHandoffInputsV001 & {
  originalAcceptedInputs: DigestFormalHandoffInputsV001;
  captionPreparation: Json;
  candidateRules: Json;
  candidateAuthorization: Json;
  checkedAt: string;
};
const CAPTION216 = 'digest-caption-216px-reflow-20261003-v001';
const PREFIX216 = 'runtime/artifacts/' + CAPTION216 + '/attempt-002';
const AUTH216 = Object.freeze({path: 'docs/reports/digest-caption-216px-reflow-20261003/authorization-record.json',
  fileSha256: '8884e977e5761be373c04daceacd993671e263b15565fcfaace80db31142e419', sizeBytes: 2430});
const PREP216 = Object.freeze({path: PREFIX216 + '/preparation.json',
  fileSha256: 'b37b61268332d2deec85fa68c5ddd34cfd94dd5c997f42f10d917e2569a4528c'});
const PROPS216 = Object.freeze({path: PREFIX216 + '/candidate-props.json',
  fileSha256: '4eb6b6b6b2e924b05e241df37b9904f8d71fe432da59247160b165191ff06052', sizeBytes: 5744});
const SOURCE_CONNECTION_DECISION = Object.freeze({path: 'docs/reports/digest-caption-216px-reflow-20261003/source-connection-decision-record.json',
  fileSha256: '8255c2579b072ddb2bf339fd56f179e87b97154bc763aecd44f04a199cd71a40', sizeBytes: 1668});
const RULES216 = Object.freeze({path: PREFIX216 + '/candidate-rules.json',
  fileSha256: 'cc11b610b88834227e8d55ffe64e61f01f8cf654a243dc32c872549e8956c781', sizeBytes: 3858});
const TIMING216 = ['sourceStartMs', 'sourceEndMs', 'sourceStartFrame30', 'sourceEndFrame30', 'startFrame', 'endFrameExclusive', 'displayFrameCount'];
const timing216 = (row: Json) => Object.fromEntries(TIMING216.map(key => [key, row[key]]));

function approvedDigestCandidateLayoutRules(candidate: Json, baseline: Json, typographyValues: Json) {
  assert.equal(candidate.horizontalSafeMarginRatio, typographyValues.horizontalSafeMarginRatio, 'CANDIDATE_MARGIN_CHANGED');
  const restored = structuredClone(candidate); restored.horizontalSafeMarginRatio = baseline.horizontalSafeMarginRatio;
  assert.deepEqual(restored, baseline, 'CANDIDATE_216_GENERAL_LAYOUT_DELTA');
  return structuredClone(candidate);
}

/** Reconstructs saved capabilities; never calls the model or repeats the accepted judgment. */
export async function readDigestFormal216HandoffInputsV002(workspaceRoot: string = ROOT): Promise<Json> {
  assert(typeof MANIFEST_SHA === 'string' && /^[0-9a-f]{64}$/u.test(MANIFEST_SHA), 'FORMAL_216_MANIFEST_SHA_NOT_BOUND');
  const source = await readDigestFormalHandoffInputsV001(workspaceRoot), root = source.workspaceRoot;
  const [wire, stable, display, clock, indexer, entry, inspector] = await Promise.all([
    load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'),
    load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs'),
    load('evals/clip_composition/adopted_media_manufacturing_v001.mts'),
    load('evals/clip_composition/presentation_base_media_timeline_v004.mjs'),
    load('evals/clip_composition/presentation_renderer_text_layout_v001.mjs'),
    load('evals/clip_composition/presentation_renderer_entry_v001.tsx'),
    load('evals/clip_composition/inspect_presentation_render_layout_v001.ts'),
  ]);
  const read = async (binding: Json) => {
    safe(binding.path); assert(binding.path.endsWith('.json') && /^[0-9a-f]{64}$/u.test(binding.fileSha256), 'FORMAL_216_BINDING_INVALID');
    const bytes: Buffer = await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot: root, relativePath: binding.path});
    assert.equal(sha(bytes), binding.fileSha256, 'FORMAL_216_INPUT_SHA_CHANGED');
    if (binding.sizeBytes !== undefined) assert.equal(bytes.length, binding.sizeBytes, 'FORMAL_216_INPUT_SIZE_CHANGED');
    const value = JSON.parse(bytes.toString()); assert(value && typeof value === 'object' && !Array.isArray(value));
    if (binding.schemaVersion !== undefined) assert.equal(value.schemaVersion, binding.schemaVersion);
    if (binding.canonicalSha256 !== undefined) assert.equal(wire.canonicalSha(value), binding.canonicalSha256);
    return value;
  };
  const manifestBinding = {path: MANIFEST, fileSha256: MANIFEST_SHA}, manifest = await read(manifestBinding);
  assert.equal(manifest.schemaVersion, 'digest-caption-216px-reflow-candidate-bundle-v001');
  assert(typeof TYPOGRAPHY_CONFIGURATION_SHA === 'string' && /^[0-9a-f]{64}$/u.test(TYPOGRAPHY_CONFIGURATION_SHA), 'TYPOGRAPHY_CONFIGURATION_SHA_NOT_BOUND');
  assert.equal(manifest.typographySettingsBinding.path, PREFIX216 + '/typography-settings.json');
  const typography = await read(manifest.typographySettingsBinding);
  assert.equal(typography.schemaVersion, 'digest-caption-typography-settings-v001');
  assert.deepEqual(typography.settings, {fontSizePx: 216, horizontalMargin: {unit: 'font-character', value: 0.5}, maxLinesPerCue: 2});
  assert.equal(typography.sourceUserConfigurationBinding.path, TYPOGRAPHY_CONFIGURATION_PATH);
  assert.equal(typography.sourceUserConfigurationBinding.fileSha256, TYPOGRAPHY_CONFIGURATION_SHA);
  const typographyConfiguration = await read(typography.sourceUserConfigurationBinding);
  assert.equal(typographyConfiguration.schemaVersion, 'digest-configurable-typography-user-instruction-v001');
  assert.deepEqual(typographyConfiguration.settings, typography.settings);
  assert.deepEqual(typographyConfiguration.userInstruction, {at: '2026-10-03T10:31:17Z',
    messageId: 'Sentinel_2ea1725c97f481918275d6ab0335fff7', text: 'システムとしては固定じゃなくて可変にして'});
  assert.deepEqual(typographyConfiguration.originalScopeBinding, AUTH216);
  assert.deepEqual(typographyConfiguration.selectedAppearanceBinding, {path: 'docs/reports/digest-caption-216px-reflow-20261003/typography-adoption-record.json',
    fileSha256: 'f0e1466475034e396478d7bfb3fef716050f0d17c6d53ab174bd1fc1666b3884', sizeBytes: 1451});
  const appearance = await read(typographyConfiguration.selectedAppearanceBinding);
  assert.deepEqual(appearance.adoptedForThisOnePlan, {fontSizePx: 216, minimumActualInkHorizontalMarginPx: 108});
  assert.equal(appearance.allCaptionsAndFinalVideoQuality, 'pending');
  const typographyValues = resolveDigestTypographySettingsV001(typography.settings, typographyGeometryFromProps(source.manifest.technicalCandidate.props));
  assert.deepEqual(typography.derived, typographyValues); assert.deepEqual(manifest.derivedTypographyValues, typographyValues);
  assert.equal(typography.existingInputsUnchanged, true);
  assert.deepEqual(typography.preparationBinding, manifest.preparationBinding);
  assert.deepEqual(typography.candidatePropsBinding, PROPS216); assert.deepEqual(typography.candidateRulesBinding, RULES216);
  assert.deepEqual(manifest.sourceManifestBinding, source.manifestBinding);
  assert.deepEqual(manifest.sourceCorrespondenceBinding, source.manifest.correspondenceBinding);
  assert.deepEqual(manifest.meaningBinding, source.manifest.meaningBinding); assert.deepEqual(await read(manifest.meaningBinding), source.meaning);
  assert.deepEqual(manifest.mapBinding, source.manifest.mapBinding); assert.deepEqual(await read(manifest.mapBinding), source.cueTimeMap);
  assert.deepEqual(manifest.originalClockBinding, source.normalExecution.clockResolutionBinding);
  assert.deepEqual(manifest.authorizationBinding, AUTH216); assert.deepEqual(manifest.scopeBinding, AUTH216);
  const authorization = await read(AUTH216);
  const sourceConnectionDecision = await read(SOURCE_CONNECTION_DECISION);
  assert.equal(sourceConnectionDecision.schemaVersion, 'digest-caption-source-connection-technical-decision-v001');
  assert.equal(sourceConnectionDecision.implementationScopeAddition, IMPLEMENTATIONS.at(-1));
  assert.equal(sourceConnectionDecision.newAuthorityGranted, false); assert.equal(sourceConnectionDecision.validatorExemptions, 0);
  assert.equal(authorization.schemaVersion, 'digest-caption-216px-user-instruction-v001');
  assert.deepEqual(authorization.sourceCandidateManifest, source.manifestBinding);
  assert.equal(manifest.preparationBinding.path, PREP216.path); assert.equal(manifest.preparationBinding.fileSha256, PREP216.fileSha256);
  const preparation = await read(manifest.preparationBinding); assert.deepEqual(await read(PREP216), preparation);
  assert.equal(preparation.schemaVersion, 'digest-caption-216px-reflow-preparation-v001');
  assert.equal(preparation.status, 'prepared-awaiting-actual-model-answers'); assert.deepEqual(preparation.authorizationBinding, AUTH216);
  assert.deepEqual(preparation.originalManifestBinding, source.manifestBinding);
  assert.deepEqual(preparation.originalMeaningBinding, source.manifest.meaningBinding);
  assert.deepEqual(preparation.originalCorrespondenceBinding, source.manifest.correspondenceBinding);
  assert.deepEqual(preparation.originalMapBinding, source.manifest.mapBinding);
  assert.deepEqual(preparation.preserved, {groups: 9, atoms: 3613, frames: 27691, samples: 40705770});
  assert.deepEqual(preparation.effects, {judgments: 0, media: 0, api: 0});
  assert.deepEqual(preparation.propsBinding, PROPS216); assert.deepEqual(preparation.candidateRulesBinding, RULES216);
  assert.deepEqual(manifest.candidateRulesBinding, RULES216);
  const rules = await read(RULES216), propsRecord = await read(PROPS216);
  assert.equal(rules.schemaVersion, 'digest-caption-216px-candidate-rules-v001');
  assert.equal(rules.candidatePlanId, CAPTION216); assert.equal(rules.attempt, 'attempt-002');
  assert.deepEqual(rules.authorizationBinding, AUTH216); assert.deepEqual(rules.sourceManifestBinding, source.manifestBinding);
  assert.equal(rules.oldTaskDescription, source.requests[0].input.taskDescription);
  assert.equal(rules.candidateOnly, true); assert.equal(rules.generalStylesOrDefaultsChanged, false);
  assert.equal(rules.originalMeaningOwnerAndClockUnchanged, true); assert.equal(rules.judgments, 0);
  assert.equal(rules.validatorExemptions, 0); assert.equal(rules.newTrust, false);
  assert.deepEqual(rules.oldCueOuterBoundaryPolicy, {previous: 'conservative-helper-provisional-preservation', current: 'not-required',
    previousWasUserAuthorizationCondition: false, sameRetainedGroupBoundaryRepositionAllowed: true});
  assert.equal(rules.rules.maxLogicalWidthPerLine, typographyValues.maxLogicalWidthPerLine); assert.equal(rules.rules.maxLinesPerCue, typographyValues.maxLinesPerCue);
  assert.equal(propsRecord.schemaVersion, 'digest-caption-216px-candidate-props-v001');
  assert.deepEqual(propsRecord.sourcePropsBinding, source.manifest.technicalCandidate.source);
  assert.deepEqual(propsRecord.sourceManifestBinding, source.manifestBinding); assert.deepEqual(propsRecord.authorizationBinding, AUTH216);
  assert.equal(propsRecord.layoutRulesChanged, true); assert.equal(propsRecord.actualInkMargin, 'not-yet-measured');
  assert.equal(propsRecord.humanQuality, 'pending');
  assert.deepEqual(propsRecord.changedFields, {fontSizePx: {from: 144, to: 216}, canvasSafeLeftPx: {from: 4, to: 108},
    canvasSafeRightPx: {from: 4, to: 108}, horizontalSafeMarginRatio: {from: 0, to: 0.05625}});
  const expectedProps = structuredClone(source.manifest.technicalCandidate.props);
  expectedProps.visualState.textStyle.fontSizePx = typographyValues.fontSizePx; expectedProps.canvas.safeAreaPx.left = typographyValues.horizontalMarginPx;
  expectedProps.canvas.safeAreaPx.right = typographyValues.horizontalMarginPx; expectedProps.layoutRules.horizontalSafeMarginRatio = typographyValues.horizontalSafeMarginRatio;
  assert.deepEqual(propsRecord.props, expectedProps, 'FORMAL_216_PROPS_SCOPE_CHANGED');
  const oldCandidate = source.manifest.technicalCandidate;
  assert.deepEqual(manifest.technicalCandidate, {source: PROPS216, field: 'props', props: expectedProps,
    sourcePropsBinding: oldCandidate.source, fontLedgerBinding: oldCandidate.fontLedgerBinding, declaredFont: oldCandidate.declaredFont,
    fontBytesReadOrVerified: false, formalStyleAdopted: false, layoutRulesChanged: true,
    minimumActualInkHorizontalMarginPx: typographyValues.horizontalMarginPx, actualGlyphOrInkMargin: 'not-yet-measured'});
  const limits = {...structuredClone(source.requests[0].input.styleLimits), maxLogicalWidthPerLine: typographyValues.maxLogicalWidthPerLine, maxLinesPerCue: typographyValues.maxLinesPerCue};
  assert.deepEqual(manifest.newStyleLimits, limits); assert.deepEqual(preparation.styleLimits, limits);
  const groups: Json[] = source.meaning.orderedCandidates, atoms: Json[] = source.meaning.atomOccurrences;
  const atomById = new Map<string, Json>(atoms.map(atom => [atom.atomOccurrenceId, atom]));
  const atomTiming = (group: Json, mapping: Json, ids: string[]) => {
    assert(ids.length); const spans = ids.map(id => {const atom = atomById.get(id); assert(atom); assert.equal(atom.retainedSpans.length, 1);
      const span = atom.retainedSpans[0]; assert.equal(span.timelineSegmentId, group.timelineSegmentId);
      assert(span.sourceStartMs < span.sourceEndMs); return span;});
    assert(spans.every((span, i) => !i || (span.sourceStartMs >= spans[i - 1].sourceStartMs && span.sourceEndMs >= spans[i - 1].sourceEndMs)));
    const sourceStartMs = spans[0].sourceStartMs, sourceEndMs = spans.at(-1)!.sourceEndMs;
    assert(sourceStartMs >= mapping.sourceStartMs && sourceEndMs <= mapping.sourceEndMs);
    const frameClock = source.cueTimeMap.sourceFrameClock;
    const sourceStartFrame30 = clock.frameBoundaryWithVideoOffsetV001(sourceStartMs, frameClock.videoPresentationOffsetMs);
    const sourceEndFrame30 = clock.sourceEndFrameBoundaryWithVideoOffsetV001(sourceEndMs, frameClock);
    const startFrame = mapping.outputStartFrame + sourceStartFrame30 - mapping.sourceStartFrame30;
    const endFrameExclusive = mapping.outputStartFrame + sourceEndFrame30 - mapping.sourceStartFrame30;
    assert(Number.isSafeInteger(sourceStartFrame30) && Number.isSafeInteger(sourceEndFrame30)
      && sourceStartFrame30 >= mapping.sourceStartFrame30 && sourceEndFrame30 <= mapping.sourceEndFrame30
      && startFrame >= mapping.outputStartFrame && endFrameExclusive <= mapping.outputEndFrame, 'FORMAL_216_CLOCK_OUTSIDE_SOURCE');
    return {sourceStartMs, sourceEndMs, sourceStartFrame30, sourceEndFrame30, startFrame, endFrameExclusive, displayFrameCount: endFrameExclusive - startFrame};
  };
  assert.equal(preparation.requests.length, 9); assert.equal(manifest.responses.length, 9);
  assert.deepEqual(typography.requestBindings, preparation.requests);
  const requests: Json[] = [], responses: Json[] = [], results: Json[] = [], tokens: object[] = [], groupedRows: Json[] = [], groupedChanges: Json[] = [];
  for (const [i, receipt] of (manifest.responses as Json[]).entries()) {
    assert.equal(receipt.ordinal, i + 1); assert.deepEqual(receipt.oldRequestBinding, source.manifest.responses[i].requestBinding);
    assert.deepEqual(receipt.requestBinding, preparation.requests[i]);
    for (const [key, name] of [['requestBinding', 'request'], ['responseBinding', 'response'], ['resultBinding', 'result'],
      ['traceBinding', 'trace'], ['correspondenceBinding', 'correspondence']])
      assert.equal(receipt[key].path, PREFIX216 + '/' + name + '-' + String(i + 1).padStart(4, '0') + '.json');
    const request = await read(receipt.requestBinding), response = await read(receipt.responseBinding), result = await read(receipt.resultBinding);
    assert.equal(request.requestId, CAPTION216 + '-attempt-002-display-' + (i + 1));
    assert.deepEqual(request.input.styleLimits, limits); assert.equal(request.input.taskDescription, rules.newTaskDescription);
    assert.equal(request.inputCanonicalSha256, wire.canonicalSha(request.input));
    const restored = structuredClone(request), oldRequest = source.requests[i]; restored.requestId = oldRequest.requestId;
    restored.input.styleLimits = structuredClone(oldRequest.input.styleLimits); restored.input.taskDescription = oldRequest.input.taskDescription;
    restored.inputCanonicalSha256 = oldRequest.inputCanonicalSha256; assert.deepEqual(restored, oldRequest, 'FORMAL_216_REQUEST_SCOPE_CHANGED');
    const actual = receipt.actualAnswerSourceBinding; assert(path.isAbsolute(actual.path) && /^[0-9a-f]{64}$/u.test(actual.fileSha256));
    const actualStat = await lstat(actual.path); assert(actualStat.isFile() && !actualStat.isSymbolicLink() && await realpath(actual.path) === actual.path);
    const actualBytes = await readFile(actual.path); assert.equal(sha(actualBytes), actual.fileSha256); assert.equal(actualBytes.length, actual.sizeBytes);
    assert.deepEqual(JSON.parse(actualBytes.toString()), response, 'FORMAL_216_ACTUAL_ANSWER_CHANGED');
    assert.equal(receipt.judgmentNote, response.judgmentNote);
    const token = display.validateDisplayForAdoptionV001(request, response, result, 'digest-caption-judgment-display-response-v001');
    const trace = display.readValidatedDisplayTracesV001([request], [token]);
    assert.deepEqual(await read(receipt.traceBinding), {schemaVersion: 'digest-caption-216px-reflow-trace-v001', traces: trace});
    const perGroup = await read(receipt.correspondenceBinding); assert.equal(perGroup.schemaVersion, 'digest-caption-216px-reflow-correspondence-v001');
    const rows: Json[] = perGroup.rows, group = groups[i], cap = request.input.captions[0], boundaries: Json[] = cap.boundaryCandidates;
    const indices = new Map<string, number>(boundaries.map((boundary, j) => [boundary.boundaryId, j]));
    assert.equal(boundaries.length, group.atomOccurrenceIds.length); assert.equal(indices.size, boundaries.length);
    assert.equal(rows.length, trace[0].cues.length); assert.equal(rows.length, receipt.cueCount);
    assert.equal(rows.reduce((n, row) => n + row.lines.length, 0), receipt.lineCount);
    assert.equal(rows.reduce((n, row) => n + row.atomOccurrenceIds.length, 0), receipt.atomCount);
    const oldRows: Json[] = source.correspondence.rows.filter((row: Json) => row.groupOrdinal === i + 1), oldByAtom = new Map<string, Json>();
    oldRows.forEach(old => old.atomOccurrenceIds.forEach((id: string) => {assert(!oldByAtom.has(id)); oldByAtom.set(id, old);}));
    const mapping = source.originalClock.mappings[i]; assert.equal(mapping.segmentId, group.timelineSegmentId);
    let previousEnd = -1, previousFrameEnd = mapping.outputStartFrame;
    for (const [j, row] of rows.entries()) {
      const cue = trace[0].cues[j], end = indices.get(cue.cueEndBoundaryId); assert(end !== undefined && end > previousEnd);
      const ids = group.atomOccurrenceIds.slice(previousEnd + 1, end + 1), rowAtoms = ids.map((id: string) => {const atom = atomById.get(id); assert(atom); return atom;});
      const oldCueOrdinals: number[] = []; for (const id of ids) {const old = oldByAtom.get(id); assert(old); if (oldCueOrdinals.at(-1) !== old.cueOrdinal) oldCueOrdinals.push(old.cueOrdinal);}
      assert.equal(row.groupOrdinal, i + 1); assert.equal(row.cueOrdinal, j + 1); assert(!Object.hasOwn(row, 'oldCueOrdinal'));
      assert.deepEqual(row.oldCueOrdinals, oldCueOrdinals); assert.equal(row.candidateId, group.candidateId);
      assert.equal(row.timelineSegmentId, group.timelineSegmentId); assert.equal(row.captionId, cap.captionId);
      assert.equal(row.cueEndBoundaryId, cue.cueEndBoundaryId); assert.deepEqual(row.lineEndBoundaryIds, cue.lineEndBoundaryIds);
      assert.deepEqual(row.atomOccurrenceIds, ids); assert.deepEqual(row.sourceSegmentIds, rowAtoms.map((atom: Json) => atom.sourceSegmentId));
      assert.deepEqual(row.semanticUtteranceIds, [...new Set(rowAtoms.map((atom: Json) => atom.semanticUtteranceId))]);
      let previousLine = previousEnd;
      const lines = cue.lineEndBoundaryIds.map((id: string) => {const lineEnd = indices.get(id); assert(lineEnd !== undefined && lineEnd > previousLine && lineEnd <= end);
        const lineIds = group.atomOccurrenceIds.slice(previousLine + 1, lineEnd + 1);
        const line = {lineEndBoundaryId: id, text: boundaries.slice(previousLine + 1, lineEnd + 1).map(boundary => boundary.text).join(''),
          atomOccurrenceIds: lineIds, sourceSegmentIds: lineIds.map((aid: string) => {const atom = atomById.get(aid); assert(atom); return atom.sourceSegmentId;})};
        previousLine = lineEnd; return line;});
      assert.equal(previousLine, end); assert.deepEqual(row.lines, lines);
      assert.deepEqual(timing216(row), atomTiming(group, mapping, ids), 'FORMAL_216_CUE_CLOCK_CHANGED');
      assert(Number.isSafeInteger(row.startFrame) && Number.isSafeInteger(row.endFrameExclusive)
        && row.startFrame >= previousFrameEnd && row.endFrameExclusive > row.startFrame, 'FORMAL_216_CUE_OVERLAP_OR_EMPTY');
      const indexed = indexer.indexExplicitLinesV001(lines.map((line: Json) => line.text)); assert.equal(indexed.status, 'passed');
      assert.equal(indexed.sourceText, rowAtoms.map((atom: Json) => atom.text).join(''));
      const props = {...structuredClone(expectedProps), instructionId: CAPTION216 + '-attempt-002-geometry-' + (i + 1) + '-' + (j + 1),
        text: indexed.sourceText, indexedLines: indexed.indexedLines};
      assert.deepEqual(row.exactTextModel, entry.buildExactTextModel(props), 'FORMAL_216_EXACT_TEXT_MODEL_CHANGED');
      const geometry = inspector.inspectPresentationRenderLayoutV001({canvas: props.canvas, overlays: [props]});
      assert.equal(geometry.status, 'passed'); assert.deepEqual(geometry.violations, []); assert.deepEqual(row.geometry, geometry);
      previousEnd = end; previousFrameEnd = row.endFrameExclusive;
    }
    assert.equal(previousEnd, boundaries.length - 1); assert.deepEqual(rows.flatMap(row => row.atomOccurrenceIds), group.atomOccurrenceIds);
    const expectedChanges = oldRows.map(old => {
      const oldSet = new Set<string>(old.atomOccurrenceIds);
      const intersections = rows.flatMap(row => {const shared: string[] = row.atomOccurrenceIds.filter((id: string) => oldSet.has(id));
        return shared.length ? [{newCueOrdinal: row.cueOrdinal, atomOccurrenceIds: shared, newCueTiming: timing216(row),
          intersectionTiming: atomTiming(group, mapping, shared)}] : [];});
      assert.deepEqual(intersections.flatMap(intersection => intersection.atomOccurrenceIds), old.atomOccurrenceIds);
      const children = intersections.map(intersection => rows[intersection.newCueOrdinal - 1]);
      const fixed = children.length === 1 && wire.same(children[0].atomOccurrenceIds, old.atomOccurrenceIds)
        && wire.same(children[0].lineEndBoundaryIds, old.lineEndBoundaryIds);
      if (fixed) for (const key of ['cueEndBoundaryId', 'lineEndBoundaryIds', 'atomOccurrenceIds', 'sourceSegmentIds', 'semanticUtteranceIds', 'lines', ...TIMING216])
        assert.deepEqual(children[0][key], old[key], 'FORMAL_216_FIXED_CUE_CHANGED');
      return {oldRequestBinding: source.manifest.responses[i].requestBinding, oldCueOrdinal: old.cueOrdinal, timelineSegmentId: old.timelineSegmentId,
        oldCueEndBoundaryId: old.cueEndBoundaryId, oldAtomOccurrenceIds: old.atomOccurrenceIds, oldLineEndBoundaryIds: old.lineEndBoundaryIds,
        oldCueTiming: timing216(old), fixed, newCueOrdinals: intersections.map(intersection => intersection.newCueOrdinal),
        newLineEndBoundaryIds: children.map(row => row.lineEndBoundaryIds), intersections};
    });
    assert.deepEqual(perGroup.changes, expectedChanges, 'FORMAL_216_INTERSECTIONS_CHANGED');
    for (const row of rows) assert.deepEqual(expectedChanges.flatMap(change => change.intersections
      .filter(intersection => intersection.newCueOrdinal === row.cueOrdinal).flatMap(intersection => intersection.atomOccurrenceIds)), row.atomOccurrenceIds);
    assert.equal(receipt.fixedOldCues, expectedChanges.filter(change => change.fixed).length);
    assert.equal(receipt.variableOldCues, expectedChanges.filter(change => !change.fixed).length);
    requests.push(request); responses.push(response); results.push(result); tokens.push(token); groupedRows.push(...rows); groupedChanges.push(...expectedChanges);
  }
  assert.equal(groupedChanges.length, 243); assert.deepEqual(groupedRows.flatMap(row => row.atomOccurrenceIds), atoms.map(atom => atom.atomOccurrenceId));
  const traces = display.readValidatedDisplayTracesV001(requests, tokens);
  assert.equal(manifest.tracesBinding.path, PREFIX216 + '/traces.json'); assert.equal(manifest.correspondenceBinding.path, PREFIX216 + '/correspondence.json');
  assert.deepEqual(await read(manifest.tracesBinding), {schemaVersion: 'digest-caption-216px-reflow-traces-v001', traces});
  const correspondence = await read(manifest.correspondenceBinding);
  assert.deepEqual(correspondence, {schemaVersion: 'digest-caption-216px-reflow-correspondence-v001', rows: groupedRows, changes: groupedChanges});
  const summary = {groups: 9, oldCues: 243, fixedOldCues: groupedChanges.filter(change => change.fixed).length,
    variableOldCues: groupedChanges.filter(change => !change.fixed).length, newCues: groupedRows.length,
    newLines: groupedRows.reduce((n, row) => n + row.lines.length, 0), atoms: atoms.length,
    minDisplayFrames: Math.min(...groupedRows.map(row => row.displayFrameCount)), maxDisplayFrames: Math.max(...groupedRows.map(row => row.displayFrameCount)),
    originalClockSummary: source.cueTimeMap.summary};
  assert.deepEqual(manifest.summary, summary); assert(Number.isSafeInteger(summary.newCues) && summary.newCues > 0 && summary.newCues <= 27691);
  assert.deepEqual(manifest.admission, {presentation: 'not-connected', executionPermission: 'authorized-for-one-normal-after-technical-checks', humanQuality: 'pending', outlineChoice: null});
  assert.deepEqual(manifest.effects, {skillInvocations: 9, actualAnswerFiles: 9, mediaFontBinary: 0, rendering: 0, productChanges: 0, apiCostUsd: 0});
  const aggregateView = {...structuredClone(source.aggregateView), styleLimits: limits, taskDescription: rules.newTaskDescription};
  const output = {...source, originalAcceptedInputs: source, manifestBinding, manifest, requests, responses, results, traces, correspondence,
    captionPreparation: preparation, candidateRules: rules, candidateAuthorization: authorization,
    aggregateView, sourceConnectionDecision, sourceConnectionDecisionBinding: SOURCE_CONNECTION_DECISION, typographySettings: typography.settings, typographyValues, typographyConfiguration,
    typographySettingsBinding: manifest.typographySettingsBinding, checkedAt: new Date().toISOString()};
  function freeze(v: any) {if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {Object.values(v).forEach(freeze); Object.freeze(v);}}
  freeze(output); sourceBundles.add(output); formal216Bundles.add(output); return output;
}


type QualifiedSourcePackageRecord = {inputs: Json; bodySha256: string; mode: 'preflight' | 'manufacturing'; context?: Json};
const qualifiedSourcePackages = new WeakMap<object, QualifiedSourcePackageRecord>();

async function registerDigestFormalSourcePackageV001(value: Json, inputs: Json,
  mode: 'preflight' | 'manufacturing', context?: Json) {
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  if (mode === 'manufacturing') await assertQualifiedDigestStorageContextV001(context);
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert(!qualifiedSourcePackages.has(value), 'SOURCE_PACKAGE_ALREADY_REGISTERED');
  qualifiedSourcePackages.set(value, {inputs, bodySha256: sha(m.formal(value)), mode, context});
  const validator = await load('evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs');
  await validator.qualifyDigestFormalSourcePackageTaskV001(value, inputs);
}

/** Private creation and original-byte qualification are both necessary; JSON bindings cannot manufacture a capability. */
export async function assertQualifiedDigestFormalSourcePackageTaskV001(value: Json, inputs: Json) {
  assert(inputs !== null && typeof inputs === 'object' && formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  assert(value !== null && typeof value === 'object', 'QUALIFIED_DIGEST_SOURCE_PACKAGE_REQUIRED');
  const record = qualifiedSourcePackages.get(value);
  assert(record && record.inputs === inputs, 'QUALIFIED_DIGEST_SOURCE_PACKAGE_REQUIRED');
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  assert.equal(sha(m.formal(value)), record.bodySha256, 'QUALIFIED_DIGEST_SOURCE_PACKAGE_MUTATED');
  assert.deepEqual(inputs.manifestBinding, {path: MANIFEST, fileSha256: MANIFEST_SHA});
  for (const binding of [inputs.manifestBinding, inputs.manifest.candidateRulesBinding, inputs.manifest.authorizationBinding,
    inputs.typographySettingsBinding, inputs.sourceConnectionDecisionBinding, {path: TYPOGRAPHY_CONFIGURATION_PATH, fileSha256: TYPOGRAPHY_CONFIGURATION_SHA},
    {path: 'docs/reports/digest-caption-216px-reflow-20261003/typography-adoption-record.json',
      fileSha256: 'f0e1466475034e396478d7bfb3fef716050f0d17c6d53ab174bd1fc1666b3884'}, inputs.manifest.meaningBinding]) {
    assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256, 'QUALIFIED_DIGEST_SOURCE_ORIGINAL_HASH_CHANGED');
  }
  assert.equal(value.schemaVersion, inputs.styleTemplate.schemaVersion);
  assert.equal(value.packageId, PLAN + '-source-package');
  assert.equal(value.promptInput.taskDescription, inputs.candidateRules.newTaskDescription);
  assert.deepEqual(value.promptInput.styleLimits, inputs.requests[0].input.styleLimits);
  const captionId = inputs.aggregateView.inputCaptionId;
  const boundaries = inputs.requests.flatMap((request: Json) => request.input.captions[0].boundaryCandidates);
  assert.deepEqual(value.promptInput.captions, [{captionId, boundaryCandidates: boundaries}]);
  assert.equal(boundaries.length, 3613); assert.equal(inputs.correspondence.rows.length, inputs.manifest.summary.newCues);
  const atoms = inputs.meaning.atomOccurrences;
  assert.deepEqual(value.reconstructionMap.captions, [{captionId, meaningPackageOrdinal: 1,
    semanticCaptionId: inputs.meaning.captions[0].captionId, atomOccurrenceIds: atoms.map((atom: Json) => atom.atomOccurrenceId),
    boundaries: boundaries.map((boundary: Json, i: number) => ({boundaryId: boundary.boundaryId, ordinal: i + 1,
      afterAtomOccurrenceId: atoms[i].atomOccurrenceId}))}]);
  assert.equal(value.reconstructionMap.caseContexts.length, 1);
  const expectedMeaningBinding = record.mode === 'preflight' ? m.bind(inputs.manifest.meaningBinding.path, inputs.meaning) : m.bind((record.context!.outputRoot) + '/meaning-input.json', inputs.meaning);
  assert.deepEqual(value.reconstructionMap.meaningPackageBindings, [expectedMeaningBinding]);
  const cc = value.reconstructionMap.caseContexts[0]; assert.deepEqual(cc.meaningPackageBinding, expectedMeaningBinding); assert.equal(cc.caseId, PLAN); assert.equal(cc.inputCaptionId, captionId);
  assert.equal(cc.horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine, inputs.typographyValues.maxLogicalWidthPerLine);
  assert.equal(cc.horizontalStyleInput.captionLayoutPolicy.maxLinesPerDisplayPage, inputs.typographyValues.maxLinesPerCue);
  assert.equal(cc.resolvedStyle.maxLogicalWidthPerLine, inputs.typographyValues.maxLogicalWidthPerLine);
  assert.equal(cc.resolvedStyle.maxLinesPerDisplayPage, inputs.typographyValues.maxLinesPerCue);
  assert.equal(cc.resolvedStyle.cropMode, 'identity'); assert.equal(cc.resolvedStyle.sceneTransitionMode, 'straight-cut-only');
  assert.equal(cc.resolvedStyle.audioMode, 'preserve-source-only');
  for (const binding of [inputs.manifestBinding, inputs.manifest.candidateRulesBinding, inputs.manifest.authorizationBinding,
    inputs.typographySettingsBinding, inputs.sourceConnectionDecisionBinding, {path: TYPOGRAPHY_CONFIGURATION_PATH, fileSha256: TYPOGRAPHY_CONFIGURATION_SHA}])
    assert(value.provenance.approvedContractBindings.some((actual: Json) => actual.path === binding.path && actual.fileSha256 === binding.fileSha256),
      'QUALIFIED_DIGEST_SOURCE_PROVENANCE_CHANGED');
  assert.deepEqual(value.provenance.implementationBindings.map((binding: Json) => binding.path), IMPLEMENTATIONS);
  for (const binding of value.provenance.implementationBindings)
    assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256, 'QUALIFIED_DIGEST_IMPLEMENTATION_HASH_CHANGED');
  if (record.mode === 'manufacturing') {
    await assertQualifiedDigestStorageContextV001(record.context);
    assert.equal(value.provenance.sourcePackageJobBinding.path, record.context!.outputRoot + '/core-plan.json');
    const plan = await record.context!.readBound(value.provenance.sourcePackageJobBinding);
    assert.equal(plan.planId, PLAN); assert.equal(plan.outputRoot, record.context!.outputRoot); assert.deepEqual(plan.acceptedManifestBinding, inputs.manifestBinding);
    assert(value.provenance.approvedContractBindings.some((binding: Json) => m.same(binding, plan.authorization)), 'FORMAL_SOURCE_APPROVAL_BINDING_CHANGED');
    assert.deepEqual(plan.typographySettingsBinding, inputs.typographySettingsBinding);
    assert.deepEqual(plan.derivedTypographyValues, inputs.typographyValues);
    for (const binding of [cc.meaningPackageBinding, ...Object.values(cc.styleBindings), ...Object.values(cc.baseMediaInput)] as Json[])
      assert(binding.path.startsWith(record.context!.outputRoot + '/')
        || (record.context!.continuation !== undefined && Object.values(record.context!.continuation.base).some((base: any) => m.same(base, binding)))
        || binding.path === inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings.materialValidationIndex.path);
  } else {
    assert.equal(record.mode, 'preflight');
    assert.deepEqual(cc.baseMediaInput, inputs.styleTemplate.reconstructionMap.caseContexts[0].baseMediaInput);
    assert.deepEqual(cc.styleBindings, inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings);
    assert.equal(cc.meaningPackageBinding.path, inputs.manifest.meaningBinding.path);
    assert.equal(cc.meaningPackageBinding.fileSha256, inputs.manifest.meaningBinding.fileSha256);
    assert.equal(value.provenance.sourcePackageJobBinding.path, MANIFEST);
    assert.equal(value.provenance.sourcePackageJobBinding.fileSha256, MANIFEST_SHA);
    for (const binding of [cc.meaningPackageBinding, ...Object.values(cc.styleBindings), ...Object.values(cc.baseMediaInput)] as Json[])
      assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256, 'PREFLIGHT_EXISTING_REFERENCE_HASH_CHANGED');
  }
  return Object.freeze({taskDescription: inputs.candidateRules.newTaskDescription,
    manifestBinding: inputs.manifestBinding, candidateRulesBinding: inputs.manifest.candidateRulesBinding,
    bodySha256: record.bodySha256, mode: record.mode});
}

async function buildDigestFormalSourcePackageV001(inputs: Json, c: Json, base: Json, style: Json,
  mode: 'preflight' | 'manufacturing', context?: Json) {
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const atoms = inputs.meaning.atomOccurrences, boundaries = inputs.requests.flatMap((request: Json) => request.input.captions[0].boundaryCandidates);
  const inputCaptionId = inputs.aggregateView.inputCaptionId, sourcePackage = structuredClone(inputs.styleTemplate);
  sourcePackage.packageId = PLAN + '-source-package';
  sourcePackage.promptInput = {...structuredClone(inputs.requests[0].input), captions: [{captionId: inputCaptionId, boundaryCandidates: boundaries}]};
  const meaningBinding = mode === 'preflight' ? m.bind(inputs.manifest.meaningBinding.path, inputs.meaning) : m.bind(context!.outputRoot + '/meaning-input.json', inputs.meaning);
  const cc = structuredClone(sourcePackage.reconstructionMap.caseContexts[0]);
  cc.caseId = PLAN; cc.inputCaptionId = inputCaptionId; cc.meaningPackageBinding = meaningBinding; cc.baseMediaInput = base;
  cc.styleBindings = style.bindings; cc.horizontalStyleInput.presetBinding = {...style.bindings, presetId: cc.resolvedStyle.presetId};
  cc.horizontalStyleInput.captionLayoutPolicy.maxLogicalWidthPerLine = inputs.typographyValues.maxLogicalWidthPerLine;
  cc.resolvedStyle.maxLogicalWidthPerLine = inputs.typographyValues.maxLogicalWidthPerLine;
  cc.horizontalStyleInput.captionLayoutPolicy.maxLinesPerDisplayPage = inputs.typographyValues.maxLinesPerCue;
  cc.resolvedStyle.maxLinesPerDisplayPage = inputs.typographyValues.maxLinesPerCue;
  sourcePackage.reconstructionMap = {meaningPackageBindings: [meaningBinding], captions: [{captionId: inputCaptionId,
    meaningPackageOrdinal: 1, semanticCaptionId: inputs.meaning.captions[0].captionId,
    atomOccurrenceIds: atoms.map((atom: Json) => atom.atomOccurrenceId),
    boundaries: boundaries.map((boundary: Json, i: number) => {assert.equal(boundary.text, atoms[i].text);
      return {boundaryId: boundary.boundaryId, ordinal: i + 1, afterAtomOccurrenceId: atoms[i].atomOccurrenceId};})}], caseContexts: [cc]};
  const implementationBindings = mode === 'preflight' ? await Promise.all(IMPLEMENTATIONS.map(async p => ({path: p, fileSha256: await m.fileSha(path.join(ROOT, p))}))) : c.plan.implementationBindings;
  sourcePackage.provenance = {sourcePackageJobBinding: c.planBinding,
    implementationBindings: implementationBindings.map((binding: Json, i: number) => ({role: 'formal-handoff-' + (i + 1), ...binding})),
    approvedContractBindings: [c.plan.authorization, inputs.manifestBinding, inputs.manifest.candidateRulesBinding,
      inputs.manifest.authorizationBinding, inputs.typographySettingsBinding, inputs.sourceConnectionDecisionBinding,
      {path: TYPOGRAPHY_CONFIGURATION_PATH, fileSha256: TYPOGRAPHY_CONFIGURATION_SHA}]};
  await registerDigestFormalSourcePackageV001(sourcePackage, inputs, mode, context);
  return sourcePackage;
}

/** Uses the actual qualified Digest text/atoms, real saved JSON bindings, and no generated media receipt. */
export async function buildDigestFormalSourcePackagePreflightV001(inputs: Json) {
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const original = inputs.styleTemplate.reconstructionMap.caseContexts[0];
  return buildDigestFormalSourcePackageV001(inputs, {planBinding: m.bind(MANIFEST, inputs.manifest), plan: {authorization: AUTH216}},
    original.baseMediaInput, {bindings: original.styleBindings}, 'preflight');
}

async function candidateStyle(context: Json, inputs: Json, m: any) {
  const old = inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings;
  const registry = await m.readBound(old.presetRegistry), baseline = await m.readBound(old.rendererTrust);
  assert.equal(m.canonicalSha(baseline), '9d5ffe631033dc594c917649e2529899e303f3cb8a7d7b1b65ea0d26b7c645f2');
  const preset = structuredClone(registry);
  const profile = preset.presets.find((p: Json) => p.presetId === 'normal-landscape-readable-pop-v001');
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  assert(profile); profile.maxLogicalWidth = inputs.typographyValues.maxLogicalWidthPerLine; profile.maxLines = inputs.typographyValues.maxLinesPerCue;
  const at = profile.visualStates.findIndex((v: Json) => v.stateId === 'caption-core-v001'); assert(at >= 0);
  profile.visualStates[at] = structuredClone(inputs.manifest.technicalCandidate.props.visualState);
  preset.canvas = structuredClone(inputs.manifest.technicalCandidate.props.canvas);
  assert.deepEqual(profile.visualStates[at].textStyle, {fontAssetId: 'line-seed-jp-extra-bold-v001', fontSizePx: inputs.typographyValues.fontSizePx,
    fontColor: '#FFFDF8', borderColor: '#2F4F4F', borderWidthPx: 8, lineSpacingPercent: 150,
    glowColor: '#2F4F4F', glowWidthPx: 4, glowOpacityPercent: 82});
  const root = context.outputRoot + '/candidate-style/';
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
  assert.deepEqual(trust.layoutRules, baseline.layoutRules, 'BASELINE_LAYOUT_RULES_CHANGED');
  const candidateRules = approvedDigestCandidateLayoutRules(inputs.manifest.technicalCandidate.props.layoutRules, baseline.layoutRules, inputs.typographyValues);
  trust.layoutRules = candidateRules;
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
  await context.publish(context.outputRoot + '/candidate-style-delta.json', {schemaVersion: 'digest-formal-candidate-style-delta-v001',
    baselineTrustBinding: old.rendererTrust, acceptedMain: 'f2ef22148e7e81d7057a3907f21cc3dbe256742b',
    dependencyDelta, profileWidth: inputs.typographyValues.maxLogicalWidthPerLine, visualCapabilityWidth: 36, layoutRulesChanged: true,
    typographySettingsBinding: inputs.typographySettingsBinding, derivedTypographyValues: inputs.typographyValues,
    layoutRulesDelta: {horizontalSafeMarginRatio: {from: baseline.layoutRules.horizontalSafeMarginRatio, to: inputs.typographyValues.horizontalSafeMarginRatio}},
    candidateRulesBinding: inputs.manifest.candidateRulesBinding, candidateAuthorizationBinding: inputs.manifest.authorizationBinding,
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
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  await assertQualifiedDigestStorageContextV001(context);
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const core = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const meaning = inputs.meaning;
  const sourcePackage = await buildDigestFormalSourcePackageV001(inputs, c, base, style, 'manufacturing', context);
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
  assert(formal216Bundles.has(inputs), 'QUALIFIED_216_FORMAL_INPUTS_REQUIRED');
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const base = await load('evals/clip_composition/presentation_base_media_build_v003.mjs');
  const timeline = await load('evals/clip_composition/presentation_base_media_timeline_v004.mjs');
  assert.deepEqual(await base.inspectPresentationBaseMediaToolProfileV001(), base.PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE);
  for (const binding of timeline.PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES) assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256);
  const caller = await load('evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  await caller.observePresentationRendererRuntimeBindingsV001(inputs.rendererTemplate.runtimeBindings);
  const trust = await m.readBound(inputs.rendererTemplate.registryBindings.rendererTrust);
  const sourceValidator = await load('evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs');
  const taskFixture = await buildDigestFormalSourcePackagePreflightV001(inputs);
  const sourcePackageTask = sourceValidator.validatePresentationOutputCaptionCueSourcePackageV001(taskFixture);
  for (const binding of trust.fontAssets) assert.equal(await m.fileSha(path.join(ROOT, safe(binding.path))), binding.fileSha256);
  const entry = await load('evals/clip_composition/presentation_renderer_entry_v001.tsx');
  const inspector = await load('evals/clip_composition/inspect_presentation_render_layout_v001.ts');
  const indexer = await load('evals/clip_composition/presentation_renderer_text_layout_v001.mjs');
  const candidateLayoutRules = approvedDigestCandidateLayoutRules(inputs.manifest.technicalCandidate.props.layoutRules, trust.layoutRules, inputs.typographyValues);
  for (const row of inputs.correspondence.rows) {
    const indexed = indexer.indexExplicitLinesV001(row.lines.map((line: Json) => line.text));
    assert.equal(indexed.status, 'passed');
    const props = {...structuredClone(inputs.manifest.technicalCandidate.props), layoutRules: candidateLayoutRules,
      instructionId: PLAN + '-preflight-' + row.groupOrdinal + '-' + row.cueOrdinal,
      text: indexed.sourceText, indexedLines: indexed.indexedLines};
    entry.buildExactTextModel(props);
    const result = inspector.inspectPresentationRenderLayoutV001({canvas: props.canvas, overlays: [props]});
    assert.equal(result.status, 'passed', 'ESTIMATED_LAYOUT_REJECTED group=' + row.groupOrdinal +
      ' cue=' + row.cueOrdinal + ' frame=' + row.startFrame + ' detail=' + JSON.stringify(result.violations));
  }
  return {schemaVersion: 'digest-formal-cheap-preflight-v001', status: sourcePackageTask.status === 'passed' ? 'passed' : 'blocked',
    sourcePackageTask, mediaReady: sourcePackageTask.status === 'passed', checkedAt: new Date().toISOString(),
    clocks: {frames: 27691, audioSamples: 40705770}, exactSavedInputs: true, fontBytes: 'passed',
    runtimeBindings: 'passed', estimatedLayouts: inputs.manifest.summary.newCues, candidateRulesBinding: inputs.manifest.candidateRulesBinding, typographySettingsBinding: inputs.typographySettingsBinding, derivedTypographyValues: inputs.typographyValues, actualGlyph: 'not-yet-checked',
    toolBinaryDiagnostics: await base.inspectPresentationBaseMediaToolBinaryDiagnosticsV001()};
}

const ORIGINAL_MANUFACTURING_GRANT_ID_V001 = 'digest-formal-user-grant-20261003T070603-v001';
const PREVIOUS_MANUFACTURING_RECORD_BINDING_V001 = Object.freeze({
  path: ROOT + '/docs/reports/digest-caption-216px-reflow-20261003/manufacturing-authorization-record.json',
  fileSha256: '3d2519e4f7366ef4b919d49672eb0405ee126398442abac9021482cc6cbe71c5', sizeBytes: 3742,
});

/** Metadata equality only; the caller must still read both actual bound records. */
export function assertDigestFormalRetryAuthorizationMetadataV001(previous: Json, candidate: Json, previousBinding: Json): void {
  assert.deepEqual(previousBinding, PREVIOUS_MANUFACTURING_RECORD_BINDING_V001, 'ENTRY_RETRY_PREVIOUS_APPROVAL_BINDING_CHANGED');
  assert(!Object.hasOwn(previous, 'recordId') && !Object.hasOwn(previous, 'previousManufacturingRecordBinding'), 'ENTRY_RETRY_UNEXPECTED_PREVIOUS_METADATA');
  assert.deepEqual(Object.keys(candidate).sort(), [...Object.keys(previous), 'recordId', 'previousManufacturingRecordBinding'].sort(), 'ENTRY_RETRY_APPROVAL_EXACT_FIELDS');
  assert.equal(candidate.recordId, ORIGINAL_MANUFACTURING_GRANT_ID_V001, 'ENTRY_RETRY_ORIGINAL_GRANT_ID_CHANGED');
  assert.deepEqual(candidate.previousManufacturingRecordBinding, previousBinding, 'ENTRY_RETRY_PREVIOUS_APPROVAL_CHANGED');
  assert(typeof candidate.recordedAt === 'string' && /^2026-10-03T[0-9:.]+(?:Z|\+00:00)$/u.test(candidate.recordedAt)
    && Number.isFinite(Date.parse(candidate.recordedAt)) && Date.parse(candidate.recordedAt) > Date.parse(previous.recordedAt), 'ENTRY_RETRY_RECORDED_AT_INVALID');
  const previousBody = {...previous}, candidateBody = {...candidate};
  delete previousBody.recordedAt; delete candidateBody.recordedAt; delete candidateBody.recordId; delete candidateBody.previousManufacturingRecordBinding;
  assert.deepEqual(candidateBody, previousBody, 'ENTRY_RETRY_APPROVAL_SCOPE_CHANGED');
}

async function readDigestFormalEntryEvidenceBytesV001(binding: Json): Promise<Buffer> {
  assert(/^[0-9a-f]{64}$/u.test(binding.fileSha256) && Number.isSafeInteger(binding.sizeBytes) && binding.sizeBytes >= 0);
  const before = await lstat(binding.path, {bigint: true});
  assert(before.isFile() && !before.isSymbolicLink(), 'ENTRY_RETRY_FILE_TYPE_CHANGED');
  assert.equal(await realpath(binding.path), binding.path, 'ENTRY_RETRY_REALPATH_CHANGED');
  const bytes = await readFile(binding.path), after = await lstat(binding.path, {bigint: true});
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'] as const) assert.equal(after[key], before[key], 'ENTRY_RETRY_FILE_UNSTABLE');
  assert.equal(sha(bytes), binding.fileSha256, 'ENTRY_RETRY_ACTUAL_BYTES_CHANGED');
  assert.equal(bytes.length, binding.sizeBytes, 'ENTRY_RETRY_ACTUAL_SIZE_CHANGED');
  return bytes;
}

const ENTRY_EVALUATION_FAILURE_BINDINGS_V001 = Object.freeze({
  "originalPermitBinding": {
    "path": "/Users/kawafmm/Documents/Codex/2026-10-03/task-3/216-formal-manufacturing-permit.json",
    "fileSha256": "7cbe0ba3c7068052bd076da9437a2ad6416ef3aa3240b0b644d8546d56e26f62",
    "sizeBytes": 3689
  },
  "summaryBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor/summary.json",
    "fileSha256": "82a0b3a4cb6e2e929d239f1c3ae5c2a49186967e93269b1348d5c7fe06a1a17d",
    "sizeBytes": 1468
  },
  "ownedGroupBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor/owned-group.json",
    "fileSha256": "e1e9149b7a38261ca7f385d778d4c1b1a798751844dc6b8c45f444e2e68ae983",
    "sizeBytes": 2178
  },
  "shutdownBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor/group-shutdown.json",
    "fileSha256": "327dd123337d55e8452ca26259aa82ab7d1d32de8fa321e2295a48937f138cab",
    "sizeBytes": 799
  },
  "resourceBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor/resource.jsonl",
    "fileSha256": "efa68a568c6be1fe79dd5a05fc0a5ec289162d7c7023f5f893c78e3c47e8d749",
    "sizeBytes": 2838
  },
  "workerLogBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor/worker.log",
    "fileSha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "sizeBytes": 0
  }
});

for (const binding of Object.values(ENTRY_EVALUATION_FAILURE_BINDINGS_V001)) Object.freeze(binding);

/** Read-only eligibility for the sole pre-media ESM entry failure. This is not a manufacturing grant. */
export async function inspectDigestFormalEntryRetryEvidenceV001(permit: Json, generatedRoot: string): Promise<Json> {
  assert.equal(generatedRoot, path.join(GUEST, OUT), 'ENTRY_RETRY_OUTPUT_ROOT_CHANGED');
  assert.equal(permit.status, 'verified-formal-handoff-v001');
  assert.equal(permit.bindings.planId, PLAN); assert.equal(permit.bindings.logicalPrefix, OUT);
  assert.equal(permit.monitorDirectory, generatedRoot + '/monitor-retry-entry-v001', 'ENTRY_RETRY_MONITOR_CHANGED');
  const proof = permit.entryRetry;
  assert(proof && typeof proof === 'object' && !Array.isArray(proof), 'ENTRY_RETRY_EVIDENCE_REQUIRED');
  assert.deepEqual(Object.keys(proof).sort(), ['schemaVersion', ...Object.keys(ENTRY_EVALUATION_FAILURE_BINDINGS_V001)].sort(), 'ENTRY_RETRY_EXACT_FIELDS');
  assert.equal(proof.schemaVersion, 'digest-formal-entry-retry-v001');
  const observed: Json = {};
  for (const [role, expected] of Object.entries(ENTRY_EVALUATION_FAILURE_BINDINGS_V001)) {
    assert.deepEqual(proof[role], expected, 'ENTRY_RETRY_BINDING_CHANGED: ' + role);
    const bytes = await readDigestFormalEntryEvidenceBytesV001(expected);
    observed[role] = role === 'workerLogBinding' || role === 'resourceBinding' ? bytes : JSON.parse(bytes.toString());
  }
  const previous = observed.originalPermitBinding, summary = observed.summaryBinding;
  const owned = observed.ownedGroupBinding, shutdown = observed.shutdownBinding;
  assert.equal(previous.status, 'verified-formal-handoff-v001');
  assert.equal(previous.monitorDirectory, generatedRoot + '/monitor');
  assert.equal(previous.bindings.implementationSha, 'c49915309107a62bf019bf6c3be0d3884466bc61');
  assert.equal(previous.bindings.commandPermitPath, ENTRY_EVALUATION_FAILURE_BINDINGS_V001.originalPermitBinding.path);
  assert.equal(previous.command.at(-1), previous.bindings.commandPermitPath);
  for (const key of ['planId', 'logicalPrefix', 'planManifest']) assert.deepEqual(permit.bindings[key], previous.bindings[key], 'ENTRY_RETRY_PLAN_CHANGED');
  assert.deepEqual(previous.bindings.approvalRecord, PREVIOUS_MANUFACTURING_RECORD_BINDING_V001, 'ENTRY_RETRY_PREVIOUS_APPROVAL_BINDING_CHANGED');
  const nextApprovalBinding = permit.bindings.approvalRecord;
  assert.deepEqual(Object.keys(nextApprovalBinding).sort(), ['path', 'fileSha256', 'sizeBytes'].sort(), 'ENTRY_RETRY_APPROVAL_BINDING_EXACT_FIELDS');
  assert.equal(nextApprovalBinding.path, ROOT + '/docs/reports/digest-caption-216px-reflow-20261003/manufacturing-authorization-retry-record.json', 'ENTRY_RETRY_NEW_APPROVAL_PATH_CHANGED');
  const previousApproval = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(previous.bindings.approvalRecord)).toString());
  const nextApproval = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(nextApprovalBinding)).toString());
  assertDigestFormalRetryAuthorizationMetadataV001(previousApproval, nextApproval, previous.bindings.approvalRecord);
  assert.deepEqual(permit.storage, previous.storage, 'ENTRY_RETRY_STORAGE_CHANGED');
  assert.deepEqual(permit.command.slice(0, -1), previous.command.slice(0, -1), 'ENTRY_RETRY_COMMAND_CHANGED');
  assert.equal(permit.command.at(-1), permit.bindings.commandPermitPath);
  assert.deepEqual(permit.implementation.map((item: Json) => item.path), previous.implementation.map((item: Json) => item.path), 'ENTRY_RETRY_IMPLEMENTATION_PATHS_CHANGED');
  assert.equal(summary.status, 'interrupted'); assert.equal(summary.reason, 'formal worker nonzero exit');
  assert.equal(summary.exitCode, 13); assert.equal(summary.stage, null); assert.deepEqual(summary.remainingRunning, []);
  assert.deepEqual(summary.command, previous.command); assert.equal(summary.formalPermit, previous.bindings.commandPermitPath);
  assert.deepEqual(owned.command, previous.command); assert.deepEqual(owned.bindings, previous.bindings);
  assert.deepEqual(owned.storage, previous.storage); assert.equal(owned.permitFile, previous.bindings.commandPermitPath);
  assert.equal(owned.group, owned.parentPid); assert.equal(owned.group, shutdown.group);
  assert.deepEqual(summary.imageIdentity, owned.imageIdentity); assert.deepEqual(shutdown.remaining, []); assert.deepEqual(shutdown.remainingRunning, []);
  assert.equal(observed.workerLogBinding.length, 0);
  const oldMonitor = generatedRoot + '/monitor';
  assert.equal(await realpath(oldMonitor), oldMonitor);
  assert.deepEqual((await readdir(oldMonitor)).sort(), ['group-shutdown.json', 'owned-group.json', 'resource.jsonl', 'summary.json', 'worker.log']);
  assert.deepEqual(await readdir(generatedRoot + '/temp'), [], 'ENTRY_RETRY_TEMP_NOT_EMPTY');
  const allowedRootEntries = ['monitor', 'monitor-retry-entry-v001', 'temp'];
  const rootEntries = await readdir(generatedRoot);
  assert(rootEntries.includes('monitor') && rootEntries.includes('temp') && rootEntries.every(name => allowedRootEntries.includes(name)), 'ENTRY_RETRY_PRE_MEDIA_ROOT_CHANGED');
  for (const name of rootEntries) {
    const absolute = generatedRoot + '/' + name, info = await lstat(absolute);
    assert(info.isDirectory() && !info.isSymbolicLink()); assert.equal(await realpath(absolute), absolute);
  }
  return Object.freeze({status: 'qualified-specific-pre-media-entry-failure', allowedRootEntries: Object.freeze(allowedRootEntries),
    originalSummaryBinding: ENTRY_EVALUATION_FAILURE_BINDINGS_V001.summaryBinding, manufacturingAuthorizationRequired: true});
}


const BODY_FAILURE_BINDINGS_V001: Json = Object.freeze({
  "previousPermitBinding": {
    "path": "/Users/kawafmm/Documents/Codex/2026-10-03/task-3/216-formal-manufacturing-retry-permit.json",
    "fileSha256": "c8eabe20604009d58a5f96a07810cea68e277c03f2ff69b7c8158bef1a9b99ff",
    "sizeBytes": 5464
  },
  "failureEvidenceBinding": {
    "path": "/Users/kawafmm/workspace/zev2/docs/reports/digest-caption-216px-reflow-20261003/body-timeout-evidence.json",
    "fileSha256": "be594a57246ff43b4d4e6c4ce22ca25db1a2a77d9396a7c5b6577b845cd29b13",
    "sizeBytes": 7900
  },
  "workerLogBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor-retry-entry-v001/worker.log",
    "fileSha256": "ccae1042a551ad7236a02eba03b7ccba5c819b21c52cf5a752b4130d8ee8df3b",
    "sizeBytes": 376
  },
  "resourceBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/monitor-retry-entry-v001/resource.jsonl",
    "fileSha256": "4e938bedbd5eca322653d05e6ac1ec60e138a617fa4ead06a41d168a4dc1ab73",
    "sizeBytes": 2144624
  },
  "baseMediaBinding": {
    "path": "/Volumes/ZEV-Digest-20261003-01/runtime/artifacts/digest-formal-handoff-20261003-v001/attempt-001/base-media/base-media.mp4",
    "fileSha256": "3c16357caee723c7ebd9ef2f0d78c3e4752b9255913a825dec7e04e3b8291b38",
    "sizeBytes": 639776321
  },
  "rendererImportFailureBinding": {
    "path": "/Users/kawafmm/workspace/zev2/docs/reports/digest-caption-216px-reflow-20261003/renderer-import-failure-evidence.json",
    "fileSha256": "e2acdf88998d88029d91564522d3d1f56ad6ce910545f9b2d3e754942e5a6c91",
    "sizeBytes": 13907
  },
  "encodedQcFailureBinding": {
    "path": "/Users/kawafmm/workspace/zev2/docs/reports/digest-caption-216px-reflow-20261003/encoded-qc-failure-evidence.json",
    "fileSha256": "65ffb659d1a8ef24612dc1fa7b4f89a5ec82e3151632a700e899d3aeb36b3b43",
    "sizeBytes": 147008
  },
  "cleanEntryFailureBinding": {
    "path": "/Users/kawafmm/workspace/zev2/docs/reports/digest-caption-216px-reflow-20261003/clean-entry-failure-evidence.json",
    "fileSha256": "9a64d026520ef4211d2158bb98f17d3aebd25a9f1ac43de2673719dca8c485ec",
    "sizeBytes": 7953
  }
});
for (const binding of Object.values(BODY_FAILURE_BINDINGS_V001)) Object.freeze(binding);

/** Actual retained base bytes, never a substitute or a large in-memory copy. */
async function verifyDigestFormalBodyVideoV001(binding: Json) {
  const before = await lstat(binding.path, {bigint: true});
  assert(before.isFile() && !before.isSymbolicLink()); assert.equal(await realpath(binding.path), binding.path);
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(binding.path)) {hash.update(chunk); bytes += chunk.length;}
  const after = await lstat(binding.path, {bigint: true});
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'] as const) assert.equal(before[key], after[key], 'BODY_BASE_UNSTABLE');
  assert.equal(bytes, binding.sizeBytes, 'BODY_BASE_SIZE_CHANGED');
  assert.equal(hash.digest('hex'), binding.fileSha256, 'BODY_BASE_BYTES_CHANGED');
}

/** Eligibility only for the recorded body timeout of this already approved single plan. */
export async function inspectDigestFormalBodyContinuationV001(permit: Json): Promise<Json> {
  const proof = permit.bodyContinuation;
  assert(proof && typeof proof === 'object' && !Array.isArray(proof), 'BODY_CONTINUATION_EVIDENCE_REQUIRED');
  assert.deepEqual(Object.keys(proof).sort(), ['schemaVersion', 'ownerBinding', ...Object.keys(BODY_FAILURE_BINDINGS_V001)].sort(), 'BODY_CONTINUATION_EXACT_FIELDS');
  assert.equal(proof.schemaVersion, 'digest-formal-body-continuation-v003');
  assert(!Object.hasOwn(permit, 'entryRetry'), 'BODY_CONTINUATION_NOT_ENTRY_RETRY');
  const oldRoot = path.join(GUEST, OUT), newRoot = path.join(GUEST, BODY_OUT);
  assert.equal(permit.status, 'verified-formal-handoff-v001');
  assert.equal(permit.bindings.planId, PLAN); assert.equal(permit.bindings.logicalPrefix, OUT);
  assert.equal(permit.monitorDirectory, newRoot + '/monitor-retry-clean-v001', 'BODY_CONTINUATION_FIXED_CHILD_REQUIRED');
  const observed: Json = {};
  for (const [role, expected] of Object.entries(BODY_FAILURE_BINDINGS_V001) as [string, Json][]) {
    assert.deepEqual(proof[role], expected, 'BODY_CONTINUATION_BINDING_CHANGED: ' + role);
    if (role === 'baseMediaBinding') {await verifyDigestFormalBodyVideoV001(expected); continue;}
    const bytes = await readDigestFormalEntryEvidenceBytesV001(expected);
    observed[role] = ['workerLogBinding', 'resourceBinding'].includes(role) ? bytes : JSON.parse(bytes.toString());
  }
  const previous = observed.previousPermitBinding, evidence = observed.failureEvidenceBinding;
  assert.equal(previous.bindings.implementationSha, 'e37361ca38c9e89507ebb2d40b616cad886a5d79');
  assert.equal(previous.monitorDirectory, oldRoot + '/monitor-retry-entry-v001');
  const cleanFailure = observed.cleanEntryFailureBinding;
  assert.equal(cleanFailure.schemaVersion, 'digest-formal-clean-entry-failure-evidence-v001');
  assert.equal(cleanFailure.outputRoot, newRoot); assert.equal(cleanFailure.implementationSha, '742dd96bb3b125ef80e278f7c323485f8b8d26b2');
  assert.equal(cleanFailure.mediaStarted, 0); assert.equal(cleanFailure.outputsStarted, 0);
  for (const [name, ref] of Object.entries(cleanFailure.bindings) as [string, Json][]) {
    safe(name); assert.equal(ref.path, newRoot + '/' + name); await readDigestFormalEntryEvidenceBytesV001(ref);
  }
  const cleanPermit = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(cleanFailure.previousPermitBinding)).toString());
  assert.equal(cleanPermit.bindings.implementationSha, cleanFailure.implementationSha);
  assert.equal(cleanPermit.monitorDirectory, newRoot + '/monitor');
  for (const key of ['planId', 'logicalPrefix', 'planManifest', 'approvalRecord']) assert.deepEqual(cleanPermit.bindings[key], previous.bindings[key], 'BODY_CLEAN_ENTRY_GRANT_CHANGED');
  assert.deepEqual(cleanPermit.storage, previous.storage);
  assert.deepEqual(cleanFailure.summary.command, cleanPermit.command); assert.deepEqual(cleanFailure.owned.command, cleanPermit.command);
  assert.deepEqual(cleanFailure.owned.bindings, cleanPermit.bindings); assert.equal(cleanFailure.owned.group, 38281);
  assert.equal(cleanFailure.owned.parentPid, cleanFailure.owned.group); assert.equal(cleanFailure.shutdown.group, cleanFailure.owned.group);
  assert.equal(cleanFailure.summary.status, 'interrupted'); assert.equal(cleanFailure.summary.exitCode, 1); assert.equal(cleanFailure.summary.stage, null);
  assert.deepEqual(cleanFailure.summary.remainingRunning, []); assert.deepEqual(cleanFailure.shutdown.remainingRunning, []); assert.deepEqual(cleanFailure.shutdown.remaining, []);
  assert((await readFile(newRoot + '/monitor/worker.log', 'utf8')).includes('CLEAN_IMPLEMENTATION_REQUIRED'), 'BODY_EXACT_CLEAN_ENTRY_FAILURE_REQUIRED');
  for (const name of ['core-plan.json', 'source-package.json', 'renderer-job.json', 'render', 'renderer-result.json', 'admission-receipt.json', 'line-layout.json', 'result.json', 'low-memory-composite.json']) await absent(newRoot + '/' + name);
  for (let i = 0; i < IMPLEMENTATIONS.length; i++) {
    const code = (await exec('git', ['show', cleanPermit.bindings.implementationSha + ':' + IMPLEMENTATIONS[i]], {cwd: ROOT, encoding: 'buffer', maxBuffer: 4000000})).stdout as Buffer;
    assert.equal(sha(code), cleanPermit.implementation[i].fileSha256, 'BODY_CLEAN_ENTRY_CODE_CHANGED');
  }

  const qcFailure = observed.encodedQcFailureBinding;
  const qcRoot = oldRoot + '/body-continuation-v002';
  assert.equal(qcFailure.schemaVersion, 'digest-formal-encoded-qc-failure-evidence-v001');
  assert.equal(qcFailure.outputRoot, qcRoot); assert.equal(qcFailure.implementationSha, '7b6e039ddd9b771d9822623181b0e95ad8ad3829');
  assert.equal(qcFailure.technicalQc, 'failed'); assert.equal(qcFailure.serializePngAndFilters, false);
  assert.equal(qcFailure.qcMethod, 'encoded-omission-v2'); assert.equal(qcFailure.sampleCount, 1); assert.equal(qcFailure.completedFrameCount, 0);
  for (const [name, ref] of Object.entries(qcFailure.bindings) as [string, Json][]) {
    safe(name); assert.equal(ref.path, qcRoot + '/' + name); await readDigestFormalEntryEvidenceBytesV001(ref);
  }
  await verifyDigestFormalBodyVideoV001(qcFailure.videoBinding);
  const qcComposite = JSON.parse(await readFile(qcRoot + '/low-memory-composite.json', 'utf8'));
  assert.equal(qcComposite.status, 'completed'); assert.equal(qcComposite.scope.frameCount, 27691);
  assert.equal(qcComposite.output.path, qcFailure.videoBinding.path); assert.equal(qcComposite.output.fileSha256, qcFailure.videoBinding.fileSha256);
  assert.equal(qcComposite.output.bytes, qcFailure.videoBinding.sizeBytes);
  assert.equal(qcFailure.overlayBindings.length, 372);
  for (const ref of qcFailure.overlayBindings as Json[]) {
    assert(ref.path.startsWith(qcRoot + '/.render.presentation-renderer-v002-work-ZwvMgf/publish/overlays/'));
    await readDigestFormalEntryEvidenceBytesV001(ref);
  }
  const qcPermit = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(qcFailure.previousPermitBinding)).toString());
  assert.equal(qcPermit.bindings.implementationSha, qcFailure.implementationSha);
  assert.equal(qcPermit.monitorDirectory, qcRoot + '/monitor');
  for (const key of ['planId', 'logicalPrefix', 'planManifest', 'approvalRecord']) assert.deepEqual(qcPermit.bindings[key], previous.bindings[key], 'BODY_QC_FAILURE_GRANT_CHANGED');
  assert.deepEqual(qcPermit.storage, previous.storage);
  assert.deepEqual(qcFailure.summary.command, qcPermit.command); assert.deepEqual(qcFailure.owned.command, qcPermit.command);
  assert.deepEqual(qcFailure.owned.bindings, qcPermit.bindings); assert.equal(qcFailure.owned.group, 77704);
  assert.equal(qcFailure.owned.parentPid, qcFailure.owned.group); assert.equal(qcFailure.shutdown.group, qcFailure.owned.group);
  assert.equal(qcFailure.summary.status, 'interrupted'); assert.equal(qcFailure.summary.reason, 'formal worker nonzero exit'); assert.equal(qcFailure.summary.exitCode, 1);
  assert.deepEqual(qcFailure.summary.remainingRunning, []); assert.deepEqual(qcFailure.shutdown.remainingRunning, []); assert.deepEqual(qcFailure.shutdown.remaining, []);
  assert.equal(qcFailure.rendererFailure.status, 'process_failed'); assert.equal(qcFailure.rendererFailure.message, 'encoded counterfactual frame pipeline did not complete successfully');
  await absent(qcRoot + '/result.json'); await absent(qcRoot + '/render');
  for (let i = 0; i < IMPLEMENTATIONS.length; i++) {
    const code = (await exec('git', ['show', qcPermit.bindings.implementationSha + ':' + IMPLEMENTATIONS[i]], {cwd: ROOT, encoding: 'buffer', maxBuffer: 4000000})).stdout as Buffer;
    assert.equal(sha(code), qcPermit.implementation[i].fileSha256, 'BODY_QC_FAILURE_CODE_CHANGED');
  }

  const importFailure = observed.rendererImportFailureBinding;
  const importRoot = oldRoot + '/body-continuation-v001';
  assert.equal(importFailure.schemaVersion, 'digest-formal-renderer-import-failure-evidence-v001');
  assert.equal(importFailure.outputRoot, importRoot); assert.equal(importFailure.implementationSha, 'e8e80af06efe1332a152eda68003558948517bdf');
  assert.equal(importFailure.mediaStarted, 0); assert.equal(importFailure.subtitleRendering, 'not-started');
  for (const [name, ref] of Object.entries(importFailure.bindings) as [string, Json][]) {
    safe(name); assert.equal(ref.path, importRoot + '/' + name); await readDigestFormalEntryEvidenceBytesV001(ref);
  }
  const importPermit = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(importFailure.previousPermitBinding)).toString());
  assert.equal(importPermit.bindings.implementationSha, importFailure.implementationSha);
  assert.equal(importPermit.monitorDirectory, importRoot + '/monitor');
  assert.deepEqual(importFailure.summary.command, importPermit.command); assert.deepEqual(importFailure.owned.bindings, importPermit.bindings);
  assert.deepEqual(importFailure.owned.command, importPermit.command); assert.equal(importFailure.owned.group, importFailure.owned.parentPid);
  assert.equal(importFailure.shutdown.group, importFailure.owned.group);
  assert.equal(importFailure.summary.status, 'interrupted'); assert.equal(importFailure.summary.stage, 'body'); assert.equal(importFailure.summary.exitCode, 1);
  assert.deepEqual(importFailure.summary.remainingRunning, []); assert.deepEqual(importFailure.shutdown.remainingRunning, []); assert.deepEqual(importFailure.shutdown.remaining, []);
  for (const key of ['planId', 'logicalPrefix', 'planManifest', 'approvalRecord']) assert.deepEqual(importPermit.bindings[key], previous.bindings[key], 'BODY_IMPORT_FAILURE_GRANT_CHANGED');
  assert.deepEqual(importPermit.storage, previous.storage);
  const importLog = await readFile(importRoot + '/monitor/worker.log', 'utf8');
  assert(importLog.includes('ERR_UNSUPPORTED_RESOLVE_REQUEST') && importLog.includes('run_presentation_instruction_renderer_job_v002.ts') && importLog.includes('data:text/javascript,'), 'BODY_EXACT_IMPORT_FAILURE_REQUIRED');
  for (const name of ['render', 'renderer-result.json', 'admission-receipt.json', 'line-layout.json', 'result.json', 'low-memory-composite.json']) await absent(importRoot + '/' + name);
  assert.deepEqual(await readdir(importRoot + '/temp'), []);
  for (let i = 0; i < IMPLEMENTATIONS.length; i++) {
    const code = (await exec('git', ['show', importPermit.bindings.implementationSha + ':' + IMPLEMENTATIONS[i]], {cwd: ROOT, encoding: 'buffer', maxBuffer: 4000000})).stdout as Buffer;
    assert.equal(sha(code), importPermit.implementation[i].fileSha256, 'BODY_IMPORT_FAILURE_CODE_CHANGED');
  }

  assert.equal(evidence.schemaVersion, 'digest-formal-body-timeout-final-evidence-v001');
  assert.equal(evidence.outputRoot, oldRoot); assert.equal(evidence.baseValidation, 'passed');
  assert.equal(evidence.subtitleRendering, 'not-started'); assert.equal(evidence.finalComposite, 'not-started');
  for (const [name, ref] of Object.entries(evidence.bindings) as [string, Json][]) {
    safe(name); await readDigestFormalEntryEvidenceBytesV001({path: oldRoot + '/' + name, ...ref});
  }
  const summary = JSON.parse(await readFile(oldRoot + '/monitor-retry-entry-v001/summary.json', 'utf8'));
  const shutdown = JSON.parse(await readFile(oldRoot + '/monitor-retry-entry-v001/group-shutdown.json', 'utf8'));
  const owned = JSON.parse(await readFile(oldRoot + '/monitor-retry-entry-v001/owned-group.json', 'utf8'));
  assert.deepEqual(summary, evidence.summary); assert.deepEqual(shutdown, evidence.shutdown);
  assert.equal(summary.status, 'interrupted'); assert.equal(summary.reason, 'formal worker nonzero exit');
  assert.equal(summary.stage, 'body'); assert.equal(summary.exitCode, -15); assert.deepEqual(summary.remainingRunning, []);
  assert.deepEqual(summary.command, previous.command); assert.equal(summary.formalPermit, previous.bindings.commandPermitPath);
  assert.deepEqual(owned.command, previous.command); assert.deepEqual(owned.bindings, previous.bindings);
  assert.deepEqual(owned.storage, previous.storage); assert.equal(owned.permitFile, previous.bindings.commandPermitPath);
  assert.equal(owned.group, 58723); assert.equal(owned.parentPid, owned.group); assert.equal(shutdown.group, owned.group);
  assert.deepEqual(shutdown.remaining, []); assert.deepEqual(shutdown.remainingRunning, []);
  const processes = (await exec('/bin/ps', ['-axo', 'pid=,pgid=,stat=,args='])).stdout;
  assert(!processes.split('\n').some(line => {const row = line.trim().split(/\s+/u); return row[1] === String(owned.group) && !row[2]?.startsWith('Z');}), 'BODY_PREVIOUS_OWNER_LIVE');
  assert(!processes.split('\n').some(line => {const row = line.trim().split(/\s+/u); return row[1] === String(importFailure.owned.group) && !row[2]?.startsWith('Z');}), 'BODY_IMPORT_FAILURE_OWNER_LIVE');
  assert(!processes.split('\n').some(line => {const row = line.trim().split(/\s+/u); return row[1] === String(qcFailure.owned.group) && !row[2]?.startsWith('Z');}), 'BODY_QC_FAILURE_OWNER_LIVE');
  assert(!processes.split('\n').some(line => {const row = line.trim().split(/\s+/u); return row[1] === String(cleanFailure.owned.group) && !row[2]?.startsWith('Z');}), 'BODY_CLEAN_ENTRY_OWNER_LIVE');
  assert(observed.workerLogBinding.toString().includes('SUPERVISOR_REPLY_TIMEOUT'), 'BODY_EXACT_TIMEOUT_REQUIRED');
  const resources = observed.resourceBinding.toString().trim().split('\n').map((line: string) => JSON.parse(line));
  assert(resources.some((sample: Json) => sample.phase === 'before-body' && sample.pressure === 1), 'BODY_BEFORE_BODY_SAMPLE_REQUIRED');
  for (const key of ['planId', 'logicalPrefix', 'planManifest', 'approvalRecord']) assert.deepEqual(permit.bindings[key], previous.bindings[key], 'BODY_PREVIOUS_GRANT_OR_INPUT_CHANGED');
  assert.deepEqual(permit.storage, previous.storage, 'BODY_STORAGE_CHANGED');
  assert.deepEqual(permit.command.slice(0, -1), previous.command.slice(0, -1), 'BODY_ENTRY_CHANGED');
  assert.equal(permit.command.at(-1), permit.bindings.commandPermitPath);
  assert.deepEqual(permit.implementation.map((ref: Json) => ref.path), previous.implementation.map((ref: Json) => ref.path), 'BODY_IMPLEMENTATION_PATHS_CHANGED');
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  for (let i = 0; i < IMPLEMENTATIONS.length; i++) {
    const oldCode = (await exec('git', ['show', previous.bindings.implementationSha + ':' + IMPLEMENTATIONS[i]], {cwd: ROOT, encoding: 'buffer', maxBuffer: 4000000})).stdout as Buffer;
    assert.equal(sha(oldCode), previous.implementation[i].fileSha256, 'BODY_OLD_IMPLEMENTATION_CHANGED');
    assert.equal(await m.fileSha(permit.implementation[i].path), permit.implementation[i].fileSha256, 'BODY_CURRENT_IMPLEMENTATION_CHANGED');
    if (i >= 3) assert.equal(permit.implementation[i].fileSha256, previous.implementation[i].fileSha256, 'BODY_UNCHANGED_IMPLEMENTATION_CHANGED');
    if (i === 1) {
      const currentCode = await readFile(permit.implementation[i].path, 'utf8');
      assert.equal(currentCode.replace("if ((storageContext.outputRoot !== DIGEST_STORAGE_OUTPUT_ROOT\n    && storageContext.outputRoot !== DIGEST_STORAGE_OUTPUT_ROOT + '/body-continuation-v003')", "if (storageContext.outputRoot !== DIGEST_STORAGE_OUTPUT_ROOT").replace("{storageContext, serializePngAndFilters: true}", "{storageContext}"), oldCode.toString(), 'BODY_CORE_EXACT_CONNECTION_DIFF_REQUIRED');
    }

    if (i === 2) {
      const currentCode = await readFile(permit.implementation[i].path, 'utf8');
      const reversed = currentCode.replace("import {fileURLToPath, pathToFileURL} from 'node:url';", "import {fileURLToPath} from 'node:url';")
        .replace("pathToFileURL(path.resolve(MODULE_DIRECTORY, '../../runner/src/digest-formal-handoff-v001.ts')).href", "'../../runner/src/digest-formal-handoff-v001.js'");
      assert.equal(reversed, oldCode.toString(), 'BODY_CALLER_EXACT_IMPORT_DIFF_REQUIRED');
    }
  }
  for (const name of ['render', 'renderer-result.json', 'admission-receipt.json', 'line-layout.json', 'result.json', 'low-memory-composite.json']) await absent(oldRoot + '/' + name);
  assert.deepEqual(await readdir(oldRoot + '/temp'), [], 'BODY_PREVIOUS_TEMP_NOT_EMPTY');
  assert.equal(await realpath(newRoot), newRoot); assert.equal(await realpath(newRoot + '/temp'), newRoot + '/temp');
  assert.deepEqual(await readdir(newRoot + '/temp'), [], 'BODY_NEW_TEMP_NOT_EMPTY');
  const entries = await readdir(newRoot);
  assert(entries.includes('ownership.json') && entries.includes('temp') && entries.every(name => ['ownership.json', 'ownership-retry-clean-v001.json', 'temp', 'monitor', 'monitor-retry-clean-v001'].includes(name)), 'BODY_NEW_ROOT_ALREADY_USED');
  assert.equal(proof.ownerBinding.path, newRoot + '/ownership-retry-clean-v001.json', 'BODY_OWNER_PATH_CHANGED');
  const owner = JSON.parse((await readDigestFormalEntryEvidenceBytesV001(proof.ownerBinding)).toString());
  assert.deepEqual(Object.keys(owner).sort(), ['schemaVersion', 'ownerId', 'createdAt', 'controllerPid', 'implementationSha', 'commandPermitPath', 'outputRoot', 'manifestSha256'].sort(), 'BODY_OWNER_EXACT_FIELDS');
  assert.equal(owner.schemaVersion, 'digest-formal-body-exclusive-owner-v001'); assert(/^[0-9a-f-]{36}$/u.test(owner.ownerId));
  assert.equal(owner.outputRoot, BODY_OUT); assert.equal(owner.manifestSha256, MANIFEST_SHA);
  assert.equal(owner.implementationSha, permit.bindings.implementationSha); assert.equal(owner.commandPermitPath, permit.bindings.commandPermitPath);
  assert(Number.isSafeInteger(owner.controllerPid) && owner.controllerPid > 0); process.kill(owner.controllerPid, 0);
  assert(Number.isFinite(Date.parse(owner.createdAt)) && Date.now() - Date.parse(owner.createdAt) >= 0 && Date.now() - Date.parse(owner.createdAt) < 600000, 'BODY_OWNER_NOT_FRESH');
  const baseManifest = JSON.parse(await readFile(oldRoot + '/base-media/generation-manifest.json', 'utf8'));
  const receipt = JSON.parse(await readFile(oldRoot + '/base-media/validation-receipt.json', 'utf8'));
  assert.equal(receipt.status, 'passed'); assert.equal(receipt.outputs.baseMedia.path, OUT + '/base-media/base-media.mp4');
  assert.equal(receipt.outputs.baseMedia.fileSha256, BODY_FAILURE_BINDINGS_V001.baseMediaBinding.fileSha256);
  const oldPackage = JSON.parse(await readFile(oldRoot + '/source-package.json', 'utf8'));
  const base = oldPackage.reconstructionMap.caseContexts[0].baseMediaInput;
  assert.deepEqual(Object.keys(base).sort(), ['baseMedia', 'timeline', 'generationManifest', 'validationReceipt'].sort());
  for (const ref of Object.values(base) as Json[]) {
    assert(ref.path.startsWith(OUT + '/base-media/'));
    const expected = ref.path.endsWith('.mp4') ? BODY_FAILURE_BINDINGS_V001.baseMediaBinding : {...evidence.bindings[ref.path.slice(OUT.length + 1)], path: oldRoot + ref.path.slice(OUT.length)};
    assert.equal(ref.fileSha256, expected.fileSha256); if (ref.sizeBytes !== undefined) assert.equal(ref.sizeBytes, expected.sizeBytes);
  }
  assert.equal(baseManifest.outputs.baseMedia.frameCount, 27691, 'BODY_BASE_FRAME_COUNT_CHANGED');
  assert.equal(baseManifest.audio.encodeInput.sampleCount, 40705770, 'BODY_BASE_SAMPLE_COUNT_CHANGED');
  assert.equal(baseManifest.segments.length, 9, 'BODY_BASE_SEGMENTS_CHANGED');
  const qualification = {status: 'qualified-specific-stopped-body', outputRoot: BODY_OUT, base,
    previousImplementationSha: previous.bindings.implementationSha, previousImplementationBindings: previous.implementation,
    currentImplementationSha: permit.bindings.implementationSha, currentImplementationBindings: permit.implementation,
    previousEvidence: structuredClone(proof), importFailureImplementationSha: importFailure.implementationSha, importFailureImplementationBindings: importPermit.implementation, qcFailureImplementationSha: qcFailure.implementationSha, qcFailureImplementationBindings: qcPermit.implementation, cleanEntryFailureImplementationSha: cleanFailure.implementationSha, cleanEntryFailureImplementationBindings: cleanPermit.implementation, oldResultsPreserved: true, manufacturingAuthorizationRequired: true};
  function freeze(value: any) {if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {Object.values(value).forEach(freeze); Object.freeze(value);}}
  freeze(qualification); return qualification;
}

export async function runDigestFormalCandidateV001(permitPath: string) {
  const began = Date.now(), permit = JSON.parse(await readFile(permitPath, 'utf8'));
  const m = await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const inputs = await readDigestFormal216HandoffInputsV002();
  const preflight = await inspectDigestFormalPreflightV001(inputs);
  assert.equal(preflight.sourcePackageTask.status, 'passed', 'FORMAL_CAPTION_TASK_UNSUPPORTED ' + JSON.stringify(preflight.sourcePackageTask));
  assert.equal(preflight.mediaReady, true, 'FORMAL_CAPTION_TASK_UNSUPPORTED');
  const {context, approval} = await storage(permitPath, permit, m, inputs);
  const outputRoot = context.outputRoot;
  await absent(context.resolve(outputRoot + '/core-plan.json'));
  const allowedRootEntries = context.continuation !== undefined ? ['ownership.json', 'ownership-retry-clean-v001.json', 'temp', 'monitor', 'monitor-retry-clean-v001'] : permit.monitorDirectory === context.generatedRoot + '/monitor' && !Object.hasOwn(permit, 'entryRetry')
    ? ['monitor', 'temp'] : (await inspectDigestFormalEntryRetryEvidenceV001(permit, context.generatedRoot)).allowedRootEntries;
  assert((await readdir(context.generatedRoot)).every(name => allowedRootEntries.includes(name)), 'UNEXPECTED_GENERATED_ROOT_CONTENT');
  assert.equal(await realpath(permit.monitorDirectory), permit.monitorDirectory, 'FORMAL_MONITOR_NOT_OWNED');
  assert.equal(await realpath(context.generatedRoot), context.generatedRoot);
  assert.equal(await realpath(context.tempDirectory), context.tempDirectory); Object.assign(process.env, {TMPDIR: context.tempDirectory, TMP: context.tempDirectory,
    TEMP: context.tempDirectory, MAGICK_TEMPORARY_PATH: context.tempDirectory});
  await context.publish(outputRoot + '/cheap-preflight.json', preflight);
  await context.publish(outputRoot + '/authorization.json', approval);
  const authorizationBinding = m.bind(outputRoot + '/authorization.json', approval);
  await context.publish(outputRoot + '/storage-permit.json', {schemaVersion: 'digest-formal-storage-permit-v001', ...permit});
  const style = await candidateStyle(context, inputs, m);
  const plan = {schemaVersion: 'digest-formal-candidate-core-plan-v001', planId: PLAN, outputRoot,
    authorization: authorizationBinding, implementationBindings: permit.implementation.map((b: Json) => ({path: path.relative(ROOT, b.path), fileSha256: b.fileSha256})),
    acceptedManifestBinding: inputs.manifestBinding, typographySettingsBinding: inputs.typographySettingsBinding, derivedTypographyValues: inputs.typographyValues, originalNormalOwners: inputs.handoff.normalOwners,
    request: {sourceVideo: inputs.normalPlan.sourceVideoBinding, transcript: inputs.normalPlan.transcriptBinding,
      utterances: inputs.normalPlan.utteranceBinding}};
  if (context.continuation !== undefined) Object.assign(plan, {continuation: context.continuation});
  const planBinding = await context.publish(outputRoot + '/core-plan.json', plan);
  const c = {plan, planBinding, authorization: approval, rendererTemplate: style.rendererTemplate};
  const adoption = inputs.adoption, edit = inputs.edit;
  await context.publish(outputRoot + '/machine-adoption.json', adoption); await context.publish(outputRoot + '/edit-plan.json', edit);
  const job = structuredClone(inputs.manufacturing);
  job.jobId = PLAN + '-base'; job.sourceArtifact.path = inputs.sourcePhysicalPath;
  job.assemblyDecision = {path: outputRoot + '/machine-adoption.json', fileSha256: m.bind(outputRoot + '/machine-adoption.json', adoption).fileSha256};
  job.outputDirectory = outputRoot + '/base-media';
  const core = await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const baseModule = await load('evals/clip_composition/presentation_base_media_build_v003.mjs');
  m.pass(baseModule.validatePresentationBaseMediaBuildJobV001(job), 'FORMAL_DERIVED_JOB_INVALID');
  const mapping = core.projectAdoptedMediaRangesV001(edit, inputs.inspection.media);
  assert.equal(mapping.mappings.at(-1).outputEndFrame, 27691);
  assert.equal(mapping.mappings.at(-1).audioSamples.outputEnd, 40705770);
  assert.deepEqual(mapping.mappings, inputs.clock.mappings, 'SAVED_CLOCK_MISMATCH');
  const jobBinding = await context.publish(outputRoot + '/manufacturing-job.json', job);
  const invocation = await context.publish(outputRoot + '/core-invocation.json', {schemaVersion: 'digest-formal-core-invocation-v001',
    planBinding, jobBinding, authorizationBinding, acceptedManifestBinding: inputs.manifestBinding,
    sourceLogicalBinding: inputs.handoff.manufacturingProposal.material.logicalBinding,
    sourcePhysicalBinding: {path: inputs.sourcePhysicalPath, fileSha256: job.sourceArtifact.fileSha256},
    normalReferences: inputs.handoff.normalReferenceMap, storagePermitFileSha256: sha(await readFile(permitPath)),
    candidateStyleBindings: style.bindings, implementationSha: permit.bindings.implementationSha,
    ...(context.continuation === undefined ? {} : {continuation: context.continuation,
      baseAction: 'reuse-verified-immutable-base', manufacturingJobExecuted: false})});
  // JSON/owner/clock/style/font checks precede the first large copy.
  assert.equal(await m.fileSha(path.join(ROOT, safe(inputs.sourcePhysicalPath))), job.sourceArtifact.fileSha256);
  await context.resourceCheck({stage: 'start', newBytes: context.continuation === undefined ? 22800000000 : 22900000000});
  const baseStarted = Date.now();
  const base = context.continuation === undefined ? await core.buildAdoptedBaseMediaV001(c, adoption, edit, job, jobBinding, invocation,
    {inspection: 'digest-formal-source-inspection-v001', receipt: 'digest-formal-base-validation-v001'}, context) : context.continuation.base;
  const baseMs = Date.now() - baseStarted;
  const artifacts = await prepareDigestFormalCandidateCoreV001(inputs, c, base, style, context);
  // New formal identifiers remain bound to the original cue clocks and lines.
  const instructions = artifacts.instruction.instructions;
  assert.equal(instructions.length, inputs.manifest.summary.newCues);
  const correspondence = inputs.correspondence.rows;
  instructions.forEach((v: Json, i: number) => {
    const row = correspondence[i]; assert.equal(v.outputTime.startFrame, row.startFrame);
    assert.equal(v.outputTime.endFrameExclusive, row.endFrameExclusive);
  });
  const artifactBindings: Json = {};
  for (const [key, name] of Object.entries(core.CORE_FILES) as [string, string][]) artifactBindings[key] = await context.publish(outputRoot + '/' + name, artifacts[key]);
  await context.resourceCheck({stage: 'body', newBytes: 22900000000});
  const renderStarted = Date.now();
  const result = await core.renderAdoptedVideoV001(c, artifactBindings, 'digest-formal-render-execution-v001', context);
  const receipt = {schemaVersion: 'digest-formal-manufacturing-result-v001', status: 'completed', planBinding,
    invocationBinding: invocation, typographySettingsBinding: inputs.typographySettingsBinding, derivedTypographyValues: inputs.typographyValues, result, timing: {initialPreparationMs: baseStarted - began, baseMediaMs: baseMs,
      renderAndQcMs: Date.now() - renderStarted, totalMs: Date.now() - began},
    implementationSha: permit.bindings.implementationSha, technicalQc: 'passed',
    ...(context.continuation === undefined ? {} : {continuation: context.continuation, baseMediaReused: true}),
    humanQuality: 'not-evaluated', outlineChoice: null, originalJudgmentReruns: 0, completedAt: new Date().toISOString()};
  await context.publish(outputRoot + '/result.json', receipt); return receipt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Complete ESM evaluation before qualification dynamically imports this module.
  void (async () => {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--inputs-only') {
      const v = await readDigestFormalHandoffInputsV001();
      process.stdout.write(JSON.stringify({status: 'saved-inputs-qualified', groups: v.traces.length,
        cues: v.correspondence.rows.length, atoms: v.meaning.atomOccurrences.length}) + '\n');
    } else if (process.argv.length === 3 && process.argv[2] === '--216-inputs-only') {
      const v = await readDigestFormal216HandoffInputsV002();
      process.stdout.write(JSON.stringify({status: '216-saved-inputs-qualified', checkedAt: v.checkedAt, groups: v.traces.length,
        cues: v.correspondence.rows.length, atoms: v.meaning.atomOccurrences.length, manifestBinding: v.manifestBinding}) + '\n');
    } else {
      assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--permit');
      const result = await runDigestFormalCandidateV001(path.resolve(process.argv[3]));
      process.stdout.write(JSON.stringify({event: 'completed', result}) + '\n');
    }
  } catch (error) {process.stderr.write(String((error as Error).stack) + '\n'); process.exitCode = 1;} finally {process.stdin.destroy();}
  })();
}

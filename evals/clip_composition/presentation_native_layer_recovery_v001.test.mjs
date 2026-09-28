import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, statfs, symlink, unlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {buildPresentationNativeLayerPlanV001, buildPresentationNativeLayerArgumentsV001,
  buildPresentationNativeLayerDecodeArgumentsV001} from './presentation_native_frame_qc_v001.mjs';
import {createPresentationNativeLayerRecoveryManifestV001, readPresentationNativeLayerRecoveryManifestV001,
  openPresentationNativeLayerRecoveryV001, provePresentationNativeLayerRecoveryV001} from './presentation_native_layer_recovery_v001.mjs';
import {buildPresentationNativeRecoveryDecodeArgumentsV001} from './presentation_native_layer_recovery_v001.mjs';

const exec = promisify(execFile), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ref = async file => {const bytes = await readFile(file); return {path: file, bytes: bytes.length, fileSha256: sha(bytes)};};
const run = async (command, args) => {
  const output = await exec(command, args, {encoding: 'buffer', maxBuffer: 1024 * 1024});
  return {...output, code: 0, signal: null};
};
const temporary = async callback => {
  const root = await mkdtemp(path.join(await realpath(os.tmpdir()), 'zev-layer-recovery-'));
  try {return await callback(root);} finally {await rm(root, {recursive: true});}
};
async function fixture(root, count = 1) {
  const source = path.join(root, 'source'), directory = path.join(root, 'layers');
  await mkdir(source); await mkdir(directory);
  const ffmpeg = await ref(await realpath('/opt/homebrew/bin/ffmpeg'));
  const magick = await realpath('/opt/homebrew/bin/magick');
  const sceneBindings = [], processes = [], outputArtifacts = [];
  // Synthetic alpha/color/position differences exercise recovery only. These
  // 8x8 inputs are not a claim of human-approved subtitle appearance.
  for (let index = 0; index < count; index++) {
    const pngPath = path.join(source, 'state-' + index + '.png');
    await run(magick, ['-size', '8x8', 'xc:none', '-fill', `rgba(${20 + index * 19},${210 - index * 11},90,0.7)`,
      '-draw', `rectangle ${index % 3},1 6,6`, pngPath]);
    const bound = await ref(pngPath);
    sceneBindings.push({instructionId: 'fixture-' + index, selectedKind: ['normal', 'color', 'panel', 'scale', 'bounce', 'shake', 'pulse'][index % 7],
      states: [{bindingId: 'state-' + index, pngPath, pngSha256: bound.fileSha256, state: 'fixture-' + index}], alternates: []});
  }
  const samples = Array.from({length: 4}, (_, frame) => ({references: [{layers: sceneBindings.map((row, index) => ({
    bindingId: 'state-' + index, localFrame: frame, displayFrameCount: 12}))}]}));
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples, sceneBindings, directory, canvas: {width: 8, height: 8}});
  const groups = new Map();
  for (const row of nativeLayers.layers) {if (!groups.has(row.sourceSha256)) groups.set(row.sourceSha256, []); groups.get(row.sourceSha256).push(row);}
  for (const group of groups.values()) {
    const faded = group.filter(row => row.generated);
    for (const [purpose, args] of [['native-layer-prepare', buildPresentationNativeLayerArgumentsV001(faded)],
      ['native-layer-decode', buildPresentationNativeLayerDecodeArgumentsV001(group)]]) {
      await run(ffmpeg.path, args);
      processes.push({purpose, command: ffmpeg.path, args, argumentsCanonicalSha256: sha(canonicalJson(args)), code: 0, signal: null});
    }
    for (const row of group) {if (row.generated) outputArtifacts.push(await ref(row.outputPath)); outputArtifacts.push(await ref(row.decodedPath));}
  }
  const evidencePath = path.join(source, 'execution.json');
  await writeFile(evidencePath, JSON.stringify({nativeLayers, sceneBindings}));
  const options = {file: path.join(root, 'recovery.json'), nativeLayers, sceneBindings, outputArtifacts, processes,
    inputRefs: [{role: 'tool-ffmpeg', ...ffmpeg}], candidateBindings: {fixtureSha256: sha('explicit synthetic candidate')},
    sourceEvidenceRefs: [await ref(evidencePath)]};
  return {...options, ...(await createPresentationNativeLayerRecoveryManifestV001(options)), root, options};
}

test('same-source baseline and mixed-source recovery match every byte for all four alpha factors, across the 32-input boundary', () => temporary(async root => {
  const input = await fixture(root, 9), original = new Map();
  for (const row of input.manifest.layers) original.set(row.decodedPath, await readFile(row.decodedPath));
  const coreBefore = await Promise.all(input.manifest.coreRefs.map(row => ref(row.path)));
  const processes = [], events = [];
  const manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef,
    run: async (...args) => {processes.push(args); return run(...args);}, beforeHeavyBatch: event => events.push(event)});
  const release = await manager.releaseAll(); assert.equal(release.releasedCount, 36);
  const paths = input.manifest.layers.map(row => row.decodedPath);
  const refs = await manager.ensurePaths(paths);
  assert.equal(refs.length, 36); assert.equal(processes.length, 2);
  assert.deepEqual(events.map(row => row.outputCount), [32, 4]);
  assert.deepEqual(new Set(input.manifest.layers.map(row => row.numerator)), new Set([1, 2, 3, 4]));
  for (const row of input.manifest.layers) assert((await readFile(row.decodedPath)).equals(original.get(row.decodedPath)));
  assert.equal(manager.metrics.regeneratedLogicalBytes, 36 * 8 * 8 * 4);
  assert.equal(manager.metrics.decodeProcesses, 2);
  assert.deepEqual(await Promise.all(input.manifest.coreRefs.map(row => ref(row.path))), coreBefore, 'all four existing QC core files remain unchanged');
  await manager.ensurePaths(paths); assert.equal(processes.length, 2, 'verified existing raw is reused');
  await manager.releaseExcept(paths.slice(0, 2));
  assert.equal((await readdir(input.nativeLayers.directory)).filter(name => name.endsWith('.gbrap')).length, 2);
  for (const row of input.manifest.layers) await lstat(row.outputPath); // Every PNG survives release.
}));

test('manifest rereads in another process, raw paths remain original, and explicit publication mapping resolves moved PNGs', () => temporary(async root => {
  const input = await fixture(root), manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  await manager.releaseAll();
  const copied = path.join(root, 'published'); await mkdir(copied);
  const mapping = new Map();
  for (const row of input.manifest.layers) for (const saved of [row.sourceRef, row.preparedPngRef]) {
    if (!mapping.has(saved.path)) {const output = path.join(copied, path.basename(saved.path)); await rename(saved.path, output); mapping.set(saved.path, output);}
  }
  const context = path.join(root, 'context.json'); await writeFile(context, JSON.stringify({manifestRef: input.manifestRef, mapping: [...mapping]}));
  const moduleUrl = new URL('./presentation_native_layer_recovery_v001.mjs', import.meta.url).href;
  await exec(process.execPath, ['--input-type=module', '-e', `
    import {readFile} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
    import {openPresentationNativeLayerRecoveryV001} from ${JSON.stringify(moduleUrl)};
    const context=JSON.parse(await readFile(process.argv[1],'utf8')), map=new Map(context.mapping),exec=promisify(execFile);
    const manager=await openPresentationNativeLayerRecoveryV001({manifestRef:context.manifestRef,
      resolveInputPath:p=>map.get(p)??p,run:async(command,args)=>({...await exec(command,args),code:0,signal:null})});
    await manager.ensurePaths(manager.manifest.layers.map(row=>row.decodedPath));
  `, context]);
  for (const row of input.manifest.layers) assert.deepEqual(await ref(row.decodedPath), row.rawRef);
}));

test('materialization provenance keeps unique byte observations and actual per-process commands without repeated definitions', () => temporary(async root => {
  const input = await fixture(root, 2), manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  const paths = input.manifest.layers.map(row => row.decodedPath);
  await manager.ensurePaths(paths);
  const first = manager.getProvenance(), readsBefore = first.metrics.verifiedLogicalReadBytes;
  assert.equal(first.layerObservations.length, 8);
  await manager.ensurePaths(paths);
  const second = manager.getProvenance();
  assert.equal(second.layerObservations.length, 8, 'repeated reads share observations, not skipped verification');
  assert.equal(second.metrics.rawExistingVerified, 16);
  assert(second.metrics.verifiedLogicalReadBytes > readsBefore);
  assert.deepEqual(second.operations[0].layerObservationIndexes, second.operations[1].layerObservationIndexes);
  await manager.releaseAll(); await manager.ensurePaths(paths);
  const value = manager.getProvenance();
  assert.equal(value.manifest, undefined, 'manifest definitions occur only once as original UTF-8 bytes');
  assert.equal(sha(value.manifestUtf8), input.manifestRef.fileSha256);
  assert.equal(Buffer.byteLength(value.manifestUtf8), input.manifestRef.bytes);
  const savedManifest = JSON.parse(value.manifestUtf8);
  assert.equal(value.layerObservations.length, 8, 'regenerated exact bytes reuse the unique observation');
  assert.deepEqual(value.operations.map(row => row.sequence), [0, 1, 2, 3]);
  const generated = value.operations[3];
  assert.equal(generated.kind, 'generated-batch'); assert.equal(generated.process.code, 0); assert.equal(generated.process.signal, null);
  assert.equal(generated.process.argumentsCanonicalSha256, sha(canonicalJson(generated.process.args)));
  assert.equal(generated.process.stdoutSha256, sha('')); assert.equal(generated.process.stderrSha256, sha(''));
  const rows = generated.layerObservationIndexes.map((index, offset) => {
    const observed = value.layerObservations[index], definition = savedManifest.layers.find(row => row.key === observed.key);
    assert.deepEqual(Object.keys(observed).sort(), ['actualRawRef', 'key', 'preparedPngRef', 'sourceRef']);
    assert.deepEqual(observed.sourceRef, definition.sourceRef); assert.deepEqual(observed.preparedPngRef, definition.preparedPngRef);
    assert.deepEqual(observed.actualRawRef, definition.rawRef);
    assert.equal(path.dirname(generated.temporaryRawPaths[offset]), path.dirname(definition.decodedPath));
    return {...definition, outputPath: observed.preparedPngRef.path, decodedPath: generated.temporaryRawPaths[offset]};
  });
  assert.deepEqual(generated.process.args, buildPresentationNativeRecoveryDecodeArgumentsV001(rows));
  value.layerObservations[0].actualRawRef.fileSha256 = '0'.repeat(64); value.operations.pop();
  assert.equal(manager.getProvenance().operations.length, 4, 'snapshot cannot mutate manager records');
  assert.notEqual(manager.getProvenance().layerObservations[0].actualRawRef.fileSha256, '0'.repeat(64));
  const firstRow = input.manifest.layers[0], sourceBytes = await readFile(firstRow.sourceRef.path);
  await writeFile(firstRow.sourceRef.path, 'changed input while decoded raw still exists');
  await assert.rejects(manager.ensurePaths([firstRow.decodedPath]), /SHA\/bytes differ/);
  await writeFile(firstRow.sourceRef.path, sourceBytes);
}));

test('changed manifest, PNG, existing raw and original artifact SHA reject without deleting evidence', () => temporary(async root => {
  const input = await fixture(root), manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  const first = input.manifest.layers[0], bytes = await readFile(first.decodedPath);
  await writeFile(first.decodedPath, Buffer.alloc(bytes.length, 123));
  await assert.rejects(manager.ensurePaths([first.decodedPath]), /SHA\/bytes differ/);
  await assert.rejects(manager.releaseAll(), /SHA\/bytes differ/);
  for (const row of input.manifest.layers) await lstat(row.decodedPath);
  await writeFile(first.decodedPath, bytes); await manager.releaseAll();
  const pngBytes = await readFile(first.outputPath); await writeFile(first.outputPath, 'changed');
  await assert.rejects(manager.ensurePaths([first.decodedPath]), /SHA\/bytes differ/); await writeFile(first.outputPath, pngBytes);
  const saved = await readFile(input.manifestRef.path); await writeFile(input.manifestRef.path, saved + ' ');
  await assert.rejects(manager.ensurePaths([]), /SHA\/bytes differ/);
  await assert.rejects(readPresentationNativeLayerRecoveryManifestV001({manifestRef: input.manifestRef}), /SHA\/bytes differ/);
}));

test('unknown paths, traversal and symbolic raw or ancestors cannot be materialized or deleted', () => temporary(async root => {
  const input = await fixture(root), manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  await assert.rejects(manager.ensurePaths([input.manifest.layers[0].sourcePath]), /unknown raw path/);
  await assert.rejects(manager.releaseExcept([path.join(root, 'other.gbrap')]), /unknown raw path/);
  const first = input.manifest.layers[0], outside = path.join(root, 'unrelated'); await copyFile(first.decodedPath, outside);
  await unlink(first.decodedPath); await symlink(outside, first.decodedPath);
  await assert.rejects(manager.ensurePaths([first.decodedPath]), /regular path required/);
  await assert.rejects(manager.releaseAll(), /regular path required/); await lstat(outside);
  await unlink(first.decodedPath); await copyFile(outside, first.decodedPath);
  const moved = path.join(root, 'moved-layers'); await rename(input.nativeLayers.directory, moved); await symlink(moved, input.nativeLayers.directory);
  await assert.rejects(manager.ensurePaths([first.decodedPath]), /symbolic or non-directory ancestor/);
}));

test('failed child, incomplete bytes and cancellation never expose a partial raw as completed', () => temporary(async root => {
  const input = await fixture(root), manager = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  await manager.releaseAll(); const paths = input.manifest.layers.map(row => row.decodedPath);
  const failed = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run: async()=>({code: 1})});
  await assert.rejects(failed.ensurePaths(paths), /child process did not complete/);
  for (const file of paths) await assert.rejects(lstat(file), {code: 'ENOENT'});
  const incomplete = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef,
    run: async()=>({code: 0, signal: null})});
  await assert.rejects(incomplete.ensurePaths(paths), /SHA\/bytes differ/);
  const abort = new AbortController();
  const cancelled = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, signal: abort.signal,
    run: async(...args)=>{const result=await run(...args);abort.abort();return result;}});
  await assert.rejects(cancelled.ensurePaths(paths), {name: 'AbortError'});
  for (const file of paths) await assert.rejects(lstat(file), {code: 'ENOENT'});
  assert((await readdir(input.nativeLayers.directory)).some(name => name.endsWith('.partial')), 'failed partials retained for diagnosis');
}));

test('capacity guard runs before output creation; concurrent operations and pre-cancelled release reject', () => temporary(async root => {
  const input = await fixture(root), original = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run});
  await original.releaseAll(); const before = await readdir(input.nativeLayers.directory);
  let calls = 0;
  const gate = await openPresentationNativeLayerRecoveryV001({manifestRef: input.manifestRef, run:async()=>{calls++;},
    beforeHeavyBatch:()=>{throw Object.assign(new Error('capacity'),{code:'READABILITY_CAPACITY_INTERRUPTED'});}});
  await assert.rejects(gate.ensurePaths(input.manifest.layers.map(row=>row.decodedPath)), {code:'READABILITY_CAPACITY_INTERRUPTED'});
  assert.equal(calls,0);assert.deepEqual(await readdir(input.nativeLayers.directory),before);
  let unblock;const waiting=new Promise(resolve=>{unblock=resolve;});
  const serial = await openPresentationNativeLayerRecoveryV001({manifestRef:input.manifestRef,run,beforeHeavyBatch:()=>waiting});
  const pending=serial.ensurePaths([input.manifest.layers[0].decodedPath]);
  await assert.rejects(serial.releaseAll(),/concurrent/);unblock();await pending;
  const abort=new AbortController();abort.abort();
  const cancelled=await openPresentationNativeLayerRecoveryV001({manifestRef:input.manifestRef,run,signal:abort.signal});
  await assert.rejects(cancelled.releaseAll(),{name:'AbortError'});await lstat(input.manifest.layers[0].decodedPath);
}));

test('manifest creation refuses missing original bytes, wrong hashes and unproven old decode commands', () => temporary(async root => {
  const input=await fixture(root), options={...input.options,file:path.join(root,'second.json')};
  await assert.rejects(createPresentationNativeLayerRecoveryManifestV001({...options,processes:[]}),/successful command/);
  const changed=structuredClone(options);changed.outputArtifacts.find(row=>row.path.endsWith('.gbrap')).fileSha256='0'.repeat(64);
  await assert.rejects(createPresentationNativeLayerRecoveryManifestV001(changed),/SHA\/bytes differ/);
  await unlink(input.manifest.layers[0].decodedPath);
  await assert.rejects(createPresentationNativeLayerRecoveryManifestV001(options),{code:'ENOENT'});
  await assert.rejects(lstat(options.file),{code:'ENOENT'});
}));

test('pre-release proof removes only its own diagnostic copies and compares actual bytes while preserving originals', () => temporary(async root => {
  const input=await fixture(root,7), paths=input.manifest.layers.map(row=>row.decodedPath);
  const before=await Promise.all(paths.map(ref));
  const result=await provePresentationNativeLayerRecoveryV001({manifestRef:input.manifestRef,paths,
    directory:path.join(root,'proof'),run});
  assert.equal(result.status,'passed');assert.equal(result.proof.originalRawReleased,0);
  assert.equal(result.proof.diagnosticCopyReleaseCount,28);assert.equal(result.proof.proofs.length,28);
  assert.deepEqual(await Promise.all(paths.map(ref)),before);
  for(const row of result.proof.proofs)assert((await readFile(row.original.path)).equals(await readFile(row.regenerated.path)));
  assert.deepEqual(new Set(result.proof.proofs.map(row=>row.numerator)),new Set([1,2,3,4]));
  await assert.rejects(provePresentationNativeLayerRecoveryV001({manifestRef:input.manifestRef,paths,
    directory:path.join(root,'proof'),run}),/new diagnostic directory/);
}));

// Explicit local saved-fixture experiment. The caller supplies both a new output
// directory and its already-approved free-space floor; normal tests never run it.
test('saved candidate Pulse PNG fixture: all five states and four fade factors recover identical raw bytes',
  {skip:!process.env.ZEV_LAYER_RECOVERY_PULSE_DIRECTORY}, async()=>{
  const directory=process.env.ZEV_LAYER_RECOVERY_PULSE_DIRECTORY;
  const minimum=Number(process.env.ZEV_LAYER_RECOVERY_MINIMUM_FREE_BYTES);
  assert(path.isAbsolute(directory));assert(Number.isSafeInteger(minimum)&&minimum>0,'caller must supply approved capacity floor');
  const repository=path.resolve(new URL('../../',import.meta.url).pathname);
  const fixtureDirectory=path.join(repository,'runtime/artifacts/caption-readability-20260928-preview-v006');
  const verificationPath=path.join(fixtureDirectory,'raster-verification.json');
  const verification=JSON.parse(await readFile(verificationPath,'utf8'));
  const states=['normal','between-normal-middle','middle','between-middle-maximum','maximum'];
  const sceneBindings=[];
  for(const state of states){
    const label='synthetic-pulse-'+state,pngPath=path.join(fixtureDirectory,'raster',label+'.png');
    const saved=verification.checks.find(row=>row.label===label);assert(saved?.props&&saved.captionId==='7a-synthetic-pulse');
    const bound=await ref(pngPath);assert.equal(bound.fileSha256,saved.sha256);
    sceneBindings.push({instructionId:'saved-pulse-fixture-'+state,selectedKind:'pulse',
      states:[{bindingId:label,state,pngPath,pngSha256:bound.fileSha256,propsCanonicalSha256:sha(canonicalJson(saved.props))}],alternates:[]});
  }
  const gate=async event=>{
    const disk=await statfs(path.dirname(directory)),free=disk.bavail*disk.bsize;
    assert(free>=minimum,
      'saved Pulse proof capacity guard: free='+free+'; planned='+event.plannedLogicalBytes+'; floor='+minimum);
  };
  await gate({plannedLogicalBytes:0});await mkdir(directory);const layersDirectory=path.join(directory,'layers');await mkdir(layersDirectory);
  const samples=Array.from({length:4},(_,localFrame)=>({references:[{layers:sceneBindings.map(row=>({
    bindingId:row.states[0].bindingId,localFrame,displayFrameCount:12}))}]}));
  const nativeLayers=buildPresentationNativeLayerPlanV001({samples,sceneBindings,directory:layersDirectory,canvas:{width:1920,height:1080}});
  const ffmpeg=await ref(await realpath('/opt/homebrew/bin/ffmpeg'));
  const groups=new Map(),processes=[],outputArtifacts=[];
  for(const row of nativeLayers.layers){if(!groups.has(row.sourceSha256))groups.set(row.sourceSha256,[]);groups.get(row.sourceSha256).push(row);}
  for(const group of groups.values()){
    for(const [purpose,args] of [['native-layer-prepare',buildPresentationNativeLayerArgumentsV001(group.filter(row=>row.generated))],
      ['native-layer-decode',buildPresentationNativeLayerDecodeArgumentsV001(group)]]){
      await gate({plannedLogicalBytes:group.length*1920*1080*4});const started=performance.now();await run(ffmpeg.path,args);
      processes.push({purpose,command:ffmpeg.path,args,argumentsCanonicalSha256:sha(canonicalJson(args)),code:0,signal:null,wallMilliseconds:performance.now()-started});
    }
    for(const row of group){if(row.generated)outputArtifacts.push(await ref(row.outputPath));outputArtifacts.push(await ref(row.decodedPath));}
  }
  const evidencePath=path.join(directory,'saved-pulse-input.json');
  await writeFile(evidencePath,JSON.stringify({scope:'saved Pulse fixture only; no candidate injection',verificationRef:await ref(verificationPath),states,nativeLayers,sceneBindings,processes},null,2)+'\n',{flag:'wx'});
  const created=await createPresentationNativeLayerRecoveryManifestV001({file:path.join(directory,'manifest.json'),nativeLayers,sceneBindings,
    outputArtifacts,processes,inputRefs:[{role:'tool-ffmpeg',...ffmpeg}],candidateBindings:{savedPulseFixtureSha256:(await ref(verificationPath)).fileSha256},
    sourceEvidenceRefs:[await ref(evidencePath),await ref(verificationPath)]});
  const result=await provePresentationNativeLayerRecoveryV001({manifestRef:created.manifestRef,
    paths:created.manifest.layers.map(row=>row.decodedPath),directory:path.join(directory,'diagnostic'),run,beforeHeavyBatch:gate});
  assert.equal(result.proof.proofs.length,20);assert.equal(result.proof.originalRawReleased,0);
  for(const binding of sceneBindings.flatMap(row=>row.states))assert.equal((await ref(binding.pngPath)).fileSha256,binding.pngSha256);
  console.log(JSON.stringify({savedPulseProof:result.status,proofRef:result.proofRef,states:5,alphaFactors:4,
    originalSavedPngsChanged:false,candidatePulseInjected:false}));
});

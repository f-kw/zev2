import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, mkdir, writeFile, readFile, rm, lstat, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const exec = promisify(execFile);
const ROOT = process.env.ZEV_SOURCE_SNAPSHOT_TEST_REPO
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORE = path.join(ROOT, 'evals/clip_composition/adopted_media_manufacturing_v001.mts');
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

// The positive boundary uses a test-only ESM-loader model for qualified storage
// and filesystem hardware. It does not mint production authority. Core code,
// copy/chmod, small bytes/inodes and streaming hashes remain real. Every case
// stops at the first source probe; no FFmpeg, STT or media manufacture is run.
const loader = String.raw`
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile(process.env.ZEV_SOURCE_SNAPSHOT_FIXTURE,'utf8'));
export async function resolve(specifier,context,next){
 const parent=context.parentURL?.startsWith('file:')?fileURLToPath(context.parentURL.split('?')[0]):'';
 if(parent===config.core){
  const mappings=[['run_candidate_discovery_digest_skill_e2e_v001.mts','wire.mjs'],
   ['presentation_base_media_build_v003.mjs','base.mjs'],['presentation_base_media_timeline_v004.mjs','timeline.mjs'],
   ['digest-formal-handoff-v001.js','qualification.mjs'],['digest-approved-job-runner-v001.js','qualification.mjs']];
  for(const [suffix,name]of mappings)if(specifier.endsWith(suffix))return{url:pathToFileURL(config.directory+'/'+name).href,shortCircuit:true};
 }
 return next(specifier,context);
}
`;
const qualification = String.raw`
import assert from 'node:assert/strict';
import {lstat,realpath,readFile,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile(process.env.ZEV_SOURCE_SNAPSHOT_FIXTURE,'utf8'));
const qualified=new WeakMap();
const trace=(name)=>globalThis.sourceSnapshotObservations.push(name);
async function identity(file){
 assert.equal(await realpath(file),file,'TEST_SOURCE_SYMLINK');
 const before=await lstat(file,{bigint:true});assert(before.isFile()&&!before.isSymbolicLink());
 const h=createHash('sha256');for await(const part of createReadStream(file))h.update(part);
 const after=await lstat(file,{bigint:true});for(const k of ['dev','ino','size','mtimeNs','ctimeNs'])assert.equal(before[k],after[k]);
 return Object.freeze({dev:String(after.dev),ino:String(after.ino),sizeBytes:Number(after.size),mtimeNs:String(after.mtimeNs),ctimeNs:String(after.ctimeNs),fileSha256:h.digest('hex')});
}
export async function assertQualifiedApprovedDigestStorageContextV001(context,plan){
 assert(qualified.has(context),'QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED');
 if(plan)assert.equal(plan.outputRoot,context.outputRoot);
 await context.assertCurrent();
}
export const assertQualifiedDigestStorageContextV001=assertQualifiedApprovedDigestStorageContextV001;
export function makeTestOnlyContext(){
 let sourceChecks=0;
 const context=Object.freeze({approvedJob:Object.freeze({testOnly:true}),outputRoot:config.outputRoot,
  resolve:p=>{assert(p.startsWith(config.outputRoot+'/'));return config.guest+'/'+p;},
  assertCurrent:async()=>{trace('storage-current');assert(qualified.has(context));},
  publish:async()=>{throw Error('TEST_PUBLISH_MUST_NOT_RUN');},readBound:async()=>{throw Error('TEST_READ_BOUND_MUST_NOT_RUN');},
  readJson:async()=>{throw Error('TEST_READ_JSON_MUST_NOT_RUN');},
  resolveApprovedDigestSourceV001:async source=>{
   trace('resolve-source');await assertQualifiedApprovedDigestStorageContextV001(context);
   assert.deepEqual(source,config.sourceArtifact,'TEST_BOUND_SOURCE_CHANGED');
   if(config.mode==='undefined-source')return undefined;
   const pin=await identity(config.physicalSource);assert.equal(pin.fileSha256,source.fileSha256);
   const check=async()=>{sourceChecks++;trace('source-check-'+sourceChecks);await context.assertCurrent();
    if(config.mode==='before-source-change'&&sourceChecks===1)await writeFile(config.physicalSource,'changed before copy');
    assert.deepEqual(await identity(config.physicalSource),pin,'TEST_SOURCE_IDENTITY_CHANGED');};
   const returnedPin=config.mode==='wrong-source-hash'?Object.freeze({...pin,fileSha256:'0'.repeat(64)}):pin;
   return Object.freeze({physicalPath:config.physicalSource,identity:returnedPin,assertCurrent:check});
  }});
 qualified.set(context,true);return context;
}
`;
const worker = String.raw`
import {readFile,rename,writeFile} from 'node:fs/promises';
import {buildAdoptedBaseMediaV001} from 'CORE_URL';
import {makeTestOnlyContext} from './qualification.mjs';
const config=JSON.parse(await readFile(process.env.ZEV_SOURCE_SNAPSHOT_FIXTURE,'utf8'));
globalThis.sourceSnapshotObservations=[];
let context=config.mode==='legacy'?undefined:makeTestOnlyContext();
if(config.mode==='clone-context')context={...context};
if(config.mode==='fake-context')context=Object.freeze({approvedJob:{},outputRoot:config.outputRoot,
 resolve:()=>config.physicalSource,resolveApprovedDigestSourceV001:async()=>{throw Error('FAKE_RESOLVER_CALLED');},assertCurrent:async()=>{}});
const source=structuredClone(config.sourceArtifact);if(config.mode==='wrong-source')source.sourceRef='unapproved-other-source';
const c={plan:{planId:'test-only-source-plan',outputRoot:config.outputRoot,request:{sourceVideo:{path:source.path,fileSha256:source.fileSha256}}},authorization:{}};
try{await buildAdoptedBaseMediaV001(c,{}, {},{sourceArtifact:source},{fileSha256:'unused'}, {}, {inspection:'test-only'},context);
 throw Error('TEST_UNEXPECTED_MEDIA_SUCCESS');}
catch(error){process.stdout.write(JSON.stringify({error:error.message,trace:globalThis.sourceSnapshotObservations})+'\n');}
`;
async function fixture(mode: string) {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'zev-source-snapshot-')));
  try {
    const guest = path.join(directory, 'guest'), repository = path.join(directory, 'repo');
    const outputRoot = 'runtime/artifacts/test-only-snapshot';
    await mkdir(guest + '/' + outputRoot, {recursive: true});
    await mkdir(repository + '/logical', {recursive: true});
    await mkdir(repository + '/' + outputRoot, {recursive: true});
    const bytes = Buffer.from('Small source-boundary fixture. Not playable media.\n');
    const physicalSource = guest + '/approved-single-source.bin';
    await writeFile(physicalSource, bytes, {flag: 'wx'});
    await writeFile(repository + '/logical/source.bin', bytes, {flag: 'wx'});
    const config = {directory, core: CORE, guest, repository, outputRoot, physicalSource, mode,
      sourceArtifact: {sourceProvenance: 'test-only', sourceRef: 'test-only-source', sourceUri: 'fixture:source',
        path: 'logical/source.bin', fileSha256: sha(bytes)}};
    const cfg = directory + '/configuration.json';
    await writeFile(cfg, JSON.stringify(config), {flag: 'wx'});
    await writeFile(directory + '/loader.mjs', loader);
    await writeFile(directory + '/register.mjs', "import {register} from 'node:module';register('./loader.mjs',import.meta.url);\n");
    await writeFile(directory + '/qualification.mjs', qualification);
    const wire = pathToFileURL(ROOT + '/evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts').href;
    const base = pathToFileURL(ROOT + '/evals/clip_composition/presentation_base_media_build_v003.mjs').href;
    const timeline = pathToFileURL(ROOT + '/evals/clip_composition/presentation_base_media_timeline_v004.mjs').href;
    await writeFile(directory + '/wire.mjs', 'export * from ' + JSON.stringify(wire) + ';\nexport const ROOT=' + JSON.stringify(repository) + ';\n');
    await writeFile(directory + '/timeline.mjs', 'export * from ' + JSON.stringify(timeline) + ';\nexport const PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES=[];\n');
    await writeFile(directory + '/base.mjs', 'export * from ' + JSON.stringify(base) + ';\nimport {PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE as profile} from ' + JSON.stringify(base) + ';\n'
      + 'export const inspectPresentationBaseMediaToolProfileV001=async()=>profile;\n'
      + 'export const inspectPresentationBaseMediaToolBinaryDiagnosticsV001=async()=>({testOnly:true});\n'
      + "export const inspectPresentationBaseMediaSourceV002=async()=>{globalThis.sourceSnapshotObservations.push('source-probe');throw Error('TEST_ONLY_PROBE_BOUNDARY');};\n");
    // The copy-only shim substitutes the source inode or snapshot after actual
    // copy, proving the checks reject before the source probe can be reached.
    const fsShim = "export * from 'node:fs/promises';\nimport * as fs from 'node:fs/promises';\n"
      + 'const config=JSON.parse(await fs.readFile(process.env.ZEV_SOURCE_SNAPSHOT_FIXTURE,\'utf8\'));\n'
      + "export async function copyFile(a,b,...flags){globalThis.sourceSnapshotObservations.push('copy');await fs.copyFile(a,b,...flags);"
      + "if(config.mode==='after-source-change'){const old=await fs.readFile(a);await fs.rename(a,a+'.old');await fs.writeFile(a,old,{flag:'wx'});}"
      + "if(config.mode==='snapshot-mismatch')await fs.writeFile(b,'different snapshot');}\n";
    await writeFile(directory + '/copy.mjs', fsShim);
    const copyResolver = loader.replace("const mappings=[", "const mappings=[['node:fs/promises','copy.mjs'],");
    await writeFile(directory + '/loader.mjs', copyResolver);
    await writeFile(directory + '/worker.mjs', worker.replace('CORE_URL', pathToFileURL(CORE).href));
    const child = await exec(process.execPath, ['--import', ROOT + '/runner/node_modules/tsx/dist/loader.mjs',
      '--import', directory + '/register.mjs', directory + '/worker.mjs'],
      {cwd: ROOT, env: {...process.env, ZEV_SOURCE_SNAPSHOT_FIXTURE: cfg}, timeout: 30_000, maxBuffer: 1_000_000});
    const result = JSON.parse(child.stdout.trim());
    const snapshot = guest + '/' + outputRoot + '/base-media-work/source-snapshot.mp4';
    let saved: Buffer | undefined, modeBits: number | undefined;
    try {saved = await readFile(mode === 'legacy' ? repository + '/' + outputRoot + '/base-media-work/source-snapshot.mp4' : snapshot);
      modeBits = (await lstat(mode === 'legacy' ? repository + '/' + outputRoot + '/base-media-work/source-snapshot.mp4' : snapshot)).mode;
    } catch (error: any) {if (error.code !== 'ENOENT') throw error;}
    return {result, saved, original: bytes, modeBits};
  } finally {await rm(directory, {recursive: true, force: true});}
}

test('qualified storage model copies the one SSD source and verifies it before any source probe', async () => {
  const {result, saved, original, modeBits} = await fixture('approved');
  assert.equal(result.error, 'TEST_ONLY_PROBE_BOUNDARY');assert(saved?.equals(original));assert.equal(modeBits! & 0o222, 0);
  assert(result.trace.indexOf('source-check-1') < result.trace.indexOf('copy'));
  assert(result.trace.indexOf('copy') < result.trace.indexOf('source-check-2'));
  assert(result.trace.indexOf('source-check-2') < result.trace.indexOf('source-probe'));
});
test('legacy repository source continues to use its existing snapshot path', async () => {
  const {result, saved, original, modeBits} = await fixture('legacy');
  assert.equal(result.error, 'TEST_ONLY_PROBE_BOUNDARY');assert(saved?.equals(original));assert.equal(modeBits! & 0o222, 0);
  assert(!result.trace.includes('resolve-source'));
});
for (const mode of ['fake-context', 'clone-context', 'wrong-source', 'undefined-source', 'wrong-source-hash', 'before-source-change', 'after-source-change', 'snapshot-mismatch']) {
  test('rejects ' + mode + ' before probing or processing media', async () => {
    const {result} = await fixture(mode);
    assert.notEqual(result.error, 'TEST_ONLY_PROBE_BOUNDARY');assert(!result.trace.includes('source-probe'));
    if (['fake-context', 'clone-context'].includes(mode)) assert.match(result.error, /QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/);
    if (mode === 'wrong-source') assert.match(result.error, /TEST_BOUND_SOURCE_CHANGED/);
    if (['undefined-source', 'wrong-source-hash'].includes(mode)) assert.match(result.error, /CORE_APPROVED_SOURCE_IDENTITY_INVALID/);
    if (['before-source-change', 'after-source-change'].includes(mode)) assert.match(result.error, /TEST_SOURCE_IDENTITY_CHANGED/);
    if (mode === 'snapshot-mismatch') assert.match(result.error, /SOURCE_SNAPSHOT_MISMATCH/);
    if (!['after-source-change', 'snapshot-mismatch'].includes(mode)) assert(!result.trace.includes('copy'));
  });
}

test('production Core refuses caller-created frozen contexts before invoking any caller resolver', async () => {
  const {buildAdoptedBaseMediaV001} = await import(pathToFileURL(CORE).href);
  let called = 0;
  const outputRoot = 'runtime/artifacts/test-only-unqualified-source';
  const resolver = async () => {called++;throw Error('UNQUALIFIED_RESOLVER_MUST_NOT_RUN');};
  const forged = Object.freeze({approvedJob: Object.freeze({job: {planId: 'forged'}}), outputRoot,
    resolveApprovedDigestSourceV001: resolver, resolve: resolver, assertCurrent: resolver});
  const c = {plan: {planId: 'forged', outputRoot}};
  for (const context of [forged, {...forged}]) {
    await assert.rejects(buildAdoptedBaseMediaV001(c, {}, {}, {sourceArtifact: {}}, {}, {}, {inspection: 'test-only'}, context),
      /QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/);
  }
  assert.equal(called, 0);
});

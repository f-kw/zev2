import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rm, lstat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {spawn, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DIGEST_APPROVED_JOB_GUARD_V001} from './digest-approved-job-v001.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),exec=promisify(execFile),node=process.execPath;
const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const bytes=(v:unknown)=>Buffer.from(JSON.stringify(v,null,2)+'\n');
async function fileHash(p:string){const h=createHash('sha256');for await(const c of createReadStream(p))h.update(c);return h.digest('hex');}
const implementationPaths=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts',
  'runner/src/digest-approved-inputs-v001.ts','runner/src/digest-formal-handoff-v001.ts','runner/src/digest-approved-record-finalize-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts','evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts','evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs','tools/digest-quality/original-resolution-full-supervisor-v002.py',
  'evals/clip_composition/digest_representative_completion_v001.mjs'];

// Test-only loader, generated inside one ignored, owned fixture. The actual runner private
// createStorage/current/currentRaw/WeakMap and the actual approved-job factory/readBytes run.
// No production trust/export exists. Hardware/ps/dirty-status observations and unrelated
// inputs/old recovery-origin qualification are modeled; this is not their acceptance test.
// Code/Node/control hashes, identity pins, filesystem reads, mutations and PID liveness are real.
const loaderSource=String.raw`import {pathToFileURL} from 'node:url';import path from 'node:path';
const fixture=process.env.ZEV_STORAGE_REVALIDATION_FIXTURE;
export async function resolve(specifier,context,next){
 const parent=context.parentURL??'';
 if(!parent.endsWith('-shim.mjs')&&!parent.endsWith('/control.mjs')){
  if(parent.includes('/digest-approved-job-runner-v001.ts')&&specifier.includes('digest-approved-inputs-v001.js'))return {url:pathToFileURL(fixture+'/inputs-shim.mjs').href,shortCircuit:true};
  const shims={'node:fs/promises':'fs-promises-shim.mjs','node:fs':'fs-shim.mjs','node:child_process':'child-process-shim.mjs'};
  if(shims[specifier])return {url:pathToFileURL(fixture+'/'+shims[specifier]).href,shortCircuit:true};
 }
 return next(specifier,context);
}
export async function load(url,context,next){
 const result=await next(url,context);
 if(url.split('?')[0].endsWith('/runner/src/digest-approved-job-runner-v001.ts')){
  let source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString();
  const origin=/await\s+readSpecificDigestFailedWorkV001\(qualified\)/gu;
  if([...source.matchAll(origin)].length!==1)throw Error('TEST_RECOVERY_ORIGIN_HOOK_SHAPE_CHANGED');
  source=source.replace(origin,'await globalThis.__ZEV_STORAGE_REVALIDATION_TEST__.readRecovery(qualified)');
  return {...result,source:source+'\nexport {createStorage as __storageTestCreateStorage};\n'};
 }
 return result;
}`;
const registerSource=String.raw`import {register} from 'node:module';import {pathToFileURL} from 'node:url';register(pathToFileURL(process.env.ZEV_STORAGE_REVALIDATION_FIXTURE+'/loader.mjs'),import.meta.url);`;
const controlSource=String.raw`import {readFileSync} from 'node:fs';
export const cfg=JSON.parse(readFileSync(process.env.ZEV_STORAGE_REVALIDATION_FIXTURE+'/hardware.json','utf8'));
export const state={jobReads:0,authorizationReads:0,inputReads:0,extraCodeStats:0,dirty:false,headChanged:false,deadOwner:false,deviceDelta:0,hostDeviceDelta:0,guestUuidChanged:false,hostUuidChanged:false,
 guestFree:100_000_000_000,internalFree:100_000_000_000,imageIdentityChanged:false,nodeIdentityChanged:false,mutation:null,pauseJobOnce:false,paused:false,release:undefined,now:Date.now()};
export function resetCounts(){state.jobReads=state.authorizationReads=state.inputReads=0;state.extraCodeStats=0;}
export function map(p){if(typeof p!=='string')return p;for(const [logical,actual] of [[cfg.guestRoot,cfg.guestPhysical],[cfg.hostRoot,cfg.hostPhysical]])if(p===logical||p.startsWith(logical+'/'))return actual+p.slice(logical.length);return p;}
export function logical(p){for(const [prefix,actual] of [[cfg.guestRoot,cfg.guestPhysical],[cfg.hostRoot,cfg.hostPhysical]])if(p===actual||p.startsWith(actual+'/'))return prefix+p.slice(actual.length);return p;}
`;
const fsPromisesSource=String.raw`import * as original from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {cfg,state,map,logical} from './control.mjs';export * from 'node:fs/promises';
const text=p=>p instanceof URL?fileURLToPath(p):p;
export async function realpath(p,...a){return logical(await original.realpath(map(text(p)),...a));}
export async function lstat(p,...a){p=text(p);const st=await original.lstat(map(p),...a);
 let dev=p===cfg.guestRoot||p.startsWith(cfg.guestRoot+'/')?cfg.guestDevice+state.deviceDelta:p===cfg.hostRoot||p.startsWith(cfg.hostRoot+'/')?cfg.hostDevice+state.hostDeviceDelta:null;
 if(dev!==null)st.dev=typeof st.dev==='bigint'?BigInt(dev):dev;
 if(p===cfg.extraCode)state.extraCodeStats++;
 if((p===cfg.imagePath&&state.imageIdentityChanged)||(p===cfg.nodePath&&state.nodeIdentityChanged))st.ino+=typeof st.ino==='bigint'?1n:1;
 return st;
}
export async function readFile(p,...a){p=text(p);
 if(p===cfg.options.jobBinding.path){state.jobReads++;if(state.pauseJobOnce){state.pauseJobOnce=false;state.paused=true;await new Promise(r=>state.release=r);}}
 if(p===cfg.options.authorizationBinding.path)state.authorizationReads++;
 if(cfg.inputPaths.includes(p))state.inputReads++;
 const result=await original.readFile(map(p),...a);
 if(state.mutation&&state.mutation.path===p){const mutation=state.mutation;state.mutation=null;
  const raw=await original.readFile(map(p));
  if(mutation.kind==='write')await original.writeFile(map(p),Buffer.concat([raw,Buffer.from(' ')]));
  else {const replacement=map(p)+'.test-owned-replacement';await original.writeFile(replacement,mutation.kind==='same-bytes'?raw:Buffer.concat([raw,Buffer.from(' ')]),{flag:'wx'});await original.rename(replacement,map(p));}
 }
 return result;
}
export const writeFile=(p,...a)=>original.writeFile(map(text(p)),...a);
export const mkdir=(p,...a)=>original.mkdir(map(text(p)),...a);
export const readdir=(p,...a)=>original.readdir(map(text(p)),...a);
export async function open(p,...a){p=text(p);const handle=await original.open(map(p),...a),stat=handle.stat.bind(handle);
 handle.stat=async(...args)=>{const st=await stat(...args);const dev=p===cfg.guestRoot||p.startsWith(cfg.guestRoot+'/')?cfg.guestDevice+state.deviceDelta:p===cfg.hostRoot||p.startsWith(cfg.hostRoot+'/')?cfg.hostDevice+state.hostDeviceDelta:null;
  if(dev!==null)st.dev=typeof st.dev==='bigint'?BigInt(dev):dev;return st;};return handle;}
export const chmod=(p,...a)=>original.chmod(map(text(p)),...a);
export const rename=(a,b,...c)=>original.rename(map(text(a)),map(text(b)),...c);
export async function statfs(p,...a){const st=await original.statfs(map(text(p)),...a);return {...st,bsize:1,bavail:text(p)===cfg.guestRoot?state.guestFree:state.internalFree};}
export default {...original,realpath,lstat,readFile,writeFile,mkdir,readdir,open,chmod,rename,statfs};
`;
const fsSource=String.raw`import * as original from 'node:fs';import {map} from './control.mjs';export * from 'node:fs';export const createReadStream=(p,...a)=>original.createReadStream(map(p),...a);export default {...original,createReadStream};`;
const childProcessSource=String.raw`import * as original from 'node:child_process';import {promisify} from 'node:util';import {cfg,state} from './control.mjs';export * from 'node:child_process';
function observed(command,args){
 if(/(?:ffmpeg|ffprobe|magick|remotion)/i.test(command))throw Error('TEST_MEDIA_TOOL_FORBIDDEN');
 if(command==='git'&&args[0]==='status')return state.dirty?' M TEST-ONLY-DIRTY\n':'';
 if(command==='git'&&args[0]==='rev-parse'&&state.headChanged)return '0'.repeat(40)+'\n';
 if(command==='/bin/ps')return cfg.repo+'/tools/digest-quality/original-resolution-full-supervisor-v002.py '+cfg.permitPath+' '+cfg.options.trustedJobSha256+' '+cfg.options.trustedAuthorizationSha256;
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('diskutil'))){const root=args.at(-1),guest=root===cfg.guestRoot;return JSON.stringify({
  VolumeUUID:guest?(state.guestUuidChanged?'BAD-UUID':cfg.guestVolumeUuid):(state.hostUuidChanged?'BAD-UUID':cfg.hostVolumeUuid),MountPoint:root,FilesystemType:guest?'apfs':'exfat',
  DeviceNode:guest?'/dev/disk91s1':'/dev/disk92s1',WritableVolume:true,GlobalPermissionsEnabled:guest});}
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('hdiutil')))return JSON.stringify({images:[{'image-path':cfg.imagePath,'system-entities':[{'dev-entry':'/dev/disk91s1','mount-point':cfg.guestRoot}]}]});
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('plistlib.load(open')))return JSON.stringify({'diskimage-bundle-type':'com.apple.diskimage.sparsebundle',size:100_000_000_000});
 return null;
}
export function execFile(command,args,options,callback){if(typeof options==='function'){callback=options;options={};}try{const value=observed(command,args);if(value!==null){queueMicrotask(()=>callback(null,value,''));return {};}}
 catch(e){queueMicrotask(()=>callback(e,'',''));return {};}return original.execFile(command,args,options,callback);}
execFile[promisify.custom]=(command,args,options={})=>new Promise((resolve,reject)=>execFile(command,args,options,(error,stdout,stderr)=>error?reject(error):resolve({stdout,stderr})));
export function spawn(command,...args){if(/(?:ffmpeg|ffprobe|magick|remotion)/i.test(command))throw Error('TEST_MEDIA_TOOL_FORBIDDEN');return original.spawn(command,...args);}
export default {...original,execFile,spawn};
`;
const inputsSource=String.raw`export async function assertApprovedDigestInputsV001(inputs,q){if(!Object.isFrozen(inputs)||inputs.testOnlyQualified!==q)throw Error('TEST_ONLY_UNRELATED_INPUT_MODEL');}
export const readApprovedDigestInputsV001=()=>{throw Error('TEST_UNRELATED_INPUT_READ_FORBIDDEN');};
export const prepareApprovedDigestCaptionCoreV001=()=>{throw Error('TEST_MANUFACTURING_FORBIDDEN');};
export const assertQualifiedApprovedDigestSourcePackageTaskV001=()=>{throw Error('TEST_SOURCE_PACKAGE_FORBIDDEN');};
export const qualifyApprovedDigestSourcePackageReadbackV001=()=>{throw Error('TEST_SOURCE_PACKAGE_FORBIDDEN');};
`;
const workerSource=String.raw`import assert from 'node:assert/strict';import {readFile,writeFile,mkdir,lstat,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';import path from 'node:path';
import {cfg,state,resetCounts,map} from './control.mjs';
const common=await import(pathToFileURL(cfg.repo+'/runner/src/digest-approved-job-v001.ts'));
const rawRunner=await import(pathToFileURL(cfg.repo+'/runner/src/digest-approved-job-runner-v001.ts'));const runner=rawRunner.default??rawRunner;
const sha=v=>createHash('sha256').update(v).digest('hex'),formal=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const originalNow=Date.now;Date.now=()=>state.now;
const originalKill=process.kill.bind(process);process.kill=(pid,signal)=>{if(signal===0&&state.deadOwner&&pid===process.ppid)throw Object.assign(Error('TEST_OWNER_NOT_ALIVE'),{code:'ESRCH'});return originalKill(pid,signal);};
let recoveryChecks=0;
globalThis.__ZEV_STORAGE_REVALIDATION_TEST__={readRecovery:async q=>{await common.assertQualifiedDigestApprovedJobV001(q);return Object.freeze({pins:new Map(),assertCurrent:async()=>{recoveryChecks++;}});}};
const q=await common.readQualifiedDigestApprovedJobV001(cfg.options),out=q.job.outputRoot,s=q.job.storage;
const generated=s.guestRoot+'/'+out;await mkdir(generated+'/temp',{recursive:true});await mkdir(generated+'/monitor');
const owner={schemaVersion:'digest-approved-job-exclusive-owner-v001',exclusiveOwnerId:cfg.id,createdAt:new Date(state.now).toISOString(),controllerPid:process.ppid,
 jobSha256:q.jobBinding.fileSha256,authorizationSha256:q.authorizationBinding.fileSha256,outputRoot:out,commandPermitPath:cfg.permitPath,implementationSha:q.job.implementation.sha};
const ownerRaw=formal(owner);await writeFile(generated+'/ownership.json',ownerRaw,{flag:'wx'});
const permit={schemaVersion:'digest-approved-job-command-permit-v001',status:'verified-approved-digest-job-v001',jobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
 bindings:{planId:q.job.planId,logicalPrefix:out,planManifest:{...q.job.inputs.candidateManifestBinding,path:cfg.repo+'/'+q.job.inputs.candidateManifestBinding.path},approvalRecord:q.authorizationBinding,implementationSha:q.job.implementation.sha,commandPermitPath:cfg.permitPath},
 storage:s,implementation:q.job.implementation.bindings.map(b=>({...b,path:cfg.repo+'/'+b.path})),monitorDirectory:generated+'/monitor',
 command:[process.execPath,'--import',cfg.repo+'/runner/node_modules/tsx/dist/loader.mjs',cfg.repo+'/runner/src/digest-approved-job-runner-v001.ts','--permit',cfg.permitPath,'--job-sha256',q.jobBinding.fileSha256,'--authorization-sha256',q.authorizationBinding.fileSha256],
 ownerBinding:{path:generated+'/ownership.json',fileSha256:sha(ownerRaw),sizeBytes:ownerRaw.length}};
const permitRaw=formal(permit);await writeFile(cfg.permitPath,permitRaw,{flag:'wx'});
await writeFile(generated+'/monitor/owned-group.json',formal({group:process.pid,parentPid:process.pid,command:permit.command,bindings:permit.bindings,storage:s}),{flag:'wx'});
Object.assign(process.env,{ZEV_FULL_SUPERVISED:'1',ZEV_APPROVED_JOB_PERMIT:cfg.permitPath,ZEV_APPROVED_JOB_SHA256:q.jobBinding.fileSha256,ZEV_APPROVED_AUTHORIZATION_SHA256:q.authorizationBinding.fileSha256});delete process.env.NODE_OPTIONS;
const inputs=Object.freeze({testOnlyQualified:q,styleTemplate:{reconstructionMap:{caseContexts:[{styleBindings:{}}]}},typographySettingsBinding:q.job.inputs.typographySettingsBinding});
const m={fileSha:async p=>sha(await readFile(p)),formal,bind:(p,v)=>({path:p,fileSha256:sha(formal(v)),sizeBytes:formal(v).length}),same:(a,b)=>JSON.stringify(a)===JSON.stringify(b)};
const context=await runner.__storageTestCreateStorage(cfg.permitPath,permitRaw,permit,q,inputs,m);
assert(Object.isFrozen(context)&&Object.isFrozen(q.job));resetCounts();
const plan={planId:q.job.planId,outputRoot:out,approvedJobBinding:q.jobBinding,approvalRecordBinding:q.authorizationBinding,
 acceptedManifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,verificationPolicy:q.job.verificationPolicy};
const validate=()=>runner.assertQualifiedApprovedDigestStorageContextV001(context,plan);
const counts=()=>({jobReads:state.jobReads,authorizationReads:state.authorizationReads,inputReads:state.inputReads,recoveryChecks});
function fresh(n){assert.equal(state.jobReads,2*n,'each actual job revalidation must retain both stable reads');assert.equal(state.authorizationReads,2*n,'each actual authorization revalidation must retain both stable reads');}
const target=out+'/test-operation.json',operation=()=>context.publish(target,{schemaVersion:'test-only-storage-operation',value:1});
async function absent(){await assert.rejects(lstat(map(context.resolve(target))),{code:'ENOENT'});}
async function rejectsBeforeOperation(pattern){await assert.rejects(operation(),pattern);await absent();}
async function replaceSame(p){const raw=await readFile(p),replacement=p+'.owned-replacement';await writeFile(replacement,raw,{flag:'wx'});await rename(replacement,p);}
let evidence={};
if(cfg.scenario==='normal-fresh'){
 await validate();fresh(1);const one=counts();resetCounts();await validate();await validate();fresh(2);const serial=counts();resetCounts();await Promise.all([validate(),validate()]);fresh(2);const parallel=counts();
 // Exercise the real guarded publication and stable readback, not merely the public entry.
 resetCounts();const binding=await operation();assert.equal((await context.readBound(binding)).value,1);fresh(3);
 evidence={one,serial,parallel,publicationAndReadback:counts()};
}else if(cfg.scenario==='recovery-cache'){
 assert.equal(recoveryChecks,1);await validate();fresh(1);assert.equal(recoveryChecks,1);resetCounts();await validate();fresh(1);assert.equal(recoveryChecks,1);
 state.now+=1000;resetCounts();await validate();fresh(2);assert.equal(recoveryChecks,2);evidence={afterExpired:counts()};
 // A successful cached storage observation cannot hide changed control bytes.
 resetCounts();await writeFile(q.jobBinding.path,Buffer.concat([await readFile(q.jobBinding.path),Buffer.from(' ')]));resetCounts();await assert.rejects(validate(),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);await absent();
}else if(cfg.scenario==='recovery-inflight'){
 state.now+=1000;state.pauseJobOnce=true;const direct=context.assertCurrent();
 for(let i=0;!state.paused&&i<1000;i++)await new Promise(r=>setImmediate(r));assert(state.paused,'currentRaw entered actual job read');
 let outerSettled=false;const outer=validate().then(()=>{outerSettled=true;});
 for(let i=0;state.extraCodeStats<2&&i<2000;i++)await new Promise(r=>setTimeout(r,1));await new Promise(r=>setImmediate(r));
 assert.equal(state.extraCodeStats,2,'outer real qualification reached its last actual code identity check while currentRaw remains blocked');assert.equal(outerSettled,false,'outer waits for the in-flight current');
 assert.equal(state.jobReads,3,'outer fresh check must enter even while recovery current is shared');
 assert.equal(state.authorizationReads,4,'both actual authorization stable reads complete for each fresh check');
 state.release();await Promise.all([direct,outer]);fresh(2);assert.equal(recoveryChecks,2);evidence=counts();
}else if(cfg.scenario==='fake-and-plan'){
 let callbacks=0;for(const fake of [{assertCurrent:async()=>callbacks++},Object.freeze({...context}),{...context,assertCurrent:async()=>callbacks++}])await assert.rejects(runner.assertQualifiedApprovedDigestStorageContextV001(fake),/QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/);
 assert.equal(callbacks,0);assert.equal(state.jobReads,0);await assert.rejects(common.assertQualifiedDigestApprovedJobV001({...q}),/QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/);
 for(const key of ['planId','outputRoot','approvedJobBinding','approvalRecordBinding','acceptedManifestBinding','typographySettingsBinding','verificationPolicy']){
  const wrong={...plan,[key]:key.endsWith('Binding')?{path:'runtime/artifacts/fake/other.json',fileSha256:'0'.repeat(64)}:'wrong'};
  await assert.rejects(runner.assertQualifiedApprovedDigestStorageContextV001(context,wrong));
 }
 await absent();evidence={callbacks,forgedContexts:3,wrongPlanFields:7};
}else if(cfg.scenario==='job-bytes'||cfg.scenario==='authorization-bytes'){
 const p=cfg.scenario==='job-bytes'?q.jobBinding.path:q.authorizationBinding.path;await writeFile(p,Buffer.concat([await readFile(p),Buffer.from(' ')]));await rejectsBeforeOperation(/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
}else if(cfg.scenario==='job-identity'||cfg.scenario==='authorization-identity'){
 await replaceSame(cfg.scenario==='job-identity'?q.jobBinding.path:q.authorizationBinding.path);await rejectsBeforeOperation(/APPROVED_JOB_CONTROL_IDENTITY_CHANGED/);
}else if(cfg.scenario.startsWith('during-read-')){
 state.mutation={path:q.jobBinding.path,kind:cfg.scenario.slice('during-read-'.length)};await rejectsBeforeOperation(/APPROVED_JOB_UNSTABLE_REFERENCE/);
}else if(cfg.scenario==='head-change'){
 state.headChanged=true;await rejectsBeforeOperation(/APPROVED_JOB_IMPLEMENTATION_HEAD_CHANGED/);
}else if(cfg.scenario==='code-change'){
 await writeFile(cfg.extraCode,Buffer.concat([await readFile(cfg.extraCode),Buffer.from(' ')]));await rejectsBeforeOperation(/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
}else if(cfg.scenario.startsWith('input-')){
 const p=cfg.inputPaths[Number(cfg.scenario.slice(6))];await writeFile(p,Buffer.concat([await readFile(p),Buffer.from(' ')]));await rejectsBeforeOperation(/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
}else if(cfg.scenario==='owner-bytes'||cfg.scenario==='permit-bytes'){
 const p=cfg.scenario==='owner-bytes'?permit.ownerBinding.path:cfg.permitPath;await writeFile(p,Buffer.concat([await readFile(p),Buffer.from(' ')]));await rejectsBeforeOperation(cfg.scenario==='permit-bytes'?/APPROVED_JOB_PERMIT_CHANGED/:undefined);
}else if(cfg.scenario==='owner-identity'||cfg.scenario==='permit-identity'){
 await replaceSame(cfg.scenario==='owner-identity'?permit.ownerBinding.path:cfg.permitPath);await rejectsBeforeOperation(/APPROVED_JOB_OWNER_OR_PERMIT_IDENTITY_CHANGED/);
}else if(cfg.scenario==='owner-dead'){
 state.deadOwner=true;await rejectsBeforeOperation(/TEST_OWNER_NOT_ALIVE/);
}else if(cfg.scenario==='guest-device'||cfg.scenario==='host-device'){
 if(cfg.scenario==='guest-device')state.deviceDelta=1;else state.hostDeviceDelta=1;await rejectsBeforeOperation();
}else if(cfg.scenario==='guest-uuid'||cfg.scenario==='host-uuid'){
 if(cfg.scenario==='guest-uuid')state.guestUuidChanged=true;else state.hostUuidChanged=true;await rejectsBeforeOperation();
}else if(cfg.scenario==='image-identity'){
 state.imageIdentityChanged=true;await rejectsBeforeOperation();
}else if(cfg.scenario==='node-identity'){
 state.nodeIdentityChanged=true;await rejectsBeforeOperation(/APPROVED_JOB_NODE_IDENTITY_CHANGED/);
}else if(cfg.scenario==='image-metadata'){
 const p=s.imagePath+'/Info.plist';await writeFile(p,Buffer.concat([await readFile(p),Buffer.from(' ')]));await rejectsBeforeOperation();
}else if(cfg.scenario==='dirty-code'){
 state.dirty=true;await rejectsBeforeOperation(/APPROVED_JOB_IMPLEMENTATION_DIRTY/);
}else if(cfg.scenario==='guest-reserve'||cfg.scenario==='internal-reserve'){
 if(cfg.scenario==='guest-reserve')state.guestFree=q.job.guard.reserveBytes;else state.internalFree=q.job.guard.reserveBytes;await rejectsBeforeOperation(/APPROVED_JOB_DISK_RESERVE/);
}else if(cfg.scenario==='next-unit-reserve'){
 state.guestFree=q.job.guard.reserveBytes+1;await assert.rejects(context.resourceCheck({stage:'test-only-next-unit',newBytes:2}));await absent();
}else throw Error('UNKNOWN_TEST_SCENARIO '+cfg.scenario);
process.kill=originalKill;Date.now=originalNow;process.stdout.write(JSON.stringify({scenario:cfg.scenario,passed:true,evidence,counts:counts(),productionAuthority:false,mediaGenerated:0})+'\n');
`;

async function fixture(scenario:string){
  const id=randomUUID(),name='test-storage-revalidation-'+id,relative='runtime/artifacts/'+name,directory=ROOT+'/'+relative;
  await exec('git',['check-ignore','-q',relative+'/job.json'],{cwd:ROOT});await mkdir(directory,{recursive:false});
  try{
    const save=async(name:string,value:unknown)=>{const raw=bytes(value),file=directory+'/'+name;await writeFile(file,raw,{flag:'wx'});return {path:file,fileSha256:hash(raw),sizeBytes:raw.length};};
    await mkdir(directory+'/guest');await mkdir(directory+'/host');await mkdir(directory+'/host/test-only.sparsebundle');await writeFile(directory+'/host/test-only.sparsebundle/Info.plist','TEST-ONLY IMAGE METADATA\n',{flag:'wx'});
    const controls:any={};for(const key of ['prep','candidate','typography','renderer']){const b=await save(key+'.json',{schemaVersion:'test-only-'+key});controls[key]={...b,path:path.relative(ROOT,b.path)};}
    const extraCode=directory+'/test-only-code.txt';await writeFile(extraCode,'SYNTHETIC OWN CODE PIN\n',{flag:'wx'});
    const guestRoot='/Volumes/TEST-STORAGE-GUEST-'+id,hostRoot='/Volumes/TEST-STORAGE-HOST-'+id,recovery=scenario.startsWith('recovery-');
    const job:any={schemaVersion:'digest-approved-job-v001',planId:name,outputRoot:relative+'/attempt-001',
      inputs:{preparationParameters:{testOnly:true},preparationManifestBinding:controls.prep,candidateManifestBinding:controls.candidate,typographySettingsBinding:controls.typography,rendererTemplateBinding:controls.renderer},
      storage:{guestRoot,hostRoot,imagePath:hostRoot+'/test-only.sparsebundle',guestVolumeUuid:'11111111-1111-1111-1111-111111111111',hostVolumeUuid:'22222222-2222-2222-2222-222222222222',
        guestDevice:19001,hostDevice:19002,imageMaximumBytes:100_000_000_000,hostMetadataReserveBytes:6_000_000_000,internalRoot:ROOT},
      expected:{frames:2,audioSamples:2940,groups:1,atoms:1,cues:1},guard:{...DIGEST_APPROVED_JOB_GUARD_V001},allocationBudget:{baseBuildBytes:1,rendererPreparationBytes:1},
      implementation:{sha:(await exec('git',['rev-parse','HEAD'],{cwd:ROOT})).stdout.trim(),bindings:[...await Promise.all(implementationPaths.map(async p=>({path:p,fileSha256:await fileHash(ROOT+'/'+p)}))),
        {path:path.relative(ROOT,extraCode),fileSha256:await fileHash(extraCode)}],nodeBinding:{path:node,fileSha256:await fileHash(node),sizeBytes:(await lstat(node)).size}}};
    if(recovery){const binding=await save('test-only-recovery-origin.json',{schemaVersion:'test-only-not-a-production-recovery'});job.recoveryBinding={...binding,path:path.relative(ROOT,binding.path)};
      job.verificationPolicy={schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',representativeInstructionIds:['test-only-caption'],permittedMethods:['text-clock-context'],confirmationRecordPath:job.outputRoot+'/representative/confirmation.json'};}
    const jobBinding=await save('job.json',job),authorizationBinding=await save('synthetic-authorization.json',{schemaVersion:'digest-approved-job-authorization-v001',recordId:name+'-synthetic',
      userApproval:{at:new Date().toISOString(),messageId:'TEST-NOT-A-HUMAN-MESSAGE',sourceThreadId:'TEST-NO-HUMAN-AUTHORITY',text:'Synthetic storage regression only. No real grant, media, manufacture or approval.'},
      actions:['manufacture-one-approved-plan'],normalCandidates:1,jobBinding,planId:job.planId,outputRoot:job.outputRoot,manifestBinding:job.inputs.candidateManifestBinding,
      typographySettingsBinding:job.inputs.typographySettingsBinding,storage:job.storage,guard:job.guard,implementation:job.implementation,
      ...(recovery?{recoveryBinding:job.recoveryBinding,verificationPolicy:job.verificationPolicy}:{})});
    const options={workspaceRoot:ROOT,jobBinding,authorizationBinding,trustedJobSha256:jobBinding.fileSha256,trustedAuthorizationSha256:authorizationBinding.fileSha256};
    const cfg={id,scenario,repo:ROOT,fixture:directory,options,guestRoot,hostRoot,guestPhysical:directory+'/guest',hostPhysical:directory+'/host',
      guestDevice:job.storage.guestDevice,hostDevice:job.storage.hostDevice,guestVolumeUuid:job.storage.guestVolumeUuid,hostVolumeUuid:job.storage.hostVolumeUuid,imagePath:job.storage.imagePath,
      nodePath:node,extraCode,inputPaths:Object.values(controls).map((b:any)=>ROOT+'/'+b.path),permitPath:guestRoot+'/'+job.outputRoot+'/command-permit.json'};
    await save('hardware.json',cfg);
    for(const [name,source] of Object.entries({'loader.mjs':loaderSource,'register.mjs':registerSource,'control.mjs':controlSource,'fs-promises-shim.mjs':fsPromisesSource,
      'fs-shim.mjs':fsSource,'child-process-shim.mjs':childProcessSource,'inputs-shim.mjs':inputsSource,'worker.mjs':workerSource}))await writeFile(directory+'/'+name,source,{flag:'wx'});
    const env:NodeJS.ProcessEnv={...process.env,NODE_PATH:ROOT+'/runner/node_modules',ZEV_STORAGE_REVALIDATION_FIXTURE:directory};delete env.NODE_OPTIONS;
    const child=spawn(node,['--import',ROOT+'/runner/node_modules/tsx/dist/loader.mjs','--import',directory+'/register.mjs',directory+'/worker.mjs'],{cwd:ROOT,env,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v);
    const result=await new Promise<{code:number|null}>((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code}));});
    assert.equal(result.code,0,stderr);const evidence=JSON.parse(stdout.trim());assert.equal(evidence.passed,true);assert.equal(evidence.mediaGenerated,0);return evidence;
  }finally{await rm(directory,{recursive:true,force:true});await assert.rejects(lstat(directory),{code:'ENOENT'});}
}

test('Normal actual storage gate performs one fresh qualification per call, serially and concurrently, and guards publication/readback',async()=>{await fixture('normal-fresh');});
test('Recovery retains the external fresh qualification inside 900ms and after expiry; cached success cannot hide changed job bytes',async()=>{await fixture('recovery-cache');});
test('Recovery in-flight current is shared while the public call still performs its own fresh qualification',async()=>{await fixture('recovery-inflight');});
test('Actual private context/job membership and plan bindings reject forgeries/clones/mismatches before operation',async()=>{await fixture('fake-and-plan');});
for(const scenario of ['job-bytes','authorization-bytes','job-identity','authorization-identity','during-read-write','during-read-rename','during-read-same-bytes',
  'head-change','code-change','input-0','input-1','input-2','input-3','owner-bytes','permit-bytes','owner-identity','permit-identity','owner-dead',
  'guest-device','host-device','guest-uuid','host-uuid','image-identity','node-identity','image-metadata','dirty-code','guest-reserve','internal-reserve','next-unit-reserve']){
  test('Actual revalidation rejects '+scenario+' before the guarded operation creates its output',async()=>{await fixture(scenario);});
}

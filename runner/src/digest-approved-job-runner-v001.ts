/** Normal entry for one explicitly authorized Digest job; historical retries are a separate entry. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, realpath, lstat, readdir, statfs, chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {readQualifiedDigestApprovedJobV001, assertQualifiedDigestApprovedJobV001, validateDigestApprovedJobConfigurationV001,
  digestJobSha256V001 as sha, digestJobRelativePathV001 as safe, digestApprovedJobInputRootV001, type Json} from './digest-approved-job-v001.js';
import {readApprovedDigestInputsV001, assertApprovedDigestInputsV001, prepareApprovedDigestCaptionCoreV001,
  buildApprovedDigestCaptionVisibilitySelectionV001,
  assertQualifiedApprovedDigestSourcePackageTaskV001, qualifyApprovedDigestSourcePackageReadbackV001} from './digest-approved-inputs-v001.js';
import type {ApprovedDigestQualifiedJobV001} from './digest-approved-inputs-v001.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exec = promisify(execFile), contexts = new WeakMap<object, Json>();
const frozen = (v:any):any => {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(frozen);Object.freeze(v);}return v;};
export type ApprovedDigestSourceIdentityV001 = Readonly<{dev:string;ino:string;sizeBytes:number;mtimeNs:string;ctimeNs:string;fileSha256:string}>;
export type ApprovedDigestResolvedSourceV001 = Readonly<{physicalPath:string;identity:ApprovedDigestSourceIdentityV001;assertCurrent:()=>Promise<void>}>;
const load = (p: string): Promise<any> => import(pathToFileURL(path.join(ROOT, safe(p))).href);
async function boundAbsolute(binding: Json): Promise<Buffer> {
  assert(binding && path.isAbsolute(binding.path) && path.normalize(binding.path) === binding.path && /^[0-9a-f]{64}$/u.test(binding.fileSha256));
  assert.equal(await realpath(binding.path), binding.path);
  const before = await lstat(binding.path, {bigint: true}); assert(before.isFile() && !before.isSymbolicLink());
  const first = await readFile(binding.path), second = await readFile(binding.path), after = await lstat(binding.path, {bigint: true});
  assert(first.equals(second) && before.ino === after.ino && before.dev === after.dev && before.size === after.size
    && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs, 'APPROVED_STORAGE_UNSTABLE_FILE');
  assert.equal(sha(first), binding.fileSha256); if (binding.sizeBytes !== undefined) assert.equal(first.length, binding.sizeBytes); return first;
}
async function disk(root: string) {return JSON.parse((await exec('/usr/bin/python3', ['-B','-c',
  'import json,plistlib,subprocess,sys;print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/sbin/diskutil","info","-plist",sys.argv[1]]))))',root])).stdout);}
/** Only objects minted after explicit grant/plan/storage/owner validation qualify. */
export async function assertQualifiedApprovedDigestStorageContextV001(context: unknown, plan?: Json): Promise<void> {
  assert(context && typeof context === 'object' && contexts.has(context), 'QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED');
  const record = contexts.get(context)!;
  // Normal assertCurrent always revalidates below; recovery can reuse its check.
  if (record.qualified.job.recoveryBinding !== undefined) {
    await assertQualifiedDigestApprovedJobV001(record.qualified);
  }
  if (plan !== undefined) {
    assert.equal(plan.planId, record.qualified.job.planId); assert.equal(plan.outputRoot, record.qualified.job.outputRoot);
    assert.deepEqual(plan.approvedJobBinding, record.qualified.jobBinding);
    assert.deepEqual(plan.approvalRecordBinding, record.qualified.authorizationBinding);
    assert.deepEqual(plan.acceptedManifestBinding, record.qualified.job.inputs.candidateManifestBinding);
    assert.deepEqual(plan.typographySettingsBinding, record.qualified.job.inputs.typographySettingsBinding);
    assert.deepEqual(plan.verificationPolicy, record.qualified.job.verificationPolicy,'APPROVED_CORE_VERIFICATION_POLICY_MISMATCH');
  }
  await (context as Json).assertCurrent();
}

async function observeDeclaredSource(context:Json,declaration:Json):Promise<ApprovedDigestSourceIdentityV001> {
  await context.assertCurrent();
  const q=context.approvedJob,absolute=declaration.physicalPath;
  const sourceRoot=declaration.placement==='normal-declared-guest-source-v001'?q.job.storage.guestRoot:ROOT;
  assert(path.isAbsolute(absolute)&&path.normalize(absolute)===absolute&&absolute.startsWith(sourceRoot+'/'),'APPROVED_JOB_SOURCE_PREFIX_CHANGED');
  const rootStat=await lstat(sourceRoot,{bigint:true});
  const expectedDevice=declaration.placement==='normal-declared-guest-source-v001'?BigInt(q.job.storage.guestDevice):rootStat.dev;
  for(let p=path.dirname(absolute);;p=path.dirname(p)) {
    const st=await lstat(p,{bigint:true});assert(st.isDirectory()&&!st.isSymbolicLink()&&st.dev===expectedDevice,'APPROVED_JOB_SOURCE_PARENT_CHANGED');
    if(p===sourceRoot)break;assert(p.startsWith(sourceRoot+'/'),'APPROVED_JOB_SOURCE_PREFIX_CHANGED');
  }
  assert.equal(await realpath(absolute),absolute,'APPROVED_JOB_SOURCE_REALPATH_CHANGED');
  const before=await lstat(absolute,{bigint:true});
  assert(before.isFile()&&!before.isSymbolicLink()&&before.dev===expectedDevice,'APPROVED_JOB_SOURCE_FILE_OR_DEVICE_CHANGED');
  assert.equal(before.size,BigInt(declaration.sizeBytes),'APPROVED_JOB_SOURCE_SIZE_CHANGED');
  const digest=createHash('sha256');let bytes=0;
  for await(const chunk of createReadStream(absolute)) {digest.update(chunk);bytes+=chunk.length;assert(bytes<=declaration.sizeBytes,'APPROVED_JOB_SOURCE_SIZE_CHANGED');}
  const after=await lstat(absolute,{bigint:true});
  assert(after.isFile()&&!after.isSymbolicLink()&&await realpath(absolute)===absolute,'APPROVED_JOB_SOURCE_REALPATH_CHANGED');
  for(const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(before[key],after[key],'APPROVED_JOB_SOURCE_IDENTITY_CHANGED');
  assert.equal(bytes,declaration.sizeBytes,'APPROVED_JOB_SOURCE_SIZE_CHANGED');
  const fileSha256=digest.digest('hex');assert.equal(fileSha256,declaration.fileSha256,'APPROVED_JOB_SOURCE_BYTES_CHANGED');
  await context.assertCurrent();
  return Object.freeze({dev:String(after.dev),ino:String(after.ino),sizeBytes:bytes,mtimeNs:String(after.mtimeNs),ctimeNs:String(after.ctimeNs),fileSha256});
}

/** The public entry checks the actual private context; caller callbacks never qualify. */
export async function resolveQualifiedApprovedDigestSourceV001(context:unknown,sourceArtifact:Json):Promise<ApprovedDigestResolvedSourceV001> {
  await assertQualifiedApprovedDigestStorageContextV001(context);
  const record=contexts.get(context as object)!,owned=context as Json;
  await assertApprovedDigestInputsV001(record.inputs,record.qualified);
  const declared=record.inputs.sourceDeclaration;
  assert.deepEqual(sourceArtifact,declared.sourceArtifact,'APPROVED_JOB_SOURCE_ARTIFACT_CHANGED');
  const artifact=frozen(structuredClone(sourceArtifact)),identity=await observeDeclaredSource(owned,declared);
  const assertCurrent=async()=>{
    await assertQualifiedApprovedDigestStorageContextV001(owned);
    assert.deepEqual(artifact,record.inputs.manufacturing.sourceArtifact,'APPROVED_JOB_SOURCE_ARTIFACT_CHANGED');
    assert.deepEqual(await observeDeclaredSource(owned,declared),identity,'APPROVED_JOB_SOURCE_IDENTITY_CHANGED');
  };
  return Object.freeze({physicalPath:declared.physicalPath,identity,assertCurrent});
}
async function createStorage(permitPath: string, permitBytes: Buffer, permit: Json, qualified: ApprovedDigestQualifiedJobV001, inputs: Json, m: any) {
  await assertApprovedDigestInputsV001(inputs, qualified);
  const job = qualified.job, s = job.storage, outputRoot = job.outputRoot, generatedRoot = path.join(s.guestRoot, outputRoot);
  const recovery = job.recoveryBinding === undefined ? null : await readSpecificDigestFailedWorkV001(qualified);
  const reuseModule = job.inputs.baseReuseBundleBinding === undefined ? null : await load('runner/src/digest-approved-base-reuse-v001.ts');
  const baseReuse = reuseModule === null ? null : await reuseModule.readQualifiedDigestApprovedBaseReuseV001(qualified,inputs);
  assert.equal(permit.schemaVersion, 'digest-approved-job-command-permit-v001'); assert.equal(permit.status, 'verified-approved-digest-job-v001');
  assert.deepEqual(Object.keys(permit).sort(), ['schemaVersion','status','jobBinding','authorizationBinding','bindings','storage','implementation','monitorDirectory','command','ownerBinding'].sort());
  assert.deepEqual(permit.jobBinding, qualified.jobBinding); assert.deepEqual(permit.authorizationBinding, qualified.authorizationBinding);
  assert.deepEqual(permit.storage, s);
  assert.deepEqual(permit.bindings, {planId: job.planId,logicalPrefix: outputRoot,
    planManifest: {...job.inputs.candidateManifestBinding,path: path.join(digestApprovedJobInputRootV001(job,job.inputs.candidateManifestBinding.path,ROOT),job.inputs.candidateManifestBinding.path)},
    approvalRecord: qualified.authorizationBinding,implementationSha: job.implementation.sha,commandPermitPath: permitPath});
  assert.deepEqual(permit.implementation, job.implementation.bindings.map((b: Json) => ({...b,path: path.join(ROOT,b.path)})));
  assert.equal(permit.monitorDirectory, generatedRoot + '/monitor'); assert.equal(permit.ownerBinding.path, generatedRoot + '/ownership.json');
  assert.deepEqual(permit.command, [process.execPath,'--import',ROOT+'/runner/node_modules/tsx/dist/loader.mjs',
    ROOT+'/runner/src/digest-approved-job-runner-v001.ts','--permit',permitPath,'--job-sha256',qualified.jobBinding.fileSha256,
    '--authorization-sha256',qualified.authorizationBinding.fileSha256]);
  assert.equal(process.env.ZEV_FULL_SUPERVISED,'1'); assert.equal(process.env.ZEV_APPROVED_JOB_PERMIT, permitPath);
  assert.equal(process.env.ZEV_APPROVED_JOB_SHA256,qualified.jobBinding.fileSha256);
  assert.equal(process.env.ZEV_APPROVED_AUTHORIZATION_SHA256,qualified.authorizationBinding.fileSha256);
  assert(!Object.hasOwn(process.env,'NODE_OPTIONS'));
  assert.equal((await exec('/usr/bin/id',['-u'])).stdout.trim() === '0', false, 'NONROOT_JOB_REQUIRED');
  const owner = JSON.parse((await boundAbsolute(permit.ownerBinding)).toString());
  const ownerIdentity=await lstat(permit.ownerBinding.path,{bigint:true}),permitIdentity=await lstat(permitPath,{bigint:true});
  assert.deepEqual(Object.keys(owner).sort(),['schemaVersion','exclusiveOwnerId','createdAt','controllerPid','jobSha256','authorizationSha256','outputRoot','commandPermitPath','implementationSha'].sort());
  assert.equal(owner.schemaVersion,'digest-approved-job-exclusive-owner-v001'); assert(/^[0-9a-f-]{36}$/u.test(owner.exclusiveOwnerId));
  assert.equal(owner.controllerPid,process.ppid); assert.equal(owner.jobSha256,qualified.jobBinding.fileSha256);
  assert.equal(owner.authorizationSha256,qualified.authorizationBinding.fileSha256); assert.equal(owner.outputRoot,outputRoot);
  assert.equal(owner.commandPermitPath,permitPath); assert.equal(owner.implementationSha,job.implementation.sha);
  assert(Number.isFinite(Date.parse(owner.createdAt)) && Date.now()-Date.parse(owner.createdAt)>=0
    && Date.now()-Date.parse(owner.createdAt)<600_000,'APPROVED_JOB_OWNER_NOT_FRESH');
  const controller=(await exec('/bin/ps',['-p',String(process.ppid),'-o','args='])).stdout;
  const directSupervisor=controller.includes(permitPath);
  const launchingSupervisor=controller.includes('--launch-job')&&controller.includes(qualified.jobBinding.path)
    &&controller.includes(qualified.authorizationBinding.path);
  assert(controller.includes(ROOT+'/tools/digest-quality/original-resolution-full-supervisor-v002.py')
    && (directSupervisor||launchingSupervisor) && controller.includes(qualified.jobBinding.fileSha256)
    && controller.includes(qualified.authorizationBinding.fileSha256),'APPROVED_JOB_SUPERVISOR_OWNER_REQUIRED');
  const owned=JSON.parse(await readFile(permit.monitorDirectory+'/owned-group.json','utf8'));
  assert.equal(owned.group,process.pid); assert.equal(owned.parentPid,process.pid); assert.deepEqual(owned.command,permit.command);
  assert.deepEqual(owned.bindings,permit.bindings); assert.deepEqual(owned.storage,s);
  assert.equal(await realpath(generatedRoot),generatedRoot); assert.equal(await realpath(generatedRoot+'/temp'),generatedRoot+'/temp');
  assert((await readdir(generatedRoot)).every(n=>['ownership.json','command-permit.json','temp','monitor'].includes(n)), 'APPROVED_JOB_ROOT_ALREADY_USED');
  assert.equal(await realpath(s.imagePath),s.imagePath);
  const imageStat=await lstat(s.imagePath); assert(imageStat.isDirectory() && !imageStat.isSymbolicLink());
  const imageInfo=await readFile(s.imagePath+'/Info.plist');
  const plist=JSON.parse((await exec('/usr/bin/python3',['-B','-c','import json,plistlib,sys;print(json.dumps(plistlib.load(open(sys.argv[1],"rb"))))',s.imagePath+'/Info.plist'])).stdout);
  assert.equal(plist['diskimage-bundle-type'],'com.apple.diskimage.sparsebundle'); assert(Number.isSafeInteger(plist.size)&&plist.size>0&&plist.size<=s.imageMaximumBytes);
  assert.equal(process.execPath,job.implementation.nodeBinding.path,'APPROVED_JOB_NODE_PATH_CHANGED');
  assert.equal(await realpath(process.execPath),process.execPath);const nodeIdentity=await lstat(process.execPath,{bigint:true});
  assert(nodeIdentity.isFile()&&!nodeIdentity.isSymbolicLink());assert.equal(await m.fileSha(process.execPath),job.implementation.nodeBinding.fileSha256,'APPROVED_JOB_NODE_BYTES_CHANGED');
  if(job.implementation.nodeBinding.sizeBytes!==undefined) assert.equal(Number(nodeIdentity.size),job.implementation.nodeBinding.sizeBytes);
  let resourceId=0; let publishedSourcePackageSha: string|undefined;
  async function currentRaw() {
    await assertQualifiedDigestApprovedJobV001(qualified);
    if (recovery !== null) await recovery.assertCurrent();
    if (baseReuse !== null) await reuseModule!.assertQualifiedDigestApprovedBaseReuseV001(baseReuse,qualified);
    for(const key of job.inputs.kind==='j16-staged-static-v001'
      ? ['candidateManifestBinding','visibilitySelectionBinding','visibilityAdoptionBinding','typographySettingsBinding','rendererTemplateBinding']
      : ['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding','migrationApprovalEvidenceBinding'])
      await qualified.readBinding(job.inputs[key]);
    const nodeNow=await lstat(process.execPath,{bigint:true});
    for(const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(nodeNow[key],nodeIdentity[key],'APPROVED_JOB_NODE_IDENTITY_CHANGED');
    assert.equal(sha(await readFile(permitPath)),sha(permitBytes),'APPROVED_JOB_PERMIT_CHANGED'); await boundAbsolute(permit.ownerBinding);
    for(const [file,identity] of [[permitPath,permitIdentity],[permit.ownerBinding.path,ownerIdentity]] as const) {
      const now=await lstat(file,{bigint:true});for(const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const)
        assert.equal(now[key],identity[key],'APPROVED_JOB_OWNER_OR_PERMIT_IDENTITY_CHANGED');
    }
    process.kill(owner.controllerPid,0);
    assert.equal((await exec('git',['status','--porcelain=v1'],{cwd:ROOT})).stdout,'','APPROVED_JOB_IMPLEMENTATION_DIRTY');
    const [guest,host,im]=await Promise.all([disk(s.guestRoot),disk(s.hostRoot),lstat(s.imagePath)]);
    for(const [info,root,uuid,device,fs] of [[guest,s.guestRoot,s.guestVolumeUuid,s.guestDevice,'apfs'],[host,s.hostRoot,s.hostVolumeUuid,s.hostDevice,'exfat']] as any[]) {
      assert.equal(info.VolumeUUID,uuid); assert.equal(info.MountPoint,root); assert.equal(info.FilesystemType,fs);
      assert.equal(await realpath(root),root); assert.equal((await lstat(root)).dev,device);
      assert(/^\/dev\/disk[0-9]+s[0-9]+$/u.test(info.DeviceNode)); assert.equal(info.WritableVolume,true);
    }
    assert.equal(guest.GlobalPermissionsEnabled,true); assert.equal(im.ino,imageStat.ino); assert.equal(im.dev,s.hostDevice);
    assert(!im.isSymbolicLink()); assert.equal(await realpath(s.imagePath),s.imagePath); assert.equal(sha(await readFile(s.imagePath+'/Info.plist')),sha(imageInfo));
    const mounted=JSON.parse((await exec('/usr/bin/python3',['-B','-c','import json,plistlib,subprocess;print(json.dumps(plistlib.loads(subprocess.check_output(["/usr/bin/hdiutil","info","-plist"]))))'])).stdout);
    const matches=mounted.images.filter((v:Json)=>v['image-path']===s.imagePath);
    assert.equal(matches.length,1); assert(matches[0]['system-entities'].some((v:Json)=>v['dev-entry']===guest.DeviceNode&&v['mount-point']===s.guestRoot));
    for(const root of [s.guestRoot,s.internalRoot]) {const fs=await statfs(root); assert(fs.bavail*fs.bsize>job.guard.reserveBytes,'APPROVED_JOB_DISK_RESERVE');}
  }
  let recoveryCheckAt = 0;
  let recoveryCheck: Promise<void> | undefined;
  async function current() {
    if (recovery === null) return currentRaw();
    if (recoveryCheck !== undefined) return recoveryCheck;
    if (Date.now() - recoveryCheckAt < 900) return;
    recoveryCheck = currentRaw();
    try {await recoveryCheck; recoveryCheckAt = Date.now();} finally {recoveryCheck = undefined;}
  }
  const generated=(p:string)=>{safe(p); return p===outputRoot||p.startsWith(outputRoot+'/');};
  const oldReference = (p:string) => recovery !== null && recovery.pins.has(path.join(s.guestRoot,p));
  const readRoot=(p:string)=>generated(p)||oldReference(p)?s.guestRoot:digestApprovedJobInputRootV001(job,p,ROOT);
  const resolve=(p:string)=>path.join(readRoot(p),p);
  async function readJson(p:string) {
    await current(); const stable=await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    const bytes=await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot:readRoot(p),relativePath:p});
    const value=JSON.parse(bytes.toString());
    if(p===outputRoot+'/source-package.json') {
      assert(publishedSourcePackageSha&&sha(bytes)===publishedSourcePackageSha,'APPROVED_SOURCE_PUBLICATION_CHANGED');
      await qualifyApprovedDigestSourcePackageReadbackV001(value,inputs,qualified,context,{...m.bind(p,value),fileSha256:sha(bytes),sizeBytes:bytes.length},bytes);
    }
    return value;
  }
  async function readBound(b:Json) {
    await current(); safe(b.path); const stable=await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    const bytes=await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot:readRoot(b.path),relativePath:b.path});
    assert.equal(sha(bytes),b.fileSha256); if(b.sizeBytes!==undefined) assert.equal(bytes.length,b.sizeBytes);
    const value=JSON.parse(bytes.toString()); if(b.canonicalSha256!==undefined) assert.equal(m.canonicalSha(value),b.canonicalSha256);
    if(b.schemaVersion!==undefined) {
      const oldStyle=inputs.styleTemplate?.reconstructionMap.caseContexts[0].styleBindings;
      const qualifiedRegistryIndex=oldStyle!==undefined&&[oldStyle.presetValidationIndex,oldStyle.materialValidationIndex].some((original:Json)=>m.same(original,b));
      if(qualifiedRegistryIndex&&value.schemaVersion===undefined) assert.equal(value.registryVersion,b.schemaVersion,'APPROVED_JOB_BOUND_REGISTRY_VERSION_CHANGED');
      else assert.equal(value.schemaVersion,b.schemaVersion);
    }
    if(b.path===outputRoot+'/source-package.json') {
      assert(publishedSourcePackageSha&&sha(bytes)===publishedSourcePackageSha,'APPROVED_SOURCE_PUBLICATION_CHANGED');
      await qualifyApprovedDigestSourcePackageReadbackV001(value,inputs,qualified,context,b,bytes);
    }
    return value;
  }
  async function publish(p:string,value:Json) {
    assert(generated(p)&&p.startsWith(outputRoot+'/'),'APPROVED_JOB_GENERATED_PREFIX_REQUIRED'); await current();
    const parent=path.dirname(resolve(p)); await mkdir(parent,{recursive:true}); assert.equal(await realpath(parent),parent);
    const bytes=m.formal(value);
    if(p===outputRoot+'/source-package.json') {await assertQualifiedApprovedDigestSourcePackageTaskV001(value,inputs); publishedSourcePackageSha=sha(bytes);}
    await writeFile(resolve(p),bytes,{flag:'wx'}); await chmod(resolve(p),0o444);
    assert.deepEqual(m.formal(await readJson(p)),bytes); return m.bind(p,value);
  }
  async function resourceCheck({stage,newBytes}:{stage:string;newBytes:number}) {
    await current(); assert(typeof stage==='string'&&stage.length>0&&Number.isSafeInteger(newBytes)&&newBytes>=0);
    const fs=await statfs(s.guestRoot); assert(fs.bavail*fs.bsize>=newBytes+job.guard.reserveBytes,'APPROVED_JOB_NEXT_UNIT_RESERVE');
    const id=++resourceId; process.stdout.write('@@RESOURCE_CHECK '+JSON.stringify({id,stage,newBytes})+'\n');
    const line:string=await new Promise((resolveReply,reject)=>{let buffer='';
      const timer=setTimeout(()=>{process.stdin.off('data',got);process.stdin.pause();reject(Error('SUPERVISOR_REPLY_TIMEOUT'));},10000);
      const got=(chunk:Buffer)=>{buffer+=chunk.toString();if(!buffer.includes('\n'))return;clearTimeout(timer);process.stdin.off('data',got);process.stdin.pause();resolveReply(buffer.trim());};
      process.stdin.on('data',got);process.stdin.resume();});
    const reply=JSON.parse(line); assert.equal(reply.id,id); assert(reply.sample?.guest&&reply.sample?.host);
  }
  const context=Object.freeze({outputRoot,planId:job.planId,approvedJob:qualified,storageRoot:s.guestRoot,generatedRoot,tempDirectory:generatedRoot+'/temp',
    resolve,assertCurrent:current,publish,readJson,readBound,resourceCheck,
    resolveCaptionVisibilitySelectionV001:async(plan:Json)=>{await current();return buildApprovedDigestCaptionVisibilitySelectionV001(inputs,qualified,plan);},
    resolveApprovedDigestSourceV001:(artifact:Json)=>resolveQualifiedApprovedDigestSourceV001(context,artifact),
    composeMedia:async(args:Json)=>{await current();assert(recovery === null, 'SPECIFIC_RECOVERY_CANNOT_COMPOSE_NEW_MEDIA');assert.equal(args.expectedFrameCount,job.expected.frames,'APPROVED_JOB_COMPOSE_CLOCK_MISMATCH');
      assert(args.outputPath.startsWith(generatedRoot+'/')); const compositor=await load('tools/digest-quality/original-resolution-low-memory-composite.mjs');
      const visibilitySelection=await buildApprovedDigestCaptionVisibilitySelectionV001(inputs,qualified,args.plan);
      assert.deepEqual(args.visibilitySelection??null,visibilitySelection,'APPROVED_JOB_COMPOSE_VISIBILITY_SUBSTITUTION');
      if(inputs.kind==='j16-staged-static-v001') {
        const drawing=await resolveQualifiedApprovedJ16DrawingV001(context,inputs.normalPlan);
        assert.equal(args.baseMediaPath,drawing.background.video.path,'APPROVED_J16_BACKGROUND_SUBSTITUTION');
        assert.equal(args.audioMediaPath,drawing.background.audio.path,'APPROVED_J16_AUDIO_SUBSTITUTION');
      } else assert(args.audioMediaPath===null||args.audioMediaPath===undefined,'APPROVED_NORMAL_SEPARATE_AUDIO_FORBIDDEN');
      const evidence=await compositor.runFormalLowMemoryCompositeV001({baseMediaPath:args.baseMediaPath,
        ...(inputs.kind==='j16-staged-static-v001'?{audioMediaPath:args.audioMediaPath}:{}),plan:args.plan,visibilitySelection,
        overlayRecords:args.overlayRecords,expectedFrameCount:args.expectedFrameCount,expectedOverlayCount:job.expected.cues,
        outputPath:args.outputPath,ffmpegPath:args.ffmpegPath,processObserver:args.processObserver,resourceCheck});
      const result={...evidence,approvedJobBinding:qualified.jobBinding,typographySettingsBinding:inputs.typographySettingsBinding,derivedTypographyValues:inputs.typographyValues};
      await publish(outputRoot+'/low-memory-composite.json',result);return result;}});
  contexts.set(context,{qualified,inputs}); if(baseReuse!==null) baseReuseContexts.set(context,baseReuse); if (recovery !== null) failedWorkContexts.set(context,recovery);
  await current(); return context;
}

// This entry is restricted to the one recorded representative-module failure.
// Historical bytes are origins; they never qualify as current implementation.
const failedWorkContexts = new WeakMap<object, Json>();
const baseReuseContexts = new WeakMap<object, Readonly<Json>>();
const FAILED_WORK_CASE = Object.freeze({
  planId: 'digest-SJvP9jhEdyI-20261004-v001',
  outputRoot: 'runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/manufacture-v003',
  jobSha256: '74a234da2825f179ace510bfdd4bd12a1951a9cf5fd30adac55dd7f4000e8809',
  authorizationSha256: '8458ac86fcfa77455c8d5a7d031f0155e838500629bb13287c479665317c6d61',
  implementationSha: '2399aa61e245da2506e2487943a24414097852cd',
  videoSha256: '6434a56b40e66212c5dd910638c33b73b53029d733592b0b77ca6aa03d4f18b8',
  videoBytes: 617257203,
  workName: '.render.presentation-renderer-v002-work-xnJorQ',
});

export function assertSpecificDigestFailedWorkDescriptorV001(value: Json, job: Json): void {
  assert.equal(value.schemaVersion, 'digest-approved-specific-failed-work-recovery-v001');
  assert.equal(job.recoveryBinding.fileSha256, '84370d9611ed428f2bdcdf83321ea3c91c2e1f82edd56c96d420de0cb00eb349', 'RECOVERY_CAPTURED_DESCRIPTOR_REQUIRED');
  assert.equal(job.recoveryBinding.sizeBytes, 1010509, 'RECOVERY_CAPTURED_DESCRIPTOR_SIZE_REQUIRED');
  assert.equal(value.planId, FAILED_WORK_CASE.planId);
  assert.equal(value.oldOutputRoot, FAILED_WORK_CASE.outputRoot);
  assert.equal(value.oldImplementationSha, FAILED_WORK_CASE.implementationSha);
  assert.equal(value.failureCode, 'QUALIFIED_REPRESENTATIVE_COMPLETION_REQUIRED');
  assert.equal(value.oldJobBinding.fileSha256, FAILED_WORK_CASE.jobSha256);
  assert.equal(value.oldAuthorizationBinding.fileSha256, FAILED_WORK_CASE.authorizationSha256);
  assert.equal(value.videoBinding.fileSha256, FAILED_WORK_CASE.videoSha256);
  assert.equal(value.videoBinding.sizeBytes, FAILED_WORK_CASE.videoBytes);
  assert.equal(job.planId, FAILED_WORK_CASE.planId);
  assert(job.outputRoot !== value.oldOutputRoot && path.posix.dirname(job.outputRoot) === path.posix.dirname(value.oldOutputRoot), 'RECOVERY_FRESH_SIBLING_ROOT_REQUIRED');
  assert.equal(job.expected.cues, 651); assert.equal(job.expected.frames, 37619);
  assert(Array.isArray(value.primaryOverlays) && value.primaryOverlays.length === 651, 'RECOVERY_PRIMARY_COVERAGE_REQUIRED');
  assert.equal(new Set(value.primaryOverlays.map((r: Json) => r.instructionId)).size, 651, 'RECOVERY_DUPLICATE_PRIMARY');
  assert.equal(value.primaryOverlays.reduce((n: number, r: Json) => n + r.lineMaskBindings.length, 0), 1042, 'RECOVERY_LINE_MASK_COVERAGE_REQUIRED');
  assert(Array.isArray(value.jsonBindings) && value.jsonBindings.length > 0);
  assert.equal(new Set(value.jsonBindings.map((b: Json) => b.path)).size, value.jsonBindings.length, 'RECOVERY_DUPLICATE_JSON');
  for (const b of value.jsonBindings) assert(safe(b.path).startsWith(value.oldOutputRoot + '/'), 'RECOVERY_OLD_REFERENCE_PREFIX_REQUIRED');
}

async function readSpecificDigestFailedWorkV001(qualified: ApprovedDigestQualifiedJobV001): Promise<Json> {
  const job = qualified.job, descriptor = await qualified.readBinding(job.recoveryBinding);
  assertSpecificDigestFailedWorkDescriptorV001(descriptor, job);
  const oldRoot = path.join(job.storage.guestRoot, descriptor.oldOutputRoot);
  const workRoot = path.join(oldRoot, FAILED_WORK_CASE.workName);
  assert.equal(await realpath(oldRoot), oldRoot); assert.equal(await realpath(workRoot), workRoot);
  const pins = new Map<string, Json>();
  async function pin(b: Json, external = false): Promise<void> {
    assert(path.isAbsolute(b.path) && path.normalize(b.path) === b.path && /^[a-f0-9]{64}$/u.test(b.fileSha256));
    assert(Number.isSafeInteger(b.sizeBytes) && b.sizeBytes > 0);
    assert(external || b.path.startsWith(oldRoot + '/'), 'RECOVERY_REFERENCE_OUTSIDE_OLD_WORK');
    assert.equal(await realpath(b.path), b.path, 'RECOVERY_REFERENCE_SYMLINK');
    const before = await lstat(b.path, {bigint: true});
    assert(before.isFile() && !before.isSymbolicLink());
    if (!external) assert.equal(before.dev, BigInt(job.storage.guestDevice));
    assert.equal(before.size, BigInt(b.sizeBytes));
    const first = createHash('sha256');
    for await (const bytes of createReadStream(b.path)) first.update(bytes);
    const after = await lstat(b.path, {bigint: true});
    for (const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(after[key], before[key], 'RECOVERY_INPUT_CHANGED_WHILE_READING');
    assert.equal(first.digest('hex'), b.fileSha256, 'RECOVERY_INPUT_BYTES_CHANGED');
    pins.set(b.path, {binding: Object.freeze({...b}), identity: after});
  }
  await pin(descriptor.oldJobBinding, true); await pin(descriptor.oldAuthorizationBinding, true);
  const oldJob = JSON.parse((await boundAbsolute(descriptor.oldJobBinding)).toString());
  const oldAuthorization = JSON.parse((await boundAbsolute(descriptor.oldAuthorizationBinding)).toString());
  validateDigestApprovedJobConfigurationV001(oldJob, oldAuthorization, {workspaceRoot: ROOT,
    jobBinding: descriptor.oldJobBinding, authorizationBinding: descriptor.oldAuthorizationBinding,
    trustedJobSha256: FAILED_WORK_CASE.jobSha256, trustedAuthorizationSha256: FAILED_WORK_CASE.authorizationSha256});
  assert.equal(oldJob.implementation.sha, descriptor.oldImplementationSha);
  for (const field of ['planId','inputs','expected','storage','guard']) assert.deepEqual(job[field], oldJob[field], 'RECOVERY_ORIGINAL_' + field + '_CHANGED');
  for (const field of ['userApproval','actions','normalCandidates','humanQuality','outlineChoice'])
    assert.deepEqual(qualified.authorization[field], oldAuthorization[field], 'RECOVERY_ORIGINAL_AUTHORIZATION_CHANGED');
  const oldPolicy = {...oldJob.verificationPolicy, confirmationRecordPath: job.verificationPolicy.confirmationRecordPath};
  assert.deepEqual(job.verificationPolicy, oldPolicy, 'RECOVERY_VERIFICATION_SELECTION_CHANGED');
  for (const b of oldJob.implementation.bindings) {
    const bytes = (await exec('git', ['show', oldJob.implementation.sha + ':' + safe(b.path)], {cwd: ROOT, encoding: 'buffer', maxBuffer: 8 * 1024 * 1024})).stdout;
    assert.equal(sha(bytes), b.fileSha256, 'RECOVERY_HISTORICAL_IMPLEMENTATION_CHANGED');
    if (b.sizeBytes !== undefined) assert.equal(bytes.length, b.sizeBytes);
  }
  const fixedFiles: Json = {
    summaryBinding: oldRoot + '/monitor/summary.json', oldOwnershipBinding: oldRoot + '/ownership.json',
    commandPermitBinding: oldRoot + '/command-permit.json', rendererLockOwnerBinding: oldRoot + '/.render.presentation-renderer-v002.lock/owner.json',
    ownedGroupBinding: oldRoot + '/monitor/owned-group.json', lowMemoryBinding: oldRoot + '/low-memory-composite.json',
    layoutInputBinding: workRoot + '/scratch/layout-input.json', layoutOutputBinding: workRoot + '/scratch/layout-output.json',
    videoBinding: workRoot + '/publish/presentation-rendered-v002.mp4',
  };
  for (const [key, file] of Object.entries(fixedFiles)) {assert.equal(descriptor[key].path, file); await pin(descriptor[key]);}
  for (const key of ['shutdownBinding','workerStderrBinding']) await pin(descriptor[key]);
  const json = async (b: Json) => JSON.parse((await readFile(b.path)).toString());
  const summary = await json(descriptor.summaryBinding), owner = await json(descriptor.oldOwnershipBinding);
  const permit = await json(descriptor.commandPermitBinding), group = await json(descriptor.ownedGroupBinding);
  const lock = await json(descriptor.rendererLockOwnerBinding), shutdown = await json(descriptor.shutdownBinding);
  assert.equal(summary.reason, 'formal worker nonzero exit'); assert.equal(summary.exitCode, 1);
  assert.deepEqual(summary.remainingRunning, []); assert.deepEqual(shutdown.remainingRunning ?? shutdown.remaining, []);
  assert.deepEqual(summary.jobBinding, descriptor.oldJobBinding); assert.deepEqual(summary.authorizationBinding, descriptor.oldAuthorizationBinding);
  assert.deepEqual(permit.jobBinding, descriptor.oldJobBinding); assert.deepEqual(permit.authorizationBinding, descriptor.oldAuthorizationBinding);
  assert.deepEqual(permit.storage, job.storage); assert.equal(owner.outputRoot, descriptor.oldOutputRoot);
  assert.equal(owner.jobSha256, FAILED_WORK_CASE.jobSha256); assert.equal(owner.authorizationSha256, FAILED_WORK_CASE.authorizationSha256);
  assert.equal(owner.implementationSha, FAILED_WORK_CASE.implementationSha);
  assert.equal(lock.outputDirectory, oldRoot + '/render'); assert.equal(lock.processId, group.parentPid);
  const stderr = await readFile(descriptor.workerStderrBinding.path, 'utf8');
  assert(stderr.includes(descriptor.failureCode) && stderr.includes('qualifyPresentationInstructionRendererCompletionV002'), 'RECOVERY_ACTUAL_FAILURE_REQUIRED');
  const oldIds = new Set([owner.controllerPid, group.parentPid, group.group, lock.processId]);
  async function assertStopped() {
    const ps = (await exec('/bin/ps', ['-axo','pid=,pgid=,stat='])).stdout;
    for (const line of ps.trim().split('\n')) {
      const [pid, pgid, state] = line.trim().split(/\s+/u);
      assert(state.startsWith('Z') || (!oldIds.has(Number(pid)) && !oldIds.has(Number(pgid))), 'RECOVERY_OLD_OWNER_STILL_RUNNING');
    }
  }
  await assertStopped();
  for (const missing of ['result.json','renderer-result.json','representative-technical-evidence-v001.json','render']) {
    try {await lstat(path.join(oldRoot, missing)); assert.fail('RECOVERY_ALREADY_PUBLISHED');}
    catch (error: any) {if (error.code !== 'ENOENT') throw error;}
  }
  const oldJson = new Map<string, Json>();
  for (const b of descriptor.jsonBindings) {
    const file = path.join(job.storage.guestRoot, b.path); await pin({...b, path: file});
    const value = JSON.parse((await readFile(file)).toString());
    if (b.schemaVersion !== undefined) assert.equal(value.schemaVersion, b.schemaVersion);
    oldJson.set(b.path, value);
  }
  const oldRendererJob = oldJson.get(descriptor.oldOutputRoot + '/renderer-job.json'); assert(oldRendererJob);
  const base = frozen(structuredClone(oldRendererJob.cropAppliedBaseMedia));
  for (const b of Object.values(base) as Json[]) {
    assert(b.path.startsWith(descriptor.oldOutputRoot + '/'));
    if (!pins.has(path.join(job.storage.guestRoot, b.path))) {
      const st = await lstat(path.join(job.storage.guestRoot, b.path));
      await pin({...b, path: path.join(job.storage.guestRoot, b.path), sizeBytes: b.sizeBytes ?? st.size});
    }
  }
  const instruction = oldJson.get(oldRendererJob.instructionArtifactBinding.path); assert(instruction);
  const lineLayout = oldJson.get(descriptor.oldOutputRoot + '/line-layout.json'); assert(lineLayout);
  const presetRegistry = oldJson.get(oldRendererJob.registryBindings.styleProfileRegistry.path); assert(presetRegistry);
  const rendererTrust = oldJson.get(oldRendererJob.registryBindings.rendererTrust.path); assert(rendererTrust);
  const renderer = await load('evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  const common = renderer.buildPresentationInstructionCommonCorePlanV001({job: oldRendererJob,
    visualStateId: oldRendererJob.executionInputs.visualStateId, instructionArtifact: instruction,
    lineLayout, styleProfileRegistry: presetRegistry, rendererTrust});
  assert.equal(common.status, 'built');
  const layoutInput = await json(descriptor.layoutInputBinding), layoutOutput = await json(descriptor.layoutOutputBinding);
  assert.equal(layoutOutput.status, 'passed'); assert.deepEqual(layoutOutput.violations, []);
  assert.equal(layoutOutput.items.length, job.expected.cues); assert.equal(layoutInput.overlays.length, job.expected.cues);
  for (const [i, r] of descriptor.primaryOverlays.entries()) {
    assert.equal(r.instructionId, common.plan.elements[i].instructionId);
    const stem = String(i + 1).padStart(2,'0') + '-' + sha(r.instructionId).slice(0,12);
    assert.equal(r.primaryBinding.path, workRoot + '/publish/overlays/' + stem + '.png');
    assert.equal(r.repeatBinding.path, workRoot + '/scratch/frames/' + stem + '.repeat.png');
    await pin(r.primaryBinding); await pin(r.repeatBinding);
    assert.equal(r.primaryBinding.fileSha256, r.repeatBinding.fileSha256, 'RECOVERY_ORIGINAL_DETERMINISM_FAILED');
    assert.equal(r.lineMaskBindings.length, common.plan.elements[i].indexedLines.length);
    for (const [j, mask] of r.lineMaskBindings.entries()) {
      assert.equal(mask.lineIndex, j); assert.equal(mask.binding.path, workRoot + '/scratch/frames/' + stem + '-line-' + String(j + 1).padStart(2,'0') + '.png');
      await pin(mask.binding);
    }
    assert.equal(layoutOutput.items[i].instructionId, r.instructionId);
  }
  const composite = await json(descriptor.lowMemoryBinding);
  assert.equal(composite.status, 'completed'); assert.deepEqual(composite.approvedJobBinding, descriptor.oldJobBinding);
  assert.equal(composite.scope.frameCount, job.expected.frames);
  assert.equal(composite.output.fileSha256, descriptor.videoBinding.fileSha256); assert.equal(composite.output.bytes ?? composite.output.sizeBytes, descriptor.videoBinding.sizeBytes);
  let end = 0;
  for (const segment of composite.segments) {assert.equal(segment.range.startFrame, end); assert.equal(segment.exitCode, 0); end = segment.range.endFrameExclusive;}
  assert.equal(end, job.expected.frames);
  const current = async () => {
    await assertStopped();
    for (const [file, record] of pins) {
      const st = await lstat(file, {bigint:true});
      for (const key of ['ino','dev','size','mtimeNs','ctimeNs'] as const) assert.equal(st[key], record.identity[key], 'RECOVERY_ORIGIN_IDENTITY_CHANGED');
    }
  };
  await current();
  const view = Object.freeze({descriptor: frozen(descriptor), base, plan: frozen(common.plan),
    layoutInput: frozen(layoutInput), layoutOutput: frozen(layoutOutput)});
  return Object.freeze({view, base, oldJson, pins, assertCurrent: current});
}

/** A caller object or clone cannot select saved files or create recovery authority. */
export async function readQualifiedApprovedDigestFailedWorkV001(context: unknown): Promise<Json> {
  await assertQualifiedApprovedDigestStorageContextV001(context);
  const saved = failedWorkContexts.get(context as object); assert(saved, 'QUALIFIED_SPECIFIC_FAILED_WORK_REQUIRED');
  return saved.view;
}
export async function assertQualifiedApprovedDigestRecoveryBaseV001(context: unknown, base: Json): Promise<void> {
  const saved = await readQualifiedApprovedDigestFailedWorkV001(context);
  assert.equal(base, saved.base, 'QUALIFIED_RECOVERY_BASE_SAME_OBJECT_REQUIRED');
}

async function candidateStyle(qualified:ApprovedDigestQualifiedJobV001, inputs:Json,context:Json,m:any) {
  const old=inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings;
  const preset=structuredClone(await context.readBound(old.presetRegistry)); const baseline=await context.readBound(old.rendererTrust);
  const cc=inputs.styleTemplate.reconstructionMap.caseContexts[0]; const props=inputs.manifest.technicalCandidate.props;
  const profile=preset.presets.find((p:Json)=>p.presetId===cc.resolvedStyle.presetId); assert(profile,'APPROVED_JOB_STYLE_PROFILE_MISSING');
  profile.maxLogicalWidth=inputs.typographyValues.maxLogicalWidthPerLine;profile.maxLines=inputs.typographyValues.maxLinesPerCue;
  const at=profile.visualStates.findIndex((v:Json)=>v.stateId===props.visualState.stateId);assert(at>=0);
  profile.visualStates[at]=structuredClone(props.visualState);preset.canvas=structuredClone(props.canvas);
  assert.equal(props.visualState.textStyle.fontSizePx,inputs.typographyValues.fontSizePx);
  const root=context.outputRoot+'/candidate-style/';const registryBinding=await context.publish(root+'preset-registry.json',preset);
  const validationValue=await context.readBound(old.presetValidationIndex);
  const validation=await context.publish(root+'preset-validation-index.json',{...validationValue,schemaVersion:validationValue.schemaVersion??validationValue.registryVersion});
  const registryTrust=structuredClone(await context.readBound(old.trustedRegistryBindings));registryTrust.presetValidationIndexSha256=validation.canonicalSha256;
  const registryTrustBinding=await context.publish(root+'trusted-registry-bindings.json',registryTrust);
  const trust=structuredClone(await context.readBound(inputs.rendererTemplate.registryBindings.rendererTrust));
  assert.deepEqual(trust.layoutRules,baseline.layoutRules,'APPROVED_JOB_BASELINE_LAYOUT_CHANGED');
  const restored=structuredClone(props.layoutRules);restored.horizontalSafeMarginRatio=baseline.layoutRules.horizontalSafeMarginRatio;
  assert.deepEqual(restored,baseline.layoutRules,'APPROVED_JOB_GENERAL_LAYOUT_DELTA');
  assert.equal(props.layoutRules.horizontalSafeMarginRatio,inputs.typographyValues.horizontalSafeMarginRatio);trust.layoutRules=structuredClone(props.layoutRules);
  trust.presetRegistry={registryVersion:preset.registryVersion,path:registryBinding.path,fileSha256:registryBinding.fileSha256,canonicalSha256:registryBinding.canonicalSha256};trust.registryBinding=registryTrustBinding;
  const code=new Map(qualified.job.implementation.bindings.map((b:Json)=>[b.path,b.fileSha256]));
  for(const b of trust.rendererDependencies) {const actual=await m.fileSha(path.join(ROOT,safe(b.path)));
    assert(actual===b.fileSha256||actual===code.get(b.path),'APPROVED_JOB_RENDERER_DEPENDENCY_NOT_APPROVED '+b.path);b.fileSha256=actual;}
  for(const b of trust.fontAssets) assert.equal(await m.fileSha(path.join(ROOT,safe(b.path))),b.fileSha256,'APPROVED_JOB_FONT_BYTES_CHANGED');
  const trustBinding=await context.publish(root+'trust.json',trust);
  const bindings={trustedRegistryBindings:registryTrustBinding,presetRegistry:registryBinding,presetValidationIndex:validation,
    materialValidationIndex:old.materialValidationIndex,rendererTrust:trustBinding};
  const rendererTemplate=structuredClone(inputs.rendererTemplate);rendererTemplate.registryBindings.styleProfileRegistry=registryBinding;
  rendererTemplate.registryBindings.rendererTrust=trustBinding;
  rendererTemplate.registryBindings.fontLedger={...trustBinding,jsonPointer:'/fontAssets',valueCanonicalSha256:m.canonicalSha(trust.fontAssets)};
  for(const b of rendererTemplate.rendererImplementationBindings) {const actual=await m.fileSha(path.join(ROOT,safe(b.path)));
    assert(actual===b.fileSha256||actual===code.get(b.path),'APPROVED_JOB_RENDERER_IMPLEMENTATION_NOT_APPROVED');b.fileSha256=actual;}
  return {bindings,rendererTemplate,baselineBindings:old};
}

/** Standard Normal result lookup resolves any immutable record-only completion. */
export async function getApprovedDigestJobResultV001(options:Json) {
  const {readApprovedDigestJobResultV001}=await load('runner/src/digest-approved-record-finalize-v001.ts');
  return readApprovedDigestJobResultV001(options);
}

/** Only projects an already qualified Core result; it grants no publication capability. */
export function projectApprovedDigestManufacturingCompletionV001(result:Json) {
  if(result.verification===undefined) {assert.equal(result.qc,'passed','APPROVED_FULL_QC_REQUIRED');return {status:'completed',technicalQc:'passed'};}
  const v=result.verification;
  assert.equal(v.schemaVersion,'digest-representative-completion-v001');
  assert(['passed-representative','confirmation-pending'].includes(v.status),'APPROVED_REPRESENTATIVE_QC_FAILED');
  assert.equal(result.complete,v.status==='passed-representative','APPROVED_REPRESENTATIVE_COMPLETE_MISMATCH');
  assert.equal(result.qc,v.status);assert.equal(v.checks.fullVisibility.status,'not-executed');
  return {status:result.complete?'completed':'confirmation-pending',complete:result.complete,verification:v,
    verificationMode:v.mode,technicalQc:{wholeRules:v.checks.wholeRules,media:v.checks.media,audioPreservation:v.checks.audioPreservation,fullVisibility:v.checks.fullVisibility}};
}

/** Allocation estimate comes from this source/clock, never the previous video's bytes. */
export function estimateApprovedDigestBaseAllocationV001(sourceBytes:number,media:Json,expected:Json) {
  assert(Number.isSafeInteger(sourceBytes)&&sourceBytes>0); assert(Number.isSafeInteger(media.decodedFrameCount)&&media.decodedFrameCount>0);
  assert(Number.isFinite(media.fps)&&media.fps>0); assert(Number.isSafeInteger(media.audioClock.sampleRate)&&media.audioClock.sampleRate>0);
  assert(Number.isSafeInteger(media.audioClock.channels)&&media.audioClock.channels>0);
  assert(Number.isSafeInteger(media.audioClock.sourceGridSampleCount)&&media.audioClock.sourceGridSampleCount>0,
    'APPROVED_JOB_SOURCE_AUDIO_GRID_CLOCK_REQUIRED');
  const sourceSamples=media.audioClock.sourceGridSampleCount;
  const pcm=(sourceSamples+expected.audioSamples)*media.audioClock.channels*4;
  // Exact large uncompressed inputs; compressed-video growth is covered by an explicit job budget and live monitoring.
  const bytes=sourceBytes+pcm*2;
  assert(Number.isSafeInteger(bytes)&&bytes>0,'APPROVED_JOB_ALLOCATION_ESTIMATE_OVERFLOW');return bytes;
}
/** Project the actual published adoption reference to the existing two-field base-job contract. */
export function projectApprovedDigestBaseMediaJobV001(input:Json,planId:string,outputRoot:string,adoptionBinding:Json):Json {
  safe(outputRoot); assert.equal(adoptionBinding.path,outputRoot+'/machine-adoption.json');
  assert(/^[0-9a-f]{64}$/u.test(adoptionBinding.fileSha256),'APPROVED_JOB_ADOPTION_BYTES_REQUIRED');
  const job=structuredClone(input);job.jobId=planId+'-base';
  job.assemblyDecision={path:adoptionBinding.path,fileSha256:adoptionBinding.fileSha256};
  job.outputDirectory=outputRoot+'/base-media';return job;
}
export async function runApprovedDigestJobV001(permitPath:string,jobSha:string,authorizationSha:string) {
  const began=Date.now();const permitBytes=await readFile(permitPath),permit=JSON.parse(permitBytes.toString());
  assert.equal(await realpath(permitPath),permitPath);
  const qualified=await readQualifiedDigestApprovedJobV001({workspaceRoot:ROOT,jobBinding:permit.jobBinding,
    authorizationBinding:permit.authorizationBinding,trustedJobSha256:jobSha,trustedAuthorizationSha256:authorizationSha});
  const job=qualified.job,m=await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const inputs=await readApprovedDigestInputsV001(qualified); const context=await createStorage(permitPath,permitBytes,permit,qualified,inputs,m);
  Object.assign(process.env,{TMPDIR:context.tempDirectory,TMP:context.tempDirectory,TEMP:context.tempDirectory,MAGICK_TEMPORARY_PATH:context.tempDirectory});
  if(inputs.kind==='j16-staged-static-v001')return runApprovedJ16StaticJobV001(qualified,inputs,context,m,began);
  const baseModule=await load('evals/clip_composition/presentation_base_media_build_v003.mjs');
  assert.deepEqual(await baseModule.inspectPresentationBaseMediaToolProfileV001(),baseModule.PRESENTATION_BASE_MEDIA_EXPECTED_TOOL_PROFILE,'APPROVED_JOB_TOOL_PROFILE_CHANGED');
  const timeline=await load('evals/clip_composition/presentation_base_media_timeline_v004.mjs');
  for(const b of timeline.PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES) assert.equal(await m.fileSha(path.join(ROOT,safe(b.path))),b.fileSha256,'APPROVED_JOB_BASE_DEPENDENCY_CHANGED');
  const renderer=await load('evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  await renderer.observePresentationRendererRuntimeBindingsV001(inputs.rendererTemplate.runtimeBindings);
  const style=await candidateStyle(qualified,inputs,context,m),out=context.outputRoot;
  const authorizationBinding=await context.publish(out+'/authorization.json',qualified.authorization);
  const plan={schemaVersion:'digest-approved-candidate-core-plan-v001',planId:job.planId,outputRoot:out,
    ...(job.verificationPolicy===undefined?{}:{verificationPolicy:job.verificationPolicy}),
    approvedJobBinding:qualified.jobBinding,approvalRecordBinding:qualified.authorizationBinding,authorization:authorizationBinding,
    implementationBindings:job.implementation.bindings,acceptedManifestBinding:job.inputs.candidateManifestBinding,
    typographySettingsBinding:inputs.typographySettingsBinding,derivedTypographyValues:inputs.typographyValues,
    request:{sourceVideo:inputs.normalPlan.sourceVideoBinding,transcript:inputs.normalPlan.transcriptBinding,utterances:inputs.normalPlan.utteranceBinding}};
  const planBinding=await context.publish(out+'/core-plan.json',plan),c={plan,planBinding,authorization:qualified.authorization,rendererTemplate:style.rendererTemplate};
  const adoptionBinding=await context.publish(out+'/machine-adoption.json',inputs.adoption);await context.publish(out+'/edit-plan.json',inputs.edit);
  const manufacturing=projectApprovedDigestBaseMediaJobV001(inputs.manufacturing,job.planId,out,adoptionBinding);
  const core=await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  m.pass(baseModule.validatePresentationBaseMediaBuildJobV001(manufacturing),'APPROVED_JOB_MANUFACTURING_INVALID');
  const mappings=core.projectAdoptedMediaRangesV001(inputs.edit,inputs.inspection.media);
  assert.equal(mappings.mappings.at(-1).outputEndFrame,job.expected.frames);assert.equal(mappings.mappings.at(-1).audioSamples.outputEnd,job.expected.audioSamples);
  assert.deepEqual(mappings.mappings,inputs.clock.mappings,'APPROVED_JOB_ORIGINAL_CLOCK_CHANGED');
  const baseReuse=baseReuseContexts.get(context)??null;
  const reuseModule=baseReuse===null?null:await load('runner/src/digest-approved-base-reuse-v001.ts');
  const source=baseReuse===null?await context.resolveApprovedDigestSourceV001(manufacturing.sourceArtifact):await reuseModule!.qualifyDigestApprovedBaseReuseSourceV001(baseReuse,context);
  assert.equal(source.identity.fileSha256,manufacturing.sourceArtifact.fileSha256,'APPROVED_JOB_SOURCE_BYTES_CHANGED');
  const jobBinding=await context.publish(out+'/manufacturing-job.json',manufacturing);
  const invocation=await context.publish(out+'/core-invocation.json',{schemaVersion:'digest-approved-core-invocation-v001',
    approvedJobBinding:qualified.jobBinding,authorizationBinding:qualified.authorizationBinding,planBinding,jobBinding,
    acceptedManifestBinding:job.inputs.candidateManifestBinding,storagePermitFileSha256:sha(permitBytes),implementationSha:job.implementation.sha});
  const minimumBaseBytes=baseReuse===null?estimateApprovedDigestBaseAllocationV001(source.identity.sizeBytes,inputs.inspection.media,job.expected):baseReuse.minimumCopyBytes;
  assert(job.allocationBudget.baseBuildBytes>=minimumBaseBytes,'APPROVED_JOB_BASE_BUDGET_BELOW_INPUTS');
  await context.resourceCheck({stage:'start',newBytes:job.allocationBudget.baseBuildBytes});
  const baseStarted=Date.now(); const recovered = job.recoveryBinding === undefined ? null : await readQualifiedApprovedDigestFailedWorkV001(context);
  const reused=baseReuse===null?null:await reuseModule!.copyQualifiedDigestApprovedBaseReuseV001(baseReuse,context,inputs,{invocationBinding:invocation,manufacturingJobBinding:jobBinding,manufacturingJob:manufacturing,machineAdoptionBinding:adoptionBinding,editPlanBinding:m.bind(out+'/edit-plan.json',inputs.edit)});
  const base = reused!==null?reused.base:recovered === null ? await core.buildAdoptedBaseMediaV001(c,inputs.adoption,inputs.edit,manufacturing,jobBinding,invocation,
    {inspection:'digest-approved-source-inspection-v001',receipt:'digest-approved-base-validation-v001'},context) : recovered.base;
  const baseMs=Date.now()-baseStarted;const artifacts=await prepareApprovedDigestCaptionCoreV001(inputs,qualified,c,base,style,context);
  assert.equal(artifacts.instruction.instructions.length,job.expected.cues);
  artifacts.instruction.instructions.forEach((v:Json,i:number)=>{const row=inputs.correspondence.rows[i];assert.equal(v.outputTime.startFrame,row.startFrame);assert.equal(v.outputTime.endFrameExclusive,row.endFrameExclusive);});
  const artifactBindings:Json={};for(const [key,name] of Object.entries(core.CORE_FILES) as [string,string][]) artifactBindings[key]=await context.publish(out+'/'+name,artifacts[key]);
  await context.resourceCheck({stage:'body',newBytes:job.allocationBudget.rendererPreparationBytes}); const renderStarted=Date.now();
  const result=await core.renderAdoptedVideoV001(c,artifactBindings,'digest-approved-render-execution-v001',context);
  const completion=projectApprovedDigestManufacturingCompletionV001(result);
  const receipt={schemaVersion:'digest-approved-manufacturing-result-v001',...completion,approvedJobBinding:qualified.jobBinding,
    authorizationBinding:qualified.authorizationBinding,planBinding,invocationBinding:invocation,typographySettingsBinding:inputs.typographySettingsBinding,
    derivedTypographyValues:inputs.typographyValues,result,
    ...(result.publishedMediaBinding===undefined?{}:{publishedMediaBinding:result.publishedMediaBinding}),
    ...(result.technicalEvidenceBinding===undefined?{}:{technicalEvidenceBinding:result.technicalEvidenceBinding}),
    timing:{initialPreparationMs:baseStarted-began,baseMediaMs:baseMs,
      renderAndQcMs:Date.now()-renderStarted,totalMs:Date.now()-began},implementationSha:job.implementation.sha,
    humanQuality:'not-evaluated',outlineChoice:null,originalJudgmentReruns:0,
    ...(reused===null?{}:{baseReuse:reused.record}),
    ...(recovered === null ? {} : {recovery: {recoveryBinding:job.recoveryBinding, oldJobBinding:recovered.descriptor.oldJobBinding,
      oldAuthorizationBinding:recovered.descriptor.oldAuthorizationBinding, originalComposite:recovered.descriptor.videoBinding,
      baseMediaOrigin:recovered.base, nativeDraws:0, compositeRuns:0, technicalInspection:'actual-reinspection-of-saved-media-and-pngs'}}),
    ...(result.verification===undefined?{completedAt:new Date().toISOString()}:{recordedAt:new Date().toISOString(),completedAt:completion.status==='completed'?new Date().toISOString():null})};
  const saved=await context.publish(out+'/result.json',receipt),receiptBytes=await readFile(context.resolve(out+'/result.json'));
  const receiptBinding={path:out+'/result.json',fileSha256:sha(receiptBytes),sizeBytes:receiptBytes.length};
  assert.equal(saved.fileSha256,receiptBinding.fileSha256);return {...receipt,receiptBinding};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  void(async()=>{try {assert.equal(process.argv.length,8);assert.equal(process.argv[2],'--permit');assert.equal(process.argv[4],'--job-sha256');assert.equal(process.argv[6],'--authorization-sha256');
    const result=await runApprovedDigestJobV001(path.resolve(process.argv[3]),process.argv[5],process.argv[7]);process.stdout.write(JSON.stringify({event:result.status,result})+'\n');
  }catch(error){process.stderr.write(String((error as Error).stack)+'\n');process.exitCode=1;}finally{process.stdin.destroy();}})();
}


const j16Backgrounds=new WeakMap<object,Json>();
/** Only the owned job can supply a drawing view, its background and its AAC.
 * File renderer admission still checks the unchanged original typed Core. */
export async function resolveQualifiedApprovedJ16DrawingV001(context:unknown,commonPlan:Json):Promise<Json> {
  await assertQualifiedApprovedDigestStorageContextV001(context);
  const {inputs,qualified}=contexts.get(context as object)!;
  assert.equal(inputs.kind,'j16-staged-static-v001','QUALIFIED_J16_STATIC_JOB_REQUIRED');
  await assertApprovedDigestInputsV001(inputs,qualified);
  assert.deepEqual(commonPlan,inputs.normalPlan,'APPROVED_J16_ORIGINAL_CORE_PLAN_CHANGED');
  const saved=j16Backgrounds.get(context as object);assert(saved,'APPROVED_J16_BACKGROUND_NOT_BUILT');
  const owned=context as Json;
  const proof=await owned.readJson(qualified.job.outputRoot+'/orchestration-background/proof.json');
  assert.deepEqual(proof,saved.proof,'APPROVED_J16_BACKGROUND_PROOF_CHANGED');
  assert.equal(proof.projectionSha256,inputs.j16View.projection.projectionSha256);
  assert.deepEqual(proof.concreteConnections,inputs.j16View.projection.connections);
  for(const binding of [proof.outputs.background,proof.outputs.audio]) {
    assert(binding.path.startsWith(owned.generatedRoot+'/orchestration-background/'));
    await boundAbsolute({path:binding.path,fileSha256:binding.fileSha256,sizeBytes:binding.bytes});
    assert.equal((await lstat(binding.path)).dev,qualified.job.storage.guestDevice,'APPROVED_J16_BACKGROUND_DEVICE_CHANGED');
  }
  return Object.freeze({view:inputs.j16View,background:Object.freeze({projectionSha256:proof.projectionSha256,
    displayFrameCount:proof.displayFrameCount,video:proof.outputs.background,audio:proof.outputs.audio}),
    mediaInspection:saved.mediaInspection});
}

/** Verify the small immutable feature boundary before starting any large unit. */
async function runApprovedJ16StaticJobV001(qualified:ApprovedDigestQualifiedJobV001,inputs:Json,context:Json,m:any,began:number) {
  const job=qualified.job,out=context.outputRoot,template=structuredClone(inputs.rendererTemplate);
  const renderer=await load('evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts');
  await renderer.observePresentationRendererRuntimeBindingsV001(template.runtimeBindings);
  const trust=structuredClone(await context.readBound(template.registryBindings.rendererTrust));
  const code=new Map(job.implementation.bindings.map((b:Json)=>[b.path,b.fileSha256]));
  for(const binding of [...trust.rendererDependencies,...template.rendererImplementationBindings]) {
    const actual=await m.fileSha(path.join(ROOT,safe(binding.path)));
    assert(actual===binding.fileSha256||actual===code.get(binding.path),'APPROVED_J16_IMPLEMENTATION_NOT_APPROVED '+binding.path);
    binding.fileSha256=actual;
  }
  for(const binding of trust.fontAssets)assert.equal(await m.fileSha(path.join(ROOT,safe(binding.path))),binding.fileSha256,'APPROVED_J16_FONT_CHANGED');
  const trustBinding=await context.publish(out+'/candidate-style/trust.json',trust);
  template.registryBindings.rendererTrust=trustBinding;
  template.registryBindings.fontLedger={...trustBinding,jsonPointer:'/fontAssets',valueCanonicalSha256:m.canonicalSha(trust.fontAssets)};
  template.jobId=job.planId+'-renderer';template.attemptId=job.planId;
  template.publication={admissionReceiptPath:out+'/admission-receipt.json',lineLayoutPath:out+'/line-layout.json',renderOutputRoot:out+'/render'};
  const authorization=await context.publish(out+'/authorization.json',qualified.authorization);
  const plan={schemaVersion:'digest-approved-candidate-core-plan-v001',planId:job.planId,outputRoot:out,
    verificationPolicy:job.verificationPolicy,approvedJobBinding:qualified.jobBinding,approvalRecordBinding:qualified.authorizationBinding,
    authorization,implementationBindings:job.implementation.bindings,acceptedManifestBinding:job.inputs.candidateManifestBinding,
    typographySettingsBinding:inputs.typographySettingsBinding,derivedTypographyValues:inputs.typographyValues,
    request:{sourceVideo:inputs.j16Source.mediaRef,originalCore:template.instructionArtifactBinding},inputKind:inputs.kind,
    visibilitySelectionBinding:job.inputs.visibilitySelectionBinding,visibilityAdoptionBinding:job.inputs.visibilityAdoptionBinding};
  const planBinding=await context.publish(out+'/core-plan.json',plan);
  const invocation=await context.publish(out+'/core-invocation.json',{schemaVersion:'digest-approved-core-invocation-v001',
    approvedJobBinding:qualified.jobBinding,authorizationBinding:qualified.authorizationBinding,planBinding,
    acceptedManifestBinding:job.inputs.candidateManifestBinding,implementationSha:job.implementation.sha,inputKind:inputs.kind,
    visibilitySelectionBinding:job.inputs.visibilitySelectionBinding,visibilityAdoptionBinding:job.inputs.visibilityAdoptionBinding});
  const projection=inputs.j16View.projection;
  const minimumBytes=(projection.sourceFrameCount+projection.displayFrameCount)*1920*1080*3/2
    +(projection.sourcePlaybackSampleCount+projection.displayPlaybackSampleCount)*8;
  assert(Number.isSafeInteger(minimumBytes)&&job.allocationBudget.baseBuildBytes>=minimumBytes,'APPROVED_J16_BACKGROUND_BUDGET_BELOW_INPUTS');
  await context.resourceCheck({stage:'start',newBytes:job.allocationBudget.baseBuildBytes});
  const {createPresentationRendererProcessObserverV001}=await load('evals/clip_composition/presentation_renderer_process_observation_v001.mjs');
  const processObserver=createPresentationRendererProcessObserverV001({observationDirectory:context.resolve(out+'/background-process-observations')});
  const backgroundModule=await load('evals/clip_composition/presentation_orchestration_background_v001.mjs');
  const baseStarted=Date.now();
  const background=await backgroundModule.buildOrchestrationBackgroundV001({repositoryRoot:ROOT,
    outputDirectory:context.resolve(out+'/orchestration-background'),projection,expectedProjectionSha256:projection.projectionSha256,
    ffmpegPath:template.runtimeBindings.ffmpeg.path,ffprobePath:template.runtimeBindings.ffprobe.path,
    storageContext:context,processObserver});
  const {proofRef:_,...proof}=background;
  const {inspectRenderedMediaWithToolsV001}=await load('evals/clip_composition/presentation_renderer_qc_v002.mjs');
  const mediaInspection=await inspectRenderedMediaWithToolsV001(proof.outputs.background.path,
    {ffmpegPath:template.runtimeBindings.ffmpeg.path,ffprobePath:template.runtimeBindings.ffprobe.path,processObserver,
      observationLabelPrefix:'approved-j16-background'});
  assert.equal(proof.status,'passed');assert.equal(proof.displayFrameCount,job.expected.frames);
  assert.equal(proof.verification.audio.displaySampleCount,job.expected.audioSamples);
  j16Backgrounds.set(context,{proof,mediaInspection});
  await resolveQualifiedApprovedJ16DrawingV001(context,inputs.normalPlan);
  const baseMs=Date.now()-baseStarted,rendererJobBinding=await context.publish(out+'/renderer-job.json',template);
  await context.resourceCheck({stage:'body',newBytes:job.allocationBudget.rendererPreparationBytes});
  const renderStarted=Date.now(),core=await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  const result=await core.renderAdoptedVideoV001({plan,planBinding,authorization:qualified.authorization,rendererTemplate:template},
    {rendererJob:rendererJobBinding},'digest-approved-render-execution-v001',context);
  const completion=projectApprovedDigestManufacturingCompletionV001(result);
  const receipt={schemaVersion:'digest-approved-manufacturing-result-v001',...completion,approvedJobBinding:qualified.jobBinding,
    authorizationBinding:qualified.authorizationBinding,planBinding,invocationBinding:invocation,
    typographySettingsBinding:inputs.typographySettingsBinding,derivedTypographyValues:inputs.typographyValues,result,
    inputKind:inputs.kind,visibilitySelectionBinding:job.inputs.visibilitySelectionBinding,visibilityAdoptionBinding:job.inputs.visibilityAdoptionBinding,
    publishedMediaBinding:result.publishedMediaBinding,
    ...(result.technicalEvidenceBinding===undefined?{}:{technicalEvidenceBinding:result.technicalEvidenceBinding}),
    timing:{initialPreparationMs:baseStarted-began,baseMediaMs:baseMs,renderAndQcMs:Date.now()-renderStarted,totalMs:Date.now()-began},
    implementationSha:job.implementation.sha,humanQuality:'not-evaluated',outlineChoice:null,originalJudgmentReruns:0,
    recordedAt:new Date().toISOString(),completedAt:completion.status==='completed'?new Date().toISOString():null};
  await context.publish(out+'/result.json',receipt);
  const bytes=await readFile(context.resolve(out+'/result.json'));
  return {...receipt,receiptBinding:{path:out+'/result.json',fileSha256:sha(bytes),sizeBytes:bytes.length}};
}


export async function assertQualifiedApprovedJ16BackgroundBuildV001(context:unknown,projection:Json,outputDirectory:string) {
  await assertQualifiedApprovedDigestStorageContextV001(context);
  const {inputs,qualified}=contexts.get(context as object)!;
  assert.equal(inputs.kind,'j16-staged-static-v001','QUALIFIED_J16_STATIC_JOB_REQUIRED');
  await assertApprovedDigestInputsV001(inputs,qualified);
  assert.deepEqual(projection,inputs.j16View.projection,'APPROVED_J16_BACKGROUND_PROJECTION_SUBSTITUTION');
  assert.equal(outputDirectory,(context as Json).resolve(qualified.job.outputRoot+'/orchestration-background'),
    'APPROVED_J16_BACKGROUND_OUTPUT_ROOT_CHANGED');
}

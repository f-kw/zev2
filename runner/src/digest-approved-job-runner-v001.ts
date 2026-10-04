/** Normal entry for one explicitly authorized Digest job; historical retries are a separate entry. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, realpath, lstat, readdir, statfs, chmod} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readQualifiedDigestApprovedJobV001, assertQualifiedDigestApprovedJobV001,
  digestJobSha256V001 as sha, digestJobRelativePathV001 as safe, type Json} from './digest-approved-job-v001.js';
import {readApprovedDigestInputsV001, assertApprovedDigestInputsV001, prepareApprovedDigestCaptionCoreV001,
  assertQualifiedApprovedDigestSourcePackageTaskV001, qualifyApprovedDigestSourcePackageReadbackV001} from './digest-approved-inputs-v001.js';
import type {ApprovedDigestQualifiedJobV001} from './digest-approved-inputs-v001.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exec = promisify(execFile), contexts = new WeakMap<object, Json>();
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
  const record = contexts.get(context)!; await assertQualifiedDigestApprovedJobV001(record.qualified);
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
async function createStorage(permitPath: string, permitBytes: Buffer, permit: Json, qualified: ApprovedDigestQualifiedJobV001, inputs: Json, m: any) {
  await assertApprovedDigestInputsV001(inputs, qualified);
  const job = qualified.job, s = job.storage, outputRoot = job.outputRoot, generatedRoot = path.join(s.guestRoot, outputRoot);
  assert.equal(permit.schemaVersion, 'digest-approved-job-command-permit-v001'); assert.equal(permit.status, 'verified-approved-digest-job-v001');
  assert.deepEqual(Object.keys(permit).sort(), ['schemaVersion','status','jobBinding','authorizationBinding','bindings','storage','implementation','monitorDirectory','command','ownerBinding'].sort());
  assert.deepEqual(permit.jobBinding, qualified.jobBinding); assert.deepEqual(permit.authorizationBinding, qualified.authorizationBinding);
  assert.deepEqual(permit.storage, s);
  assert.deepEqual(permit.bindings, {planId: job.planId,logicalPrefix: outputRoot,
    planManifest: {...job.inputs.candidateManifestBinding,path: path.join(ROOT,job.inputs.candidateManifestBinding.path)},
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
  async function current() {
    await assertQualifiedDigestApprovedJobV001(qualified);
    for(const key of ['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding'])
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
  const generated=(p:string)=>{safe(p); return p===outputRoot||p.startsWith(outputRoot+'/');};
  const resolve=(p:string)=>path.join(generated(p)?s.guestRoot:ROOT,p);
  async function readJson(p:string) {
    await current(); const stable=await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    const bytes=await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot:generated(p)?s.guestRoot:ROOT,relativePath:p});
    const value=JSON.parse(bytes.toString());
    if(p===outputRoot+'/source-package.json') {
      assert(publishedSourcePackageSha&&sha(bytes)===publishedSourcePackageSha,'APPROVED_SOURCE_PUBLICATION_CHANGED');
      await qualifyApprovedDigestSourcePackageReadbackV001(value,inputs,qualified,context,{...m.bind(p,value),fileSha256:sha(bytes),sizeBytes:bytes.length},bytes);
    }
    return value;
  }
  async function readBound(b:Json) {
    await current(); safe(b.path); const stable=await load('evals/clip_composition/presentation_timeline_composition_decision_v001.mjs');
    const bytes=await stable.readPresentationMeaningWorkspaceFileStableV001({workspaceRoot:generated(b.path)?s.guestRoot:ROOT,relativePath:b.path});
    assert.equal(sha(bytes),b.fileSha256); if(b.sizeBytes!==undefined) assert.equal(bytes.length,b.sizeBytes);
    const value=JSON.parse(bytes.toString()); if(b.canonicalSha256!==undefined) assert.equal(m.canonicalSha(value),b.canonicalSha256);
    if(b.schemaVersion!==undefined) {
      const oldStyle=inputs.styleTemplate.reconstructionMap.caseContexts[0].styleBindings;
      const qualifiedRegistryIndex=[oldStyle.presetValidationIndex,oldStyle.materialValidationIndex].some((original:Json)=>m.same(original,b));
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
    composeMedia:async(args:Json)=>{await current();assert.equal(args.expectedFrameCount,job.expected.frames,'APPROVED_JOB_COMPOSE_CLOCK_MISMATCH');
      assert(args.outputPath.startsWith(generatedRoot+'/')); const compositor=await load('tools/digest-quality/original-resolution-low-memory-composite.mjs');
      const evidence=await compositor.runFormalLowMemoryCompositeV001({baseMediaPath:args.baseMediaPath,plan:args.plan,
        overlayRecords:args.overlayRecords,expectedFrameCount:args.expectedFrameCount,expectedOverlayCount:job.expected.cues,
        outputPath:args.outputPath,ffmpegPath:args.ffmpegPath,processObserver:args.processObserver,resourceCheck});
      const result={...evidence,approvedJobBinding:qualified.jobBinding,typographySettingsBinding:inputs.typographySettingsBinding,derivedTypographyValues:inputs.typographyValues};
      await publish(outputRoot+'/low-memory-composite.json',result);return result;}});
  contexts.set(context,{qualified,inputs}); await current(); return context;
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
export async function runApprovedDigestJobV001(permitPath:string,jobSha:string,authorizationSha:string) {
  const began=Date.now();const permitBytes=await readFile(permitPath),permit=JSON.parse(permitBytes.toString());
  assert.equal(await realpath(permitPath),permitPath);
  const qualified=await readQualifiedDigestApprovedJobV001({workspaceRoot:ROOT,jobBinding:permit.jobBinding,
    authorizationBinding:permit.authorizationBinding,trustedJobSha256:jobSha,trustedAuthorizationSha256:authorizationSha});
  const job=qualified.job,m=await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const inputs=await readApprovedDigestInputsV001(qualified); const context=await createStorage(permitPath,permitBytes,permit,qualified,inputs,m);
  Object.assign(process.env,{TMPDIR:context.tempDirectory,TMP:context.tempDirectory,TEMP:context.tempDirectory,MAGICK_TEMPORARY_PATH:context.tempDirectory});
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
  await context.publish(out+'/machine-adoption.json',inputs.adoption);await context.publish(out+'/edit-plan.json',inputs.edit);
  const manufacturing=structuredClone(inputs.manufacturing);manufacturing.jobId=job.planId+'-base';manufacturing.sourceArtifact.path=inputs.sourcePhysicalPath;
  manufacturing.assemblyDecision=m.bind(out+'/machine-adoption.json',inputs.adoption);manufacturing.outputDirectory=out+'/base-media';
  const core=await load('evals/clip_composition/adopted_media_manufacturing_v001.mts');
  m.pass(baseModule.validatePresentationBaseMediaBuildJobV001(manufacturing),'APPROVED_JOB_MANUFACTURING_INVALID');
  const mappings=core.projectAdoptedMediaRangesV001(inputs.edit,inputs.inspection.media);
  assert.equal(mappings.mappings.at(-1).outputEndFrame,job.expected.frames);assert.equal(mappings.mappings.at(-1).audioSamples.outputEnd,job.expected.audioSamples);
  assert.deepEqual(mappings.mappings,inputs.clock.mappings,'APPROVED_JOB_ORIGINAL_CLOCK_CHANGED');
  assert.equal(await m.fileSha(path.join(ROOT,safe(inputs.sourcePhysicalPath))),manufacturing.sourceArtifact.fileSha256,'APPROVED_JOB_SOURCE_BYTES_CHANGED');
  const jobBinding=await context.publish(out+'/manufacturing-job.json',manufacturing);
  const invocation=await context.publish(out+'/core-invocation.json',{schemaVersion:'digest-approved-core-invocation-v001',
    approvedJobBinding:qualified.jobBinding,authorizationBinding:qualified.authorizationBinding,planBinding,jobBinding,
    acceptedManifestBinding:job.inputs.candidateManifestBinding,storagePermitFileSha256:sha(permitBytes),implementationSha:job.implementation.sha});
  const sourceStat=await lstat(path.join(ROOT,inputs.sourcePhysicalPath));
  const minimumBaseBytes=estimateApprovedDigestBaseAllocationV001(sourceStat.size,inputs.inspection.media,job.expected);
  assert(job.allocationBudget.baseBuildBytes>=minimumBaseBytes,'APPROVED_JOB_BASE_BUDGET_BELOW_INPUTS');
  await context.resourceCheck({stage:'start',newBytes:job.allocationBudget.baseBuildBytes});
  const baseStarted=Date.now(); const base=await core.buildAdoptedBaseMediaV001(c,inputs.adoption,inputs.edit,manufacturing,jobBinding,invocation,
    {inspection:'digest-approved-source-inspection-v001',receipt:'digest-approved-base-validation-v001'},context);
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

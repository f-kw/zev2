import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rm, chmod, lstat, readdir} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {spawn, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DIGEST_APPROVED_JOB_GUARD_V001, readQualifiedDigestApprovedJobV001} from './digest-approved-job-v001.js';
import {assertQualifiedDigestRecordFinalizationContextV001, finalizeApprovedDigestJobRecordV001,
  readApprovedDigestJobResultV001} from './digest-approved-record-finalize-v001.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'), exec=promisify(execFile),
  node=process.execPath, tsx=ROOT+'/runner/node_modules/tsx/dist/loader.mjs';
const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
async function fileHash(p:string){const h=createHash('sha256');for await(const c of createReadStream(p))h.update(c);return h.digest('hex');}
const bytes=(v:any)=>Buffer.from(JSON.stringify(v,null,2)+'\n');
const implementationPaths=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts',
  'runner/src/digest-approved-inputs-v001.ts','runner/src/digest-approved-record-finalize-v001.ts','runner/src/digest-formal-handoff-v001.ts',
  'evals/clip_composition/adopted_media_manufacturing_v001.mts','evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
  'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts','evals/clip_composition/render_presentation_v002.mjs',
  'tools/digest-quality/original-resolution-low-memory-composite.mjs','tools/digest-quality/original-resolution-full-supervisor-v002.py',
  'evals/clip_composition/digest_representative_completion_v001.mjs'];

// This loader exists only inside one ignored synthetic fixture. It virtualizes mount/device,
// supervisor argv and the dirty checkout's clean-status observation; authority factories,
// anchors, code/Node SHA, actual small files, processes, UUID/PID, chmod, mkdir/link and locks remain real.
const loaderSource=`import {pathToFileURL} from 'node:url';import path from 'node:path';
const fixture=process.env.ZEV_RECORD_FIXTURE_PATH;
export async function resolve(specifier,context,next){
 const parent=context.parentURL??'';
 if(!parent.endsWith('-shim.mjs')){const names={'node:fs/promises':'fs-promises-shim.mjs','node:fs':'fs-shim.mjs','node:child_process':'child-process-shim.mjs'};
 if(names[specifier])return {url:pathToFileURL(path.join(fixture,names[specifier])).href,shortCircuit:true};}
 return next(specifier,context);
}`;
const registerSource=`import {register} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';register(pathToFileURL(path.join(process.env.ZEV_RECORD_FIXTURE_PATH,'loader.mjs')),import.meta.url);`;
const fsPromisesSource=`import * as original from 'node:fs/promises';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';
export * from 'node:fs/promises';
const cfg=JSON.parse(readFileSync(process.env.ZEV_RECORD_FIXTURE_PATH+'/hardware.json','utf8'));
function text(p){return p instanceof URL?fileURLToPath(p):p;}
function mapped(p){p=text(p);if(typeof p!=='string')return p;for(const [logical,actual] of [[cfg.guestRoot,cfg.guestPhysical],[cfg.hostRoot,cfg.hostPhysical]])if(p===logical||p.startsWith(logical+'/'))return actual+p.slice(logical.length);return p;}
function logical(p){for(const [prefix,actual] of [[cfg.guestRoot,cfg.guestPhysical],[cfg.hostRoot,cfg.hostPhysical]])if(p===actual||p.startsWith(actual+'/'))return prefix+p.slice(actual.length);return p;}
function device(p){p=text(p);return typeof p==='string'&&(p===cfg.guestRoot||p.startsWith(cfg.guestRoot+'/'))?cfg.guestDevice:typeof p==='string'&&(p===cfg.hostRoot||p.startsWith(cfg.hostRoot+'/'))?cfg.hostDevice:null;}
export async function lstat(p,...a){const st=await original.lstat(mapped(p),...a),dev=device(p);if(dev!==null)st.dev=typeof st.dev==='bigint'?BigInt(dev):dev;return st;}
export async function realpath(p,...a){return logical(await original.realpath(mapped(p),...a));}
export const readFile=(p,...a)=>original.readFile(mapped(p),...a);
export const writeFile=(p,...a)=>original.writeFile(mapped(p),...a);
export const mkdir=(p,...a)=>original.mkdir(mapped(p),...a);
export const open=(p,...a)=>original.open(mapped(p),...a);
export const chmod=(p,...a)=>original.chmod(mapped(p),...a);
export const unlink=(p,...a)=>original.unlink(mapped(p),...a);
export const rmdir=(p,...a)=>original.rmdir(mapped(p),...a);
export const copyFile=(a,b,...c)=>original.copyFile(mapped(a),mapped(b),...c);
export async function statfs(p,...a){const st=await original.statfs(mapped(p),...a);return {...st,bavail:100_000_000,bsize:4096};}
export async function link(a,b,...c){
 if(text(b).endsWith('/completed-receipt.json')){
  if(process.env.ZEV_FIXTURE_PRECOMMIT_FAIL==='1')throw Object.assign(Error('TEST_PRECOMMIT_FAILURE'),{code:'ENOSPC'});
  if(process.env.ZEV_FIXTURE_HOLD_COMMIT==='1'){
   await original.writeFile(cfg.fixture+'/commit-ready','1');let ready=false;
   for(let i=0;i<200;i++){try{await original.access(cfg.fixture+'/release-commit');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,25));}
   if(!ready)throw Error('TEST_COMMIT_BARRIER_TIMEOUT');
  }
 }
 return original.link(mapped(a),mapped(b),...c);
}
export default {...original,lstat,realpath,readFile,writeFile,mkdir,open,chmod,unlink,rmdir,copyFile,statfs,link};
`;
const fsSource=`import * as original from 'node:fs';export * from 'node:fs';const cfg=JSON.parse(original.readFileSync(process.env.ZEV_RECORD_FIXTURE_PATH+'/hardware.json','utf8'));
function mapped(p){if(typeof p!=='string')return p;for(const [logical,actual] of [[cfg.guestRoot,cfg.guestPhysical],[cfg.hostRoot,cfg.hostPhysical]])if(p===logical||p.startsWith(logical+'/'))return actual+p.slice(logical.length);return p;}
export const createReadStream=(p,...a)=>original.createReadStream(mapped(p),...a);
export default {...original,createReadStream};
`;
const childProcessSource=`import * as original from 'node:child_process';import {readFileSync} from 'node:fs';import {promisify} from 'node:util';export * from 'node:child_process';
const cfg=JSON.parse(readFileSync(process.env.ZEV_RECORD_FIXTURE_PATH+'/hardware.json','utf8'));
function mock(command,args){
 if(/(?:ffmpeg|ffprobe|magick|remotion)/i.test(command))throw Error('TEST_RENDER_OR_TOOL_MUST_NOT_RUN');
 if(command==='git'&&args[0]==='status')return '';
 if(command==='/bin/ps')return cfg.parentArgs;
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('diskutil'))){const root=args.at(-1),guest=root===cfg.guestRoot;return JSON.stringify({VolumeUUID:guest?cfg.guestVolumeUuid:cfg.hostVolumeUuid,MountPoint:root,FilesystemType:guest?'apfs':'exfat',DeviceNode:guest?'/dev/disk91s1':'/dev/disk92s1',WritableVolume:true,GlobalPermissionsEnabled:guest});}
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('hdiutil')))return JSON.stringify({images:[{'image-path':cfg.imagePath,'system-entities':[{'dev-entry':'/dev/disk91s1','mount-point':cfg.guestRoot}]}]});
 if(command==='/usr/bin/python3'&&args.some(v=>typeof v==='string'&&v.includes('plistlib.load(open')))return JSON.stringify({'diskimage-bundle-type':'com.apple.diskimage.sparsebundle',size:100_000_000_000});
 return null;
}
export function execFile(command,args,options,callback){if(typeof options==='function'){callback=options;options={};}try{const out=mock(command,args);if(out!==null){queueMicrotask(()=>callback(null,out,''));return {};}}catch(e){queueMicrotask(()=>callback(e,'',''));return {};}return original.execFile(command,args,options,callback);}
execFile[promisify.custom]=(command,args,options={})=>new Promise((resolve,reject)=>execFile(command,args,options,(error,stdout,stderr)=>error?reject(error):resolve({stdout,stderr})));
export function spawn(command,...args){if(/(?:ffmpeg|ffprobe|magick|remotion)/i.test(command))throw Error('TEST_RENDER_OR_TOOL_MUST_NOT_RUN');return original.spawn(command,...args);}
export default {...original,execFile,spawn};
`;
const seedSource=`import {readFile,writeFile,mkdir,chmod,lstat} from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';const cfg=JSON.parse(await readFile(process.env.ZEV_RECORD_FIXTURE_PATH+'/hardware.json','utf8'));
const common=await import(pathToFileURL(cfg.repo+'/runner/src/digest-approved-job-v001.ts'));
const shared=await import(pathToFileURL(cfg.repo+'/evals/clip_composition/digest_representative_completion_v001.mjs'));
const qc=await import(pathToFileURL(cfg.repo+'/evals/clip_composition/presentation_renderer_qc_v002.mjs'));
const contract=await import(pathToFileURL(cfg.repo+'/evals/clip_composition/presentation_caption_contract_v002.mjs'));
const q=await common.readQualifiedDigestApprovedJobV001(cfg.options),out=q.job.outputRoot,root=cfg.guestRoot+'/'+out;
const sha=v=>createHash('sha256').update(v).digest('hex'),canonical=v=>sha(contract.canonicalJson(v));
async function save(logical,value,binary=false){const file=cfg.guestRoot+'/'+logical;await mkdir(path.dirname(file),{recursive:true});const raw=binary?value:Buffer.from(JSON.stringify(value,null,2)+'\\n');await writeFile(file,raw,{flag:'wx'});await chmod(file,0o444);return {path:logical,fileSha256:sha(raw),sizeBytes:raw.length};}
const media=await save(out+'/render/presentation-rendered-v002.mp4',Buffer.from('TEST ONLY OPAQUE MEDIA BYTES; NO VIDEO GENERATED'),true);
const png=await save(out+'/render/overlays/fixture.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLlQAAAAASUVORK5CYII=','base64'),true);
const element={instructionId:'fixture-caption-1',startFrame:0,endFrameExclusive:2,displayFrameCount:2,text:'Synthetic fixture',presetId:'fixture-preset',registryVersion:'fixture-registry',indexedLines:[{text:'Synthetic fixture'}],visualState:{layout:{maxLines:2},position:{preset:'bottom'},background:{kind:'none'}}};
const plan={schemaVersion:'presentation-render-plan-v002',canvas:{width:64,height:64,fps:30,safeAreaPx:{left:0,right:0,top:0,bottom:0}},elements:[element]};
const app={instructionId:element.instructionId,requestedPresetId:element.presetId,appliedPresetId:element.presetId,appliedPresetRegistryVersion:element.registryVersion,
 overlayFile:'overlays/fixture.png',overlaySha256:png.fileSha256,appliedOverlayPropsCanonicalSha256:'e'.repeat(64),finalPlanElementReference:{planFile:'presentation-render-plan-v002.json',instructionId:element.instructionId,canonicalSha256:canonical({...element,overlaySha256:png.fileSha256})}};
const inspection={instructionId:element.instructionId,overlayFile:app.overlayFile,overlaySha256:png.fileSha256,appliedOverlayPropsCanonicalSha256:app.appliedOverlayPropsCanonicalSha256,
 alphaMax:255,alphaBounds:{left:10,top:10,right:20,bottom:20},lineCount:1,lineAlphaBounds:[{lineIndex:0,left:10,top:10,right:20,bottom:20}]};
const outputMedia={durationMs:2*1000/30,video:{width:64,height:64,fps:30,frameCount:2}},expectedAudio={present:false};
const rules=qc.evaluatePresentationRendererQcV002({plan,applicationResults:[app],overlayInspections:[inspection],mediaInspection:outputMedia,expectedAudio,expectedFrameCount:2,canvas:plan.canvas,requireFinalVisibility:false});
if(rules.status!=='passed')throw Error(JSON.stringify(rules.violations));
const bindings={planId:q.job.planId,outputRoot:out,approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,manifestBinding:q.job.inputs.candidateManifestBinding,
 typographySettingsBinding:q.job.inputs.typographySettingsBinding,rendererPlanCanonicalSha256:canonical(plan),completedMedia:{...media,path:cfg.guestRoot+'/'+media.path}};
let verification=q.job.verificationPolicy?shared.evaluateDigestRepresentativeCompletionV001({policy:q.job.verificationPolicy,bindings,plan,ruleQc:rules}):undefined;
const technical={schemaVersion:'digest-representative-technical-evidence-v001',planId:q.job.planId,approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
 manifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,implementationSha:q.job.implementation.sha,
 verificationPolicy:q.job.verificationPolicy,publishedMediaBinding:media,rendererPlanCanonicalSha256:canonical(plan),plan,applicationResults:[app],overlayRecords:[{element,inspection,pngBinding:png}],outputMedia,expectedAudio,expectedFrameCount:2};
const technicalBinding=await save(out+'/representative-technical-evidence-v001.json',technical);
const corePlan={schemaVersion:'digest-approved-candidate-core-plan-v001',planId:q.job.planId,outputRoot:out,approvedJobBinding:q.jobBinding,approvalRecordBinding:q.authorizationBinding,
 acceptedManifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,verificationPolicy:q.job.verificationPolicy};
corePlan.implementationBindings=q.job.implementation.bindings;const coreBinding=await save(out+'/core-plan.json',corePlan);
const pending={schemaVersion:'digest-approved-manufacturing-result-v001',status:'confirmation-pending',complete:false,approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
 planBinding:coreBinding,implementationSha:q.job.implementation.sha,typographySettingsBinding:q.job.inputs.typographySettingsBinding,verification,outlineChoice:null,
 technicalEvidenceBinding:technicalBinding,publishedMediaBinding:media,completedAt:null,humanQuality:'not-evaluated',originalJudgmentReruns:0,
 result:{status:'confirmation-pending',complete:false,qc:'confirmation-pending',verification,video:{path:media.path,fileSha256:media.fileSha256},technicalEvidenceBinding:technicalBinding,publishedMediaBinding:media}};
let receiptBinding;
const sample=Buffer.from(JSON.stringify({testOnly:true,instructionId:element.instructionId,text:element.text,frame:1})+'\\n'),sampleSource=cfg.fixture+'/sample-source.json';
await writeFile(sampleSource,sample,{flag:'wx'});const evidenceBinding={path:out+'/representative/evidence/context.json',fileSha256:sha(sample),sizeBytes:sample.length};
const record={schemaVersion:'digest-representative-verification-record-v001',planId:q.job.planId,approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
 manifestBinding:q.job.inputs.candidateManifestBinding,typographySettingsBinding:q.job.inputs.typographySettingsBinding,rendererPlanCanonicalSha256:canonical(plan),
 completedMedia:{fileSha256:media.fileSha256,sizeBytes:media.sizeBytes},confirmedAt:new Date().toISOString(),representatives:[{instructionId:element.instructionId,startFrame:0,endFrameExclusive:2,
 observedAtFrame:1,method:'text-clock-context',result:'accepted',evidenceBinding,note:'Synthetic structural test, not a real viewing or human approval'}],observations:{wholeVideoPlayback:'not-evaluated',audioListening:'not-evaluated',humanQualityAdoption:'not-evaluated'}};
const recordRaw=Buffer.from(JSON.stringify(record,null,2)+'\\n'),recordSource=cfg.fixture+'/record-source.json';await writeFile(recordSource,recordRaw,{flag:'wx'});
if(cfg.initialMode!=='pending'){
 const admission=await save(out+'/admission-receipt.json',{schemaVersion:'test-only-admission',status:'accepted'}),lineLayout=await save(out+'/line-layout.json',{schemaVersion:'test-only-layout',lines:['Synthetic fixture']});
 if(cfg.initialMode==='representative'){
  const rb=await save(q.job.verificationPolicy.confirmationRecordPath,record);await save(evidenceBinding.path,sample,true);
  verification=shared.evaluateDigestRepresentativeCompletionV001({policy:q.job.verificationPolicy,bindings,plan,ruleQc:rules,representativeRecord:record,representativeRecordBinding:rb});
 }
 const finalQc=cfg.initialMode==='full'?rules:verification;
 const execution=await save(out+'/renderer-result.json',{schemaVersion:'digest-approved-render-execution-v001',exitCode:0,result:{status:'completed',qc:finalQc,verification,
  commonCorePlan:plan,publication:{status:'published',outputDirectory:cfg.guestRoot+'/'+out+'/render'}}});
 pending.status='completed';pending.complete=true;pending.completedAt=new Date().toISOString();pending.verification=verification;pending.technicalQc=cfg.initialMode==='full'?'passed':{wholeRules:verification.checks.wholeRules,media:verification.checks.media,audioPreservation:verification.checks.audioPreservation,fullVisibility:verification.checks.fullVisibility};
 pending.result={...pending.result,status:'completed',complete:true,qc:cfg.initialMode==='full'?'passed':verification.status,verification,execution,admission,lineLayout};
 if(cfg.initialMode==='representative')pending.result.counterfactualQcExecuted=false;
}
receiptBinding=await save(out+'/result.json',pending);
const registration={schemaVersion:'digest-representative-registration-v001',approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,pendingReceiptBinding:receiptBinding,
 record:{destinationPath:q.job.verificationPolicy?.confirmationRecordPath??out+'/representative/confirmation.json',sourceBinding:{path:recordSource,fileSha256:sha(recordRaw),sizeBytes:recordRaw.length}},
 evidence:[{destinationPath:evidenceBinding.path,sourceBinding:{path:sampleSource,fileSha256:sha(sample),sizeBytes:sample.length}}]};
const bundleRaw=Buffer.from(JSON.stringify(registration,null,2)+'\\n'),bundle=cfg.fixture+'/registration-source.json';await writeFile(bundle,bundleRaw,{flag:'wx'});
process.stdout.write(JSON.stringify({pendingReceiptBinding:receiptBinding,registrationBinding:{path:bundle,fileSha256:sha(bundleRaw),sizeBytes:bundleRaw.length},media,png,technicalBinding,coreBinding})+'\\n');
`;

type Fixture={directory:string;cfg:any;options:any;seed:any;physical:(logical:string)=>string;run:(mode:string,env?:Record<string,string>,anchor?:any)=>ReturnType<typeof worker>};
function worker(directory:string,args:string[],env:Record<string,string>={}) {
  const processEnv:NodeJS.ProcessEnv={...process.env,NODE_PATH:ROOT+'/runner/node_modules',ZEV_RECORD_FIXTURE_PATH:directory,...env};delete processEnv.NODE_OPTIONS;
  const child=spawn(node,['--import',directory+'/register.mjs','--import',tsx,...args],{cwd:ROOT,env:processEnv,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',v=>stdout+=v);child.stderr.on('data',v=>stderr+=v);
  const done=new Promise<{code:number|null;stdout:string;stderr:string}>(resolve=>child.on('close',code=>resolve({code,stdout,stderr})));
  return {child,done};
}
async function fixture(action:(f:Fixture)=>Promise<void>,initialMode='pending') {
  const id='test-record-finalize-'+randomUUID(),relative='runtime/artifacts/'+id,directory=ROOT+'/'+relative;
  await exec('git',['check-ignore','-q',relative+'/job.json'],{cwd:ROOT});await mkdir(directory,{recursive:false});
  const save=async(name:string,value:any)=>{const raw=bytes(value),file=directory+'/'+name;await writeFile(file,raw,{flag:'wx'});return {path:file,fileSha256:hash(raw),sizeBytes:raw.length};};
  try {
    await mkdir(directory+'/guest');await mkdir(directory+'/host');await mkdir(directory+'/host/test-only.sparsebundle');
    await writeFile(directory+'/host/test-only.sparsebundle/Info.plist','TEST-ONLY VIRTUAL IMAGE METADATA\n');
    const controls:any={};for(const key of ['prep','candidate','typography','renderer']) {const b=await save(key+'.json',{schemaVersion:'test-only-'+key});controls[key]={...b,path:path.relative(ROOT,b.path)};}
    const guestRoot='/Volumes/TEST-RECORD-GUEST-'+id,hostRoot='/Volumes/TEST-RECORD-HOST-'+id;
    const job:any={schemaVersion:'digest-approved-job-v001',planId:id,outputRoot:relative+'/attempt-001',
      inputs:{preparationParameters:{testOnly:true},preparationManifestBinding:controls.prep,candidateManifestBinding:controls.candidate,typographySettingsBinding:controls.typography,rendererTemplateBinding:controls.renderer},
      storage:{guestRoot,hostRoot,imagePath:hostRoot+'/test-only.sparsebundle',guestVolumeUuid:'11111111-1111-1111-1111-111111111111',hostVolumeUuid:'22222222-2222-2222-2222-222222222222',
        guestDevice:19001,hostDevice:19002,imageMaximumBytes:100_000_000_000,hostMetadataReserveBytes:6_000_000_000,internalRoot:ROOT},expected:{frames:2,audioSamples:2940,groups:1,atoms:1,cues:1},
      implementation:{sha:(await exec('git',['rev-parse','HEAD'],{cwd:ROOT})).stdout.trim(),bindings:await Promise.all(implementationPaths.map(async p=>({path:p,fileSha256:await fileHash(ROOT+'/'+p)}))),
        nodeBinding:{path:node,fileSha256:await fileHash(node),sizeBytes:(await lstat(node)).size}},guard:{...DIGEST_APPROVED_JOB_GUARD_V001},allocationBudget:{baseBuildBytes:1,rendererPreparationBytes:1},
      verificationPolicy:{schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',representativeInstructionIds:['fixture-caption-1'],
        permittedMethods:['text-clock-context'],confirmationRecordPath:relative+'/attempt-001/representative/confirmation.json'}};
    if(initialMode==='full')delete job.verificationPolicy;
    const jobBinding=await save('job.json',job),authorizationBinding=await save('synthetic-test-authorization.json',{schemaVersion:'digest-approved-job-authorization-v001',recordId:id+'-synthetic',
      userApproval:{at:new Date().toISOString(),messageId:'TEST-NOT-A-USER-MESSAGE',sourceThreadId:'TEST-ONLY-NO-HUMAN-APPROVAL',text:'SYNTHETIC TEST ONLY. No real manufacturing or human grant; hardware virtualized, no real media generated.'},
      actions:['manufacture-one-approved-plan'],jobBinding,planId:job.planId,manifestBinding:job.inputs.candidateManifestBinding,typographySettingsBinding:job.inputs.typographySettingsBinding,
      outputRoot:job.outputRoot,storage:job.storage,guard:job.guard,implementation:job.implementation,normalCandidates:1,...(job.verificationPolicy?{verificationPolicy:job.verificationPolicy}:{})});
    const options={workspaceRoot:ROOT,jobBinding,authorizationBinding,trustedJobSha256:jobBinding.fileSha256,trustedAuthorizationSha256:authorizationBinding.fileSha256};
    const cfg:any={fixture:directory,repo:ROOT,initialMode,guestRoot,hostRoot,guestPhysical:directory+'/guest',hostPhysical:directory+'/host',guestDevice:job.storage.guestDevice,hostDevice:job.storage.hostDevice,
      guestVolumeUuid:job.storage.guestVolumeUuid,hostVolumeUuid:job.storage.hostVolumeUuid,imagePath:job.storage.imagePath,options};
    await save('hardware.json',cfg);for(const [name,source] of Object.entries({'loader.mjs':loaderSource,'register.mjs':registerSource,'fs-promises-shim.mjs':fsPromisesSource,'fs-shim.mjs':fsSource,'child-process-shim.mjs':childProcessSource,'seed.mjs':seedSource}))await writeFile(directory+'/'+name,source,{flag:'wx'});
    const first=await worker(directory,[directory+'/seed.mjs']).done;assert.equal(first.code,0,first.stderr);const seed=JSON.parse(first.stdout.trim());
    const pendingAbsolute=guestRoot+'/'+seed.pendingReceiptBinding.path;
    cfg.parentArgs=[ROOT+'/tools/digest-quality/original-resolution-full-supervisor-v002.py','--finalize-job',jobBinding.path,authorizationBinding.path,options.trustedJobSha256,options.trustedAuthorizationSha256,
      pendingAbsolute,seed.pendingReceiptBinding.fileSha256,seed.registrationBinding.path,seed.registrationBinding.fileSha256].join(' ');await writeFile(directory+'/hardware.json',bytes(cfg));
    const f:Fixture={directory,cfg,options,seed,physical:logical=>directory+'/guest/'+logical,run:(mode,env={},anchor=seed.registrationBinding)=>{
      const args=[ROOT+'/runner/src/digest-approved-record-finalize-v001.ts',mode,'--job-file',jobBinding.path,'--authorization-file',authorizationBinding.path,
        '--job-sha256',options.trustedJobSha256,'--authorization-sha256',options.trustedAuthorizationSha256,'--pending-result-file',pendingAbsolute,
        '--pending-result-file-sha256',seed.pendingReceiptBinding.fileSha256,'--pending-result-size-bytes',String(seed.pendingReceiptBinding.sizeBytes),
        ...(mode==='--finalize-job'?['--registration-bundle-file',anchor.path,'--registration-bundle-sha256',anchor.fileSha256,'--registration-bundle-size-bytes',String(anchor.sizeBytes)]:[])];
      return worker(directory,args,{...(mode==='--finalize-job'?{ZEV_APPROVED_RECORD_FINALIZE_SUPERVISED:'1'}:{}),...env});
    }};
    await action(f);
  } finally {await rm(directory,{recursive:true,force:true});}
}
const parsed=(r:{code:number|null;stdout:string;stderr:string})=>{assert.equal(r.code,0,r.stderr);return JSON.parse(r.stdout.trim());};
async function waitFor(file:string){for(let i=0;i<200;i++){try{await lstat(file);return;}catch{}await new Promise(r=>setTimeout(r,25));}throw Error('TEST_TIMEOUT '+file);}

test('plain JSON cannot forge a record-only context or replace the independent pending/registration anchors',async()=>{
  const jsonContext={scope:'digest-record-only-finalization-v001',approvedJob:{job:{}},pending:{}};
  await assert.rejects(assertQualifiedDigestRecordFinalizationContextV001(jsonContext));await assert.rejects(assertQualifiedDigestRecordFinalizationContextV001(structuredClone(jsonContext)));
  const fake:any={workspaceRoot:ROOT,pendingReceiptBinding:{path:'runtime/artifacts/fake/attempt-001/result.json',fileSha256:'a'.repeat(64),sizeBytes:1},trustedPendingReceiptSha256:'b'.repeat(64)};
  await assert.rejects(readApprovedDigestJobResultV001(fake),/RECORD_PENDING_ANCHOR_MISMATCH/);
  await assert.rejects(finalizeApprovedDigestJobRecordV001(fake),/RECORD_PENDING_ANCHOR_MISMATCH/);
});

test('pending seed process exits, a different process registers/requalifies, and a third read-only process retrieves completed',async()=>fixture(async f=>{
  const original=await readFile(f.physical(f.seed.pendingReceiptBinding.path)),before=await readdir(path.dirname(f.physical(f.seed.pendingReceiptBinding.path)));
  const pending=parsed(await f.run('--get-job-result').done);assert.equal(pending.result.status,'confirmation-pending');
  assert.deepEqual(await readdir(path.dirname(f.physical(f.seed.pendingReceiptBinding.path))),before,'get must not create a lock or owner');
  const finish=parsed(await f.run('--finalize-job').done);assert.equal(finish.result.status,'completed');assert.equal(finish.result.complete,true);
  assert.equal(finish.result.verification.status,'passed-representative');assert.equal(finish.result.technicalQc.fullVisibility.status,'not-executed');
  assert.equal(finish.result.humanQuality,'not-evaluated');assert.equal(finish.result.originalJudgmentReruns,0);
  const receipt=f.physical(finish.completedReceiptBinding.path);assert.equal((await lstat(receipt)).mode&0o222,0);
  assert.equal((await readFile(f.physical(f.seed.pendingReceiptBinding.path))).equals(original),true);
  const registration=JSON.parse(await readFile(f.seed.registrationBinding.path,'utf8'));
  await rm(f.seed.registrationBinding.path);await rm(registration.record.sourceBinding.path);for(const item of registration.evidence)await rm(item.sourceBinding.path);
  const later=parsed(await f.run('--get-job-result').done);assert.equal(later.result.status,'completed');assert.deepEqual(later.completedReceiptBinding,finish.completedReceiptBinding);
  const retry=parsed(await f.run('--finalize-job').done);assert.deepEqual(retry.completedReceiptBinding,finish.completedReceiptBinding,'same SHA retry uses saved bundle when original files are gone');
  assert.equal(await fileHash(f.physical(f.seed.media.path)),f.seed.media.fileSha256);
  assert.equal(await fileHash(f.physical(f.seed.png.path)),f.seed.png.fileSha256);
  assert(!f.cfg.parentArgs.includes('ffmpeg'),'no render command is part of this fixture');
}));

test('media replacement, missing pending and independently rebound wrong plan/settings are refused',async()=>{
  for(const variant of ['media','missing','plan','settings'])await fixture(async f=>{
    const pendingFile=f.physical(f.seed.pendingReceiptBinding.path),original=await readFile(pendingFile),root=path.dirname(pendingFile);
    if(variant==='media'){const file=f.physical(f.seed.media.path);await chmod(file,0o644);await writeFile(file,'DIFFERENT TEST BYTES');await chmod(file,0o444);}
    else if(variant==='missing')await rm(pendingFile);
    else {
      const p=JSON.parse(original.toString());
      if(variant==='plan'){const planFile=f.physical(f.seed.coreBinding.path),plan=JSON.parse(await readFile(planFile,'utf8'));plan.planId='other-plan';const raw=bytes(plan);await chmod(planFile,0o644);await writeFile(planFile,raw);await chmod(planFile,0o444);p.planBinding={...p.planBinding,fileSha256:hash(raw),sizeBytes:raw.length};}
      else p.typographySettingsBinding={...p.typographySettingsBinding,fileSha256:'f'.repeat(64)};
      const raw=bytes(p);await chmod(pendingFile,0o644);await writeFile(pendingFile,raw);await chmod(pendingFile,0o444);
      const prior=f.seed.pendingReceiptBinding.fileSha256;f.seed.pendingReceiptBinding={...f.seed.pendingReceiptBinding,fileSha256:hash(raw),sizeBytes:raw.length};f.cfg.parentArgs=f.cfg.parentArgs.replace(prior,f.seed.pendingReceiptBinding.fileSha256);await writeFile(f.directory+'/hardware.json',bytes(f.cfg));
    }
    const failed=await f.run('--finalize-job').done;assert.notEqual(failed.code,0,variant);assert.match(failed.stderr,variant==='media'?/PENDING_SAVED_ARTIFACT_CHANGED/:variant==='missing'?/ENOENT/:variant==='plan'?/PENDING_CORE_PLAN_CHANGED/:/AssertionError/);
    if(variant==='media')assert((await readFile(pendingFile)).equals(original));
    await assert.rejects(lstat(root+'/record-finalization-v001/completed-receipt.json'));await assert.rejects(lstat(root+'/.record-finalization-v001.lock'));
  });
});

test('precommit failure leaves pending intact and the same registration can complete without overwriting anything',async()=>fixture(async f=>{
  const original=await readFile(f.physical(f.seed.pendingReceiptBinding.path));
  const failed=await f.run('--finalize-job',{ZEV_FIXTURE_PRECOMMIT_FAIL:'1'}).done;assert.notEqual(failed.code,0);assert.match(failed.stderr,/TEST_PRECOMMIT_FAILURE/);
  assert((await readFile(f.physical(f.seed.pendingReceiptBinding.path))).equals(original));
  const root=path.dirname(f.physical(f.seed.pendingReceiptBinding.path));await assert.rejects(lstat(root+'/record-finalization-v001/completed-receipt.json'));await assert.rejects(lstat(root+'/.record-finalization-v001.lock'));
  const completed=parsed(await f.run('--finalize-job').done);assert.equal(completed.result.status,'completed');
  assert((await readFile(f.physical(f.seed.pendingReceiptBinding.path))).equals(original));
}));

test('concurrent registration is refused by the real mkdir lock while the first process owns completion',async()=>fixture(async f=>{
  const first=f.run('--finalize-job',{ZEV_FIXTURE_HOLD_COMMIT:'1'});await waitFor(f.directory+'/commit-ready');
  try {const other=await f.run('--finalize-job').done;assert.notEqual(other.code,0);assert.match(other.stderr,/RECORD_FINALIZATION_BUSY/);}
  finally {await writeFile(f.directory+'/release-commit','1');}
  const result=parsed(await first.done);assert.equal(result.result.status,'completed');
  const root=path.dirname(f.physical(f.seed.pendingReceiptBinding.path));await assert.rejects(lstat(root+'/.record-finalization-v001.lock'));
}));

test('a different registration SHA cannot replace an existing completed receipt',async()=>fixture(async f=>{
  const first=parsed(await f.run('--finalize-job').done),file=f.physical(first.completedReceiptBinding.path),before=await readFile(file);
  const alternateRaw=Buffer.concat([await readFile(f.seed.registrationBinding.path),Buffer.from(' ')]),alternate=f.directory+'/different-registration.json';await writeFile(alternate,alternateRaw);
  const anchor={path:alternate,fileSha256:hash(alternateRaw),sizeBytes:alternateRaw.length};
  f.cfg.parentArgs=f.cfg.parentArgs.replace(f.seed.registrationBinding.path,alternate).replace(f.seed.registrationBinding.fileSha256,anchor.fileSha256);await writeFile(f.directory+'/hardware.json',bytes(f.cfg));
  const rejected=await f.run('--finalize-job',{},anchor).done;assert.notEqual(rejected.code,0);assert.match(rejected.stderr,/RECORD_COMPLETED_REGISTRATION_CONFLICT/);
  assert((await readFile(file)).equals(before));assert.equal(parsed(await f.run('--get-job-result').done).result.status,'completed');
}));

for(const mode of ['full','representative'])test(`read-only retrieval supports an initially completed ${mode} result and rejects replaced media`,async()=>fixture(async f=>{
  const root=path.dirname(f.physical(f.seed.pendingReceiptBinding.path)),before=await readdir(root),original=await readFile(f.physical(f.seed.pendingReceiptBinding.path));
  const result=parsed(await f.run('--get-job-result').done);assert.equal(result.result.status,'completed');
  assert.equal(result.result.result.qc,mode==='full'?'passed':'passed-representative');assert.deepEqual(await readdir(root),before);
  assert((await readFile(f.physical(f.seed.pendingReceiptBinding.path))).equals(original));
  const media=f.physical(f.seed.media.path);await chmod(media,0o644);await writeFile(media,'DIFFERENT SYNTHETIC MEDIA');await chmod(media,0o444);
  const refused=await f.run('--get-job-result').done;assert.notEqual(refused.code,0);assert.match(refused.stderr,/COMPLETED_MEDIA_BYTES_CHANGED/);
  await assert.rejects(lstat(root+'/.record-finalization-v001.lock'));
},mode));

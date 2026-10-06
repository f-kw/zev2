import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rm,lstat,symlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {DIGEST_APPROVED_JOB_GUARD_V001} from './digest-approved-job-v001.js';
import {validateDigestApprovedBaseReuseGraphV001,assertQualifiedDigestApprovedBaseReuseV001,readQualifiedDigestApprovedBaseReuseV001,copyQualifiedDigestApprovedBaseReuseV001} from './digest-approved-base-reuse-v001.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const binding=(p:string)=>({path:p,fileSha256:'a'.repeat(64)});
function fixture() {
  // Synthetic graph only. No manufacturing permission, supervisor, media processing, or real controls are created.
  const prefix='runtime/artifacts/test-only-old/current-inputs-v001',out='runtime/artifacts/test-only-old/completed';
  const code=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts','runner/src/digest-approved-inputs-v001.ts',
    'runner/src/digest-formal-handoff-v001.ts','runner/src/digest-caption-registration-migration-v001.ts','evals/clip_composition/adopted_media_manufacturing_v001.mts',
    'evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs','evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts',
    'evals/clip_composition/render_presentation_v002.mjs','tools/digest-quality/original-resolution-low-memory-composite.mjs','tools/digest-quality/original-resolution-full-supervisor-v002.py',
    'evals/clip_composition/digest_representative_completion_v001.mjs','runner/src/digest-approved-record-finalize-v001.ts'];
  const storage={guestRoot:'/Volumes/TestOnlyGuest',guestVolumeUuid:'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA',hostRoot:'/Volumes/TestOnlyHost',hostVolumeUuid:'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBBBB',
    imagePath:'/Volumes/TestOnlyHost/test.sparsebundle',imageMaximumBytes:100_000_000_000,hostMetadataReserveBytes:6_000_000_000,internalRoot:ROOT,guestDevice:11,hostDevice:12};
  const job:any={schemaVersion:'digest-approved-job-v002',planId:'test-only-old',outputRoot:out,inputs:{inputRoot:storage.guestRoot,inputPrefix:prefix,
    preparationParameters:{workspaceRoot:ROOT,inputRoot:storage.guestRoot,inputPrefix:prefix,outputRoot:storage.guestRoot+'/'+prefix+'/prepared',sourceRuntimeRoot:storage.guestRoot+'/'+prefix+'/source',stateBinding:binding(prefix+'/state.json'),styleTemplateBinding:binding(prefix+'/style.json'),scopeBinding:binding('test-only/scope.json')},
    ...Object.fromEntries(['preparationManifestBinding','candidateManifestBinding','typographySettingsBinding','rendererTemplateBinding','migrationApprovalEvidenceBinding'].map(k=>[k,binding(prefix+'/'+k+'.json')]))},
    storage,expected:{frames:30,audioSamples:44100,groups:1,atoms:1,cues:1},implementation:{sha:'b'.repeat(40),bindings:code.map(binding),nodeBinding:{path:process.execPath,fileSha256:'a'.repeat(64)}},guard:{...DIGEST_APPROVED_JOB_GUARD_V001},allocationBudget:{baseBuildBytes:1000,rendererPreparationBytes:1000}};
  const origin:any=Object.fromEntries(['approvedJob','authorization','completedReceipt','coreInvocation','manufacturingJob','machineAdoption','editPlan','admission','rendererJob','baseMedia','timeline','generationManifest','validationReceipt'].map(k=>[k,{...binding(out+'/'+k+'.json')} ]));
  origin.approvedJob={...binding(ROOT+'/runtime/artifacts/test-only-old/job.json'),sizeBytes:123};origin.authorization={...binding(ROOT+'/runtime/artifacts/test-only-old/auth.json'),sizeBytes:456};
  origin.machineAdoption.canonicalSha256='a'.repeat(64);
  const authorization={schemaVersion:'digest-approved-job-authorization-v002',recordId:'test-only-not-permission',userApproval:{at:'2026-10-06T00:00:00Z',messageId:'test-only',text:'Pure test, not manufacturing authorization',sourceThreadId:'test-only'},actions:['manufacture-one-approved-plan'],jobBinding:origin.approvedJob,planId:job.planId,manifestBinding:job.inputs.candidateManifestBinding,typographySettingsBinding:job.inputs.typographySettingsBinding,migrationApprovalEvidenceBinding:job.inputs.migrationApprovalEvidenceBinding,outputRoot:out,storage,guard:job.guard,implementation:job.implementation,normalCandidates:1};
  const sourceArtifact={...binding('test-only/source.mp4'),sourceProvenance:'test-only',sourceRef:'test-only',sourceUri:'file:///test-only/source.mp4'};
  const adoption={schemaVersion:'test-only-adoption',artifactId:'test-only-adoption'};
  const edit={schemaVersion:'test-only-edit',sourceVideoBinding:binding('test-only/source.mp4'),segments:[{segmentId:'one',sourceSegmentIds:[1,2],sourceStartMs:0,sourceEndMs:1000}]};
  const mappings=[{segmentId:'one',sourceStartMs:0,sourceEndMs:1000,sourceStartFrame30:0,sourceEndFrame30:30,outputStartFrame:0,outputEndFrame:30,audioSamples:{sourceStart:0,sourceEnd:44100,outputStart:0,outputEnd:44100}}];
  const media={source:{streamConfiguration:{videoCount:1,audioCount:1},video:{width:1920,height:1080},audio:{present:true}},audioClock:{sampleRate:44100,channels:2,channelLayout:'stereo'}};
  const executionInputs={format:'normal-landscape',canvas:{width:1920,height:1080,fps:30},cropPolicy:{mode:'already-applied'},sceneTransitionPolicy:{mode:'straight-cut'},audioPolicy:{mode:'preserve-source'}};
  const tools={profile:{nodeVersion:'test-only'},binaries:{node:{resolvedPath:process.execPath,fileSha256:'a'.repeat(64)},ffmpeg:{resolvedPath:'/test-only/ffmpeg',fileSha256:'a'.repeat(64)},ffprobe:{resolvedPath:'/test-only/ffprobe',fileSha256:'a'.repeat(64)}}};
  const dependencies={generation:[binding('evals/clip_composition/presentation_base_media_build_v003.mjs'),binding('evals/clip_composition/presentation_base_media_timeline_v004.mjs')],trusted:[binding('test-only/trusted.mjs')],wrapper:binding('evals/clip_composition/adopted_media_manufacturing_v001.mts')};
  const base=Object.fromEntries(['baseMedia','timeline','generationManifest','validationReceipt'].map(k=>[k,origin[k]]));
  const bodies:any={approvedJob:job,authorization,completedReceipt:{schemaVersion:'digest-approved-record-finalization-result-v001',status:'completed',approvedJobBinding:origin.approvedJob,authorizationBinding:origin.authorization,
    result:{status:'completed',complete:true,approvedJobBinding:origin.approvedJob,authorizationBinding:origin.authorization,invocationBinding:origin.coreInvocation,result:{complete:true,admission:origin.admission}}},
    coreInvocation:{schemaVersion:'digest-approved-core-invocation-v001',approvedJobBinding:origin.approvedJob,authorizationBinding:origin.authorization,jobBinding:origin.manufacturingJob,acceptedManifestBinding:job.inputs.candidateManifestBinding,implementationSha:job.implementation.sha},
    manufacturingJob:{schemaVersion:'presentation-base-media-build-job-v001',jobId:job.planId+'-base',assemblyDecision:{path:origin.machineAdoption.path,fileSha256:origin.machineAdoption.fileSha256},sourceArtifact,outputDirectory:out+'/base-media'},machineAdoption:adoption,editPlan:edit,
    admission:{schemaVersion:'presentation-renderer-admission-receipt-v002',status:'accepted',rendererJobBinding:origin.rendererJob,cropAppliedBaseMediaBinding:base},rendererJob:{schemaVersion:'presentation-instruction-renderer-job-v002',cropAppliedBaseMedia:base,executionInputs},
    timeline:{schemaVersion:'presentation-base-media-timeline-v003',sourceProvenance:sourceArtifact.sourceProvenance,sourceRef:sourceArtifact.sourceRef,baseMedia:{expectedFrameCount:30},segments:mappings.map(({audioSamples,...s})=>s)},
    generationManifest:{schemaVersion:'presentation-base-media-generation-manifest-v003',job:{jobId:job.planId+'-base',schemaVersion:'presentation-base-media-build-job-v001',fileSha256:origin.manufacturingJob.fileSha256},assemblyDecision:{decisionId:adoption.artifactId,fileSha256:origin.machineAdoption.fileSha256,payloadSha256:origin.machineAdoption.canonicalSha256,approvalRecordId:authorization.recordId},basisEditPlan:{kind:'edit_plan_json',path:origin.editPlan.path,fileSha256:origin.editPlan.fileSha256},source:{...sourceArtifact,...media.source},segments:mappings,audio:{present:true,encodeInput:{sampleCount:44100},sampleRate:44100,channels:2,channelLayout:'stereo'},outputs:{baseMedia:{frameCount:30}},tools:{expected:tools.profile,observed:tools.profile,binaryDiagnostics:tools.binaries},implementationFiles:dependencies.generation,execution:{trustedSourceFiles:dependencies.trusted}},
    validationReceipt:{schemaVersion:'digest-approved-base-validation-v001',status:'passed',coreInvocationBinding:origin.coreInvocation,machineAdoptionBinding:origin.machineAdoption,editPlanBinding:origin.editPlan,outputs:{baseMedia:origin.baseMedia,timeline:origin.timeline,generationManifest:origin.generationManifest},checks:Object.fromEntries(['machineAdoptionReconstruction','sourceSnapshotSha','formalRangeProjection','videoQc','audioQc','timelineQc'].map(k=>[k,'passed']))}};
  const current={inputPrefix:'runtime/artifacts/test-only-new/current-inputs-v001',outputRoot:'runtime/artifacts/test-only-new/attempt',storage,sourceArtifact,adoption,edit,mappings,media,expected:job.expected,executionInputs,tools,dependencies};
  const copies=Object.fromEntries(Object.entries(origin).map(([k,b]:[string,any])=>[k,{...b,path:current.inputPrefix+'/reuse/'+k+'.json',sizeBytes:b.sizeBytes??10}]));
  return JSON.parse(JSON.stringify({bundle:{schemaVersion:'digest-approved-base-reuse-input-v001',origin,copies},bodies,current}));
}
test('closed completed origin and unchanged current media validate as data, not an execution grant',()=>{
  const f=fixture();assert.deepEqual(validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current),{status:'validated-reuse-graph',manufacturingAuthorized:false});
});
test('recorded generation wrapper size is checked against actual bytes when declared',()=>{
  const f=fixture(),old=f.bodies.approvedJob.implementation.bindings.find((b:any)=>b.path==='evals/clip_composition/adopted_media_manufacturing_v001.mts');
  old.sizeBytes=33032;f.bodies.authorization.implementation=structuredClone(f.bodies.approvedJob.implementation);f.current.dependencies.wrapper.sizeBytes=33032;assert.equal(validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current).status,'validated-reuse-graph');
  f.current.dependencies.wrapper.sizeBytes++;assert.throws(()=>validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current),/WRAPPER_SIZE_CHANGED/);
});
test('every origin proof link, incomplete manufacturing and inherited QC failure is rejected',()=>{
  const cases=[(f:any)=>f.bodies.completedReceipt.status='confirmation-pending',(f:any)=>f.bodies.completedReceipt.result.complete=false,
    (f:any)=>f.bodies.completedReceipt.result.result.complete=false,(f:any)=>f.bodies.completedReceipt.approvedJobBinding.fileSha256='f'.repeat(64),
    (f:any)=>f.bodies.completedReceipt.result.result.admission.path+='other',(f:any)=>f.bodies.coreInvocation.jobBinding.fileSha256='f'.repeat(64),
    (f:any)=>f.bodies.admission.status='rejected',(f:any)=>f.bodies.admission.rendererJobBinding.fileSha256='f'.repeat(64),
    (f:any)=>f.bodies.rendererJob.cropAppliedBaseMedia.timeline.path+='other',(f:any)=>f.bodies.validationReceipt.coreInvocationBinding.path+='other',
    (f:any)=>f.bodies.validationReceipt.checks.videoQc='failed',(f:any)=>f.bodies.validationReceipt.outputs.baseMedia.fileSha256='f'.repeat(64),
    (f:any)=>f.bodies.generationManifest.assemblyDecision.approvalRecordId='other',(f:any)=>f.bodies.generationManifest.basisEditPlan.path+='other',
    (f:any)=>f.bodies.generationManifest.job.fileSha256='f'.repeat(64)];
  for(const change of cases){const f=fixture();change(f);assert.throws(()=>validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current));}
});
test('all source/ID/order/clock/crop/audio and real dependency identities must remain identical',()=>{
  const cases=[(f:any)=>f.current.sourceArtifact.fileSha256='f'.repeat(64),(f:any)=>f.current.edit.segments[0].sourceSegmentIds.reverse(),
    (f:any)=>f.current.mappings[0].sourceStartFrame30++, (f:any)=>f.current.mappings[0].audioSamples.sourceStart++,
    (f:any)=>f.current.adoption.artifactId='other',(f:any)=>f.current.media.source.video.width=1280,
    (f:any)=>f.current.expected.frames++,(f:any)=>f.current.expected.audioSamples++,(f:any)=>f.current.media.audioClock.channels=1,
    (f:any)=>f.current.executionInputs.cropPolicy.mode='crop',(f:any)=>f.current.executionInputs.sceneTransitionPolicy.mode='fade',
    (f:any)=>f.current.executionInputs.audioPolicy.mode='mute',(f:any)=>f.current.executionInputs.canvas.width=1280,
    (f:any)=>f.current.tools.binaries.ffmpeg.fileSha256='f'.repeat(64),(f:any)=>f.current.tools.profile.nodeVersion='other',
    (f:any)=>f.current.dependencies.generation[0].fileSha256='f'.repeat(64),(f:any)=>f.current.dependencies.trusted[0].fileSha256='f'.repeat(64),
    (f:any)=>f.current.dependencies.wrapper.fileSha256='f'.repeat(64)];
  for(const change of cases){const f=fixture();change(f);assert.throws(()=>validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current));}
});
test('bundle cannot redirect origin, inputs, duplicate paths or chain reused/failed jobs',()=>{
  for(const change of [(f:any)=>f.bundle.copies.timeline.path='../escape',(f:any)=>f.bundle.copies.timeline.path=f.bundle.copies.baseMedia.path,
    (f:any)=>delete f.bundle.copies.timeline.sizeBytes,(f:any)=>f.bundle.copies.timeline.fileSha256='f'.repeat(64),
    (f:any)=>f.bundle.origin.timeline.path='runtime/artifacts/other/timeline.json',(f:any)=>f.current.storage.guestVolumeUuid='changed',
    (f:any)=>f.current.outputRoot=f.bodies.approvedJob.outputRoot,(f:any)=>delete f.bundle.origin.rendererJob,
    (f:any)=>{f.bodies.approvedJob.inputs.baseReuseBundleBinding={};},(f:any)=>{f.bodies.approvedJob.recoveryBinding={};}
  ]){const f=fixture();change(f);assert.throws(()=>validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current));}
});
test('plain graph or caller callbacks cannot mint reuse, input or storage capabilities',async()=>{
  const f=fixture(),graph=validateDigestApprovedBaseReuseGraphV001(f.bundle,f.bodies,f.current);
  await assert.rejects(assertQualifiedDigestApprovedBaseReuseV001(graph,{} as any),/QUALIFIED_BASE_REUSE_REQUIRED/);
  await assert.rejects(readQualifiedDigestApprovedBaseReuseV001({job:f.bodies.approvedJob,assertCurrent:async()=>{}} as any,{}),/QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/);
  await assert.rejects(copyQualifiedDigestApprovedBaseReuseV001(graph,{approvedJob:{},assertCurrent:async()=>{}}, {},{}),/QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/);
});

const loader=String.raw`export async function load(url,context,next){const result=await next(url,context);if(url.split('?')[0].endsWith('/runner/src/digest-approved-base-reuse-v001.ts')){
 let source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString();
 const storage=/await\s+assertQualifiedApprovedDigestStorageContextV001\(context\)/gu,inputs=/await\s+assertApprovedDigestInputsV001\((inputs|r.inputs),\s*(q|qualified)\)/gu;
 if([...source.matchAll(storage)].length!==2||[...source.matchAll(inputs)].length!==3)throw Error('REUSE_TEST_QUALIFICATION_HOOK_SHAPE_CHANGED');
 source=source.replace(storage,'await globalThis.__REUSE_COPY_TEST__.assertContext(context)').replace(inputs,'await globalThis.__REUSE_COPY_TEST__.assertInputs($1,$2)');
 source+=String.raw`+"`"+String.raw`
 export async function __testSeedReuse(q,inputs,bundle,bodies){const pins=[],copies=new Map();for(const k of baseKeys){const pin=await observe(bundle.copies[k],q.job.storage.guestRoot);pins.push(pin);copies.set(k,pin);}
 const proof=freeze({bundleBinding:{path:q.job.inputs.inputPrefix+'/test-only-reuse.json',fileSha256:'a'.repeat(64)},minimumCopyBytes:1048576+pins.reduce((s,p)=>s+Number(p.identity.size),0)});
 proofs.set(proof,{qualified:q,inputs,bundle,bodies,pins,copies});return proof;}
 export {fileHash as __testFileHash};
 `+"`"+String.raw`;return {...result,source};}return result;}`;
// The loader models only pre-existing job/input/storage qualification in an owned test child.
// Actual WeakMap reuse proofs, private source binding, filesystem pins, copy/exclusive create,
// readback, output JSON and fault rejection run from the production helper. It is not a grant test.
const child=String.raw`import assert from 'node:assert/strict';import path from 'node:path';import {readFile,writeFile,mkdir,lstat,rm,symlink,chmod} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {register} from 'node:module';
 const [repo,dir]=process.argv.slice(2);register(pathToFileURL(dir+'/loader.mjs'),import.meta.url);
 const h=await import(pathToFileURL(repo+'/runner/src/digest-approved-base-reuse-v001.ts'));
 const m=await import(pathToFileURL(repo+'/evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts'));
 const raw=v=>Buffer.from(JSON.stringify(v,null,2)+'\n');let serial=0;
 async function setup(){const id='case-'+(++serial),guest=dir+'/'+id;await mkdir(guest);const inputPrefix='runtime/artifacts/test-only/current-inputs-v001',out='runtime/artifacts/test-only/output';
 await mkdir(guest+'/'+inputPrefix,{recursive:true});await mkdir(guest+'/'+out,{recursive:true});const device=(await lstat(guest)).dev;
 const q={job:{planId:'test-only',outputRoot:out,storage:{guestRoot:guest,guestDevice:device},inputs:{inputPrefix,candidateManifestBinding:{path:inputPrefix+'/candidate.json',fileSha256:'a'.repeat(64)}},implementation:{sha:'b'.repeat(40)}},jobBinding:{path:repo+'/test-only/job.json',fileSha256:'a'.repeat(64)},authorizationBinding:{path:repo+'/test-only/auth.json',fileSha256:'a'.repeat(64)}};
 const sourcePath=guest+'/'+inputPrefix+'/source.bin';await writeFile(sourcePath,'test-only current source');const sourceHash=await h.__testFileHash(sourcePath);
 const inputs={manufacturing:{sourceArtifact:{path:'test-only/source.mp4',fileSha256:sourceHash}},sourceDeclaration:{placement:'normal-declared-guest-source-v001',physicalPath:sourcePath,sizeBytes:(await lstat(sourcePath)).size,fileSha256:sourceHash},adoption:{schemaVersion:'test-only-adoption',artifactId:'one'},edit:{schemaVersion:'test-only-edit',segments:[]}};
 const bodies={timeline:{schemaVersion:'presentation-base-media-timeline-v003',originalJob:'test-only-origin'},generationManifest:{schemaVersion:'presentation-base-media-generation-manifest-v003',originalJob:'test-only-origin'},validationReceipt:{schemaVersion:'digest-approved-base-validation-v001',checks:{videoQc:'passed',audioQc:'passed'}}};const copies={},origin={};
 for(const k of ['baseMedia','timeline','generationManifest','validationReceipt']){const p=inputPrefix+'/'+k+(k==='baseMedia'?'.bin':'.json');await writeFile(guest+'/'+p,k==='baseMedia'?Buffer.alloc(4096,7):raw(bodies[k]));copies[k]={path:p,fileSha256:await h.__testFileHash(guest+'/'+p),sizeBytes:(await lstat(guest+'/'+p)).size,...(k==='baseMedia'?{}:{schemaVersion:bodies[k].schemaVersion,canonicalSha256:m.canonicalSha(bodies[k])})};origin[k]={...copies[k],path:'runtime/artifacts/test-only-origin/output/'+path.basename(p)};delete origin[k].sizeBytes;}
 const bundle={origin,copies},proof=await h.__testSeedReuse(q,inputs,bundle,bodies);let resourceCalls=0,publications=0,stopAtResource=null;
 const resolve=p=>guest+'/'+p,readBound=async b=>{const bytes=await readFile(resolve(b.path));assert.equal(m.sha(bytes),b.fileSha256);const v=JSON.parse(bytes);if(b.canonicalSha256)assert.equal(m.canonicalSha(v),b.canonicalSha256);return v;};
 const context={approvedJob:q,outputRoot:out,resolve,assertCurrent:()=>h.assertQualifiedDigestApprovedBaseReuseV001(proof,q),readBound,
 resourceCheck:async()=>{resourceCalls++;if(stopAtResource)await stopAtResource();},publish:async(p,v)=>{publications++;await writeFile(resolve(p),raw(v),{flag:'wx'});return m.bind(p,v);},
 resolveApprovedDigestSourceV001:async()=>{const s=await lstat(sourcePath,{bigint:true});return {physicalPath:sourcePath,identity:{dev:String(s.dev),ino:String(s.ino),sizeBytes:Number(s.size),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs),fileSha256:await h.__testFileHash(sourcePath)},assertCurrent:async()=>{}};}};
 globalThis.__REUSE_COPY_TEST__={assertContext:async c=>{assert.equal(c,context);await c.assertCurrent();},assertInputs:async(i,j)=>{assert.equal(i,inputs);assert.equal(j,q);}};
 const publish=async(p,v)=>{await writeFile(resolve(p),raw(v),{flag:'wx'});return m.bind(p,v);};const adoptionBinding=await publish(out+'/machine-adoption.json',inputs.adoption),editPlanBinding=await publish(out+'/edit-plan.json',inputs.edit);
 const manufacturingJob={schemaVersion:'test-only-manufacturing',sourceArtifact:inputs.manufacturing.sourceArtifact},manufacturingJobBinding=await publish(out+'/manufacturing-job.json',manufacturingJob);
 const invocationBinding=await publish(out+'/core-invocation.json',{schemaVersion:'digest-approved-core-invocation-v001',approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,planBinding:{path:out+'/core-plan.json',fileSha256:'a'.repeat(64)},jobBinding:manufacturingJobBinding,acceptedManifestBinding:q.job.inputs.candidateManifestBinding,storagePermitFileSha256:'a'.repeat(64),implementationSha:q.job.implementation.sha});
 const execution={invocationBinding,manufacturingJobBinding,manufacturingJob,machineAdoptionBinding:adoptionBinding,editPlanBinding};return {q,inputs,proof,context,execution,guest,copies,sourcePath,bodies,setStop:f=>stopAtResource=f,counts:()=>({resourceCalls,publications})};}
 async function run(f){return h.copyQualifiedDigestApprovedBaseReuseV001(f.proof,f.context,f.inputs,f.execution);}
 let f=await setup();await assert.rejects(run(f),/CURRENT_SOURCE_QUALIFICATION_REQUIRED/);await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);
 let result=await run(f);assert.equal(result.record.actualTimeSavedMs,null);assert.equal(result.record.baseBuildExecuted,false);assert.equal(f.counts().resourceCalls,1);assert.equal(f.counts().publications,1);
 for(const k of ['baseMedia','timeline','generationManifest'])assert.equal(await h.__testFileHash(f.context.resolve(result.base[k].path)),f.copies[k].fileSha256);
 const receipt=await f.context.readBound(result.base.validationReceipt);assert.equal(receipt.currentExecution.videoQc,'not-reexecuted');assert.equal(receipt.currentExecution.audioQc,'not-reexecuted');assert.equal(receipt.checks.copyReadback,'passed');assert.equal(receipt.inheritedTechnicalQc.checks.videoQc,'passed');
 for(const [k,b] of Object.entries(f.copies))assert.equal(await h.__testFileHash(f.guest+'/'+b.path),b.fileSha256);await assert.rejects(run(f),/EEXIST/);
 f=await setup();await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);await writeFile(f.guest+'/'+f.copies.baseMedia.path,Buffer.alloc(4096,8));await assert.rejects(run(f),/FILE_IDENTITY_CHANGED/);assert.equal(f.counts().resourceCalls,0);
 f=await setup();await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);f.setStop(async()=>{throw Error('TEST_ONLY_RESERVE_REJECTED');});await assert.rejects(run(f),/RESERVE_REJECTED/);await assert.rejects(lstat(f.guest+'/'+f.q.job.outputRoot+'/base-media'),/ENOENT/);
 f=await setup();await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);f.setStop(async()=>{await writeFile(f.sourcePath,'same-size changed source');});await assert.rejects(run(f),/FILE_IDENTITY_CHANGED/);assert.equal(f.counts().publications,0);
 f=await setup();await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);const inDir=f.guest+'/'+f.q.job.inputs.inputPrefix;await rm(inDir,{recursive:true});await symlink('/tmp',inDir);await assert.rejects(run(f));assert.equal(f.counts().publications,0);
 f=await setup();await h.qualifyDigestApprovedBaseReuseSourceV001(f.proof,f.context);const oldResolve=f.context.resolve;f.context.resolve=p=>p.endsWith('/base-media')?'/tmp/test-only-escape':oldResolve(p);await assert.rejects(run(f));assert.equal(f.counts().publications,0);
 console.log(JSON.stringify({status:'passed',cases:7,mediaProcessingExecuted:false,scope:'test-only filesystem/copy checks; upstream qualification modeled'}));`;
test('owned tiny files exercise exclusive copy, readback, source/input replacement, reserve and destination refusal',async()=>{
  const dir=path.join(ROOT,'runtime/artifacts','test-only-base-reuse-copy-'+process.pid+'-'+Date.now());await mkdir(dir,{recursive:true});
  try{await writeFile(dir+'/loader.mjs',loader);await writeFile(dir+'/child.mjs',child);
    const result=await new Promise<{code:number|null;output:string}>((resolve,reject)=>{const p=spawn(process.execPath,['--import',ROOT+'/runner/node_modules/tsx/dist/loader.mjs',dir+'/child.mjs',ROOT,dir],{stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',c=>output+=c);p.stderr.on('data',c=>output+=c);p.on('error',reject);p.on('close',code=>resolve({code,output}));});
    assert.equal(result.code,0,result.output);assert.match(result.output,/"status":"passed"/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

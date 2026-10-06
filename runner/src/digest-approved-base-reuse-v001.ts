/** Explicit subtitle-only reuse. Original generation/QC remain historical, unmodified evidence. */
import assert from 'node:assert/strict';
import {lstat,realpath,readFile,mkdir,copyFile,chmod} from 'node:fs/promises';
import {constants,createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {assertQualifiedDigestApprovedJobV001,validateDigestApprovedJobConfigurationV001,validateDigestJobBindingV001} from './digest-approved-job-v001.js';
import {assertApprovedDigestInputsV001,type ApprovedDigestQualifiedJobV001} from './digest-approved-inputs-v001.js';
import {assertQualifiedApprovedDigestStorageContextV001} from './digest-approved-job-runner-v001.js';

type Json=Record<string,any>;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=(p:string)=>import(pathToFileURL(path.join(ROOT,p)).href);
const keys=['approvedJob','authorization','completedReceipt','coreInvocation','manufacturingJob','machineAdoption','editPlan','admission','rendererJob','baseMedia','timeline','generationManifest','validationReceipt'] as const;
const baseKeys=['baseMedia','timeline','generationManifest','validationReceipt'] as const;
const generationPaths=['evals/clip_composition/presentation_base_media_build_v003.mjs','evals/clip_composition/presentation_base_media_timeline_v004.mjs'];
const wrapper='evals/clip_composition/adopted_media_manufacturing_v001.mts';
const sha=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
function exact(v:Json,fields:readonly string[],label:string) {assert(v&&typeof v==='object'&&!Array.isArray(v),label);assert.deepEqual(Object.keys(v).sort(),[...fields].sort(),label);}
function freeze(v:any):any {if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function sourceBase(v:Json) {return Object.fromEntries(baseKeys.map(k=>[k,v[k]]));}
function sameBinding(actual:Json,expected:Json) {assert.deepEqual(actual,expected,'BASE_REUSE_ORIGIN_REFERENCE_CHANGED');}

/** Pure graph validation does not qualify a job, inputs, storage, or a media file. */
export function validateDigestApprovedBaseReuseGraphV001(bundle:Json,bodies:Json,current:Json) {
  exact(bundle,['schemaVersion','origin','copies'],'BASE_REUSE_INPUT_FIELDS');
  assert.equal(bundle.schemaVersion,'digest-approved-base-reuse-input-v001');
  for(const group of ['origin','copies']) exact(bundle[group],keys,'BASE_REUSE_BUNDLE_FIELDS');
  for(const k of keys) {
    const original=bundle.origin[k],copy=bundle.copies[k];
    validateDigestJobBindingV001(original,k==='approvedJob'||k==='authorization');validateDigestJobBindingV001(copy);
    assert(copy.path.startsWith(current.inputPrefix+'/'),'BASE_REUSE_COPY_INPUT_PREFIX_REQUIRED');
    assert(Number.isSafeInteger(copy.sizeBytes)&&copy.sizeBytes>0,'BASE_REUSE_COPY_SIZE_REQUIRED');
    for(const field of ['fileSha256','schemaVersion','canonicalSha256']) assert.equal(copy[field],original[field],'BASE_REUSE_COPY_BINDING_CHANGED');
    if(original.sizeBytes!==undefined)assert.equal(copy.sizeBytes,original.sizeBytes,'BASE_REUSE_COPY_SIZE_CHANGED');
  }
  assert.equal(new Set(keys.map(k=>bundle.copies[k].path)).size,keys.length,'BASE_REUSE_DUPLICATE_COPY_PATH');
  exact(bodies,keys.filter(k=>k!=='baseMedia'),'BASE_REUSE_BODY_FIELDS');
  const o=bundle.origin,j=bodies.approvedJob,a=bodies.authorization,c=bodies.completedReceipt,
    i=bodies.coreInvocation,m=bodies.manufacturingJob,ad=bodies.machineAdoption,ep=bodies.editPlan,
    admission=bodies.admission,renderer=bodies.rendererJob,t=bodies.timeline,g=bodies.generationManifest,v=bodies.validationReceipt;
  validateDigestApprovedJobConfigurationV001(j,a,{workspaceRoot:ROOT,jobBinding:o.approvedJob,authorizationBinding:o.authorization,
    trustedJobSha256:o.approvedJob.fileSha256,trustedAuthorizationSha256:o.authorization.fileSha256});
  assert(j.recoveryBinding===undefined&&j.inputs.baseReuseBundleBinding===undefined,'BASE_REUSE_CHAIN_OR_RECOVERY_UNSUPPORTED');
  assert.deepEqual(j.storage,current.storage,'BASE_REUSE_STORAGE_CHANGED');
  assert(j.outputRoot!==current.outputRoot&&!j.outputRoot.startsWith(current.outputRoot+'/')&&!current.outputRoot.startsWith(j.outputRoot+'/'),'BASE_REUSE_OUTPUT_OVERLAP');
  for(const k of keys.filter(k=>k!=='approvedJob'&&k!=='authorization'))assert(o[k].path.startsWith(j.outputRoot+'/'),'BASE_REUSE_ORIGIN_OUTPUT_PREFIX_REQUIRED');
  assert.equal(c.schemaVersion,'digest-approved-record-finalization-result-v001');assert.equal(c.status,'completed');
  sameBinding(c.approvedJobBinding,o.approvedJob);sameBinding(c.authorizationBinding,o.authorization);
  assert.equal(c.result.status,'completed');assert.equal(c.result.complete,true);assert.equal(c.result.result.complete,true);
  sameBinding(c.result.approvedJobBinding,o.approvedJob);sameBinding(c.result.authorizationBinding,o.authorization);
  sameBinding(c.result.invocationBinding,o.coreInvocation);sameBinding(c.result.result.admission,o.admission);
  assert.equal(i.schemaVersion,'digest-approved-core-invocation-v001');sameBinding(i.approvedJobBinding,o.approvedJob);sameBinding(i.authorizationBinding,o.authorization);
  sameBinding(i.jobBinding,o.manufacturingJob);sameBinding(i.acceptedManifestBinding,j.inputs.candidateManifestBinding);assert.equal(i.implementationSha,j.implementation.sha);
  assert.equal(admission.schemaVersion,'presentation-renderer-admission-receipt-v002');assert.equal(admission.status,'accepted');
  sameBinding(admission.rendererJobBinding,o.rendererJob);assert.deepEqual(admission.cropAppliedBaseMediaBinding,sourceBase(o));
  assert.equal(renderer.schemaVersion,'presentation-instruction-renderer-job-v002');assert.deepEqual(renderer.cropAppliedBaseMedia,sourceBase(o));
  for(const [k,expected] of Object.entries({cropPolicy:{mode:'already-applied'},sceneTransitionPolicy:{mode:'straight-cut'},audioPolicy:{mode:'preserve-source'}})) {
    assert.deepEqual(renderer.executionInputs[k],expected,'BASE_REUSE_UNSUPPORTED_MEDIA_POLICY');
    assert.deepEqual(current.executionInputs[k],expected,'BASE_REUSE_CURRENT_MEDIA_POLICY_CHANGED');
  }
  for(const k of ['format','canvas'])assert.deepEqual(renderer.executionInputs[k],current.executionInputs[k],'BASE_REUSE_GEOMETRY_CHANGED');
  assert.equal(v.schemaVersion,'digest-approved-base-validation-v001');assert.equal(v.status,'passed');
  sameBinding(v.coreInvocationBinding,o.coreInvocation);sameBinding(v.machineAdoptionBinding,o.machineAdoption);sameBinding(v.editPlanBinding,o.editPlan);
  assert.deepEqual(v.outputs,{baseMedia:o.baseMedia,timeline:o.timeline,generationManifest:o.generationManifest});
  for(const k of ['machineAdoptionReconstruction','sourceSnapshotSha','formalRangeProjection','videoQc','audioQc','timelineQc'])assert.equal(v.checks[k],'passed','BASE_REUSE_ORIGINAL_QC_INCOMPLETE');
  assert.equal(m.schemaVersion,'presentation-base-media-build-job-v001');assert.equal(m.jobId,j.planId+'-base');assert.equal(m.outputDirectory,j.outputRoot+'/base-media');
  assert.deepEqual(m.assemblyDecision,{path:o.machineAdoption.path,fileSha256:o.machineAdoption.fileSha256});
  assert.deepEqual(m.sourceArtifact,current.sourceArtifact,'BASE_REUSE_SOURCE_CHANGED');
  assert.deepEqual(ad,current.adoption,'BASE_REUSE_ADOPTION_CHANGED');assert.deepEqual(ep,current.edit,'BASE_REUSE_IDS_ORDER_OR_EDIT_CHANGED');
  assert.deepEqual(g.job,{jobId:m.jobId,schemaVersion:m.schemaVersion,fileSha256:o.manufacturingJob.fileSha256});
  assert.deepEqual(g.assemblyDecision,{decisionId:ad.artifactId,fileSha256:o.machineAdoption.fileSha256,payloadSha256:o.machineAdoption.canonicalSha256,approvalRecordId:a.recordId});
  assert.deepEqual(g.basisEditPlan,{kind:'edit_plan_json',path:o.editPlan.path,fileSha256:o.editPlan.fileSha256});
  assert.equal(t.schemaVersion,'presentation-base-media-timeline-v003');assert.equal(g.schemaVersion,'presentation-base-media-generation-manifest-v003');
  assert.deepEqual(g.segments,current.mappings,'BASE_REUSE_FRAME_SAMPLE_MAPPING_CHANGED');
  assert.deepEqual(t.segments,current.mappings.map(({audioSamples,...s}:Json)=>s),'BASE_REUSE_TIMELINE_MAPPING_CHANGED');
  assert.equal(t.sourceProvenance,m.sourceArtifact.sourceProvenance);assert.equal(t.sourceRef,m.sourceArtifact.sourceRef);
  assert.deepEqual(g.source,{...m.sourceArtifact,streamConfiguration:current.media.source.streamConfiguration,video:current.media.source.video,audio:current.media.source.audio},'BASE_REUSE_SOURCE_CLOCK_OR_STREAM_CHANGED');
  assert.equal(t.baseMedia.expectedFrameCount,current.expected.frames);assert.equal(g.outputs.baseMedia.frameCount,current.expected.frames);
  assert.equal(g.audio.present,true,'BASE_REUSE_SOURCE_AUDIO_REQUIRED');
  assert.equal(g.audio.encodeInput.sampleCount,current.expected.audioSamples);assert.equal(g.audio.sampleRate,current.media.audioClock.sampleRate);
  assert.equal(g.audio.channels,current.media.audioClock.channels);assert.equal(g.audio.channelLayout,current.media.audioClock.channelLayout);
  assert.deepEqual(g.tools.expected,current.tools.profile);assert.deepEqual(g.tools.observed,current.tools.profile);
  assert.deepEqual(g.tools.binaryDiagnostics,current.tools.binaries,'BASE_REUSE_TOOL_BINARY_CHANGED');
  assert.deepEqual(g.implementationFiles,current.dependencies.generation,'BASE_REUSE_GENERATOR_CHANGED');
  assert.deepEqual(g.execution.trustedSourceFiles,current.dependencies.trusted,'BASE_REUSE_TRUSTED_DEPENDENCY_CHANGED');
  const oldWrapper=j.implementation.bindings.find((b:Json)=>b.path===wrapper);
  assert(oldWrapper);
  assert.equal(oldWrapper.path,current.dependencies.wrapper.path);assert.equal(oldWrapper.fileSha256,current.dependencies.wrapper.fileSha256,'BASE_REUSE_GENERATION_WRAPPER_CHANGED');
  if(oldWrapper.sizeBytes!==undefined)assert.equal(oldWrapper.sizeBytes,current.dependencies.wrapper.sizeBytes,'BASE_REUSE_GENERATION_WRAPPER_SIZE_CHANGED');
  assert.equal(j.implementation.nodeBinding.path,current.tools.binaries.node.resolvedPath);assert.equal(j.implementation.nodeBinding.fileSha256,current.tools.binaries.node.fileSha256);
  return Object.freeze({status:'validated-reuse-graph',manufacturingAuthorized:false});
}

type Pin={absolute:string;root:string;device:bigint;identity:Awaited<ReturnType<typeof identity>>;binding:Json};
async function identity(p:string){const s=await lstat(p,{bigint:true});assert(s.isFile()&&!s.isSymbolicLink(),'BASE_REUSE_REGULAR_FILE_REQUIRED');return {dev:s.dev,ino:s.ino,size:s.size,mtimeNs:s.mtimeNs,ctimeNs:s.ctimeNs};}
async function parents(absolute:string,root:string,device:bigint) {
  assert(absolute.startsWith(root+'/'),'BASE_REUSE_FILE_ROOT_REQUIRED');
  for(let p=path.dirname(absolute);;p=path.dirname(p)){const s=await lstat(p,{bigint:true});assert(s.isDirectory()&&!s.isSymbolicLink()&&s.dev===device,'BASE_REUSE_PARENT_OR_DEVICE_CHANGED');if(p===root)break;assert(p.startsWith(root+'/'));}
}
async function ancestry(absolute:string,root:string,device:bigint) {await parents(absolute,root,device);assert.equal(await realpath(absolute),absolute,'BASE_REUSE_REALPATH_CHANGED');}
async function checkPin(pin:Pin) {await ancestry(pin.absolute,pin.root,pin.device);assert.deepEqual(await identity(pin.absolute),pin.identity,'BASE_REUSE_FILE_IDENTITY_CHANGED');}
async function fileHash(p:string) {const h=createHash('sha256');for await(const chunk of createReadStream(p))h.update(chunk);return h.digest('hex');}
async function observe(b:Json,root:string,absolute=false):Promise<Pin> {
  validateDigestJobBindingV001(b,absolute);const p=absolute?b.path:path.join(root,b.path),device=(await lstat(root,{bigint:true})).dev;
  await ancestry(p,root,device);const before=await identity(p);assert.equal(before.dev,device);if(b.sizeBytes!==undefined)assert.equal(before.size,BigInt(b.sizeBytes));
  assert.equal(await fileHash(p),b.fileSha256,'BASE_REUSE_ACTUAL_BYTES_CHANGED');const pin={absolute:p,root,device,identity:before,binding:freeze(structuredClone(b))};await checkPin(pin);return pin;
}
async function body(pin:Pin,m:Json) {await checkPin(pin);const bytes=await readFile(pin.absolute);assert.equal(sha(bytes),pin.binding.fileSha256);await checkPin(pin);
  const value=JSON.parse(bytes.toString());if(pin.binding.schemaVersion!==undefined)assert.equal(value.schemaVersion,pin.binding.schemaVersion);if(pin.binding.canonicalSha256!==undefined)assert.equal(m.canonicalSha(value),pin.binding.canonicalSha256);return value;}
type ReuseRecord={qualified:ApprovedDigestQualifiedJobV001;inputs:Json;bundle:Json;bodies:Json;pins:Pin[];copies:Map<string,Pin>;sourceQualified?:boolean};
const proofs=new WeakMap<object,ReuseRecord>();
export async function assertQualifiedDigestApprovedBaseReuseV001(proof:unknown,qualified:ApprovedDigestQualifiedJobV001) {
  assert(proof&&typeof proof==='object'&&proofs.has(proof),'QUALIFIED_BASE_REUSE_REQUIRED');const r=proofs.get(proof)!;
  assert.equal(r.qualified,qualified,'BASE_REUSE_QUALIFIED_JOB_CHANGED');
  // Full bytes were streamed on qualification and will be rehashed during copy/readback.
  // Pin all inputs/origins/dependencies between actions without repeatedly decoding or hashing media.
  for(const pin of r.pins)await checkPin(pin);
}
export async function readQualifiedDigestApprovedBaseReuseV001(qualified:ApprovedDigestQualifiedJobV001,inputs:Json) {
  await assertQualifiedDigestApprovedJobV001(qualified);await assertApprovedDigestInputsV001(inputs,qualified);
  assert(qualified.job.inputs.baseReuseBundleBinding!==undefined&&qualified.job.recoveryBinding===undefined,'BASE_REUSE_EXPLICIT_INPUT_REQUIRED');
  const m=await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const bundle=await qualified.readBinding(qualified.job.inputs.baseReuseBundleBinding);
  exact(bundle,['schemaVersion','origin','copies'],'BASE_REUSE_INPUT_FIELDS');exact(bundle.origin,keys,'BASE_REUSE_ORIGIN_FIELDS');exact(bundle.copies,keys,'BASE_REUSE_COPY_FIELDS');
  const pins:Pin[]=[await observe(qualified.job.inputs.baseReuseBundleBinding,qualified.job.inputs.inputRoot)],copies=new Map<string,Pin>(),bodies:Json={};
  // Never expose an arbitrary historical resolver. Only byte-pinned origins named in this explicit bundle are read.
  for(const k of keys) {
    const b=bundle.copies[k];assert(b.path.startsWith(qualified.job.inputs.inputPrefix+'/'),'BASE_REUSE_COPY_INPUT_PREFIX_REQUIRED');
    const copy=await observe(b,qualified.job.inputs.inputRoot);assert.equal(copy.device,BigInt(qualified.job.storage.guestDevice));pins.push(copy);copies.set(k,copy);
    if(k!=='baseMedia')bodies[k]=await body(copy,m);
  }
  const core=await load('evals/clip_composition/adopted_media_manufacturing_v001.mts'),base=await load(generationPaths[0]),timelineModule=await load(generationPaths[1]);
  const generation=await Promise.all(generationPaths.map(async p=>({path:p,fileSha256:await m.fileSha(path.join(ROOT,p))})));
  const trusted=timelineModule.PRESENTATION_BASE_MEDIA_TRUSTED_SOURCE_FILES;
  const current={inputPrefix:qualified.job.inputs.inputPrefix,outputRoot:qualified.job.outputRoot,storage:qualified.job.storage,
    executionInputs:inputs.rendererTemplate.executionInputs,sourceArtifact:inputs.manufacturing.sourceArtifact,adoption:inputs.adoption,edit:inputs.edit,
    mappings:core.projectAdoptedMediaRangesV001(inputs.edit,inputs.inspection.media).mappings,media:inputs.inspection.media,expected:qualified.job.expected,
    tools:{profile:await base.inspectPresentationBaseMediaToolProfileV001(),binaries:await base.inspectPresentationBaseMediaToolBinaryDiagnosticsV001()},
    dependencies:{generation,trusted,wrapper:{path:wrapper,fileSha256:await m.fileSha(path.join(ROOT,wrapper)),sizeBytes:Number((await lstat(path.join(ROOT,wrapper))).size)}}};
  validateDigestApprovedBaseReuseGraphV001(bundle,bodies,current);
  m.pass(base.validatePresentationBaseMediaGenerationManifestV003(bodies.generationManifest),'BASE_REUSE_MANIFEST_INVALID');
  base.inspectPresentationBaseMediaTimelineQcV002(bodies.timeline,bodies.generationManifest,{fileSha256:bundle.origin.baseMedia.fileSha256,frameCount:qualified.job.expected.frames,timelineFileSha256:bundle.origin.timeline.fileSha256});
  m.pass(base.validatePresentationBaseMediaHashGraphV001({timeline:bodies.timeline,manifest:bodies.generationManifest,report:bodies.validationReceipt,
    baseMediaFileSha256:bundle.origin.baseMedia.fileSha256,timelineFileSha256:bundle.origin.timeline.fileSha256,manifestFileSha256:bundle.origin.generationManifest.fileSha256}),'BASE_REUSE_HASH_GRAPH_INVALID');
  for(const k of keys){const absolute=k==='approvedJob'||k==='authorization';const pin=await observe(bundle.origin[k],absolute?ROOT:qualified.job.storage.guestRoot,absolute);
    assert.equal(pin.identity.size,copies.get(k)!.identity.size,'BASE_REUSE_ORIGIN_COPY_SIZE_CHANGED');pins.push(pin);}
  for(const b of [...generation,...trusted,current.dependencies.wrapper])pins.push(await observe(b,ROOT));
  for(const b of Object.values(current.tools.binaries) as Json[])pins.push(await observe({path:b.resolvedPath,fileSha256:b.fileSha256},path.dirname(b.resolvedPath),true));
  freeze(bundle);freeze(bodies);
  const minimumCopyBytes=baseKeys.reduce((sum,k)=>sum+Number(copies.get(k)!.identity.size),0)+1_048_576;
  assert(Number.isSafeInteger(minimumCopyBytes)&&minimumCopyBytes>0,'BASE_REUSE_COPY_ALLOCATION_OVERFLOW');
  const proof=freeze({schemaVersion:'digest-approved-qualified-base-reuse-v001',bundleBinding:structuredClone(qualified.job.inputs.baseReuseBundleBinding),minimumCopyBytes});
  proofs.set(proof,{qualified,inputs,bundle,bodies,pins,copies});await assertQualifiedDigestApprovedBaseReuseV001(proof,qualified);return proof;
}

/** Resolve the current source through the real private context once, then pin its observed identity. */
export async function qualifyDigestApprovedBaseReuseSourceV001(proof:unknown,context:Json) {
  await assertQualifiedApprovedDigestStorageContextV001(context);const q=context.approvedJob as ApprovedDigestQualifiedJobV001;
  await assertQualifiedDigestApprovedBaseReuseV001(proof,q);const r=proofs.get(proof as object)!;
  assert(r.sourceQualified!==true,'BASE_REUSE_SOURCE_ALREADY_QUALIFIED');await assertApprovedDigestInputsV001(r.inputs,q);
  const source=await context.resolveApprovedDigestSourceV001(r.inputs.manufacturing.sourceArtifact);
  const declaration=r.inputs.sourceDeclaration,root=declaration.placement==='normal-declared-guest-source-v001'?q.job.storage.guestRoot:ROOT;
  assert.equal(source.physicalPath,declaration.physicalPath);assert.equal(source.identity.fileSha256,declaration.fileSha256);
  await ancestry(source.physicalPath,root,BigInt(source.identity.dev));const now=await identity(source.physicalPath);
  assert.deepEqual({dev:String(now.dev),ino:String(now.ino),sizeBytes:Number(now.size),mtimeNs:String(now.mtimeNs),ctimeNs:String(now.ctimeNs),fileSha256:declaration.fileSha256},source.identity,'BASE_REUSE_CURRENT_SOURCE_IDENTITY_CHANGED');
  r.pins.push({absolute:source.physicalPath,root,device:now.dev,identity:now,binding:freeze({path:source.physicalPath,fileSha256:declaration.fileSha256,sizeBytes:declaration.sizeBytes})});
  r.sourceQualified=true;await assertQualifiedDigestApprovedBaseReuseV001(proof,q);return source;
}

/** Only the existing supervisor-minted context can publish a reused bundle. No render or fallback occurs here. */
export async function copyQualifiedDigestApprovedBaseReuseV001(proof:unknown,context:Json,inputs:Json,execution:Json) {
  await assertQualifiedApprovedDigestStorageContextV001(context);const q=context.approvedJob as ApprovedDigestQualifiedJobV001;
  await assertQualifiedDigestApprovedBaseReuseV001(proof,q);const r=proofs.get(proof as object)!;assert.equal(inputs,r.inputs);assert.equal(r.sourceQualified,true,'BASE_REUSE_CURRENT_SOURCE_QUALIFICATION_REQUIRED');await assertApprovedDigestInputsV001(inputs,q);
  const out=q.job.outputRoot;assert.equal(context.outputRoot,out);const m=await load('evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
  const invocation=await context.readBound(execution.invocationBinding);
  assert.deepEqual(invocation,{schemaVersion:'digest-approved-core-invocation-v001',approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,
    planBinding:invocation.planBinding,jobBinding:execution.manufacturingJobBinding,acceptedManifestBinding:q.job.inputs.candidateManifestBinding,
    storagePermitFileSha256:invocation.storagePermitFileSha256,implementationSha:q.job.implementation.sha});
  assert.equal(invocation.planBinding.path,out+'/core-plan.json');
  assert(/^[0-9a-f]{64}$/u.test(invocation.storagePermitFileSha256));
  assert.equal(execution.invocationBinding.path,out+'/core-invocation.json');assert.equal(execution.manufacturingJobBinding.path,out+'/manufacturing-job.json');
  assert.equal(execution.machineAdoptionBinding.path,out+'/machine-adoption.json');assert.equal(execution.editPlanBinding.path,out+'/edit-plan.json');
  assert.deepEqual(await context.readBound(execution.manufacturingJobBinding),execution.manufacturingJob);
  assert.deepEqual(execution.manufacturingJob.sourceArtifact,inputs.manufacturing.sourceArtifact);
  assert.deepEqual(await context.readBound(execution.machineAdoptionBinding),inputs.adoption);assert.deepEqual(await context.readBound(execution.editPlanBinding),inputs.edit);
  await context.resourceCheck({stage:'base-reuse-copy',newBytes:(proof as Json).minimumCopyBytes});
  const directory=path.join(q.job.storage.guestRoot,out,'base-media');assert.equal(context.resolve(out+'/base-media'),directory);
  await parents(directory,q.job.storage.guestRoot,BigInt(q.job.storage.guestDevice));
  await mkdir(directory,{recursive:false});const base:Json={};let originReceiptBinding:Json|undefined;
  for(const k of baseKeys){await context.assertCurrent();await assertQualifiedDigestApprovedBaseReuseV001(proof,q);const source=r.copies.get(k)!;
    const name=k==='validationReceipt'?'origin-validation-receipt.json':k==='baseMedia'?'base-media.mp4':k==='timeline'?'timeline.json':'generation-manifest.json';
    const relative=out+'/base-media/'+name,absolute=path.join(q.job.storage.guestRoot,relative);
    await parents(absolute,q.job.storage.guestRoot,BigInt(q.job.storage.guestDevice));
    await checkPin(source);assert.equal(await fileHash(source.absolute),source.binding.fileSha256,'BASE_REUSE_COPY_SOURCE_BYTES_CHANGED');await checkPin(source);
    await copyFile(source.absolute,absolute,constants.COPYFILE_EXCL);await checkPin(source);await chmod(absolute,0o444);
    const binding={...r.bundle.origin[k],path:relative};const readback=await observe({...binding,sizeBytes:Number(source.identity.size)},q.job.storage.guestRoot);
    r.pins.push(readback);if(k==='validationReceipt')originReceiptBinding=binding;else base[k]=binding;
    if(k!=='baseMedia')assert.deepEqual(await context.readBound(binding),r.bodies[k]);
  }
  const receipt={schemaVersion:'digest-approved-base-reuse-validation-v001',status:'passed',
    approvedJobBinding:q.jobBinding,authorizationBinding:q.authorizationBinding,baseReuseBundleBinding:(proof as Json).bundleBinding,
    coreInvocationBinding:execution.invocationBinding,manufacturingJobBinding:execution.manufacturingJobBinding,machineAdoptionBinding:execution.machineAdoptionBinding,editPlanBinding:execution.editPlanBinding,
    origin:r.bundle.origin,originValidationReceiptBinding:originReceiptBinding,
    checks:{originClosedGraph:'passed',originAndInputBytes:'passed',currentSourceAndAllMappings:'passed',generationDependenciesAndToolBinaries:'passed',copyReadback:'passed'},
    inheritedTechnicalQc:{validationReceiptBinding:r.bundle.origin.validationReceipt,checks:r.bodies.validationReceipt.checks},
    currentExecution:{baseVideoBuild:'not-executed',sourceSnapshot:'not-executed',videoQc:'not-reexecuted',audioQc:'not-reexecuted'},
    humanQuality:'not-evaluated',outputs:{baseMedia:base.baseMedia,timeline:base.timeline,generationManifest:base.generationManifest},recordedAt:new Date().toISOString()};
  await assertQualifiedDigestApprovedBaseReuseV001(proof,q);base.validationReceipt=await context.publish(out+'/base-media/validation-receipt.json',receipt);
  await context.readBound(base.validationReceipt);await assertQualifiedDigestApprovedBaseReuseV001(proof,q);
  return {base,record:{bundleBinding:(proof as Json).bundleBinding,origin:r.bundle.origin,reuseValidationReceiptBinding:base.validationReceipt,
    originalGenerationEvidencePreserved:true,baseBuildExecuted:false,actualTimeSavedMs:null}};
}

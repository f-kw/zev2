import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import childProcess from 'node:child_process';
import type {WorkflowStepRuntime} from '../../../runner/src/workflow-step-builders.js';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const report=path.join(root,'docs/reports/request-intent-connection-20261001');
const runtime=path.join(root,'runtime/artifacts/request-intent-final-cross-type-rejections-20261002-v001-attempt-001');
const evidencePath=path.join(report,'queue-source-kind-and-cross-production-rejection-evidence-v001.json');
const mode=process.argv[2];
assert(['preflight','run','read'].includes(mode),'Explicit cross-type test mode required');
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const rel=(p:string)=>path.relative(root,p).split(path.sep).join('/');
const resolve=(v:unknown)=>path.resolve(v instanceof URL?fileURLToPath(v):String(v));
const draftA='draft_source_type_fixture_015';
const tinyPaths=[path.join(runtime,'artifacts',draftA,'source-registration.json'),path.join(runtime,'artifacts',draftA,'ftyp-header.bin')];
const guard={mediaReadAttempts:0,nonFixtureOpenOrStreamAttempts:0,workflowDiskReadAttempts:0,forbiddenWriteAttempts:0,copyAttempts:0,externalProcessAttempts:0,networkAttempts:0};
let phase='bootstrap';
const readGuard=(v:unknown,openOrStream=false)=>{
  const p=resolve(v);
  if(/\.(mp4|mov|mkv|wav|mp3)$/iu.test(p)){guard.mediaReadAttempts++;throw new Error('CROSS_TYPE_MEDIA_READ_FORBIDDEN');}
  if(phase==='B'||phase==='C'){guard.workflowDiskReadAttempts++;throw new Error('CROSS_TYPE_WORKFLOW_DISK_READ_FORBIDDEN');}
  if(openOrStream&&!tinyPaths.includes(p)){guard.nonFixtureOpenOrStreamAttempts++;throw new Error('CROSS_TYPE_NON_FIXTURE_OPEN_FORBIDDEN');}
};
const writeGuard=(v:unknown)=>{
  const p=resolve(v);
  if(phase==='B'||phase==='C'||!(p===runtime||p.startsWith(runtime+path.sep)||p===evidencePath)){
    guard.forbiddenWriteAttempts++;throw new Error('CROSS_TYPE_WRITE_FORBIDDEN');
  }
};
for(const name of ['readFile','open'] as const){const original=fs.promises[name];(fs.promises as any)[name]=function(p:unknown,...a:unknown[]){readGuard(p,name==='open');return(original as any).call(this,p,...a);};}
for(const name of ['writeFile','mkdir','unlink','rm'] as const){const original=fs.promises[name];(fs.promises as any)[name]=function(p:unknown,...a:unknown[]){writeGuard(p);return(original as any).call(this,p,...a);};}
const originalReadStream=fs.createReadStream;(fs as any).createReadStream=function(p:unknown,...a:unknown[]){readGuard(p,true);return(originalReadStream as any)(p,...a);};
const originalWriteStream=fs.createWriteStream;(fs as any).createWriteStream=function(p:unknown,...a:unknown[]){writeGuard(p);return(originalWriteStream as any)(p,...a);};
const originalRename=fs.promises.rename;fs.promises.rename=async(a,b)=>{writeGuard(a);writeGuard(b);return originalRename(a,b);};
fs.promises.copyFile=async()=>{guard.copyAttempts++;throw new Error('CROSS_TYPE_COPY_FORBIDDEN');};
const rawSpawn=childProcess.spawn;
for(const name of ['spawn','exec','execFile','fork','spawnSync','execSync','execFileSync'] as const)(childProcess as any)[name]=()=>{guard.externalProcessAttempts++;throw new Error('CROSS_TYPE_EXTERNAL_PROCESS_FORBIDDEN');};
globalThis.fetch=async()=>{guard.networkAttempts++;throw new Error('CROSS_TYPE_NETWORK_FORBIDDEN');};
syncBuiltinESMExports();
const readJson=async(p:string)=>JSON.parse(await fs.promises.readFile(p,'utf8'));
const save=async(p:string,v:unknown)=>fs.promises.writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const one=(rows:any[],id:string)=>{const values=rows.filter(v=>v.id===id);assert.equal(values.length,1,id);return values[0];};
process.env.ZEV2_RUNTIME_DIR=runtime;process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
process.env.GEMINI_API_KEY='';process.env.GOOGLE_API_KEY='';

if(mode==='read'){
  const e=await readJson(evidencePath);assert.equal(e.status,'passed');assert.equal(e.results.length,4);
  for(const f of e.runtimeFiles){const b=await fs.promises.readFile(path.join(root,f.path));assert.equal(b.length,f.byteSize);assert.equal(sha(b),f.sha256);}
  for(const f of e.preservation.files){const b=await fs.promises.readFile(path.join(root,f.path));assert.equal(b.length,f.byteSize);assert.equal(sha(b),f.sha256);}
  assert(Object.values(e.guard).every(v=>v===0));assert(Object.values(guard).every(v=>v===0));
  console.log(JSON.stringify({status:'verified',separateProcess:true,results:4,runtimeFiles:e.runtimeFiles.length,oldFilesUnchanged:e.preservation.files.length,guard}));
}else{
  const {validateArtifactFileRefForKind}=await import('../../../backend/src/artifacts/validation.ts');
  const {createStepArtifactBuilders,requireWorkflowRequestOutputFileRef}=await import('../../../runner/src/workflow-step-builders.ts');
  const {registeredDigestDependencyV001}=await import('../../../runner/src/digest-plan-preparation-v001.ts');
  const shared=await import('../../../packages/shared/dist/index.js');
  for(const fn of [validateArtifactFileRefForKind,createStepArtifactBuilders,requireWorkflowRequestOutputFileRef,registeredDigestDependencyV001,shared.assertDigestArtifactV001])assert.equal(typeof fn,'function');
  const prior=await readJson(path.join(report,'queue-current-negative-qualification-evidence-v002.json'));assert.equal(prior.status,'passed');assert.equal(prior.resultCount,19);
  const old=await readJson(path.join(root,prior.preservation.baselinePath));
  const mediaEvidence=await readJson(path.join(report,'queue-local-mp4-no-inspection-evidence-attempt-007.json'));
  const completed=mediaEvidence.completed[0],state007=await readJson(path.join(root,completed.backendRuntime,'state.json'));
  const plan=await readJson(path.join(root,completed.planPath));shared.assertDigestArtifactV001(plan,'digest_plan_json');
  const prep=one(state007.agentRequests,completed.prepareRequestId);
  const requestB=state007.agentRequests.find((r:any)=>r.type==='validate_digest_plan'&&r.dependsOnAgentRequestId===prep.id);assert(requestB);
  assert.equal(requestB.input.productionType,'digest');
  const planRef=registeredDigestDependencyV001(state007,prep,'digest_plan_json');
  const noMediaEvidence=await readJson(path.join(report,'queue-no-media-regression-evidence-attempt-002.json'));
  const stateClip=await readJson(path.join(root,noMediaEvidence.runtime,'state.json'));
  const requestC=stateClip.agentRequests.find((r:any)=>r.type==='propose_clip_themes'&&r.input.productionType==='clip');assert(requestC);
  const sttC=one(stateClip.agentRequests,requestC.dependsOnAgentRequestId);assert.equal(sttC.type,'run_stt');
  assert.equal(one(stateClip.requestDrafts,requestC.requestDraftId).productionType,'clip');
  assert.equal(plan.kind,'digest_plan_json');
  await assert.rejects(fs.promises.lstat(runtime),{code:'ENOENT'});await assert.rejects(fs.promises.lstat(evidencePath),{code:'ENOENT'});
  const extra=['runner/src/workflow-step-builders.ts','runner/src/workflow-artifact-validation.ts','backend/src/artifacts/validation.ts',
    'docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-test.mts',
    'docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-evidence-v002.json',
    'docs/reports/request-intent-connection-20261001/queue-current-negative-readback-parent-audit-v002.json',
    'docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-evidence-v001.json',
    'docs/reports/request-intent-connection-20261001/queue-current-negative-qualification-setup-failure-v001.json',
    'runtime/artifacts/request-intent-current-negative-qualification-20261002-v001-attempt-001/preservation-before.json',
    'runtime/artifacts/request-intent-current-negative-qualification-20261002-v001-attempt-001/normal-api/state.json'];
  const smallPaths=new Set(old.oldBytes.map((f:any)=>f.path));
  for(const f of extra)smallPaths.add(f);
  // Small files named by prior proof are retained; no media path is opened or hashed.
  const currentRuntime=path.join(root,prior.runtime);
  const walk=async(p:string)=>{for(const x of await fs.promises.readdir(p,{withFileTypes:true})){const f=path.join(p,x.name);if(x.isDirectory())await walk(f);else {assert(x.isFile());smallPaths.add(rel(f));}}};
  await walk(currentRuntime);
  const files:any[]=[];for(const n of smallPaths){const b=await fs.promises.readFile(path.join(root,String(n)));files.push({path:n,byteSize:b.length,sha256:sha(b)});}
  const legacySnapshot=async()=>{const rows:any[]=[];for(const f of old.metadata){const s=await fs.promises.lstat(path.join(root,f.path),{bigint:true});rows.push({path:f.path,size:Number(s.size),inode:String(s.ino),device:String(s.dev),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs),allocatedBytes:Number(s.blocks)*512});}return rows;};
  const metadata=await legacySnapshot();
  const preflight={status:'passed',receivedHead:'d0259442763d7e9ea9ac2fb2e80045aa6d065f00',exports:5,newPathAbsent:true,
    artifactValidatorRuntime:rel(runtime),fixtureDraftId:draftA,requestBId:requestB.id,dependencyBId:prep.id,
    requestCId:requestC.id,dependencyCId:sttC.id,clipDraftId:requestC.requestDraftId,validPlanKind:plan.kind,
    priorNineteenResultsPreserved:true,smallFiles:files.length,legacyMetadata:metadata.length,guard};
  assert(Object.values(guard).every(v=>v===0));
  if(mode==='preflight'){console.log(JSON.stringify(preflight));process.exit(0);}
  await fs.promises.mkdir(path.join(runtime,'artifacts',draftA),{recursive:true});
  const preservationPath=path.join(runtime,'preservation-before.json');await save(preservationPath,{files,metadata,oldDeleted8:old.deletedPaths});
  const results:any[]=[];
  const e:any={schemaVersion:'request-intent-final-cross-type-rejection-evidence-v001',status:'running',receivedHead:preflight.receivedHead,
    productFixes:5,setupFixes:15,generalLimitsReset:false,preflight,runtime:rel(runtime),results,guard,
    restrictions:{productChange:0,mediaRead:0,mediaHash:0,mediaCopy:0,mediaPut:0,normalRunner:0,sourceStt:0,inspection:0,ffprobe:0,externalInference:0,expense:0,video:0,ssd:0,deletion:0},
    admission:{id9PD01:'not-approved',id9PD02:'not-approved',presentation:'not-connected',executionPermission:'not-approved',humanQuality:'pending'}};
  const checkpoint=()=>fs.promises.writeFile(evidencePath,JSON.stringify(e,null,2)+'\n');await checkpoint();
  try{
    const source={kind:'source_video',mode:'media-free-cross-type-test',sourceUri:'fixture-no-real-source',purpose:'素材登録JSONを動画bytesとして誤登録しない'};
    const sourceBytes=Buffer.from(JSON.stringify(source)+'\n');await fs.promises.writeFile(tinyPaths[0],sourceBytes,{flag:'wx'});
    const header=Buffer.from([0,0,0,16,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,0,0]);await fs.promises.writeFile(tinyPaths[1],header,{flag:'wx'});
    assert.equal(header.subarray(4,8).toString('ascii'),'ftyp');assert(header.length>=12);
    const emptyState={requestDrafts:[],agentRequests:[],fileRefs:[],outputs:[]},beforeA=JSON.stringify(emptyState);
    phase='A1';const a1=await validateArtifactFileRefForKind(draftA,'source_video',`/api/artifacts/${draftA}/source-registration.json`,'video/mp4');
    assert.deepEqual(a1,{error:'動画成果物はMP4ファイルを指定してください'});assert.equal(JSON.stringify(emptyState),beforeA);
    results.push({id:'A1',category:'current-artifact-validator',status:'passed',input:{kind:'source_video',mimeType:'video/mp4',uri:`/api/artifacts/${draftA}/source-registration.json`,actualBytesKind:'source_video JSON',byteSize:sourceBytes.length,sha256:sha(sourceBytes)},actualResult:a1,stateUnchanged:true,fileRefDelta:0,outputDelta:0});await checkpoint();
    phase='A2';const a2=await validateArtifactFileRefForKind(draftA,'source_video',`/api/artifacts/${draftA}/ftyp-header.bin`,'application/json');
    assert.deepEqual(a2,{error:'成果物参照のJSONを読めません'});assert.equal(JSON.stringify(emptyState),beforeA);
    results.push({id:'A2',category:'current-artifact-validator',status:'passed',input:{kind:'source_video',mimeType:'application/json',uri:`/api/artifacts/${draftA}/ftyp-header.bin`,actualBytesKind:'tiny ftyp header only',byteSize:header.length,sha256:sha(header)},actualResult:a2,stateUnchanged:true,fileRefDelta:0,outputDelta:0,validVideoOrQualityClaim:false});await checkpoint();
    const memoryB=structuredClone(state007),depB=one(memoryB.agentRequests,prep.id),refB=one(memoryB.fileRefs,planRef.id);
    registeredDigestDependencyV001(memoryB,depB,'digest_plan_json');refB.kind='composition_json';
    const memoryC=structuredClone(stateClip),depC=one(memoryC.agentRequests,sttC.id),rC=one(memoryC.agentRequests,requestC.id);
    const refC={id:'file_cross_kind_C_015',kind:'digest_plan_json',uri:planRef.uri,ownerId:'output_cross_kind_C_015',byteSize:Buffer.byteLength(JSON.stringify(plan)+'\n'),sha256:sha(JSON.stringify(plan)+'\n')};
    memoryC.fileRefs.push(refC);depC.status='succeeded';depC.fileRefIds=[refC.id];depC.result={outputId:refC.ownerId,outputType:'transcript',fileRefId:refC.id};
    memoryC.outputs.push({id:refC.ownerId,type:'transcript',fileRefId:refC.id});
    await save(path.join(runtime,'memory-inputs.json'),{B:{state:memoryB,requestId:requestB.id},C:{state:memoryC,requestId:rC.id},digestPlan:plan});
    const counters={dependencyResolver:0,memoryArtifactRead:0,themeBuild:0,manifestWrite:0,jsonWrite:0,otherBuild:0,judge:0};
    const forbidden=async()=>{counters.otherBuild++;throw new Error('CROSS_TYPE_UNEXPECTED_BUILD');};
    const stepRuntime:WorkflowStepRuntime={
      digestPlanPreparation:{workspaceRoot:root,artifactRoot:path.join(runtime,'artifacts'),judge:async()=>{counters.judge++;throw new Error('CROSS_TYPE_JUDGE_FORBIDDEN');}},
      prepareSourceVideo:forbidden,buildTranscript:forbidden,buildThemeOptionsArtifact:async()=>{counters.themeBuild++;throw new Error('CROSS_TYPE_THEME_BUILD_FORBIDDEN');},
      buildClipCompositionArtifact:()=>{counters.otherBuild++;throw new Error('CROSS_TYPE_COMPOSITION_FORBIDDEN');},buildEditPlanArtifact:forbidden,
      buildPatch:()=>{counters.otherBuild++;throw new Error('CROSS_TYPE_PATCH_FORBIDDEN');},renderVideo:forbidden,
      requireRequestOutputFileRef:(state,request,type,message)=>{counters.dependencyResolver++;return requireWorkflowRequestOutputFileRef(state,request,type,message);},
      readArtifactByUrl:async(uri)=>{counters.memoryArtifactRead++;assert.equal(phase,'C');assert.equal(uri,refC.uri);return structuredClone(plan);},
      writeStepManifest:async()=>{counters.manifestWrite++;throw new Error('CROSS_TYPE_MANIFEST_WRITE_FORBIDDEN');},
      writeJsonArtifact:async()=>{counters.jsonWrite++;throw new Error('CROSS_TYPE_JSON_WRITE_FORBIDDEN');}};
    const builders=createStepArtifactBuilders(stepRuntime);assert.equal(typeof builders.validate_digest_plan,'function');assert.equal(typeof builders.propose_clip_themes,'function');
    let bReason='',cReason='';const beforeB=JSON.stringify(memoryB);phase='B';
    await assert.rejects(async()=>{try{await builders.validate_digest_plan({request:one(memoryB.agentRequests,requestB.id),state:memoryB});}catch(err){bReason=err instanceof Error?err.message:String(err);throw err;}},/DIGEST_DEPENDENCY_REFERENCE_INVALID/u);
    assert.equal(JSON.stringify(memoryB),beforeB);assert.deepEqual(counters,{dependencyResolver:1,memoryArtifactRead:0,themeBuild:0,manifestWrite:0,jsonWrite:0,otherBuild:0,judge:0});
    phase='record';results.push({id:'B',category:'current-Digest-workflow-dependency',status:'passed',requestType:'validate_digest_plan',productionType:'digest',dependencyType:'prepare_digest_plan',expectedKind:'digest_plan_json',actualKind:refB.kind,actualThrownError:bReason,stateSha256Before:sha(beforeB),stateSha256After:sha(JSON.stringify(memoryB)),counters:{...counters},artifactReadBeforeRefusal:0,artifactWrite:0});await checkpoint();
    const beforeC=JSON.stringify(memoryC);phase='C';
    await assert.rejects(async()=>{try{await builders.propose_clip_themes({request:rC,state:memoryC});}catch(err){cReason=err instanceof Error?err.message:String(err);throw err;}},/テーマ作成が読む文字起こし成果物の種類が不正です/u);
    assert.equal(JSON.stringify(memoryC),beforeC);assert.deepEqual(counters,{dependencyResolver:2,memoryArtifactRead:1,themeBuild:0,manifestWrite:0,jsonWrite:0,otherBuild:0,judge:0});
    phase='record';results.push({id:'C',category:'current-Clip-workflow-builder',status:'passed',requestType:'propose_clip_themes',productionType:'clip',dependencyType:'run_stt',expectedKind:'transcript_json',fileRefKind:refC.kind,memoryPayloadKind:plan.kind,actualThrownError:cReason,stateSha256Before:sha(beforeC),stateSha256After:sha(JSON.stringify(memoryC)),counters:{...counters},memoryArtifactReads:1,diskArtifactReads:0,themeBuild:0,artifactWrite:0});
    for(const f of files){const b=await fs.promises.readFile(path.join(root,f.path));assert.equal(b.length,f.byteSize);assert.equal(sha(b),f.sha256);}
    assert.deepEqual(await legacySnapshot(),metadata);
    for(const n of old.deletedPaths)await assert.rejects(fs.promises.lstat(path.join(root,n)),{code:'ENOENT'});
    assert(Object.values(guard).every(v=>v===0));
    e.preservation={files,smallSizeAndShaUnchanged:true,legacyMetadataFiles:metadata.length,legacyMetadataUnchanged:true,deleted8RemainAbsent:true,baselinePath:rel(preservationPath)};
    e.runtimeFiles=[];const runtimeWalk=async(p:string)=>{for(const x of await fs.promises.readdir(p,{withFileTypes:true})){const f=path.join(p,x.name);if(x.isDirectory())await runtimeWalk(f);else{const b=await fs.promises.readFile(f);e.runtimeFiles.push({path:rel(f),byteSize:b.length,sha256:sha(b)});}}};await runtimeWalk(runtime);
    e.runtimeBytes=e.runtimeFiles.reduce((n:number,f:any)=>n+f.byteSize,0);e.status='passed';e.resultCount=results.length;e.testFileSha256=sha(await fs.promises.readFile(fileURLToPath(import.meta.url)));await checkpoint();
    const child=rawSpawn(process.execPath,['--import',path.join(root,'runner/node_modules/tsx/dist/loader.mjs'),fileURLToPath(import.meta.url),'read'],{cwd:root,env:{...process.env},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    const exitCode=await new Promise<number|null>(ok=>child.on('exit',ok));e.separateProcess={exitCode,stdout,stderr};assert.equal(exitCode,0,stderr);e.completedAt=new Date().toISOString();await checkpoint();
    console.log(JSON.stringify({status:e.status,results:results.length,separateProcessExitCode:exitCode,oldSmallFiles:files.length,legacyMetadataFiles:metadata.length,runtimeFiles:e.runtimeFiles.length,runtimeBytes:e.runtimeBytes,productFixes:5,setupFixes:15,guard}));
  }catch(err){phase='record';e.status='failed';e.error=err instanceof Error?err.stack:String(err);await checkpoint();throw err;}
}

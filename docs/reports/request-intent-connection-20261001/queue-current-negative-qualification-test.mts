import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const report=path.join(root,'docs/reports/request-intent-connection-20261001');
const loader=path.join(root,'runner/node_modules/tsx/dist/loader.mjs');
const runtime=path.join(root,'runtime/artifacts/request-intent-current-negative-qualification-20261002-v001-attempt-002');
const evidencePath=path.join(report,'queue-current-negative-qualification-evidence-v002.json');
const mode=process.argv[2];
assert(['preflight','run','backend','read'].includes(mode),'Explicit negative qualification mode required');
const legacyRoots=['006','007'].map(n=>path.join(root,'runtime/artifacts/request-intent-connection-20261001-v005-attempt-'+n));
const guard={mediaReadAttempts:0,legacyWriteAttempts:0};
const resolved=(v:any)=>path.resolve(v instanceof URL?fileURLToPath(v):String(v));
const checkRead=(v:any)=>{const p=resolved(v);if(/\.(mp4|mov|mkv|wav|mp3)$/iu.test(p)){guard.mediaReadAttempts++;throw new Error('NEGATIVE_TEST_MEDIA_READ_FORBIDDEN: '+p);}};
const checkWrite=(v:any)=>{const p=resolved(v);if(legacyRoots.some(x=>p===x||p.startsWith(x+path.sep))){guard.legacyWriteAttempts++;throw new Error('NEGATIVE_TEST_LEGACY_WRITE_FORBIDDEN: '+p);}};
for(const name of ['readFile','open']as const){const original=fs.promises[name];(fs.promises as any)[name]=function(p:any,...args:any[]){checkRead(p);return(original as any).call(this,p,...args);};}
for(const name of ['writeFile','mkdir','unlink','rm']as const){const original=fs.promises[name];(fs.promises as any)[name]=function(p:any,...args:any[]){checkWrite(p);return(original as any).call(this,p,...args);};}
const rename=fs.promises.rename;fs.promises.rename=async(a,b)=>{checkWrite(a);checkWrite(b);return rename(a,b);};
const copy=fs.promises.copyFile;fs.promises.copyFile=async(a,b,...args)=>{checkRead(a);checkWrite(b);return copy(a,b,...args);};
const originalStream=fs.createReadStream;(fs as any).createReadStream=function(p:any,...args:any[]){checkRead(p);return(originalStream as any)(p,...args);};
const originalWriteStream=fs.createWriteStream;(fs as any).createWriteStream=function(p:any,...args:any[]){checkWrite(p);return(originalWriteStream as any)(p,...args);};
syncBuiltinESMExports();
const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
const readJson=async(p:string)=>JSON.parse(await fs.promises.readFile(p,'utf8'));
const relative=(p:string)=>path.relative(root,p).split(path.sep).join('/');
const save=async(p:string,v:any)=>fs.promises.writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const one=(values:any[],id:string)=>{const matching=values.filter(v=>v.id===id);assert.equal(matching.length,1,id);return matching[0];};
const env=(p:string)=>({...process.env,ZEV2_RUNTIME_DIR:p,ZEV2_DISABLE_AUTO_RUNNER:'1',ZEV2_HUMAN_API_TOKEN:'isolated-human',ZEV2_AGENT_API_TOKEN:'isolated-agent',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',GOOGLE_CLOUD_PROJECT:''});

if(mode==='backend'){
  assert(process.env.ZEV2_RUNTIME_DIR?.startsWith(runtime+path.sep));
  const {default:express}=await import('../../../backend/node_modules/express/index.js');
  const {default:control}=await import('../../../backend/src/routes/control.ts');
  const app=express();app.use(express.json());app.use('/api',control);
  app.use((e:any,_q:any,r:any,_n:any)=>r.status(409).json({error:e.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail);});
  const a=server.address();assert(a && typeof a!=='string');console.log(JSON.stringify({port:a.port,pid:process.pid}));
  process.on('SIGTERM',()=>server.close(()=>{console.log(JSON.stringify({backendGuard:guard}));process.exit(0);}));
}else if(mode==='read'){
  const e=await readJson(evidencePath);assert.equal(e.status,'passed');
  const b=await fs.promises.readFile(path.join(runtime,'normal-api/state.json'));
  process.env.ZEV2_RUNTIME_DIR=path.join(runtime,'normal-api');process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
  const {loadState,readStateSnapshot}=await import('../../../backend/src/store/json-store.ts');
  assert.deepEqual(await loadState(),await readJson(path.join(runtime,'normal-api-final-state.json')));
  assert.deepEqual(await readStateSnapshot(),await readJson(path.join(runtime,'normal-api-final-state.json')));
  assert.deepEqual(await fs.promises.readFile(path.join(runtime,'normal-api/state.json')),b);
  assert.equal(sha(b),e.normalApiFinalState.sha256);
  const negative=await fs.promises.readFile(path.join(runtime,'negative-fixture/state.json'));assert.equal(sha(negative),e.incompleteTransfer.stateSha256After);
  assert.equal(e.mainGuard.mediaReadAttempts,0);assert(e.backends.every((v:any)=>v.exitCode===0 && v.guard.mediaReadAttempts===0 && v.guard.legacyWriteAttempts===0));
  console.log(JSON.stringify({status:'verified',separateProcess:true,apiStateDeepEqual:true,normalStateBytesUnchanged:true,negativeStateBytesUnchanged:true,mediaReadAttempts:guard.mediaReadAttempts}));
}else{
  const oldEvidence=await readJson(path.join(report,'queue-local-mp4-no-inspection-evidence-attempt-007.json'));
  assert.equal(oldEvidence.status,'passed');assert.equal(oldEvidence.completed.length,1);
  const completed=oldEvidence.completed[0],oldStatePath=path.join(root,completed.backendRuntime,'state.json');
  const oldStateBytes=await fs.promises.readFile(oldStatePath),oldState=JSON.parse(oldStateBytes.toString());
  const request=one(oldState.agentRequests,completed.prepareRequestId),draft=one(oldState.requestDrafts,request.requestDraftId);
  assert.equal(request.type,'prepare_digest_plan');assert.equal(draft.productionType,'digest');assert.equal(request.status,'succeeded');
  const originalPlanBytes=await fs.promises.readFile(path.join(root,completed.planPath)),originalPlan=JSON.parse(originalPlanBytes.toString());
  const originalExecution=await readJson(path.join(root,completed.executionPath));
  const shared=await import('../../../packages/shared/dist/index.js');
  const {registeredDigestDependencyV001}=await import('../../../runner/src/digest-plan-preparation-v001.ts');
  process.env.ZEV2_RUNTIME_DIR=path.join(runtime,'negative-fixture');process.env.ZEV2_DISABLE_AUTO_RUNNER='1';
  const {validateArtifactFileRefForKind}=await import('../../../backend/src/artifacts/validation.ts');
  for(const fn of [shared.assertApprovedAgentRequestInput,shared.assertDigestArtifactV001,registeredDigestDependencyV001,validateArtifactFileRefForKind])assert.equal(typeof fn,'function');
  shared.assertApprovedAgentRequestInput(oldState,request);shared.assertDigestArtifactV001(originalPlan,'digest_plan_json');
  const baseline=await readJson(path.join(legacyRoots[1],'local-mp4-preservation-baseline.json'));
  const protectedPaths=new Set<string>([...baseline.oldSmallFiles.map((v:any)=>path.join(root,v.path)),...baseline.priorProofs.map((v:any)=>path.join(root,v.path)),...baseline.productFiles.map((v:any)=>path.join(root,v.path)),
    path.join(report,'queue-local-mp4-no-inspection-evidence-attempt-007.json'),path.join(report,'queue-local-mp4-readback-cross-purpose-proof-attempt-007.json')]);
  const metadata:any[]=[],oldBytes:any[]=[];
  for(const p of protectedPaths){const b=await fs.promises.readFile(p);oldBytes.push({path:relative(p),byteSize:b.length,sha256:sha(b)});}
  const snapshotLegacy=async()=>{const rows:any[]=[];const walk=async(p:string)=>{for(const entry of await fs.promises.readdir(p,{withFileTypes:true})){const f=path.join(p,entry.name);if(entry.isDirectory())await walk(f);else{assert(entry.isFile());const s=await fs.promises.lstat(f,{bigint:true});rows.push({path:relative(f),size:Number(s.size),inode:Number(s.ino),device:Number(s.dev),mtimeNs:Number(s.mtimeNs),ctimeNs:Number(s.ctimeNs),allocatedBytes:Number(s.blocks)*512,sha256:f.endsWith('.mp4')?null:sha(await fs.promises.readFile(f))});}}};for(const p of legacyRoots)await walk(p);return rows.sort((a,b)=>a.path.localeCompare(b.path));};
  metadata.push(...await snapshotLegacy());
  await assert.rejects(fs.promises.lstat(runtime),{code:'ENOENT'});await assert.rejects(fs.promises.lstat(evidencePath),{code:'ENOENT'});
  const preflight={status:'passed',receivedHead:'0d1b0810eda4b4f9938b3882e3f52d8381c688ad',existingDraftId:draft.id,existingPrepareRequestId:request.id,existingStateSha256:sha(oldStateBytes),existingPlanSha256:sha(originalPlanBytes),functions:4,newPathAbsent:true,legacyFiles:metadata.length,protectedSmallFiles:oldBytes.length,mediaReadAttempts:guard.mediaReadAttempts,legacyWriteAttempts:guard.legacyWriteAttempts};
  assert.equal(guard.mediaReadAttempts,0);assert.equal(guard.legacyWriteAttempts,0);
  if(mode==='preflight'){console.log(JSON.stringify(preflight));process.exit(0);}
  await fs.promises.mkdir(runtime);await save(path.join(runtime,'preservation-before.json'),{oldBytes,metadata,deletedPaths:baseline.oldDeleted8});
  const results:any[]=[],children:any[]=[],backends:any[]=[],e:any={schemaVersion:'request-intent-current-negative-qualification-evidence-v001',status:'running',receivedHead:preflight.receivedHead,productFixes:5,setupFixes:14,preflight,runtime:relative(runtime),results,backends,
    oldEvidenceReplayed:false,mediaCopy:0,mediaPut:0,mediaHash:0,normalRunnerStarted:false,externalInference:false,videoManufacturing:false,sourceSttProcessing:false,inspectionProcessing:false,additionalDeletion:false,ssdOperation:false,productionAdoption:false,classification:{staticOnly:[],notRun:[]}};
  const checkpoint=()=>fs.promises.writeFile(evidencePath,JSON.stringify(e,null,2)+'\n');
  const record=(category:string,name:string,details:any)=>{results.push({category,name,status:'passed',details});};
  const reject=(category:string,name:string,fn:()=>unknown,pattern?:RegExp)=>{let reason='';assert.throws(()=>{try{fn();}catch(err){reason=err instanceof Error?err.message:String(err);throw err;}},pattern);record(category,name,{actualThrownError:reason,memoryOnly:true});};
  const startBackend=async(name:string)=>{
    const directory=path.join(runtime,name);await fs.promises.mkdir(directory,{recursive:true});
    const child=spawn(process.execPath,['--import',loader,fileURLToPath(import.meta.url),'backend'],{cwd:root,env:env(directory),stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
    const exited=new Promise<number|null>(ok=>child.on('exit',ok));const lines=createInterface({input:child.stdout});
    const port=await new Promise<number>((ok,fail)=>{lines.on('line',(line:string)=>{try{const v=JSON.parse(line);if(v.port)ok(v.port);}catch{}});child.on('exit',c=>fail(new Error('backend exit '+c+' '+stderr)));});
    const item={name,child,exited,output:()=>({stdout,stderr})};children.push(item);return {directory,base:`http://127.0.0.1:${port}/api`};
  };
  const api=async(b:any,route:string,method='GET',body?:any,actor='human')=>{assert(method!=='PUT','No artifact PUT in this test');const r=await fetch(b.base+route,{method,headers:{'content-type':'application/json',authorization:`Bearer isolated-${actor}`},...(body===undefined?{}:{body:JSON.stringify(body)})});return {httpStatus:r.status,body:await r.json() as any};};
  const businessCounts=(s:any)=>({fileRefs:s.fileRefs.length,outputs:s.outputs.length,succeeded:s.agentRequests.filter((v:any)=>v.status==='succeeded').length});
  const draftInput=(purpose:string)=>({productionType:'digest',purpose,sourceUri:'isolated-negative-test-no-media',durationLabel:'小否定試験',themeCountLabel:'小否定試験',geminiModelName:'通信なし',preset:'小否定試験'});
  try{
    const b=await startBackend('normal-api');
    const createFirst=async(purpose:string)=>{const made=await api(b,'/request-drafts','POST',draftInput(purpose));assert.equal(made.httpStatus,201);const approved=await api(b,`/request-drafts/${made.body.draft.id}/approve`,'POST',{});assert.equal(approved.httpStatus,200);const requests=approved.body.agentRequests.filter((v:any)=>v.requestDraftId===made.body.draft.id&&v.type==='prepare_video');assert.equal(requests.length,1);return requests[0];};
    const ownerRequest=await createFirst('取得者不一致を拒否する小試験');
    const claimed=await api(b,`/agent-requests/${ownerRequest.id}/claim`,'POST',{ownerId:'owner-A'},'agent');assert.equal(claimed.httpStatus,200);assert.equal(claimed.body.request.status,'running');
    const apiStatePath=path.join(b.directory,'state.json'),beforeOwner=await fs.promises.readFile(apiStatePath);
    const wrong=await api(b,`/agent-requests/${ownerRequest.id}/complete`,'POST',{ownerId:'owner-B'},'agent');assert.equal(wrong.httpStatus,409);assert.deepEqual(await fs.promises.readFile(apiStatePath),beforeOwner);assert.deepEqual(businessCounts(wrong.body.state),{fileRefs:0,outputs:0,succeeded:0});
    record('normal-api-store','wrong claim owner complete rejected',{requestId:ownerRequest.id,httpStatus:wrong.httpStatus,error:wrong.body.error,stateSha256Before:sha(beforeOwner),stateSha256After:sha(await fs.promises.readFile(apiStatePath)),stateBytesUnchanged:true,fileRefSupplied:false,counts:businessCounts(wrong.body.state)});await checkpoint();
    const expiredRequest=await createFirst('期限切れ取得の回復と完了拒否');
    const expired=await api(b,`/agent-requests/${expiredRequest.id}/claim`,'POST',{ownerId:'old-owner',expiresAt:'2000-01-01T00:00:00.000Z'},'agent');assert.equal(expired.httpStatus,200);assert.equal(expired.body.request.status,'running');
    const beforeRecovery=await fs.promises.readFile(apiStatePath),beforeRecoveryState=JSON.parse(beforeRecovery.toString());
    const recoveredResponse=await api(b,'/state');assert.equal(recoveredResponse.httpStatus,200);const recovered=one(recoveredResponse.body.agentRequests,expiredRequest.id);assert(['queued','waiting'].includes(recovered.status));assert(recovered.claimExpiredAt);
    for(const k of ['claimOwnerId','claimedAt','claimUpdatedAt','claimExpiresAt'])assert(!Object.hasOwn(recovered,k));
    const logs=recoveredResponse.body.agentOperationLogs.filter((v:any)=>v.agentRequestId===expiredRequest.id && v.eventType==='agent_request_claim_recovered');assert.equal(logs.length,1);
    assert.deepEqual(businessCounts(recoveredResponse.body),businessCounts(beforeRecoveryState));
    const recoveryBytes=await fs.promises.readFile(apiStatePath);assert.notEqual(sha(recoveryBytes),sha(beforeRecovery));
    const expiredDone=await api(b,`/agent-requests/${expiredRequest.id}/complete`,'POST',{ownerId:'old-owner'},'agent');assert.equal(expiredDone.httpStatus,409);assert.deepEqual(await fs.promises.readFile(apiStatePath),recoveryBytes);assert.deepEqual(businessCounts(expiredDone.body.state),{fileRefs:0,outputs:0,succeeded:0});
    record('normal-api-store','expired claim recovered then old owner complete rejected',{requestId:expiredRequest.id,httpStatus:expiredDone.httpStatus,statusBefore:expired.body.request.status,statusAfter:recovered.status,claimExpiredAt:recovered.claimExpiredAt,claimFieldsCleared:true,recoveryLog:logs[0],stateSha256BeforeRecovery:sha(beforeRecovery),stateSha256AfterRecovery:sha(recoveryBytes),recoveryChangedState:true,rejectedCompleteStateUnchanged:true,counts:businessCounts(expiredDone.body.state)});
    const finalApi=await api(b,'/state');assert.equal(finalApi.httpStatus,200);await save(path.join(runtime,'normal-api-final-state.json'),finalApi.body);e.normalApiFinalState={byteSize:recoveryBytes.length,sha256:sha(recoveryBytes),apiResponse:finalApi.body};await checkpoint();
    const mutationCases:[string,(s:any,r:any,d:any)=>void][]=[
      ['approved draft purpose changed',(_s,_r,d)=>d.purpose+='改変'],['approved draft source changed',(_s,_r,d)=>d.source.uri+='-other'],['request target source changed',(_s,r)=>r.target.sourceUri+='-other'],
      ['approved draft settings changed',(_s,_r,d)=>d.settings.preset+='改変'],['request constraints changed',(_s,r)=>r.constraints.preset+='改変'],
      ['legacy state missing productionType',(s)=>{for(const d of s.requestDrafts)delete d.productionType;for(const r of s.agentRequests)delete r.input.productionType;}],
      ['unknown productionType',(_s,_r,d)=>d.productionType='unknown'],['legacy state noncurrent saved steps',(_s,_r,d)=>d.steps=d.steps.slice(0,3)]];
    for(const [name,change]of mutationCases){const s=structuredClone(oldState),r=one(s.agentRequests,request.id),d=one(s.requestDrafts,r.requestDraftId);change(s,r,d);reject('current-function-memory',name,()=>shared.assertApprovedAgentRequestInput(s,r));}
    const sourceRequest=one(oldState.agentRequests,one(oldState.agentRequests,request.dependsOnAgentRequestId).dependsOnAgentRequestId);
    for(const fault of ['owner','output-reference']){const s=structuredClone(oldState),dep=one(s.agentRequests,sourceRequest.id),f=one(s.fileRefs,dep.result.fileRefId),o=one(s.outputs,dep.result.outputId);if(fault==='owner')f.ownerId='unrelated-output';else o.fileRefId='unrelated-reference';reject('current-function-memory','registered dependency '+fault+' mismatch',()=>registeredDigestDependencyV001(s,dep,'source_video'),/DIGEST_DEPENDENCY_REFERENCE_INVALID/);}
    for(const [kind,value]of [['digest_plan_json',originalPlan],['digest_execution_input_json',originalExecution]]as const)for(const version of ['v000','unknown']){const v=structuredClone(value);v.schemaVersion=(kind==='digest_plan_json'?'digest-plan-artifact-':'digest-execution-input-artifact-')+version;reject('current-artifact-validator-tiny',kind+' '+version+' rejected',()=>shared.assertDigestArtifactV001(v,kind),/VERSION_OR_FIELDS_INVALID/);}
    const artifacts=path.join(runtime,'negative-fixture/artifacts'),tinyDraft='draft_negative_tiny',producer='agent_negative_tiny';await fs.promises.mkdir(path.join(artifacts,tinyDraft),{recursive:true});
    const {bind,formal}=await import('../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts');
    const logical=(n:string)=>`artifacts/${tinyDraft}/${producer}/${n}`,physical=(n:string)=>path.join(artifacts,tinyDraft,producer+'--'+n);
    const tinyByte=async(n:string)=>{const bytes=Buffer.from('tiny negative fixture\n');await fs.promises.writeFile(physical(n),bytes,{flag:'wx'});return {path:logical(n),fileSha256:sha(bytes)};};
    const tinyJson=async(n:string,value:any)=>{await fs.promises.writeFile(physical(n),formal(value),{flag:'wx'});return bind(logical(n),value);};
    const approvedBinding=await tinyJson('approved.json',{schemaVersion:'normal-request-digest-preparation-binding-v002'}),sourceBinding=await tinyByte('source.bin'),transcriptBinding=await tinyByte('transcript.bin'),utteranceBinding=await tinyJson('utterances.json',{schemaVersion:'negative-utterances-v001'}),prepBinding=await tinyJson('preparation.json',{schemaVersion:'normal-request-digest-preparation-binding-v001',status:'complete',identity:{requestDraftId:tinyDraft,requestId:producer}});
    const tinyPlan={schemaVersion:'digest-plan-artifact-v001',kind:'digest_plan_json',requestDraftId:tinyDraft,requestId:producer,approvedRequestBinding:approvedBinding,sourceVideoBinding:sourceBinding,transcriptBinding,utteranceBinding,preparationBinding:prepBinding,dataBindings:[approvedBinding,sourceBinding,transcriptBinding,utteranceBinding,prepBinding].map(({path,fileSha256})=>({path,fileSha256})),quality:'human-review-pending'};
    shared.assertDigestArtifactV001(tinyPlan,'digest_plan_json');await save(physical('plan.json'),tinyPlan);
    const oldPrep=await validateArtifactFileRefForKind(tinyDraft,'digest_plan_json',`/api/artifacts/${tinyDraft}/${producer}--plan.json`,'application/json');assert('error'in oldPrep);assert.match(oldPrep.error,/準備の版・完了対応/);
    record('current-artifact-validator-tiny','old preparation binding version rejected after current plan structure and bytes',{actualValidatorError:oldPrep.error,planStructurePassed:true,allFiveTinyBindingsPresent:true,oldVersion:prepBinding.schemaVersion,mediaBytesUsed:false});await checkpoint();
    const negativeState=structuredClone(oldState),negativeRequest=one(negativeState.agentRequests,request.id),validate=one(negativeState.agentRequests,completed.validateRequestId);
    const removeIds=[negativeRequest.result.fileRefId,validate.result.fileRefId],removeOutputs=[negativeRequest.result.outputId,validate.result.outputId];negativeState.fileRefs=negativeState.fileRefs.filter((v:any)=>!removeIds.includes(v.id));negativeState.outputs=negativeState.outputs.filter((v:any)=>!removeOutputs.includes(v.id));
    for(const r of [negativeRequest,validate]){delete r.result;r.fileRefIds=[];delete r.claimExpiredAt;delete r.claimExpiresAt;}negativeRequest.status='running';negativeRequest.claimOwnerId='negative-complete-owner';negativeRequest.claimedAt=new Date().toISOString();negativeRequest.claimUpdatedAt=negativeRequest.claimedAt;validate.status='waiting';
    const incompletePath=path.join(artifacts,draft.id,request.id+'--digest-plan.json');await fs.promises.mkdir(path.dirname(incompletePath),{recursive:true});await fs.promises.writeFile(incompletePath,originalPlanBytes,{flag:'wx'});
    const missing=originalPlan.dataBindings[0],missingPath=path.join(artifacts,draft.id,shared.digestArtifactFileNameV001(missing.path,draft.id));await assert.rejects(fs.promises.lstat(missingPath),{code:'ENOENT'});
    const incomplete=await validateArtifactFileRefForKind(draft.id,'digest_plan_json',`/api/artifacts/${draft.id}/${request.id}--digest-plan.json`,'application/json');assert('error'in incomplete);assert.match(incomplete.error,/ENOENT/);
    record('current-artifact-validator-tiny','missing transferred binding rejected',{actualValidatorError:incomplete.error,missingBinding:missing,missingPhysicalPath:relative(missingPath),originalPlanBytesUnchanged:true});
    const negativeStatePath=path.join(runtime,'negative-fixture/state.json');await save(negativeStatePath,negativeState);
    const negativeBackend=await startBackend('negative-fixture'),beforeNegative=await fs.promises.readFile(negativeStatePath),beforeNegativeState=JSON.parse(beforeNegative.toString());
    const negativeComplete=await api(negativeBackend,`/agent-requests/${request.id}/complete`,'POST',{ownerId:'negative-complete-owner',meaning:'不完全転送の否定専用fixture',fileRef:{uri:`/api/artifacts/${draft.id}/${request.id}--digest-plan.json`,mimeType:'application/json',access:'internal'}},'agent');
    assert.equal(negativeComplete.httpStatus,400);const afterNegative=await fs.promises.readFile(negativeStatePath);assert.deepEqual(afterNegative,beforeNegative);const afterNegativeState=JSON.parse(afterNegative.toString());assert.equal(one(afterNegativeState.agentRequests,request.id).status,'running');assert(!one(afterNegativeState.agentRequests,request.id).result);assert.deepEqual(businessCounts(afterNegativeState),businessCounts(beforeNegativeState));
    e.incompleteTransfer={httpStatus:negativeComplete.httpStatus,error:negativeComplete.body.error,stateSha256Before:sha(beforeNegative),stateSha256After:sha(afterNegative),stateByteSize:afterNegative.length,stateBytesUnchanged:true,countsBefore:businessCounts(beforeNegativeState),countsAfter:businessCounts(afterNegativeState),newFileRef:0,newOutput:0,newResult:0,negativeOnlyFixture:true,copiedHistoricalSuccessNotANewE2e:true,originalPlanByteSize:originalPlanBytes.length,originalPlanSha256:sha(originalPlanBytes),largeBindingAbsent:true};record('negative-only-isolated-complete','incomplete transfer normal complete rejected with no state/result/output increase',e.incompleteTransfer);await checkpoint();
    for(const old of oldBytes){const b=await fs.promises.readFile(path.join(root,old.path));assert.equal(b.length,old.byteSize);assert.equal(sha(b),old.sha256,old.path);}assert.deepEqual(await snapshotLegacy(),metadata);assert.deepEqual(await fs.promises.readFile(oldStatePath),oldStateBytes);
    for(const p of baseline.oldDeleted8)await assert.rejects(fs.promises.lstat(path.join(root,p)),{code:'ENOENT'});
    e.preservation={protectedSmallFiles:oldBytes.length,smallSizeAndShaUnchanged:true,legacyRuntimeFiles:metadata.length,legacySmallShaAndAllMetadataUnchanged:true,originalStateSha256:sha(oldStateBytes),oldDeleted8RemainAbsent:true,baselinePath:relative(path.join(runtime,'preservation-before.json')),mediaRehash:false};
    assert.equal(guard.mediaReadAttempts,0);assert.equal(guard.legacyWriteAttempts,0);e.mainGuard={...guard};
  }catch(err){e.status='failed';e.error=err instanceof Error?err.stack:String(err);await checkpoint();throw err;}
  finally{for(const c of children){if(c.child.exitCode===null)c.child.kill('SIGTERM');const exitCode=await c.exited,output=c.output();const entries=output.stdout.trim().split('\n').map((s:string)=>{try{return JSON.parse(s);}catch{return null;}});backends.push({name:c.name,exitCode,guard:entries.find((v:any)=>v?.backendGuard)?.backendGuard??null,stderr:output.stderr});}await checkpoint();}
  assert(backends.every(v=>v.exitCode===0 && v.guard?.mediaReadAttempts===0 && v.guard?.legacyWriteAttempts===0));
  e.resultCount=results.length;e.status='passed';await checkpoint();
  const child=spawn(process.execPath,['--import',loader,fileURLToPath(import.meta.url),'read'],{cwd:root,env:env(path.join(runtime,'normal-api')),stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);const code=await new Promise<number|null>(ok=>child.on('exit',ok));e.separateProcess={command:'node --import ./runner/node_modules/tsx/dist/loader.mjs '+relative(fileURLToPath(import.meta.url))+' read',exitCode:code,stdout:out,stderr:err};await checkpoint();assert.equal(code,0,err);
  e.testFileSha256=sha(await fs.promises.readFile(fileURLToPath(import.meta.url)));e.completedAt=new Date().toISOString();await checkpoint();console.log(JSON.stringify({status:e.status,results:results.length,backendExitCodes:backends.map(v=>v.exitCode),separateProcessExitCode:code,mediaReadAttempts:guard.mediaReadAttempts,mediaPut:0,productFixes:5,setupFixes:14}));
}

import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,lstat,realpath,readdir,statfs} from 'node:fs/promises';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {syncBuiltinESMExports} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digestArtifactFileNameV001,digestArtifactPathFromUriV001,assertDigestArtifactV001,assertDigestPlanReferenceClosureV001} from '../../../packages/shared/dist/index.js';
import {formal,sha,bind} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
import {uploadCapacitySnapshot,assertNewUploadPaths,sourceSizeFiles} from './queue-capacity-preflight.mts';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const report=path.join(root,'docs/reports/request-intent-connection-20261001');
const loader=path.join(root,'runner/node_modules/tsx/dist/loader.mjs');
const mode=process.argv[2]??'';
const source=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4');
const savedTranscript=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/transcript.json');
const savedInspection=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/base-attempt-002/source-media-inspection.json');
async function fileSha(p:string) {const h=createHash('sha256');for await(const b of fs.createReadStream(p))h.update(b);return h.digest('hex');}
const relative=(p:string)=>path.relative(root,p).split(path.sep).join('/');
const isolatedEnv=(runtime:string)=>({...process.env,ZEV2_RUNTIME_DIR:runtime,ZEV2_DISABLE_AUTO_RUNNER:'1',
  ZEV2_HUMAN_API_TOKEN:'isolated-human',ZEV2_AGENT_API_TOKEN:'isolated-agent',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',GOOGLE_CLOUD_PROJECT:''});
if(mode==='backend') {
  const {default:express}=await import('../../../backend/node_modules/express/index.js');
  const {default:control}=await import('../../../backend/src/routes/control.ts');
  const {createArtifactUploadRouter}=await import('../../../backend/src/routes/artifact-upload.ts');
  const app=express();app.use('/api',createArtifactUploadRouter(process.env.ZEV2_RUNTIME_DIR!));app.use(express.json());app.use('/api',control);
  app.use((e:any,_q:any,r:any,_n:any)=>r.status(409).json({error:e.message}));
  const server=app.listen(0,'127.0.0.1');await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail);});
  const address=server.address();assert(address && typeof address!=='string');console.log(JSON.stringify({port:address.port}));
  process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
} else if(mode==='guard-runner') {
  // 追加の試験制約だけ。通常indexと入力処理は変更しない。旧元素材・転送元workerへのデータアクセスを拒否する。
  const forbidden=JSON.parse(process.env.CODEX2_TEST_FORBIDDEN_READS!) as string[];
  const check=(v:any)=>{const p=v instanceof URL?fileURLToPath(v):String(v);if(forbidden.some(x=>p===x||p.startsWith(x+'/')))throw new Error('TEST_FORBIDDEN_SOURCE_READ: '+p);};
  for(const name of ['readFile','open','lstat','realpath','stat','access'] as const) {
    const original=(fs.promises as any)[name];(fs.promises as any)[name]=function(p:any,...args:any[]){check(p);return original.call(this,p,...args);};
  }
  const originalStream=fs.createReadStream;(fs as any).createReadStream=function(p:any,...args:any[]){check(p);return (originalStream as any)(p,...args);};
  syncBuiltinESMExports();await import('../../../runner/src/index.ts');
 } else if(mode==='clock') {
  const attempt=process.argv[3]??'attempt-005',draft='draft_clock_'+attempt.replaceAll('-','_'),producer='agent_clock_check';
  const runtime=path.join(root,'runtime/artifacts/request-intent-clock-'+attempt);await mkdir(runtime);
  const directory=path.join(runtime,'artifacts',draft);await mkdir(directory,{recursive:true});
  process.env.ZEV2_RUNTIME_DIR=runtime;
  const {validateArtifactFileRefForKind}=await import('../../../backend/src/artifacts/validation.ts');
  const logical=(name:string)=>`artifacts/${draft}/${producer}/${name}`;
  const saveBytes=async(name:string,bytes:Uint8Array|string)=>{await writeFile(path.join(directory,digestArtifactFileNameV001(logical(name),draft)),bytes,{flag:'wx'});return {path:logical(name),fileSha256:sha(bytes)};};
  const saveJson=async(name:string,value:any)=>{await saveBytes(name,formal(value));return bind(logical(name),value);};
  const oldClock=path.join(root,'runtime/artifacts/request-intent-connection-20261001-v005-attempt-004/local-json/artifacts/draft_q4VWVmXYmvcgGJ4PZKPjl/agent_SdsEDp1FNwVd9h2BO62Ke--clock-resolution.json');
  const clockBytes=await readFile(oldClock);assert(!Object.hasOwn(JSON.parse(clockBytes.toString()),'schemaVersion'));
  const clockResolutionBinding=await saveBytes('clock-resolution.json',clockBytes);
  assert.deepEqual(await readFile(path.join(directory,digestArtifactFileNameV001(clockResolutionBinding.path,draft))),clockBytes);
  const plan=await saveBytes('plan.json',formal({schemaVersion:'clock-test-plan-v001'}));
  const inspection=await saveBytes('inspection.json',formal({schemaVersion:'clock-test-inspection-v001'}));
  const consumptionBinding=await saveJson('consumption-binding.json',{schemaVersion:'normal-request-digest-consumption-binding-v002'});
  const editPlanBinding=await saveJson('edit-plan.json',{schemaVersion:'new-material-digest-edit-plan-v001'});
  const manufacturingInputBinding=await saveJson('manufacturing-values.json',{schemaVersion:'presentation-base-media-build-job-v001'});
  const artifact={schemaVersion:'digest-execution-input-artifact-v001',kind:'digest_execution_input_json',requestDraftId:draft,requestId:producer,
    planFileRefBinding:{...plan,requestId:producer,outputId:'output_clock_test',fileRefId:'file_clock_test',byteSize:formal({schemaVersion:'clock-test-plan-v001'}).length},
    sourceInspectionBinding:inspection,sourceInspectionMissingReason:null,consumptionBinding,editPlanBinding,manufacturingInputBinding,clockResolutionBinding,
    dataBindings:[plan,inspection,consumptionBinding,editPlanBinding,manufacturingInputBinding,clockResolutionBinding].map(({path,fileSha256})=>({path,fileSha256})),
    admission:{planIntegrity:'passed',presentation:'not-connected',executionPermission:'not-approved',humanQuality:'pending'}};
  const results:any[]=[];
  const check=async(name:string,value:any,valid:boolean)=>{
    const filename=`${producer}--${name}.json`;await writeFile(path.join(directory,filename),formal(value),{flag:'wx'});
    const result=await validateArtifactFileRefForKind(draft,'digest_execution_input_json',`/api/artifacts/${draft}/${filename}`,'application/json');
    assert.equal(!('error' in result),valid,JSON.stringify(result));results.push({name,expected:valid?'accepted':'rejected',...result});
  };
  await check('clock-byte-save-read',artifact,true);
  const mutated=(change:(v:any)=>void)=>{const v=structuredClone(artifact);change(v);return v;};
  await check('clock-missing-field',mutated(v=>delete v.clockResolutionBinding),false);
  await check('clock-other-reference',mutated(v=>v.clockResolutionBinding.path=logical('other-clock.json')),false);
  await check('clock-fictional-version',mutated(v=>Object.assign(v.clockResolutionBinding,{schemaVersion:'invented-clock-v001',canonicalSha256:v.clockResolutionBinding.fileSha256})),false);
  for(const [name,bytes]of [['missing-bytes',null],['modified-bytes',Buffer.concat([clockBytes,Buffer.from(' ')])]] as const) {
    if(bytes)await saveBytes(name+'.json',bytes);
    await check('clock-'+name,mutated(v=>{v.clockResolutionBinding.path=logical(name+'.json');v.dataBindings.find((b:any)=>b.path===clockResolutionBinding.path).path=logical(name+'.json');}),false);
  }
  for(const field of ['consumptionBinding','editPlanBinding','manufacturingInputBinding'])
    await check(field+'-version-required',mutated(v=>delete v[field].schemaVersion),false);
  const missing=mutated(v=>{v.sourceInspectionBinding=null;v.sourceInspectionMissingReason='未提供';
    for(const field of ['consumptionBinding','editPlanBinding','manufacturingInputBinding','clockResolutionBinding'])v[field]=null;});
  await check('inspection-missing-null',missing,true);
  await check('inspection-missing-reason-required',{...missing,sourceInspectionMissingReason:null},false);
  for(const field of ['consumptionBinding','editPlanBinding','manufacturingInputBinding','clockResolutionBinding'])
    await check('inspection-missing-'+field,{...missing,[field]:artifact[field]},false);
  assert.equal(await fileSha(oldClock),clockResolutionBinding.fileSha256);
  await writeFile(path.join(report,`queue-clock-reference-evidence-${attempt}.json`),JSON.stringify({status:'passed',scope:'reference shape and actual bytes only; normal consumer tested separately',
    runtime:relative(runtime),clockResolutionBinding,clockBodyUnchanged:true,results},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'passed',clockReferenceChecks:results.length}));
 } else if(mode==='references') {
  const {buildUnseenDiscoveryRequestV001,projectUnseenSelectionPlanV001,STRUCTURE024}=await import('../../../evals/clip_composition/unseen_material_thin_plan_v001.mts');
  const {buildSelectionRequestV001}=await import('../../../evals/clip_composition/candidate_selection_validation_v001.mts');
  const {buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001}=await import('../../../runner/src/distant-connection-common-utterance-artifact-v001.ts');
  const attempt=process.argv[3]??'attempt-003',draft='draft_reference_'+attempt.replaceAll('-','_'),producer='agent_reference_plan',stt='agent_reference_stt',video='agent_reference_source';
  const artifactRoot=path.join(root,'runtime/artifacts/request-intent-reference-'+attempt);await mkdir(artifactRoot);await mkdir(path.join(artifactRoot,draft));
  const logical=(name:string)=>`artifacts/${draft}/${producer}/${name}`;
  const dataPath=(name:string)=>path.join(artifactRoot,draft,digestArtifactFileNameV001(name,draft,[producer,stt,video]));
  const values=new Map<string,any>(),bindings=new Map<string,any>();
  const save=async(name:string,value:any)=>{const b=bind(name,value);await writeFile(dataPath(name),formal(value),{flag:'wx'});values.set(name,value);bindings.set(name,b);return b;};
  const transcriptBytes=await readFile(savedTranscript),transcript=JSON.parse(transcriptBytes.toString());
  const transcriptBinding={path:`artifacts/${draft}/${stt}/transcript.json`,fileSha256:sha(transcriptBytes)};
  await writeFile(dataPath(transcriptBinding.path),transcriptBytes,{flag:'wx'});
  values.set(transcriptBinding.path,transcript);
  bindings.set(transcriptBinding.path,transcriptBinding);
  const sourceBinding=await save(`artifacts/${draft}/${video}/source-metadata.json`,{schemaVersion:'reference-test-source-metadata-v001',sourceUri:source});
  const utterances=buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({sourceTranscriptPath:transcriptBinding.path,sourceTranscriptBytes:transcriptBytes});
  const utteranceBinding=await save(logical('utterances.json'),utterances);
  const thinPlan={schemaVersion:'production-intent-plan-v0',productionIntent:'局所参照試験。生成した要求の参照対応だけを確認する。'};
  const plan:any={schemaVersion:'new-material-digest-execution-plan-v001',planId:producer,outputRoot:`artifacts/${draft}/${producer}`,
    structureConditions:[...STRUCTURE024],request:{purpose:thinPlan.productionIntent,sourceId:'source_reference_test',sourceVideo:sourceBinding,transcript:transcriptBinding,utterances:utteranceBinding}};
  const planBinding=await save(logical('discovery-plan.json'),plan),c:any={plan,planBinding,thinPlan,transcript,utterances};
  const discovery=buildUnseenDiscoveryRequestV001(c);await save(logical('candidate-request.json'),discovery);
  const candidateSet={schemaVersion:'candidate-selection-candidate-set-v001',sourceId:plan.request.sourceId,sourceVideoBinding:sourceBinding,
    transcriptBinding,utteranceBinding,origins:{},candidates:[10,20].map(i=>({candidateId:'reference-candidate-'+i,sourceId:plan.request.sourceId,title:'参照試験'+i,
      contextStartUtteranceId:utterances.utterances[i].utteranceId,contextEndUtteranceId:utterances.utterances[i].utteranceId,evidenceUtteranceIds:[utterances.utterances[i].utteranceId]}))};
  await save(logical('candidate-set.json'),candidateSet);
  const selectionPlan=projectUnseenSelectionPlanV001(c,candidateSet),selectionPlanBinding=await save(logical('selection-plan.json'),selectionPlan);
  const selection=buildSelectionRequestV001({...c,plan:selectionPlan,planBinding:selectionPlanBinding,candidateSet});await save(logical('selection-request.json'),selection);
  const adoptionBinding=await save(logical('selection-adoption.json'),{schemaVersion:'reference-test-adoption-v001'});
  const retention={schemaVersion:'candidate-internal-retention-request-v001',planBinding:selectionPlanBinding,selectionAdoptionBinding:adoptionBinding,
    input:{schemaVersion:'reference-test-only',taskDescription:thinPlan.productionIntent}};await save(logical('retention-request.json'),retention);
  const names=['binding-input.json','production-intent.json','discovery-plan.json','selection-plan.json','candidate-request.json','candidate-response.json',
    'candidate-result.json','candidate-set.json','discovery-validation.json','selection-request.json','selection-response.json','selection-result.json',
    'selection-validation.json','selection-adoption.json','retention-request.json','retention-response.json','retention-result.json','retention-validation.json'];
  for(const name of names)if(!values.has(logical(name)))await save(logical(name),name==='binding-input.json'?{schemaVersion:'reference-test-only',identity:{implementations:[]}}:thinPlan);
  const prep={schemaVersion:'normal-request-digest-preparation-binding-v002',status:'complete',identity:{requestDraftId:draft,requestId:producer,implementations:[]},
    artifacts:Object.fromEntries(names.map(n=>[n,bindings.get(logical(n))]))};
  const preparationBinding=await save(logical('preparation-binding.json'),prep);
  const artifact:any={schemaVersion:'digest-plan-artifact-v001',kind:'digest_plan_json',requestDraftId:draft,requestId:producer,
    approvedRequestBinding:bindings.get(logical('binding-input.json')),sourceVideoBinding:{path:sourceBinding.path,fileSha256:sourceBinding.fileSha256},
    transcriptBinding:{path:transcriptBinding.path,fileSha256:transcriptBinding.fileSha256},utteranceBinding,preparationBinding,
    dataBindings:[...bindings.values()].map(({path,fileSha256}:any)=>({path,fileSha256})),quality:'human-review-pending'};
  assertDigestArtifactV001(artifact,'digest_plan_json');assertDigestPlanReferenceClosureV001(artifact,prep,values,[producer,stt,video]);
  const correspondences:any[]=[];
  for(const [stage,q]of [['discovery',discovery],['selection',selection],['retention',retention]] as const)
    for(const [field,b]of Object.entries(q).filter(([,v]:any)=>v?.path) as [string,any][]) {
      assert.equal(await fileSha(dataPath(b.path)),b.fileSha256);correspondences.push({stage,field,...b,fileName:digestArtifactFileNameV001(b.path,draft)});
    }
  const rejected:string[]=[],reject=(name:string,fn:()=>unknown)=>{assert.throws(fn);rejected.push(name);};
  for(const [name,logicalPath]of [['other-draft',`artifacts/other/${producer}/x.json`],['outside-dependency',`artifacts/${draft}/agent_unrelated/x.json`],
    ['traversal',`artifacts/${draft}/${producer}/../x.json`],['legacy-flat',`artifacts/${draft}/${producer}--x.json`]])
    reject(name,()=>digestArtifactFileNameV001(logicalPath,draft,[producer,stt,video]));
  reject('wrong-producer-URI',()=>digestArtifactPathFromUriV001(`/api/artifacts/${draft}/other--x.json`,draft,producer));
  for(const [name,change]of [['missing-registry',(q:any)=>q.candidateSetBinding.path=logical('missing.json')],['SHA-mismatch',(q:any)=>q.candidateSetBinding.fileSha256='0'.repeat(64)] ]as [string,(q:any)=>void][]) {
    const changed=new Map(values);const q=structuredClone(selection);change(q);changed.set(logical('selection-request.json'),q);
    reject(name,()=>assertDigestPlanReferenceClosureV001(artifact,prep,changed,[producer,stt,video]));
  }
  const collision=structuredClone(artifact);collision.dataBindings.push({path:`artifacts/${draft}/agent_a--b/c.json`,fileSha256:'0'.repeat(64)},
    {path:`artifacts/${draft}/agent_a/b--c.json`,fileSha256:'0'.repeat(64)});reject('physical-name-collision',()=>assertDigestArtifactV001(collision,'digest_plan_json'));
  await assert.rejects(readFile(dataPath(logical('missing.json'))));rejected.push('missing-bytes');
  await writeFile(path.join(report,`queue-reference-evidence-${attempt}.json`),JSON.stringify({status:'passed',scope:'reference-only; no semantic response validation or normal completion',
    actualPureBuilders:['buildUnseenDiscoveryRequestV001','projectUnseenSelectionPlanV001','buildSelectionRequestV001'],correspondences,rejected,artifactRoot:relative(artifactRoot)},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'passed',internalReferences:correspondences.length,rejected:rejected.length}));
} else if(mode==='read') {
  const attempt=process.argv[3]??'attempt-003';
  const evidence=JSON.parse(await readFile(path.join(report,`queue-integration-evidence-${attempt}.json`),'utf8'));
  const {readConsumedDigestPlanV001}=await import('../../../runner/src/digest-plan-consumption-v001.ts');
  for(const entry of evidence.completed) {
    const state=JSON.parse(await readFile(path.join(root,entry.backendRuntime,'state.json'),'utf8'));
    const request=state.agentRequests.find((r:any)=>r.id===entry.validateRequestId);
    const result=await readConsumedDigestPlanV001({preparation:{workspaceRoot:root,artifactRoot:path.join(root,entry.readerArtifactRoot)}},{request,state});
    assert.deepEqual(result.artifact,JSON.parse(await readFile(path.join(root,entry.executionPath),'utf8')));
  }
  const history=JSON.parse(await readFile(path.join(report,'queue-history-preservation-proof.json'),'utf8'));
  for(const b of history.protectedFiles) {
    const p=path.join(root,b.path);if(b.fileSha256===null) await assert.rejects(lstat(p));else assert.equal(await fileSha(p),b.fileSha256,b.path);
  }
  console.log(JSON.stringify({status:'verified',separateProcessReconstructed:evidence.completed.length,protectedFiles:history.protectedFiles.length,oldReaderExecuted:false}));
} else {
  assert(['preflight-upload','preflight-local-mp4','run'].includes(mode),'Explicit preflight or run/scenario required');
  const attempt=process.argv[3];assert(attempt && /^attempt-\d{3}$/u.test(attempt));
  const selectedScenario=process.argv[4];
  assert(selectedScenario==='upload-json' || selectedScenario==='local-mp4','Only an explicitly authorized scenario is allowed');
  assert(mode==='run' || mode===(selectedScenario==='upload-json'?'preflight-upload':'preflight-local-mp4'),'Preflight mode/scenario mismatch');
  const runtime=path.join(root,'runtime/artifacts/request-intent-connection-20261001-v005-'+attempt);
  const evidencePath=path.join(report,selectedScenario==='upload-json'
    ?`queue-upload-transfer-evidence-${attempt}.json`:`queue-local-mp4-no-inspection-evidence-${attempt}.json`);
  const capacityRoots=(selectedScenario==='upload-json'?['upload-json-worker','upload-json','upload-json-reader']:['local-mp4']).map(n=>path.join(runtime,n));
  const localMp4CapacitySnapshot=async()=>{
    const sourceStatus=await lstat(source);assert(sourceStatus.isFile() && !sourceStatus.isSymbolicLink());
    const measuredPath=await realpath(path.dirname(runtime)),status=await lstat(measuredPath),space=await statfs(measuredPath,{bigint:true});
    const availableBytes=Number(space.bavail*space.bsize),requiredAvailableBytes=2*sourceStatus.size;
    const sameVolume=sourceStatus.dev===status.dev;
    return {measuredAt:new Date().toISOString(),source:{path:source,byteSize:sourceStatus.size,device:sourceStatus.dev},
      devices:[{intendedRoot:capacityRoots[0],measuredPath,device:status.dev,availableBytes,blockSize:Number(space.bsize),filesystemType:Number(space.type)}],
      decision:{sameVolume,knownPeakBytes:sourceStatus.size,requiredAvailableBytes,availableBytes,
        deficitBytes:Math.max(0,requiredAvailableBytes-availableBytes),passed:sameVolume && availableBytes>=requiredAvailableBytes,
        rule:'local-mp4 no-inspection work-order §3; this isolated direct PUT test only'}};
  };
  const capacitySnapshot=()=>selectedScenario==='upload-json'?uploadCapacitySnapshot(source,capacityRoots):localMp4CapacitySnapshot();
  await assertNewUploadPaths([runtime,...capacityRoots,evidencePath]);
  const preflight=await capacitySnapshot();
  const rejected=selectedScenario==='upload-json'?'UPLOAD_CAPACITY_PREFLIGHT_REJECTED':'LOCAL_MP4_CAPACITY_PREFLIGHT_REJECTED';
  console.log(JSON.stringify({event:selectedScenario==='upload-json'?'upload-preflight':'local-mp4-preflight',...preflight}));
  if(mode==='preflight-upload' || mode==='preflight-local-mp4') {assert(preflight.decision.passed,rejected);process.exit(0);}
  if(!preflight.decision.passed) {
    await writeFile(evidencePath,JSON.stringify({status:'preflight-rejected',attempt,preflight,largeFileActionStarted:false},null,2)+'\n',{flag:'wx'});
    throw new Error(rejected);
  }
  await mkdir(runtime);
  const results:any[]=[],captures:any[]=[],completed:any[]=[],children:any[]=[];
  const evidence:any={schemaVersion:'request-intent-queue-integration-evidence-v001',attempt,results,captures,completed,
    selectedScenario,instructionHead:selectedScenario==='upload-json'?'82c244729409ecd4bbd177ab0611ddaf86996a99':'85b077a39abdd1004bc903038ff508b20e09b653',productFixes:5,setupFixes:selectedScenario==='upload-json'?9:12,
    preflight,capacity:[],runnerProcesses:[],notRun:selectedScenario==='upload-json'
      ?['local-json','local-mp4','inspection-missing','two purposes through all three judgments']:['local-json replay','upload-json replay','external inference','video manufacturing'],
    inputPath:'normal draft API/approve/next/claim/runner index/factory/PUT/complete',sourceProcessingExecuted:false,sttExecuted:false,
    externalInferenceExecuted:false,inspectionExecuted:false,renderExecuted:false,productionAdoption:false};
  const checkpoint=async()=>writeFile(evidencePath,JSON.stringify(evidence,null,2)+'\n');
  const capacity=async(stage:string)=>{evidence.capacity.push({stage,...await capacitySnapshot(),
    sourceSizeFiles:await sourceSizeFiles(runtime,preflight.source.byteSize)});await checkpoint();};
  const record=(name:string,details:any={})=>{results.push({name,status:'passed',...details});console.log(JSON.stringify({test:name,status:'passed'}));};
  const startBackend=async(name:string)=>{
    const directory=path.join(runtime,name);await mkdir(directory);const child=spawn(process.execPath,['--import',loader,fileURLToPath(import.meta.url),'backend'],
      {cwd:root,env:isolatedEnv(directory),stdio:['ignore','pipe','pipe']});children.push(child);let stderr='';child.stderr.on('data',(b:any)=>stderr+=b);
    const lines=createInterface({input:child.stdout});
    const port=await new Promise<number>((ok,fail)=>{lines.on('line',(line:string)=>{try{const x=JSON.parse(line);if(x.port)ok(x.port);}catch{}});child.on('exit',c=>fail(new Error('backend '+c+' '+stderr)));});
    return {directory,base:`http://127.0.0.1:${port}/api`};
  };
  const response=async(b:any,route:string,method='GET',body?:any,actor='human')=>fetch(b.base+route,{method,
    headers:{'content-type':'application/json',authorization:`Bearer isolated-${actor}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const api=async(b:any,route:string,method='GET',body?:any,actor='human')=>{const r=await response(b,route,method,body,actor);assert(r.ok,route+' '+r.status+' '+await r.clone().text());return r.json() as any;};
  const put=async(b:any,draft:string,name:string,bytes:Buffer|string,mime='application/json')=>{
    const r=await fetch(b.base+`/artifacts/${draft}/${name}`,{method:'PUT',headers:{authorization:'Bearer isolated-agent','content-type':mime},
      body:typeof bytes==='string'?fs.createReadStream(bytes) as any:bytes,duplex:'half'} as any);
    assert(r.ok,'PUT '+name+' '+r.status+' '+await r.clone().text());return r.json() as any;
  };
  const draftInput=(purpose:string)=>({productionType:'digest',purpose,sourceUri:source,durationLabel:'隔離試験の尺条件',
    themeCountLabel:'隔離試験の候補条件',geminiModelName:'通信しない接続試験',preset:'隔離試験の編集条件'});
  const register=async(b:any,purpose:string,videoMode='json',inspection=true)=>{
    const {draft}=await api(b,'/request-drafts','POST',draftInput(purpose));
    const approved=await api(b,`/request-drafts/${draft.id}/approve`,'POST',{});
    assert.deepEqual(approved.agentRequests.map((r:any)=>r.type),['prepare_video','run_stt','prepare_digest_plan','validate_digest_plan']);
    for(const dep of approved.agentRequests.slice(0,2)) {
      const next=await api(b,'/agent-requests/next','GET',undefined,'agent');assert.equal(next.request.id,dep.id);
      await api(b,`/agent-requests/${dep.id}/claim`,'POST',{ownerId:'codex2-fixture-registration'},'agent');
      let meta:any;
      if(dep.type==='prepare_video' && videoMode==='mp4') meta=await put(b,draft.id,`${dep.id}--source.mp4`,source,'video/mp4');
      else if(dep.type==='prepare_video') {
        const inspectionMeta=inspection?await put(b,draft.id,`${dep.id}--source-inspection.json`,await readFile(savedInspection)):null;
        const value={kind:'source_video',mode:'local-source-reference',sourceUri:source,purpose,registeredAt:new Date().toISOString(),
          ...(inspectionMeta?{sourceInspectionBinding:{path:digestArtifactPathFromUriV001(inspectionMeta.uri,draft.id,dep.id),fileSha256:inspectionMeta.sha256}}:{})};
        meta=await put(b,draft.id,`${dep.id}--source-video.json`,Buffer.from(JSON.stringify(value,null,2)+'\n'));
      } else meta=await put(b,draft.id,`${dep.id}--transcript.json`,await readFile(savedTranscript));
      const done=await api(b,`/agent-requests/${dep.id}/complete`,'POST',{ownerId:'codex2-fixture-registration',meaning:'旧保存物の登録のみ。取得/STT処理未実施',
        fileRef:{uri:meta.uri,mimeType:dep.type==='prepare_video'&&videoMode==='mp4'?'video/mp4':'application/json',access:'internal'}},'agent');
      const r=done.request,state=done.state,o=state.outputs.find((o:any)=>o.id===r.result.outputId),f=state.fileRefs.find((f:any)=>f.id===r.result.fileRefId);
      assert(o && f && o.fileRefId===f.id && f.ownerId===o.id && r.result.outputType===o.type);assert.deepEqual(r.fileRefIds,[f.id]);
    }
    return {draft,requests:approved.agentRequests};
  };
  const answer=(event:any,purpose:string)=>{
    const q=event.request,stage=q.schemaVersion.startsWith('unseen')?'':q.input.productionRequest!==undefined
      ?q.input.utterances?'discovery':'selection':'retention';
    assert.equal(stage==='retention'?q.input.taskDescription:q.input.productionRequest,purpose);
    assert.equal(event.requestFileSha256,sha(formal(q)));captures.push({stage,purpose,requestFileSha256:event.requestFileSha256,sourceId:q.input.sourceId??null,utteranceCount:q.input.utterances?.length??null,candidateCount:q.input.candidates?.length??null});
    let a:any;
    if(stage==='discovery') a={status:'complete',candidates:[10,20].map(i=>({sourceId:q.input.sourceId,title:'接続fixture'+i,
      reason:'意味品質を認定しない固定回答',evidenceUtteranceIds:[q.input.utterances[i].utteranceId],
      contextStartUtteranceId:q.input.utterances[i].utteranceId,contextEndUtteranceId:q.input.utterances[i].utteranceId}))};
    else if(stage==='selection') a={status:'complete',decisions:q.input.candidates.map((c:any)=>({candidateId:c.candidateId,sourceId:c.sourceId,
      decision:'adopt',basis:'distinct-highlight',reason:'比較入力の配線試験',evidenceUtteranceIds:[c.utterances[0].utteranceId],
      comparisons:q.input.candidates.filter((o:any)=>o.candidateId!==c.candidateId).map((o:any)=>({candidateId:o.candidateId,evidenceUtteranceIds:[o.utterances[0].utteranceId]}))}))};
    else a={status:'complete',candidates:q.input.candidates.map((c:any)=>{const atoms=c.utterances.flatMap((u:any)=>u.atoms);assert(atoms.length>12);
      return {candidateId:c.candidateId,meaningPreserved:'非連続保持の接続fixture',blocks:[
        {action:'keep',startSourceSegmentId:atoms[0].sourceSegmentId,endSourceSegmentId:atoms[5].sourceSegmentId,roles:['lead-in'],reason:'前区間'},
        {action:'drop',startSourceSegmentId:atoms[6].sourceSegmentId,endSourceSegmentId:atoms[11].sourceSegmentId,roles:['digression'],reason:'中間除外'},
        {action:'keep',startSourceSegmentId:atoms[12].sourceSegmentId,endSourceSegmentId:atoms.at(-1).sourceSegmentId,roles:['payoff'],reason:'後区間'}]};})};
    return {schemaVersion:stage==='discovery'?'candidate-discovery-judgment-response-v001':stage==='selection'?'candidate-selection-response-v001':'candidate-internal-retention-response-v001',
      requestFileSha256:event.requestFileSha256,answer:a,judgmentNote:'通信しない固定配線fixture'};
  };
  const runner=async(b:any,worker:string,delivery:string,purpose:string,guard:string[]=[],expectBoundary=false)=>{
    await mkdir(worker,{recursive:true});const entry=guard.length?[fileURLToPath(import.meta.url),'guard-runner']:[path.join(root,'runner/src/index.ts')];
    const child=spawn(process.execPath,['--import',loader,...entry,`--api=${b.base}`,'--max-steps=1'],{cwd:root,
      env:{...isolatedEnv(worker),ZEV2_ARTIFACT_DELIVERY_MODE:delivery,CODEX2_TEST_FORBIDDEN_READS:JSON.stringify(guard)},stdio:['pipe','pipe','pipe']});
    children.push(child);let out='',err='';let handlerError:unknown;child.stderr.on('data',(b:any)=>err+=b);child.stdout.on('data',(b:any)=>out+=b);
    const lines=createInterface({input:child.stdout});lines.on('line',(line:string)=>{
      try{const e=JSON.parse(line);if(e.event==='candidate-digest-judgment-required')child.stdin.write(JSON.stringify(answer(e,purpose))+'\n');}catch(e){if(line.startsWith('{'))handlerError=e;}
    });
    const code=await new Promise<number|null>(ok=>child.on('exit',ok));if(handlerError)throw handlerError;
    if(expectBoundary) {assert.equal(code,1,err+'\n'+out);assert(err.includes('最大処理件数 1 件に到達'));}
    else assert.equal(code,0,err+'\n'+out);
    const execution={stdout:out,stderr:err,exitCode:code};evidence.runnerProcesses.push({worker:relative(worker),delivery,guard:guard.map(relative),expectBoundary,...execution});
    await checkpoint();return execution;
  };
  try {
    for(const config of [{name:'local-json',mode:'local',video:'json',inspection:true,purpose:'自然な導入と出来事の反応を保ち、結末が理解できる構成にする。\n関係の薄い寄り道は本編との関係で判断する。'},
      {name:'upload-json',mode:'upload',video:'json',inspection:true,purpose:'前振りと展開のつながりを優先し、ゲームの終わりと配信末尾の挨拶を区別する。\n初見に必要な説明を保持する。'},
      {name:'local-mp4',mode:'local',video:'mp4',inspection:false,purpose:'本編の見どころの反応と結果を残す。提供されないinspectionを推測で補わない。'}].filter(c=>c.name===process.argv[4])) {
      const b=await startBackend(config.name),fixture=await register(b,config.purpose,config.video,config.inspection);
      await capacity('source-STT-registered');
      const worker=config.mode==='local'?b.directory:path.join(runtime,config.name+'-worker');
      await runner(b,worker,config.mode,config.purpose,[],true);
      await capacity('worker-upload-plan-complete');
      let state=await api(b,'/state'),prep=state.agentRequests.find((r:any)=>r.id===fixture.requests[2].id);assert.equal(prep.status,'succeeded');
      const planRef=state.fileRefs.find((f:any)=>f.id===prep.result.fileRefId),planPath=path.join(b.directory,'artifacts',fixture.draft.id,planRef.artifactFileName);
      const dataPath=(logical:string)=>path.join(b.directory,'artifacts',fixture.draft.id,digestArtifactFileNameV001(logical,fixture.draft.id));
      const plan=JSON.parse(await readFile(planPath,'utf8'));assert.equal(plan.kind,'digest_plan_json');assert(!('consumptionBinding' in plan));
      for(const binding of plan.dataBindings) assert.equal(await fileSha(dataPath(binding.path)),binding.fileSha256);
      const preparation=JSON.parse(await readFile(dataPath(plan.preparationBinding.path),'utf8'));
      if(config.video==='json') assert.notEqual(preparation.identity.sourceRegistration.fileSha256,plan.sourceVideoBinding.fileSha256);
      else assert.equal(preparation.identity.sourceRegistration.fileSha256,plan.sourceVideoBinding.fileSha256);
      const nextWorker=config.mode==='upload'?path.join(runtime,config.name+'-reader'):b.directory;
      const blocked=config.mode==='upload'?[worker,source,savedTranscript,savedInspection]:[];
      await runner(b,nextWorker,config.mode,config.purpose,blocked);
      await capacity('receiver-download-validate-complete');
      state=await api(b,'/state');const validated=state.agentRequests.find((r:any)=>r.id===fixture.requests[3].id);assert.equal(validated.status,'succeeded');
      assert.equal(state.controlReviewItems.length,0);assert.equal(state.agentRequests.length,4);
      const executionRef=state.fileRefs.find((f:any)=>f.id===validated.result.fileRefId),executionPath=path.join(b.directory,'artifacts',fixture.draft.id,executionRef.artifactFileName);
      const execution=JSON.parse(await readFile(executionPath,'utf8'));assert.deepEqual(execution.admission,{planIntegrity:'passed',presentation:'not-connected',executionPermission:'not-approved',humanQuality:'pending'});
      if(config.inspection) {assert(execution.consumptionBinding && execution.clockResolutionBinding);const edit=JSON.parse(await readFile(dataPath(execution.editPlanBinding.path),'utf8'));assert.equal(edit.segments.length,4);}
      else {assert.equal(execution.sourceInspectionBinding,null);assert.equal(execution.consumptionBinding,null);assert.equal(execution.clockResolutionBinding,null);assert(execution.sourceInspectionMissingReason);}
      completed.push({name:config.name,backendRuntime:relative(b.directory),readerRuntime:relative(config.mode==='upload'?path.join(nextWorker,'runner-artifacts/..'):nextWorker),
        readerArtifactRoot:relative(config.mode==='upload'?path.join(nextWorker,'runner-artifacts'):path.join(nextWorker,'artifacts')),
        draftId:fixture.draft.id,prepareRequestId:prep.id,validateRequestId:validated.id,planPath:relative(planPath),executionPath:relative(executionPath),
        separateProcess:true,forbiddenReads:blocked.map(relative),sourceRegistrationMode:preparation.identity.sourceOrigin.mode,
        dataBindings:plan.dataBindings,admission:execution.admission});
      record(config.name+' normal registration/runner/complete',{purpose:config.purpose,dataFiles:plan.dataBindings.length,inspection:config.inspection});await checkpoint();
    }
    assert.equal(completed.length,1);assert.deepEqual(captures.map(c=>c.stage),['discovery','selection','retention']);
    record(selectedScenario==='upload-json'?'selected upload purpose reached all three actual Skills':'selected local-mp4 purpose reached all three actual Skills',
      selectedScenario==='upload-json'?{captures:captures.length,twoPurposesNotRun:true}:{captures:captures.length,crossAttemptPurposeProofPending:true});
    evidence.status='passed';await checkpoint();
  } catch(e) {evidence.status='failed';evidence.error=e instanceof Error?e.message:String(e);await checkpoint();throw e;}
  finally {for(const c of children)if(c.exitCode===null)c.kill('SIGTERM');}
}

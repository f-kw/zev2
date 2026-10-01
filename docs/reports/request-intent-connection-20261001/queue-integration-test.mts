import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,lstat,realpath,readdir} from 'node:fs/promises';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {syncBuiltinESMExports} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formal,sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const report=path.join(root,'docs/reports/request-intent-connection-20261001');
const loader=path.join(root,'runner/node_modules/tsx/dist/loader.mjs');
const mode=process.argv[2]??'run';
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
} else if(mode==='read') {
  const evidence=JSON.parse(await readFile(path.join(report,'queue-integration-evidence.json'),'utf8'));
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
  assert.equal(mode,'run');
  const attempt=process.argv[3]??'attempt-001';assert(/^attempt-\d{3}$/u.test(attempt));
  const runtime=path.join(root,'runtime/artifacts/request-intent-connection-20261001-v005-'+attempt);
  await mkdir(runtime);
  const results:any[]=[],captures:any[]=[],completed:any[]=[],children:any[]=[];
  const evidence:any={schemaVersion:'request-intent-queue-integration-evidence-v001',attempt,results,captures,completed,
    inputPath:'normal draft API/approve/next/claim/runner index/factory/PUT/complete',sourceProcessingExecuted:false,sttExecuted:false,
    externalInferenceExecuted:false,inspectionExecuted:false,renderExecuted:false,productionAdoption:false};
  const checkpoint=async()=>writeFile(path.join(report,'queue-integration-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
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
          ...(inspectionMeta?{sourceInspectionBinding:{path:`artifacts/${draft.id}/${inspectionMeta.artifactFileName}`,fileSha256:inspectionMeta.sha256}}:{})};
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
    if(out.includes('失敗'))throw new Error(out+err);return {stdout:out,stderr:err};
  };
  try {
    for(const config of [{name:'local-json',mode:'local',video:'json',inspection:true,purpose:'自然な導入と出来事の反応を保ち、結末が理解できる構成にする。\n関係の薄い寄り道は本編との関係で判断する。'},
      {name:'upload-json',mode:'upload',video:'json',inspection:true,purpose:'前振りと展開のつながりを優先し、ゲームの終わりと配信末尾の挨拶を区別する。\n初見に必要な説明を保持する。'},
      {name:'local-mp4',mode:'local',video:'mp4',inspection:false,purpose:'本編の見どころの反応と結果を残す。提供されないinspectionを推測で補わない。'}]) {
      const b=await startBackend(config.name),fixture=await register(b,config.purpose,config.video,config.inspection);
      const worker=config.mode==='local'?b.directory:path.join(runtime,config.name+'-worker');
      await runner(b,worker,config.mode,config.purpose,[],true);
      let state=await api(b,'/state'),prep=state.agentRequests.find((r:any)=>r.id===fixture.requests[2].id);assert.equal(prep.status,'succeeded');
      const planRef=state.fileRefs.find((f:any)=>f.id===prep.result.fileRefId),planPath=path.join(b.directory,'artifacts',fixture.draft.id,planRef.artifactFileName);
      const plan=JSON.parse(await readFile(planPath,'utf8'));assert.equal(plan.kind,'digest_plan_json');assert(!('consumptionBinding' in plan));
      for(const binding of plan.dataBindings) assert.equal(await fileSha(path.join(b.directory,binding.path)),binding.fileSha256);
      const preparation=JSON.parse(await readFile(path.join(b.directory,plan.preparationBinding.path),'utf8'));
      if(config.video==='json') assert.notEqual(preparation.identity.sourceRegistration.fileSha256,plan.sourceVideoBinding.fileSha256);
      else assert.equal(preparation.identity.sourceRegistration.fileSha256,plan.sourceVideoBinding.fileSha256);
      const nextWorker=config.mode==='upload'?path.join(runtime,config.name+'-reader'):b.directory;
      const blocked=config.mode==='upload'?[worker,source,savedTranscript,savedInspection]:[];
      await runner(b,nextWorker,config.mode,config.purpose,blocked);
      state=await api(b,'/state');const validated=state.agentRequests.find((r:any)=>r.id===fixture.requests[3].id);assert.equal(validated.status,'succeeded');
      assert.equal(state.controlReviewItems.length,0);assert.equal(state.agentRequests.length,4);
      const executionRef=state.fileRefs.find((f:any)=>f.id===validated.result.fileRefId),executionPath=path.join(b.directory,'artifacts',fixture.draft.id,executionRef.artifactFileName);
      const execution=JSON.parse(await readFile(executionPath,'utf8'));assert.deepEqual(execution.admission,{planIntegrity:'passed',presentation:'not-connected',executionPermission:'not-approved',humanQuality:'pending'});
      if(config.inspection) {assert(execution.consumptionBinding && execution.clockResolutionBinding);const edit=JSON.parse(await readFile(path.join(b.directory,execution.editPlanBinding.path),'utf8'));assert.equal(edit.segments.length,4);}
      else {assert.equal(execution.sourceInspectionBinding,null);assert.equal(execution.consumptionBinding,null);assert.equal(execution.clockResolutionBinding,null);assert(execution.sourceInspectionMissingReason);}
      completed.push({name:config.name,backendRuntime:relative(b.directory),readerRuntime:relative(config.mode==='upload'?path.join(nextWorker,'runner-artifacts/..'):nextWorker),
        readerArtifactRoot:relative(config.mode==='upload'?path.join(nextWorker,'runner-artifacts'):path.join(nextWorker,'artifacts')),
        draftId:fixture.draft.id,prepareRequestId:prep.id,validateRequestId:validated.id,planPath:relative(planPath),executionPath:relative(executionPath),
        separateProcess:true,forbiddenReads:blocked.map(relative),sourceRegistrationMode:preparation.identity.sourceOrigin.mode,
        dataBindings:plan.dataBindings,admission:execution.admission});
      record(config.name+' normal registration/runner/complete',{purpose:config.purpose,dataFiles:plan.dataBindings.length,inspection:config.inspection});await checkpoint();
    }
    record('different purposes reached all three actual Skills',{captures:captures.length});
    evidence.status='passed';await checkpoint();
  } catch(e) {evidence.status='failed';evidence.error=e instanceof Error?e.message:String(e);await checkpoint();throw e;}
  finally {for(const c of children)if(c.exitCode===null)c.kill('SIGTERM');}
}

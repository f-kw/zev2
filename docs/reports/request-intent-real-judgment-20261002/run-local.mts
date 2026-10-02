import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,lstat,statfs,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {formal,sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
import {digestArtifactPathFromUriV001} from '../../../packages/shared/dist/index.js';

// 起動と一件ずつの手渡しだけ。内容判断、通常caller、検査は既存実装へ委ねる。
const root=fileURLToPath(new URL('../../../',import.meta.url));
const report=path.join(root,'docs/reports/request-intent-real-judgment-20261002');
const runtime=path.join(root,'runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001');
const loader=path.join(root,'runner/node_modules/tsx/dist/loader.mjs');
const source=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4');
const transcriptPath=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/transcript.json');
const inspectionPath=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/base-attempt-002/source-media-inspection.json');
const settingsState=path.join(root,'runtime/artifacts/request-intent-connection-20261001-v005-attempt-005/local-json/state.json');
const env=(directory:string)=>({...process.env,ZEV2_RUNTIME_DIR:directory,ZEV2_DISABLE_AUTO_RUNNER:'1',
  ZEV2_HUMAN_API_TOKEN:'isolated-human',ZEV2_AGENT_API_TOKEN:'isolated-agent',
  GEMINI_API_KEY:'',GOOGLE_API_KEY:'',GOOGLE_CLOUD_PROJECT:'',ZEV2_ARTIFACT_DELIVERY_MODE:'local'});
async function capacity() {
  const s=await lstat(source),destination=await realpath(path.join(root,'runtime/artifacts'));
  assert(s.isFile() && !s.isSymbolicLink());
  const device=(await lstat(destination)).dev,f=await statfs(destination,{bigint:true});
  return {at:new Date().toISOString(),source:{path:source,byteSize:s.size,device:s.dev},
    intendedRoot:runtime,device,availableBytes:Number(f.bavail*f.bsize),requiredAvailableBytes:2*s.size,
    newLargeObjects:1,copyAuthority:'既存prepareのsource-media.mp4一つ。手動素材copyなし。'};
}
const mode=process.argv[2];
if(mode==='backend') {
  const {default:express}=await import('../../../backend/node_modules/express/index.js');
  const {default:control}=await import('../../../backend/src/routes/control.ts');
  const {createArtifactUploadRouter}=await import('../../../backend/src/routes/artifact-upload.ts');
  const app=express();app.use('/api',createArtifactUploadRouter(process.env.ZEV2_RUNTIME_DIR!));
  app.use(express.json());app.use('/api',control);
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>((ok,fail)=>{server.once('listening',ok);server.once('error',fail);});
  const address=server.address();assert(address && typeof address!=='string');
  console.log(JSON.stringify({port:address.port}));
  process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
} else if(mode==='preflight') {
  const c=await capacity();assert(c.availableBytes>=c.requiredAvailableBytes);
  const {readConsumedDigestPlanV001}=await import('../../../runner/src/digest-plan-consumption-v001.ts');
  const {readStateSnapshot}=await import('../../../backend/src/store/json-store.ts');
  assert.equal(typeof readConsumedDigestPlanV001,'function');assert.equal(typeof readStateSnapshot,'function');
  const t=JSON.parse(await readFile(transcriptPath,'utf8'));assert.equal(t.sourceUri,source);
  console.log(JSON.stringify({status:'preflight-passed',capacity:c,stdin:'回答ファイルpath一行を受け、今回の要求に対応する一回答だけchild.stdinへ送る。後続要求まで開く。'}));
} else if(mode==='run') {
  const evidence=JSON.parse(await readFile(path.join(report,'evidence.json'),'utf8'));
  const checkpoint=async()=>writeFile(path.join(report,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  const inputLines=createInterface({input:process.stdin,terminal:false});
  let runner:ReturnType<typeof spawn>|undefined,backend:ReturnType<typeof spawn>|undefined;
  let pending:{event:any;index:number;issuedAt:number;requestPath:string}|undefined;
  let delivery:Promise<void>=Promise.resolve();
  evidence.history.setupFixes=17;evidence.history.setup16Applied=true;evidence.history.setup17Applied=true;evidence.startedAt=new Date().toISOString();
  evidence.status='running';evidence.runtime=path.relative(root,runtime);evidence.judgments=[];evidence.processes=[];
  await checkpoint();
  try {
    await mkdir(path.dirname(runtime), {recursive:true});
    await mkdir(runtime,{recursive:false});await mkdir(path.join(runtime,'handoff'));
    const instruction=await readFile(path.join(root,'docs/work-orders/ZEV_DIGEST_REAL_JUDGMENT_LOCAL_20261002_v001.md'),'utf8');
    const purpose=instruction.split('\n').find(line=>line.startsWith('> この保存済み配信素材'))!.slice(2);
    assert(purpose.endsWith('計画を保存する。'));
    const oldState=JSON.parse(await readFile(settingsState,'utf8'));
    const oldDraft=oldState.requestDrafts.find((d:any)=>d.productionType==='digest');assert(oldDraft);
    evidence.settingsBasis={path:path.relative(root,settingsState),fileSha256:sha(await readFile(settingsState)),settings:oldDraft.settings,policy:oldDraft.policy};
    const input={productionType:'digest',purpose,sourceUri:source,...oldDraft.settings};
    evidence.purpose=purpose;evidence.draftInput=input;await checkpoint();
    backend=spawn(process.execPath,['--import',loader,fileURLToPath(import.meta.url),'backend'],{cwd:root,env:env(runtime),stdio:['ignore','pipe','pipe']});
    const backendExit=new Promise<number|null>(ok=>backend!.once('exit',ok));
    let backendError='';backend.stderr!.on('data',b=>backendError+=b);
    const backendLines=createInterface({input:backend.stdout!});
    const port=await new Promise<number>((ok,fail)=>{backendLines.on('line',line=>{const v=JSON.parse(line);if(v.port)ok(v.port);});backend!.once('exit',c=>fail(new Error('backend exit '+c+' '+backendError)));});
    const base=`http://127.0.0.1:${port}/api`;
    const api=async(route:string,method='GET',body?:any,actor='human')=>{
      const r=await fetch(base+route,{method,headers:{'content-type':'application/json',authorization:`Bearer isolated-${actor}`},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const value=await r.json();assert(r.ok,route+' '+r.status+' '+JSON.stringify(value));return value as any;
    };
    const put=async(draft:string,name:string,bytes:Buffer)=>{
      const r=await fetch(base+`/artifacts/${draft}/${name}`,{method:'PUT',headers:{authorization:'Bearer isolated-agent','content-type':'application/json'},body:bytes});
      const value=await r.json();assert(r.ok,'PUT '+r.status+' '+JSON.stringify(value));return value as any;
    };
    const created=await api('/request-drafts','POST',input);assert(created.draft?.id);
    const draft=created.draft,approved=await api(`/request-drafts/${draft.id}/approve`,'POST',{});
    assert.equal(approved.draft.purpose,purpose);assert.deepEqual(approved.draft.settings,oldDraft.settings);assert.deepEqual(approved.draft.policy,oldDraft.policy);
    assert.deepEqual(approved.agentRequests.map((r:any)=>r.type),['prepare_video','run_stt','prepare_digest_plan','validate_digest_plan']);
    await writeFile(path.join(runtime,'approval-api.json'),formal(approved),{flag:'wx'});
    evidence.draftId=draft.id;evidence.requestIds=approved.agentRequests.map((r:any)=>({id:r.id,type:r.type}));evidence.registration=[];await checkpoint();
    for(const dep of approved.agentRequests.slice(0,2)) {
      const next=await api('/agent-requests/next','GET',undefined,'agent');assert.equal(next.request.id,dep.id);
      await api(`/agent-requests/${dep.id}/claim`,'POST',{ownerId:'codex2-saved-input-registration'},'agent');
      let meta:any;
      if(dep.type==='prepare_video') {
        const inspectionBytes=await readFile(inspectionPath),inspection=JSON.parse(inspectionBytes.toString());
        assert.equal(inspection.sourceVideoBinding.fileSha256,'504650457fc6650bf27d6a6094402add0b684c5f32977cde27e201fe4c40a6c4');
        const im=await put(draft.id,`${dep.id}--source-inspection.json`,inspectionBytes);assert.equal(im.sha256,sha(inspectionBytes));
        const value={kind:'source_video',mode:'local-source-reference',sourceUri:source,purpose,registeredAt:new Date().toISOString(),
          sourceInspectionBinding:{path:digestArtifactPathFromUriV001(im.uri,draft.id,dep.id),fileSha256:im.sha256}};
        meta=await put(draft.id,`${dep.id}--source-video.json`,Buffer.from(JSON.stringify(value,null,2)+'\n'));
      } else {const bytes=await readFile(transcriptPath);meta=await put(draft.id,`${dep.id}--transcript.json`,bytes);assert.equal(meta.sha256,sha(bytes));}
      const complete=await api(`/agent-requests/${dep.id}/complete`,'POST',{ownerId:'codex2-saved-input-registration',meaning:'既存保存bytesの正規登録。取得/STT/inspection処理は実行していない。',
        fileRef:{uri:meta.uri,mimeType:'application/json',access:'internal'}},'agent');
      assert.equal(complete.request.status,'succeeded');evidence.registration.push({type:dep.type,meta,result:complete.request.result});await checkpoint();
    }
    const pre=await capacity();assert(pre.availableBytes>=pre.requiredAvailableBytes,'CAPACITY_INSUFFICIENT');
    evidence.capacityBefore=pre;evidence.runnerStartedAt=new Date().toISOString();await checkpoint();
    console.log(JSON.stringify({event:'registered-and-capacity-passed',draftId:draft.id,capacity:pre}));
    inputLines.on('line',line=>{
      delivery=delivery.then(async()=>{
        assert(pending,'未発行の回答は受け付けない');
        const p=path.resolve(line.trim());assert(path.dirname(p)===path.join(runtime,'handoff'),'回答は今回のhandoff内のみ');
        const bytes=await readFile(p),response=JSON.parse(bytes.toString());
        assert.equal(response.requestFileSha256,pending.event.requestFileSha256);
        assert(runner?.stdin?.writable);runner.stdin.write(JSON.stringify(response)+'\n');
        evidence.judgments.push({index:pending.index,requestPath:path.relative(root,pending.requestPath),requestFileSha256:pending.event.requestFileSha256,
          responsePath:path.relative(root,p),responseFileSha256:sha(bytes),issuedAt:new Date(pending.issuedAt).toISOString(),returnedAt:new Date().toISOString(),
          handoffElapsedMs:Date.now()-pending.issuedAt});
        pending=undefined;await checkpoint();console.log(JSON.stringify({event:'response-delivered',path:p}));
      }).catch(e=>{console.error(e);runner?.kill('SIGTERM');});
    });
    runner=spawn(process.execPath,['--import',loader,path.join(root,'runner/src/index.ts'),`--api=${base}`,'--max-steps=2'],
      {cwd:root,env:{...env(runtime),ZEV2_AGENT_OWNER_ID:'codex2-real-judgment-runner'},stdio:['pipe','pipe','pipe']});
    const runnerExit=new Promise<number|null>(ok=>runner!.once('exit',ok));
    let ordinal=0;const log:string[]=[];runner.stderr!.on('data',b=>{log.push(b.toString());process.stderr.write(b);});
    let capture:Promise<void>=Promise.resolve();
    createInterface({input:runner.stdout!}).on('line',line=>{
      log.push(line+'\n');
      let event:any;try{event=JSON.parse(line);}catch{console.log(line);return;}
      if(event.event!=='candidate-digest-judgment-required'){console.log(line);return;}
      capture=capture.then(async()=>{
        assert(!pending);assert.equal(event.requestFileSha256,sha(formal(event.request)));
        const q=event.request,deliveredPurpose=q.input.productionRequest??q.input.taskDescription;assert.equal(deliveredPurpose,purpose);
        const index=++ordinal,requestPath=path.join(runtime,'handoff',`request-${index}.json`);
        await writeFile(requestPath,formal(q),{flag:'wx'});await writeFile(path.join(runtime,'handoff',`event-${index}.json`),formal(event),{flag:'wx'});
        pending={event,index,issuedAt:Date.now(),requestPath};
        evidence.pending={index,requestPath:path.relative(root,requestPath),requestFileSha256:event.requestFileSha256};await checkpoint();
        console.log(JSON.stringify({event:'codex-judgment-needed',index,requestPath,requestFileSha256:event.requestFileSha256}));
      }).catch(e=>{console.error(e);runner?.kill('SIGTERM');});
    });
    const exit=await runnerExit;await capture;await delivery;inputLines.close();
    await writeFile(path.join(runtime,'runner.log'),log.join(''),{flag:'wx'});
    evidence.processes.push({name:'normal-runner',pid:runner.pid,exitCode:exit});evidence.runnerEndedAt=new Date().toISOString();await checkpoint();
    assert.equal(exit,0);assert.equal(ordinal,3);assert.equal(evidence.judgments.length,3);
    const final=await api('/state');await writeFile(path.join(runtime,'final-api-state.json'),formal(final),{flag:'wx'});
    const state=final;assert(state.agentRequests);const requests=state.agentRequests.filter((r:any)=>r.requestDraftId===draft.id);
    assert.deepEqual(requests.map((r:any)=>r.status),['succeeded','succeeded','succeeded','succeeded']);
    evidence.completions=requests.map((r:any)=>{
      const o=state.outputs.find((v:any)=>v.id===r.result.outputId),f=state.fileRefs.find((v:any)=>v.id===r.result.fileRefId);
      assert(o && f && o.fileRefId===f.id && f.ownerId===o.id);assert.deepEqual(r.fileRefIds,[f.id]);
      return {requestId:r.id,type:r.type,status:r.status,output:o,fileRef:f};
    });
    evidence.capacityAfter=await capacity();evidence.logicalMediaCopyBytes=pre.source.byteSize;evidence.status='normal-complete';delete evidence.pending;
    backend.kill('SIGTERM');const be=await backendExit;evidence.processes.push({name:'isolated-backend',pid:backend.pid,exitCode:be});assert.equal(be,0);
    evidence.completedAt=new Date().toISOString();await checkpoint();console.log(JSON.stringify({status:'normal-complete',runtime}));
  } catch(e) {
    evidence.status='stopped';evidence.error=String(e);await checkpoint();throw e;
  } finally {
    inputLines.close();runner?.stdin?.end();if(runner && runner.exitCode===null)runner.kill('SIGTERM');
    if(backend && backend.exitCode===null)backend.kill('SIGTERM');
  }
} else throw new Error('mode must be preflight, backend, or run');

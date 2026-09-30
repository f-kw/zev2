import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, copyFile, readdir, stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStepArtifactBuilders, requireWorkflowRequestOutputFileRef} from '../../../runner/src/workflow-step-builders.ts';
import {buildThemeOptionsArtifact} from '../../../runner/src/steps/theme-options.ts';
import {buildClipCompositionArtifact} from '../../../runner/src/steps/composition.ts';
import {readPreparedDigestPlanV001} from '../../../runner/src/digest-plan-preparation-v001.ts';
import {consumePreparedDigestPlanV001, readConsumedDigestPlanV001, prepareAndConsumeDigestPlanV001} from '../../../runner/src/digest-plan-consumption-v001.ts';
import {buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001} from '../../../runner/src/distant-connection-common-utterance-artifact-v001.ts';
import {formal, sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const relative = (p: string) => path.relative(root, p).split(path.sep).join('/');
const loader = path.join(root, 'runner/node_modules/tsx/dist/loader.mjs');
const mode = process.argv[2];
const attempt = process.argv[3] ?? 'attempt-001';
if(mode==='run') assert(/^attempt-\d{3}$/u.test(attempt));
const runtimeDir = mode !== 'run' ? process.argv[3]! : path.join(root, 'runtime/artifacts/request-intent-connection-20261001-v003-'+attempt);
Object.assign(process.env, {ZEV2_RUNTIME_DIR: runtimeDir, ZEV2_DISABLE_AUTO_RUNNER: '1',
  ZEV2_HUMAN_API_TOKEN: 'isolated-human', ZEV2_AGENT_API_TOKEN: 'isolated-agent', GEMINI_API_KEY: '', GOOGLE_API_KEY: ''});
const {loadState, saveState} = await import('../../../backend/src/store/json-store.ts');
const artifacts = path.join(runtimeDir, 'artifacts');
const transcriptPath = path.join(artifacts, 'fixture/transcript.json');
const utterancePath = path.join(artifacts, 'fixture/utterances.json');
const transcript = JSON.parse(await readFile(mode !== 'run' ? transcriptPath
  : path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/transcript.json'), 'utf8'));
const inputFor = (state: any, requestId: string) => ({state,
  request: state.agentRequests.find((r: any) => r.id === requestId), transcript,
  transcriptUri: '/api/artifacts/fixture/transcript.json'});
const dependencies = async (judge?: any) => ({workspaceRoot: root, artifactRoot: artifacts,
  sourceId: 'isolated-saved-source', utterances: {path: relative(utterancePath), fileSha256: sha(await readFile(utterancePath))}, ...(judge ? {judge} : {})});
const consumerDependencies = async () => {
  const inspection=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/base-attempt-002/source-media-inspection.json');
  return {preparation:await dependencies(),sourceInspection:{path:relative(inspection),fileSha256:sha(await readFile(inspection))}};
};
if (mode !== 'run') {
  const state = await loadState(), requestId = process.argv[4]!;
  const before = await readFile(path.join(runtimeDir, 'state.json'));
  const result = mode==='old-preparation' ? await readPreparedDigestPlanV001(await dependencies(),inputFor(state,requestId))
    : mode==='consume-old' ? await consumePreparedDigestPlanV001(await consumerDependencies(),inputFor(state,requestId))
    : await readConsumedDigestPlanV001(await consumerDependencies(),inputFor(state,requestId));
  assert.deepEqual(await readFile(path.join(runtimeDir, 'state.json')), before);
  console.log(JSON.stringify(result));
} else {
  assert.equal(mode, 'run');
  await mkdir(runtimeDir); await mkdir(path.join(artifacts, 'fixture'), {recursive: true});
  const businessPath = path.join(root, 'runtime/state.json');
  const readBusiness = () => readFile(businessPath).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  const businessBefore = await readBusiness();
  const oldTranscriptPath = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/transcript.json');
  const oldTranscriptBytes = await readFile(oldTranscriptPath);
  const oldVideo = path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/source/source-video.mp4');
  const oldPlan = JSON.parse(await readFile(path.join(root, 'runtime/artifacts/selection-structure-improvement-20260930-v001/discovery-plan.json'), 'utf8'));
  assert.equal(oldPlan.request.sourceVideo.path, relative(oldVideo));
  const sourceSize = (await stat(oldVideo)).size;
  // 既存動画の独立copy（対応FSはclone）と保存済みSTTの同一bytes。取得／STT／生成はしない。
  await copyFile(oldVideo, path.join(artifacts, 'fixture/source-video.mp4'), constants.COPYFILE_FICLONE);
  await writeFile(transcriptPath, oldTranscriptBytes, {flag: 'wx'});
  const utterances = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: relative(transcriptPath), sourceTranscriptBytes: oldTranscriptBytes});
  await writeFile(utterancePath, JSON.stringify(utterances, null, 2)+'\n', {flag: 'wx'});
  const {default: express} = await import('../../../backend/node_modules/express/index.js');
  const {default: router} = await import('../../../backend/src/routes/control.ts');
  const app = express(); app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {server.once('listening', resolve);server.once('error', reject);});
  const address = server.address(); assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  const ordinaryFetch = globalThis.fetch;
  globalThis.fetch = (url: any, init?: any) => {
    assert(String(url).startsWith(base+'/'), '外部通信を禁止');
    return ordinaryFetch(url, init);
  };
  const api = async (route: string, method = 'GET', body?: any, actor = 'human') => {
    const res = await fetch(base+route, {method, headers: {'content-type':'application/json', authorization:`Bearer isolated-${actor}`},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    assert(res.ok, `${method} ${route}: ${res.status} ${await res.clone().text()}`); return res.json() as any;
  };
  const results: any[] = [], captures: any[] = [];
  const outputDirectory = (r: any) => path.join(artifacts, r.requestDraftId, 'digest-preparation', r.id);
  const digestSnapshot = async () => {
    const files: Record<string,string> = {};
    const walk = async (directory: string) => {
      for (const entry of await readdir(directory, {withFileTypes:true})) {
        const absolute=path.join(directory,entry.name);
        if(entry.isDirectory()) await walk(absolute);
        else files[relative(absolute)]=sha(await readFile(absolute));
      }
    };
    for(const entry of await readdir(artifacts,{withFileTypes:true})) if(entry.isDirectory() && entry.name.startsWith('draft_')) {
      const directory=path.join(artifacts,entry.name,'digest-preparation');
      try {await walk(directory);} catch(e) {if((e as any).code!=='ENOENT')throw e;}
    }
    return files;
  };
  const normalRuntime = (deps?: any) => ({
    ...(deps ? {digestPlanPreparation: deps} : {}),
    requireRequestOutputFileRef: requireWorkflowRequestOutputFileRef,
    readArtifactByUrl: async (uri: string) => JSON.parse(await readFile(path.join(artifacts, uri.slice('/api/artifacts/'.length)), 'utf8')),
    buildThemeOptionsArtifact: (t: any, r: any) => buildThemeOptionsArtifact(t, r, {contentDiscoveryMode:'transcript',
      fixedThemeOptionsPath:'', sanitizePathPart:(s: string)=>s}),
    buildClipCompositionArtifact,
    writeJsonArtifact: async (r: any, kind: string, payload: any) => {
      const directory = path.join(artifacts, r.requestDraftId); await mkdir(directory, {recursive:true});
      await writeFile(path.join(directory, kind+'.json'), JSON.stringify(payload));
      return {uri:`/api/artifacts/${r.requestDraftId}/${kind}.json`, mimeType:'application/json', access:'shared', payload};
    },
    writeStepManifest: async (r: any, payload: any) => {await writeFile(path.join(artifacts, r.requestDraftId, 'step-manifest.json'), JSON.stringify(payload));},
    prepareSourceVideo: async()=>{throw new Error('禁止:素材取得');}, buildTranscript:async()=>{throw new Error('禁止:STT');},
    buildEditPlanArtifact:async()=>{throw new Error('禁止:演出');}, buildPatch:()=>{throw new Error('禁止:後修正');},
    renderVideo:async()=>{throw new Error('禁止:動画');},
  });
  const runFactory = async (f: any, judge?: any, enabled=true) => {
    const runtime = normalRuntime(enabled ? await dependencies(judge) : undefined);
    return prepareAndConsumeDigestPlanV001(runtime as any,await consumerDependencies(),inputFor(f.state,f.request.id));
  };
  const create = async (purpose: string, approve=true) => {
    const {draft} = await api('/request-drafts','POST',{purpose, sourceUri:transcript.sourceUri,
      durationLabel:'接続試験の尺条件',themeCountLabel:'2候補',geminiModelName:'接続試験のモデル条件',preset:'接続試験の編集条件'});
    if (!approve) return {draft, state: await loadState()};
    await api(`/request-drafts/${draft.id}/approve`,'POST',{});
    const state = await loadState();
    const video = state.agentRequests.find((r:any)=>r.requestDraftId===draft.id && r.type==='prepare_video')!;
    const stt = state.agentRequests.find((r:any)=>r.requestDraftId===draft.id && r.type==='run_stt')!;
    const request = state.agentRequests.find((r:any)=>r.requestDraftId===draft.id && r.type==='propose_clip_themes')!;
    const refs = [{id:'file-'+video.id,kind:'source_video',uri:'/api/artifacts/fixture/source-video.mp4',mimeType:'video/mp4',
      access:'shared',ownerId:video.id,artifactFileName:'source-video.mp4',byteSize:sourceSize,
      sha256:oldPlan.request.sourceVideo.fileSha256,createdAt:video.createdAt},
      {id:'file-'+stt.id,kind:'transcript_json',uri:'/api/artifacts/fixture/transcript.json',mimeType:'application/json',
        access:'shared',ownerId:stt.id,artifactFileName:'transcript.json',byteSize:oldTranscriptBytes.length,
        sha256:sha(oldTranscriptBytes),createdAt:stt.createdAt}];
    // source/STT完了だけのfixture。通常storeへ保存してから、通常claim APIを通す。
    for (const [i, dep] of [video,stt].entries()) {dep.status='succeeded';dep.result={fileRefId:refs[i]!.id,meaning:'既存source/STT完了fixture'};}
    state.fileRefs.push(...refs as any); await saveState(state);
    const claimed = await api(`/agent-requests/${request.id}/claim`,'POST',{ownerId:'codex2-isolated'},'agent');
    return {draft, request:claimed.request, state:await loadState()};
  };
  const provider = (f:any, fault?:string) => async (stage:string, request:any) => {
    const expected = f.request.input.purpose;
    assert.equal(stage==='retention'?request.input.taskDescription:request.input.productionRequest, expected);
    captures.push({requestId:f.request.id,stage,purpose:expected,requestFileSha256:sha(formal(request)),
      sourceId:request.input.sourceId??null,utterances:request.input.utterances?.length??null,candidates:request.input.candidates?.length??null});
    if(fault==='provider-failure' && stage==='selection') throw new Error('test-provider-failure');
    let answer:any;
    if(stage==='discovery') {
      answer={status:'complete',candidates:[10,20].map(i=>({sourceId:request.input.sourceId,title:'配線試験候補'+i,
        reason:'意味品質を測らない固定provider回答',evidenceUtteranceIds:[request.input.utterances[i].utteranceId],
        contextStartUtteranceId:request.input.utterances[i].utteranceId,contextEndUtteranceId:request.input.utterances[i].utteranceId}))};
      if(fault==='unknown-id') answer.candidates[0].contextStartUtteranceId='unknown-utterance';
    } else if(stage==='selection') {
      answer={status:'complete',decisions:request.input.candidates.map((c:any)=>({candidateId:c.candidateId,sourceId:c.sourceId,
        decision:'adopt',basis:'distinct-highlight',reason:'比較入力の配線試験',evidenceUtteranceIds:[c.utterances[0].utteranceId],
        comparisons:request.input.candidates.filter((o:any)=>o.candidateId!==c.candidateId)
          .map((o:any)=>({candidateId:o.candidateId,evidenceUtteranceIds:[o.utterances[0].utteranceId]}))}))};
      if(fault==='selection-gap') answer.decisions.pop();
      if(fault==='selection-duplicate') answer.decisions[1]=structuredClone(answer.decisions[0]);
    } else {
      answer={status:'complete',candidates:request.input.candidates.map((c:any)=>{const atoms=c.utterances.flatMap((u:any)=>u.atoms);
        assert(atoms.length>12);
        // 追加fixtureの非連続保持。意味品質や製品の件数・尺を決める値ではない。
        return {candidateId:c.candidateId,meaningPreserved:'非連続保持の後段接続試験',blocks:[
          {action:'keep',startSourceSegmentId:atoms[0].sourceSegmentId,endSourceSegmentId:atoms[5].sourceSegmentId,roles:['lead-in'],reason:'固定試験の前区間'},
          {action:'drop',startSourceSegmentId:atoms[6].sourceSegmentId,endSourceSegmentId:atoms[11].sourceSegmentId,roles:['digression'],reason:'固定試験の中間除外'},
          {action:'keep',startSourceSegmentId:atoms[12].sourceSegmentId,endSourceSegmentId:atoms.at(-1).sourceSegmentId,roles:['payoff'],reason:'固定試験の後区間'}]};})};
      if(fault==='retention-gap') answer.candidates[0].blocks[0].endSourceSegmentId=request.input.candidates[0].utterances.flatMap((u:any)=>u.atoms).at(-2).sourceSegmentId;
      if(fault==='retention-duplicate') answer.candidates[0].blocks.push(structuredClone(answer.candidates[0].blocks[0]));
    }
    return {schemaVersion:stage==='discovery'?'candidate-discovery-judgment-response-v001':stage==='selection'
      ?'candidate-selection-response-v001':'candidate-internal-retention-response-v001',
      requestFileSha256:sha(formal(request)),answer,judgmentNote:'通信しない配線試験provider。AI内容判断の実測ではない。'};
  };
  const reject = async (name:string, action:()=>Promise<any>) => {
    await assert.rejects(action); results.push({name,status:'rejected'});
  };
  const child = (mode:string,directory:string,requestId:string) => {
    const result=spawnSync(process.execPath,['--import',loader,fileURLToPath(import.meta.url),mode,directory,requestId],
      {cwd:root,env:process.env,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout);
  };
  const prepDirectory=(r:any)=>path.join(artifacts,r.requestDraftId,'digest-preparation',r.id);
  const consumptionDirectory=(r:any)=>path.join(artifacts,r.requestDraftId,'digest-consumption',r.id);
  const byteSnapshot=async(directory:string)=>Object.fromEntries(await Promise.all((await readdir(directory)).sort()
    .map(async n=>[n,sha(await readFile(path.join(directory,n)))])));
  try {
    const a=await create('前後の役割を残し、中間除外が復活しない構成。');
    const b=await create('別の制作意図と条件を出所として維持する。非連続保持を順序どおり渡す。');
    const completed=[];
    for(const f of [a,b]) {
      const result=await runFactory(f,provider(f));
      assert.equal(result.digest.status,'consumed');assert.equal(result.digest.segmentCount,4);
      const directory=consumptionDirectory(f.request), prepared=await byteSnapshot(prepDirectory(f.request));
      const edit=JSON.parse(await readFile(path.join(directory,'edit-plan.json'),'utf8'));
      const retention=JSON.parse(await readFile(path.join(prepDirectory(f.request),'retention-validation.json'),'utf8'));
      assert.equal(edit.segments.length,retention.segments.length);
      assert.deepEqual(edit.segments.map((p:any)=>p.sourceSegmentIds),retention.segments.map((p:any)=>p.sourceSegmentIds));
      for(const candidate of retention.candidates) {
        const segments=edit.segments.filter((p:any)=>p.candidateId===candidate.candidateId);
        assert.equal(segments.length,2);assert(segments[0].sourceEndMs<segments[1].sourceStartMs);
        const dropped=candidate.blocks.filter((p:any)=>p.action==='drop').flatMap((p:any)=>p.sourceSegmentIds);
        assert(dropped.every((id:number)=>!segments.flatMap((p:any)=>p.sourceSegmentIds).includes(id)));
      }
      const clock=JSON.parse(await readFile(path.join(directory,'clock-resolution.json'),'utf8'));
      clock.mappings.forEach((m:any,i:number)=>{
        assert.equal(m.sourceStartMs,edit.segments[i].sourceStartMs);assert.equal(m.sourceEndMs,edit.segments[i].sourceEndMs);
        assert.equal(m.segmentId,edit.segments[i].segmentId);
        assert.equal(m.outputStartFrame,i===0?0:clock.mappings[i-1].outputEndFrame);
        assert.equal(m.audioSamples.outputStart,m.outputStartFrame*(clock.mappings[0].audioSamples.outputEnd-clock.mappings[0].audioSamples.outputStart)/(clock.mappings[0].outputEndFrame-clock.mappings[0].outputStartFrame));
        assert.equal(m.audioSamples.sourceStart,m.sourceStartFrame30*(clock.mappings[0].audioSamples.outputEnd-clock.mappings[0].audioSamples.outputStart)/(clock.mappings[0].outputEndFrame-clock.mappings[0].outputStartFrame));
      });
      assert.equal(child('read',runtimeDir,f.request.id).status,'consumed');
      const before=await byteSnapshot(directory);
      await runFactory(f,async()=>{throw new Error('完了済みは再判断しない');});
      assert.deepEqual(await byteSnapshot(directory),before);assert.deepEqual(await byteSnapshot(prepDirectory(f.request)),prepared);
      completed.push({requestId:f.request.id,binding:relative(path.join(directory,'binding.json')),sourceIntervals:edit.segments,
        outputFrameCount:result.digest.outputFrameCount});
    }
    results.push({name:'normal-api-store-claim-factory-consumer-two-noncontiguous-purposes',status:'passed'});
    results.push({name:'keep-drop-keep-ids-clocks-frame-sample-order-and-readback',status:'passed'});
    const original=await byteSnapshot(prepDirectory(a.request));
    for(const key of ['other-request','purpose','source','approved-version','expired-claim']) {
      const f=structuredClone(a),r=f.state.agentRequests.find((r:any)=>r.id===f.request.id);
      if(key==='other-request') f.request.id=b.request.id;
      if(key==='purpose') {r.input.purpose='改変';f.request.input.purpose='改変';}
      if(key==='source') {r.target.sourceUri='別素材';f.request.target.sourceUri='別素材';}
      if(key==='approved-version') f.state.requestDrafts.find((d:any)=>d.id===f.request.requestDraftId).updatedAt='2001-01-01T00:00:00Z';
      if(key==='expired-claim') {r.claimExpiresAt='2000-01-01T00:00:00Z';f.request.claimExpiresAt=r.claimExpiresAt;}
      await reject(key,async()=>consumePreparedDigestPlanV001(await consumerDependencies(),inputFor(f.state,f.request.id)));
    }
    const directory=consumptionDirectory(a.request),bindingPath=path.join(directory,'binding.json');
    const bindingBytes=await readFile(bindingPath);
    const editPath=path.join(directory,'edit-plan.json'),editBytes=await readFile(editPath);
    for(const fault of ['unknown-version','bad-reference','missing-output','changed-output','segment-gap','segment-duplicate']) {
      const record=JSON.parse(bindingBytes.toString());
      if(fault==='unknown-version')record.schemaVersion='unknown';
      if(fault==='bad-reference')record.outputs['edit-plan.json'].path='../../escape';
      if(fault==='missing-output'){const {unlink}=await import('node:fs/promises');await unlink(editPath);}
      if(fault==='changed-output')await writeFile(editPath,Buffer.concat([editBytes,Buffer.from(' ')]));
      if(fault==='segment-gap'||fault==='segment-duplicate') {
        const edit=JSON.parse(editBytes.toString());if(fault==='segment-gap')edit.segments.pop();else edit.segments.push(structuredClone(edit.segments[0]));
        await writeFile(editPath,formal(edit));record.outputs['edit-plan.json'].fileSha256=sha(formal(edit));
      }
      if(!['missing-output','changed-output'].includes(fault))await writeFile(bindingPath,formal(record));
      await reject(fault,async()=>readConsumedDigestPlanV001(await consumerDependencies(),inputFor(a.state,a.request.id)));
      await writeFile(bindingPath,bindingBytes);await writeFile(editPath,editBytes);
    }
    const retainedPath=path.join(prepDirectory(a.request),'retention-result.json'),retainedBytes=await readFile(retainedPath);
    await writeFile(retainedPath,Buffer.concat([retainedBytes,Buffer.from(' ')]));
    await reject('changed-preparation',async()=>consumePreparedDigestPlanV001(await consumerDependencies(),inputFor(a.state,a.request.id)));
    await writeFile(retainedPath,retainedBytes);
    assert.deepEqual(await byteSnapshot(prepDirectory(a.request)),original);
    assert.equal(captures.length,6,'新しい二つのfixture以外は再判断しない');
    // 受理済みv002の旧保存もそのまま再読・消費する。旧claimに期限はなく、延長／state変更しない。
    const oldProof=JSON.parse(await readFile(new URL('./factory-connection-evidence-attempt-006.json',import.meta.url),'utf8'));
    for(const f of oldProof.completed.slice(0,2)) {
      const prepPath=path.dirname(path.join(root,f.binding)),before=await byteSnapshot(prepPath);
      assert.equal(child('old-preparation',path.join(root,oldProof.runtime),f.requestId).status,'prepared');
      assert.equal(child('consume-old',path.join(root,oldProof.runtime),f.requestId).segmentCount,2);
      assert.equal(child('read',path.join(root,oldProof.runtime),f.requestId).status,'consumed');
      assert.deepEqual(await byteSnapshot(prepPath),before);
    }
    results.push({name:'old-v002-bindings-read-consumed-without-provider-or-original-changes',status:'passed'});
    assert.deepEqual(await readBusiness(),businessBefore);assert.deepEqual(await readFile(oldTranscriptPath),oldTranscriptBytes);
    assert.deepEqual((await loadState()).controlReviewItems,[]);
    const evidence={status:'passed',runtime:relative(runtimeDir),results,captures,completed,
      consumers:['validatePresentationBaseMediaBuildJobV001','validatePresentationBaseMediaSegmentPlanV002'],
      sourceAndStt:'saved artifact completion fixtures; no ingestion/STT',judgment:'fixed noncommunicating noncontiguous-retention fixtures; no content-quality claim',
      externalInferenceCalls:0,sttRuns:0,generatedVideos:0,humanReviewMutations:0,businessStateMutations:0,
      originalV002PreparationMutations:0,oldImplementationMutations:0};
    await writeFile(new URL(`./consumer-connection-evidence-${attempt}.json`,import.meta.url),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:evidence.status,results:results.length,captures:captures.length,completed:completed.map(x=>x.binding)}));
  } finally {globalThis.fetch=ordinaryFetch;await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}

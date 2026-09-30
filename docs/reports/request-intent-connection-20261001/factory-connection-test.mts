import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, copyFile, readdir, stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStepArtifactBuilders, requireWorkflowRequestOutputFileRef} from '../../../runner/src/workflow-step-builders.ts';
import {buildThemeOptionsArtifact} from '../../../runner/src/steps/theme-options.ts';
import {buildClipCompositionArtifact} from '../../../runner/src/steps/composition.ts';
import {readPreparedDigestPlanV001} from '../../../runner/src/digest-plan-preparation-v001.ts';
import {buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001} from '../../../runner/src/distant-connection-common-utterance-artifact-v001.ts';
import {formal, sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const relative = (p: string) => path.relative(root, p).split(path.sep).join('/');
const loader = path.join(root, 'runner/node_modules/tsx/dist/loader.mjs');
const mode = process.argv[2];
const attempt = process.argv[3] ?? 'attempt-001';
if(mode!=='read') assert(/^attempt-\d{3}$/u.test(attempt));
const runtimeDir = mode === 'read' ? process.argv[3]! : path.join(root, 'runtime/artifacts/request-intent-connection-20261001-v002-'+attempt);
Object.assign(process.env, {ZEV2_RUNTIME_DIR: runtimeDir, ZEV2_DISABLE_AUTO_RUNNER: '1',
  ZEV2_HUMAN_API_TOKEN: 'isolated-human', ZEV2_AGENT_API_TOKEN: 'isolated-agent', GEMINI_API_KEY: '', GOOGLE_API_KEY: ''});
const {loadState, saveState} = await import('../../../backend/src/store/json-store.ts');
const artifacts = path.join(runtimeDir, 'artifacts');
const transcriptPath = path.join(artifacts, 'fixture/transcript.json');
const utterancePath = path.join(artifacts, 'fixture/utterances.json');
const transcript = JSON.parse(await readFile(mode === 'read' ? transcriptPath
  : path.join(root, 'runtime/artifacts/digest-new-material-20260926-v001/transcript.json'), 'utf8'));
const inputFor = (state: any, requestId: string) => ({state,
  request: state.agentRequests.find((r: any) => r.id === requestId), transcript,
  transcriptUri: '/api/artifacts/fixture/transcript.json'});
const dependencies = async (judge?: any) => ({workspaceRoot: root, artifactRoot: artifacts,
  sourceId: 'isolated-saved-source', utterances: {path: relative(utterancePath), fileSha256: sha(await readFile(utterancePath))}, ...(judge ? {judge} : {})});
if (mode === 'read') {
  const state = await loadState(), requestId = process.argv[4]!;
  const before = await readFile(path.join(runtimeDir, 'state.json'));
  const result = await readPreparedDigestPlanV001(await dependencies(), inputFor(state, requestId));
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
    return createStepArtifactBuilders(runtime as any).propose_clip_themes({request:f.request, state:f.state});
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
        return {candidateId:c.candidateId,meaningPreserved:'保持入力と全断片被覆の配線試験',blocks:[{action:'keep',
          startSourceSegmentId:atoms[0].sourceSegmentId,endSourceSegmentId:atoms.at(-1).sourceSegmentId,roles:['lead-in','payoff'],reason:'固定試験回答'}]};})};
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
  try {
    const a=await create('導入の説明と出来事の反応を保持する。\n結末が理解できる構成。');
    const b=await create('結末の意味を優先し、直前の説明を保持する。\n候補間の重複を比較する。');
    const stateBefore=structuredClone(a.state.controlReviewItems);
    const defaultOutput=await runFactory(a,undefined,false);
    await assert.rejects(()=>readdir(outputDirectory(a.request)), {code:'ENOENT'});
    const enabledOutput=await runFactory(a,provider(a));
    const strip=(v:any)=>{const {generatedAt,...rest}=v;return rest;};
    assert.deepEqual(strip(defaultOutput.payload),strip(enabledOutput.payload));
    // 構成builderの不変確認。テーマ承認／通常後段の実行ではない。
    const composition=(themes:any)=>strip(buildClipCompositionArtifact(themes,transcript,a.state,a.draft.id,a.request.input.purpose));
    assert.deepEqual(composition(defaultOutput.payload),composition(enabledOutput.payload));
    results.push({name:'default-and-enabled-normal-composition-output-identical',status:'passed'});
    assert.deepEqual((await loadState()).controlReviewItems,stateBefore);
    await runFactory(b,provider(b));
    for(const f of [a,b]) {
      const observed=captures.filter(c=>c.requestId===f.request.id);assert.deepEqual(observed.map(c=>c.stage),['discovery','selection','retention']);
      const before=await readFile(path.join(outputDirectory(f.request),'binding.json'));
      await runFactory(f,async()=>{throw new Error('完了済みprovider再呼出し禁止');});
      assert.deepEqual(await readFile(path.join(outputDirectory(f.request),'binding.json')),before);
      const child=spawnSync(process.execPath,['--import',loader,fileURLToPath(import.meta.url),'read',runtimeDir,f.request.id],
        {cwd:root,env:process.env,encoding:'utf8'});assert.equal(child.status,0,child.stderr);
      assert.equal(JSON.parse(child.stdout).status,'prepared');
    }
    for(const stage of ['discovery','selection','retention']) assert.notEqual(captures.find(c=>c.requestId===a.request.id&&c.stage===stage).requestFileSha256,
      captures.find(c=>c.requestId===b.request.id&&c.stage===stage).requestFileSha256);
    results.push({name:'normal-api-store-claim-factory-two-purposes-default-and-readback',status:'passed'});
    const partial=await create('途中再開の配線試験。全文の制作意図を保持する。');
    await reject('provider-failure',()=>runFactory(partial,provider(partial,'provider-failure')));
    await reject('incomplete-readback',async()=>readPreparedDigestPlanV001(await dependencies(),inputFor(partial.state,partial.request.id)));
    await runFactory(partial,provider(partial));
    assert.deepEqual(captures.filter(c=>c.requestId===partial.request.id).map(c=>c.stage),['discovery','selection','selection','retention']);
    results.push({name:'resume-accepted-stage-without-rejudging',status:'passed'});
    let invalidCalls=0;
    const unexpected=async()=>{invalidCalls++;throw new Error('資格不成立では呼ばない');};
    for(const key of ['draft-approval','claim','purpose','conditions','source','other-request','dependency','expired-claim']) {
      const f=structuredClone(a);
      const r=f.state.agentRequests.find((x:any)=>x.id===f.request.id);
      const d=f.state.requestDrafts.find((x:any)=>x.id===f.request.requestDraftId);
      if(key==='draft-approval') d.status='draft';
      if(key==='claim') {delete r.claimOwnerId;delete f.request.claimOwnerId;}
      if(key==='purpose') {r.input.purpose='改変';f.request.input.purpose='改変';}
      if(key==='conditions') {r.constraints.preset='改変';f.request.constraints.preset='改変';}
      if(key==='source') {r.target.sourceUri='別素材';f.request.target.sourceUri='別素材';}
      if(key==='other-request') f.request.id=b.request.id;
      if(key==='dependency') f.state.agentRequests.find((x:any)=>x.id===r.dependsOnAgentRequestId).status='queued';
      if(key==='expired-claim') {r.claimExpiresAt='2000-01-01T00:00:00Z';f.request.claimExpiresAt=r.claimExpiresAt;}
      const before=await digestSnapshot();
      await reject(key,()=>runFactory(f,unexpected));
      assert.deepEqual(await digestSnapshot(),before,'資格不成立でDigest保存を変更しない');
    }
    assert.equal(invalidCalls,0);
    const stale=await create('別目的への旧回答使い回し拒否。');
    const oldResponse=JSON.parse(await readFile(path.join(outputDirectory(a.request),'candidate-response.json'),'utf8'));
    await reject('stale-response-sha',()=>runFactory(stale,async()=>oldResponse));
    for(const fault of ['unknown-id','selection-gap','selection-duplicate','retention-gap','retention-duplicate']) {
      const f=await create('ID集合と被覆を確認する隔離入力。'+fault);
      await reject(fault,()=>runFactory(f,provider(f,fault)));
    }
    const bindingPath=path.join(outputDirectory(a.request),'binding.json');
    const bindingBytes=await readFile(bindingPath);
    for(const fault of ['unknown-version','missing','changed','bad-reference','missing-stage']) {
      const saved=JSON.parse(bindingBytes.toString());
      const victim=path.join(outputDirectory(a.request),'candidate-response.json');const victimBytes=await readFile(victim);
      if(fault==='unknown-version') saved.schemaVersion='unknown';
      if(fault==='missing-stage') delete saved.stages.selection;
      if(fault==='bad-reference') saved.artifacts['candidate-response.json'].path='../../escape';
      if(fault==='missing') {const {unlink}=await import('node:fs/promises');await unlink(victim);}
      if(fault==='changed') await writeFile(victim,Buffer.concat([victimBytes,Buffer.from(' ')]));
      if(fault!=='missing'&&fault!=='changed') await writeFile(bindingPath,formal(saved));
      await reject(fault,()=>runFactory(a,unexpected));
      await writeFile(bindingPath,bindingBytes);await writeFile(victim,victimBytes);
    }
    assert.equal(invalidCalls,0);
    assert.deepEqual(await readBusiness(),businessBefore);
    assert.deepEqual(await readFile(oldTranscriptPath),oldTranscriptBytes);
    assert.deepEqual((await loadState()).controlReviewItems,[]);
    const savedBeforeApprovalFault=await digestSnapshot();
    const changedApproval=structuredClone(a);
    changedApproval.state.requestDrafts.find((d:any)=>d.id===a.request.requestDraftId).updatedAt='2001-01-01T00:00:00Z';
    await reject('different-approved-version',()=>runFactory(changedApproval,unexpected));
    assert.deepEqual(await digestSnapshot(),savedBeforeApprovalFault);
    const oldUtterancesPath=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/utterances.json');
    const wrongDependencies={...await dependencies(unexpected),utterances:{path:relative(oldUtterancesPath),fileSha256:sha(await readFile(oldUtterancesPath))}};
    await reject('other-saved-transcript-binding',()=>createStepArtifactBuilders(normalRuntime(wrongDependencies) as any)
      .propose_clip_themes({request:a.request,state:a.state}));
    const unapproved=await create('通常APIで未承認の入力。',false);
    assert.equal(unapproved.state.agentRequests.filter((r:any)=>r.requestDraftId===unapproved.draft.id).length,0);
    await assert.rejects(()=>readdir(path.join(artifacts,unapproved.draft.id,'digest-preparation')),{code:'ENOENT'});
    results.push({name:'unapproved-api-input-produces-no-command-or-digest-save',status:'passed'});
    assert.equal(invalidCalls,0);
    const evidence={status:'passed',caller:'createStepArtifactBuilders.propose_clip_themes',runtime:relative(runtimeDir),
      sourceAndStt:'existing-saved-artifact-completion-fixtures; no ingestion/STT execution',
      sourceVideo:'independent copy of existing saved video; no source byte mutation',judgment:'non-communicating fixed provider; no AI content-quality claim',
      results,captures,completed:[a,b,partial].map(f=>({requestDraftId:f.request.requestDraftId,requestId:f.request.id,
        binding:relative(path.join(outputDirectory(f.request),'binding.json'))})),
      externalInferenceCalls:0,sttRuns:0,generatedVideos:0,humanReviewMutations:0,businessStateMutations:0};
    await writeFile(new URL(`./factory-connection-evidence-${attempt}.json`,import.meta.url),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:evidence.status,results:results.length,providerCaptures:captures.length,completed:evidence.completed}));
  } finally {
    globalThis.fetch=ordinaryFetch;
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  }
}

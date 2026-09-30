import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile, readdir, unlink} from 'node:fs/promises';
import {consumePreparedDigestPlanV001, readConsumedDigestPlanV001} from '../../../runner/src/digest-plan-consumption-v001.ts';
import {formal, sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const evidence=JSON.parse(await readFile(new URL('./consumer-connection-evidence-attempt-001.json',import.meta.url),'utf8'));
const runtime=path.join(root,evidence.runtime),artifacts=path.join(runtime,'artifacts');
const statePath=path.join(runtime,'state.json'),stateBytes=await readFile(statePath),state=JSON.parse(stateBytes.toString());
const completed=evidence.completed[0],request=state.agentRequests.find((r:any)=>r.id===completed.requestId);
const relative=(p:string)=>path.relative(root,p).split(path.sep).join('/');
const input={state,request,transcript:JSON.parse(await readFile(path.join(artifacts,'fixture/transcript.json'),'utf8')),
  transcriptUri:'/api/artifacts/fixture/transcript.json'};
const utterancePath=path.join(artifacts,'fixture/utterances.json');
const inspectionPath=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/base-attempt-002/source-media-inspection.json');
const dependencies={preparation:{workspaceRoot:root,artifactRoot:artifacts,sourceId:'isolated-saved-source',
  utterances:{path:relative(utterancePath),fileSha256:sha(await readFile(utterancePath))}},
  sourceInspection:{path:relative(inspectionPath),fileSha256:sha(await readFile(inspectionPath))}};
const output=path.dirname(path.join(root,completed.binding));
const preparation=path.join(artifacts,request.requestDraftId,'digest-preparation',request.id);
const snapshot=async(directory:string)=>Object.fromEntries(await Promise.all((await readdir(directory)).sort()
  .map(async n=>[n,sha(await readFile(path.join(directory,n)))])));
const outputBefore=await snapshot(output),preparationBefore=await snapshot(preparation),results:any[]=[];
const rejected=async(name:string,action:()=>Promise<unknown>)=>{
  await assert.rejects(action);assert.deepEqual(await snapshot(output),outputBefore);
  results.push({name,status:'rejected'});
};
for(const fault of ['unapproved','conditions']) {
  const changed=structuredClone(input);
  if(fault==='unapproved')changed.state.requestDrafts.find((d:any)=>d.id===request.requestDraftId).status='draft';
  else {changed.request.constraints.preset='changed';changed.state.agentRequests.find((r:any)=>r.id===request.id).constraints.preset='changed';}
  await rejected(fault,()=>consumePreparedDigestPlanV001(dependencies,changed));
}
const bindingPath=path.join(preparation,'binding.json'),bindingBytes=await readFile(bindingPath);
try {
  const incomplete=JSON.parse(bindingBytes.toString());incomplete.status='incomplete';
  await writeFile(bindingPath,formal(incomplete));
  await rejected('incomplete-preparation',()=>consumePreparedDigestPlanV001(dependencies,input));
} finally {await writeFile(bindingPath,bindingBytes);}
const outputBindingPath=path.join(output,'binding.json'),outputBindingBytes=await readFile(outputBindingPath);
try {
  await unlink(outputBindingPath);
  await assert.rejects(()=>readConsumedDigestPlanV001(dependencies,input));
  results.push({name:'missing-consumption-record',status:'rejected'});
} finally {await writeFile(outputBindingPath,outputBindingBytes);}
const wrongPath=path.join(artifacts,'fixture/wrong-inspection.json');
const wrong=JSON.parse(await readFile(inspectionPath,'utf8'));
const transcriptPath=path.join(artifacts,'fixture/transcript.json');
wrong.sourceVideoBinding={path:relative(transcriptPath),fileSha256:sha(await readFile(transcriptPath))};
await writeFile(wrongPath,formal(wrong),{flag:'wx'});
await rejected('inspection-bound-to-different-bytes',()=>consumePreparedDigestPlanV001({...dependencies,
  sourceInspection:{path:relative(wrongPath),fileSha256:sha(formal(wrong))}},input));
assert.deepEqual(await snapshot(output),outputBefore);assert.deepEqual(await snapshot(preparation),preparationBefore);
assert.deepEqual(await readFile(statePath),stateBytes);
const proof={status:'passed',results,providerCalls:0,stateMutations:0,preparationMutations:0,consumptionMutations:0};
await writeFile(new URL('./consumer-rejection-evidence.json',import.meta.url),JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(proof));

import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {formal,sha} from '../../../evals/clip_composition/run_candidate_discovery_digest_skill_e2e_v001.mts';
import {readConsumedDigestPlanV001} from '../../../runner/src/digest-plan-consumption-v001.ts';
import {digestArtifactFileNameV001,digestArtifactPathFromUriV001} from '../../../packages/shared/dist/index.js';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const runtime=path.join(root,'runtime/artifacts/request-intent-real-judgment-20261002-v001/attempt-001');
assert.equal(process.env.ZEV2_RUNTIME_DIR,runtime);
const {readStateSnapshot}=await import('../../../backend/src/store/json-store.ts');
const stateBytes=await readFile(path.join(runtime,'state.json'));
const state:any=await readStateSnapshot();
const api=JSON.parse(await readFile(path.join(runtime,'final-api-state.json'),'utf8'));assert.deepEqual(state,api);
const request=state.agentRequests.find((r:any)=>r.type==='validate_digest_plan');assert.equal(request.status,'succeeded');
const f=state.fileRefs.find((f:any)=>f.id===request.result.fileRefId);assert(f);
const logical=digestArtifactPathFromUriV001(f.uri,request.requestDraftId,request.id);
const p=path.join(runtime,'artifacts',request.requestDraftId,digestArtifactFileNameV001(logical,request.requestDraftId));
const bytes=await readFile(p);assert.equal(sha(bytes),f.sha256);assert.equal(bytes.length,f.byteSize);
const result=await readConsumedDigestPlanV001({preparation:{workspaceRoot:root,artifactRoot:path.join(runtime,'artifacts')}},{request,state});
assert.equal(result.status,'consumed');assert(result.reused);assert.deepEqual(result.artifact,JSON.parse(bytes.toString()));
assert(result.artifact.clockResolutionBinding);assert.deepEqual(await readFile(path.join(runtime,'state.json')),stateBytes);
const proof={status:'passed',processId:process.pid,readAt:new Date().toISOString(),requestId:request.id,
  stateFileSha256:sha(stateBytes),apiStoreDeepEqual:true,stateUnchanged:true,consumerReused:true,
  consumer:'readConsumedDigestPlanV001',segmentCount:result.segmentCount,artifactFileSha256:sha(bytes),
  judgmentProviderCalled:false,registrationCalled:false,renderExecuted:false};
await writeFile(path.join(runtime,'readback-proof.json'),formal(proof),{flag:'wx'});console.log(JSON.stringify(proof));

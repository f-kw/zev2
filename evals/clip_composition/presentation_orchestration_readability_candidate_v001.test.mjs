import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {deriveReadabilityOrchestrationDrawingViewV001, restoreOrchestrationDrawingViewEvidenceV001,
  exportOrchestrationDrawingViewEvidenceV001, assertOrchestrationDrawingViewV001,
  buildOrchestrationNativeQcAlternativeElementsV001} from './presentation_orchestration_v001.mjs';
import {createOrchestrationRenderScopeV001, assertOrchestrationScopedPlansV001}
  from './presentation_orchestration_render_scope_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001,
  verifyEditedOrchestrationCandidateTrustV001}
  from './presentation_orchestration_edited_render_v001.mjs';

const root=new URL('../../',import.meta.url), clone=structuredClone;
const hash=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const read=async relative=>JSON.parse(await readFile(new URL(relative,root),'utf8'));
let savedInputs;
async function fixture(t) {
  if(!savedInputs)savedInputs=Promise.all([
    read('runtime/artifacts/digest-new-material-20260926-v001/presentation/drawing-evidence.json'),
    read('runtime/artifacts/digest-new-material-20260926-v001/caption-attempt-003/meaning-input.json'),
    read('runtime/artifacts/caption-readability-20260928-preview-v006/readability-evidence.json'),
    read('runtime/artifacts/caption-readability-20260928-preview-v006/readability-resolution.json')]);
  let values;
  try {values=await savedInputs;}catch(error){if(error.code==='ENOENT'){t.skip('saved local candidate fixture unavailable');return null;}throw error;}
  const [originalEvidence,meaning,evidence,savedResolution]=clone(values);
  const view=restoreOrchestrationDrawingViewEvidenceV001(originalEvidence);
  return {version:'candidate-readability-v001',originalEvidence,view,meaning,evidence,savedResolution};
}

test('original drawing evidence remains the original wire format and plan when no candidate is requested',async t=>{
  const f=await fixture(t);if(!f)return;
  assert.deepEqual(exportOrchestrationDrawingViewEvidenceV001(f.view),f.originalEvidence);
  assert.equal(f.view.candidateExecution,undefined);
  assert.equal(f.view.resolvedPlan.elements.length,326);
});
test('explicit candidate preserves source projection while exposing every child through ordinary scope and native alternatives',async t=>{
  const f=await fixture(t);if(!f)return;
  const originalSnapshot=clone(f.view),candidate=deriveReadabilityOrchestrationDrawingViewV001(f);
  assert.equal(candidate.version,'candidate-readability-v001');
  assert.equal(candidate.resolvedPlan.elements.length,431);
  assert.equal(candidate.projectedNormalPlan.elements.length,431);
  assert.equal(candidate.captionTimings.length,431);
  assert.equal(candidate.candidateExecution.humanQuality,'not-evaluated');
  assert.equal(candidate.candidateExecution.productionDefaultChanged,false);
  for(const key of ['projection','sourceRefs','sourceContext','fourSavedSha256'])assert.deepEqual(candidate[key],f.view[key]);
  const scope=createOrchestrationRenderScopeV001(candidate);
  assert.equal(scope.scope.frameCount,27949);
  assertOrchestrationScopedPlansV001({view:candidate,plan:scope.resolvedPlan,baselinePlan:scope.normalPlan});
  candidate.captionTimings.forEach(timing=>{
    const caption=candidate.resolvedPlan.elements.find(e=>e.instructionId===timing.source.captionId);
    assert(caption);assert.deepEqual([caption.startFrame,caption.endFrameExclusive],[timing.startFrame,timing.endFrameExclusive]);
  });
  const alternatives=buildOrchestrationNativeQcAlternativeElementsV001(candidate);
  assert.equal(alternatives.alternatives.length,431);
  assert(alternatives.alternatives.every(row=>row.entries[0].element.visualState.textStyle.fontSizePx===144));
  assert.equal(alternatives.alternatives.filter(row=>row.entries.some(e=>e.kind==='whole-color')).length,32);
  assert.deepEqual(f.view,originalSnapshot);
});
test('candidate drawing evidence restores in a separate process with exact child clocks and source bindings',async t=>{
  const f=await fixture(t);if(!f)return;
  const candidate=deriveReadabilityOrchestrationDrawingViewV001(f),proof=exportOrchestrationDrawingViewEvidenceV001(candidate);
  assert.equal(proof.schemaVersion,'presentation-orchestration-drawing-evidence-candidate-v001');
  assert.deepEqual(proof.originalEvidence,f.originalEvidence);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(clone(proof)),candidate);
  const module=new URL('./presentation_orchestration_v001.mjs',import.meta.url).href;
  const child=spawnSync(process.execPath,['--input-type=module','-e',
    `import{readFileSync}from'node:fs';import{restoreOrchestrationDrawingViewEvidenceV001 as restore}from ${JSON.stringify(module)};
    const v=restore(JSON.parse(readFileSync(0,'utf8')));console.log(JSON.stringify({hash:v.viewSha256,count:v.resolvedPlan.elements.length}));`],
  {input:JSON.stringify(proof),encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(child.status,0,child.stderr);
  assert.deepEqual(JSON.parse(child.stdout),{hash:candidate.viewSha256,count:431});
});
test('candidate proof rejects unknown version, altered segmentation, original evidence and substituted output hash',async t=>{
  const f=await fixture(t);if(!f)return;
  const proof=exportOrchestrationDrawingViewEvidenceV001(deriveReadabilityOrchestrationDrawingViewV001(f));
  for(const mutate of [p=>p.candidateInput.version='candidate-unknown',
    p=>p.candidateInput.evidence.captions[0].atoms[0].text+='変更',
    p=>p.originalEvidence.source.planBytes+=' ',p=>p.expectedViewSha256='0'.repeat(64)]) {
    const changed=clone(proof);mutate(changed);
    const {evidenceSha256,...body}=changed;changed.evidenceSha256=hash(body);
    assert.throws(()=>restoreOrchestrationDrawingViewEvidenceV001(changed));
  }
  assert.throws(()=>deriveReadabilityOrchestrationDrawingViewV001({...f,version:'unknown'}));
  assert.throws(()=>deriveReadabilityOrchestrationDrawingViewV001({...f,version:undefined}));
});
test('candidate cannot be fabricated by cloning a view or deriving twice',async t=>{
  const f=await fixture(t);if(!f)return;
  const candidate=deriveReadabilityOrchestrationDrawingViewV001(f);
  assert.throws(()=>assertOrchestrationDrawingViewV001(clone(candidate)),/must be derived/);
  assert.throws(()=>deriveReadabilityOrchestrationDrawingViewV001({...f,view:candidate}),/original saved/);
  const scope=createOrchestrationRenderScopeV001(candidate);
  assert.throws(()=>assertOrchestrationScopedPlansV001({view:candidate,plan:f.view.resolvedPlan,baselinePlan:scope.normalPlan}),/plans differ/);
});
test('candidate drawing rules bind the finite profile and effective registry without selecting the production default',async()=>{
  const rules=await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion:'candidate-readability-v001'});
  assert.equal(rules.candidateExecution.registry.registryVersion,'candidate-readability-v001');
  assert.equal(rules.candidateExecution.humanQuality,'not-evaluated');
  assert.equal(rules.candidateExecution.productionDefaultChanged,false);
  assert(rules.files.some(ref=>ref.path.endsWith('/caption-readability-candidate.mjs')));
  assert.equal(await verifyEditedOrchestrationDrawingRulesRefV001(rules),true);
  const changed=clone(rules);changed.candidateExecution.profile.normalFontSizePx=96;
  await assert.rejects(()=>verifyEditedOrchestrationDrawingRulesRefV001(changed),/drawing implementation changed/);
  await assert.rejects(()=>buildEditedOrchestrationDrawingRulesRefV001({candidateVersion:'unknown'}));
});
test('candidate execution trust binds saved evidence, effective profile and registry; tampering never grants appearance approval',async t=>{
  const f=await fixture(t);if(!f)return;
  const view=deriveReadabilityOrchestrationDrawingViewV001(f);
  const rules=await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion:'candidate-readability-v001'});
  const directory=await mkdtemp(path.join(tmpdir(),'zev-candidate-trust-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const write=async(name,value)=>{
    const file=path.join(directory,name),bytes=Buffer.from(JSON.stringify(value));await writeFile(file,bytes);
    return {path:file,bytes:bytes.length,fileSha256:createHash('sha256').update(bytes).digest('hex')};
  };
  const drawingEvidenceRef=await write('drawing-evidence.json',exportOrchestrationDrawingViewEvidenceV001(view));
  const profileRef=await write('profile.json',rules.candidateExecution.profile);
  const registryRef=await write('registry.json',rules.candidateExecution.registry);
  const trust={schemaVersion:'presentation-candidate-execution-trust-v001',version:view.candidateExecution.version,
    drawingEvidenceRef,sourceViewSha256:view.candidateExecution.sourceViewSha256,candidateViewSha256:view.viewSha256,
    candidateSha256:view.candidateExecution.candidateSha256,profileRef,registryRef,drawingRulesRef:rules,
    humanQuality:'not-evaluated',productionDefaultChanged:false};
  const candidateTrustRef=await write('trust.json',trust);
  const args={candidateTrustRef,view,drawingRulesRef:rules,drawingEvidenceRef};
  assert.equal((await verifyEditedOrchestrationCandidateTrustV001(args)).status,'passed');
  await assert.rejects(()=>verifyEditedOrchestrationCandidateTrustV001({...args,view:clone(view)}),/must be derived/);
  await writeFile(profileRef.path,'{}');
  await assert.rejects(()=>verifyEditedOrchestrationCandidateTrustV001(args),/profile\/registry bytes changed/);
  await write('profile.json',rules.candidateExecution.profile);
  await writeFile(registryRef.path,'{}');
  await assert.rejects(()=>verifyEditedOrchestrationCandidateTrustV001(args),/profile\/registry bytes changed/);
  await write('registry.json',rules.candidateExecution.registry);
  await writeFile(drawingEvidenceRef.path,'{}');
  await assert.rejects(()=>verifyEditedOrchestrationCandidateTrustV001(args));
  await write('drawing-evidence.json',exportOrchestrationDrawingViewEvidenceV001(view));
  const adoptedTrust=await write('adopted.json',{...trust,humanQuality:'approved'});
  await assert.rejects(()=>verifyEditedOrchestrationCandidateTrustV001({...args,candidateTrustRef:adoptedTrust}));
});

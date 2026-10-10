/** Synthetic contract fixtures only; no network, hardware activation or real manufacture. */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateApprovedJ16StaticInputV001,projectApprovedJ16BoundCoreStyleV001} from './digest-approved-inputs-v001.js';
import {DIGEST_APPROVED_JOB_GUARD_V001,validateDigestApprovedJobConfigurationV001} from './digest-approved-job-v001.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const load=async(p:string)=>import(pathToFileURL(root+'/'+p).href);
const orchestration=await load('evals/clip_composition/presentation_orchestration_v001.mjs');
const stage=await load('evals/clip_composition/presentation_j16_staged_boundary_v001.mjs');
const {fixture}=await load('evals/clip_composition/presentation_orchestration_v001.test.mjs');
const {canonicalJson}=await load('evals/clip_composition/presentation_caption_contract_v002.mjs');
const hash=(v:string)=>createHash('sha256').update(v).digest('hex'),canonical=(v:unknown)=>hash(canonicalJson(v));
const text=(v:unknown)=>JSON.stringify(v)+'\n';
function staticFixture(ids:string[],font=87) {
  const f=fixture({ids}),source=structuredClone(f.source),plan=structuredClone(f.plan);
  for(const [i,row] of plan.elements.entries()) {
    row.text='試験専用の異なる文章 '+i;row.indexedLines=[{lineIndex:0,text:row.text}];
    row.targetProvenance={sourceAtomIds:['synthetic-atom-'+i]};
    row.visualState.textStyle={...row.visualState.textStyle,fontSizePx:font,borderWidthPx:5,glowWidthPx:7};
    if(i===1){row.endFrameExclusive=row.startFrame+6;row.displayFrameCount=6;}
  }
  source.planBytes=text(plan);source.planRef.fileSha256=hash(source.planBytes);
  source.captionContext.baselineRef={...source.planRef,canonicalSha256:canonical(plan)};
  const timeline=JSON.parse(source.timelineBytes);timeline.baseMedia.expectedFrameCount=ids.length*120;
  source.timelineBytes=text(timeline);source.timelineRef.fileSha256=hash(source.timelineBytes);
  const evidence=structuredClone(f.evidence);
  evidence.captions=plan.elements.map((r:any,i:number)=>({...evidence.captions[i],text:r.text,startFrame:r.startFrame,endFrameExclusive:r.endFrameExclusive,eligiblePulsePeakIds:[]}));
  const context=orchestration.createOrchestrationContextV001(source);
  const input=orchestration.createOrchestrationJudgmentInputV001({context,evidence});
  const reply=structuredClone(f.reply);reply.inputSha256=input.inputSha256;
  for(const [i,row] of reply.captions.entries()) {row.semanticRole=i===0?'focus':'normal';row.allowedPresets=[i===0?{preset:'color',scope:'whole-caption'}:{preset:'normal'}];}
  for(const [i,row] of reply.connections.entries()) {row.semanticRole=i%2?'separator':'continuation';row.allowedPresets=[i%2?'soft-separator':'normal-cut'];}
  const state=orchestration.fixOrchestrationJudgmentV001({context,input,replyBytes:text(reply)});
  const view=orchestration.resolveOrchestrationDrawingViewV001({context,state});
  const manifestBinding={path:'runtime/artifacts/synthetic-arbitrary-candidate/files.json',fileSha256:hash('fixture manifest'),sizeBytes:17};
  const adoptionBinding={path:'runtime/artifacts/synthetic-arbitrary-candidate/adoption.json',fileSha256:hash('fixture adoption'),sizeBytes:18};
  const entries=ids.map((instructionId,i)=>({instructionId,decision:i===2?'suppress':'show'}));
  const counts={totalInstructions:ids.length,shownInstructions:ids.length-1,suppressedInstructions:1};
  const selection={schemaVersion:'digest-caption-visibility-selection-v001',mode:'explicit-cue-adoption-v001',
    manifestBinding,adoptionBinding,rendererPlanCanonicalSha256:canonical(view.resolvedPlan),entries,counts};
  const adoption={mode:'explicit-cue-adoption-v001',sourceCandidateManifestBinding:manifestBinding,
    sourceSelectionRecordSha256:view.selectionRecordSha256,sourceClockSha256:view.projection.sourceClockSha256,
    approval:{userMessageId:'TEST-SYNTHETIC-NO-USER',userText:'Fixture only, no real adoption.',sourceThreadId:'TEST-NO-AUTHORITY'},
    decisions:entries.map(row=>({...row,reason:'Explicit synthetic fixture decision; never a duration threshold.'})),
    counts:{totalCues:ids.length,visibleCues:ids.length-1,suppressedCues:1}};
  return {view,source,selection,adoption,manifestBinding,adoptionBinding,plan,
    expected:{frames:view.projection.displayFrameCount,audioSamples:view.projection.displayPlaybackSampleCount,groups:ids.length,atoms:ids.length,cues:ids.length}};
}
test('different ID vocabularies and cue counts preserve the whole clock and an explicitly shown six-frame cue',async()=>{
  for(const ids of [['alpha','omega','tau'],['speech-A','speech-D','speech-H','speech-M','speech-Q']]) {
    const f=staticFixture(ids);const result=await validateApprovedJ16StaticInputV001(f);
    assert.equal(result.logicalCueCount,ids.length);assert.equal(result.visibilityCounts.shownInstructions,ids.length-1);
    assert.equal(f.view.resolvedPlan.elements[1].displayFrameCount,6);assert.equal(f.selection.entries[1].decision,'show');
    assert.equal(f.view.resolvedPlan.elements.length,ids.length);assert.equal(f.view.projection.connections[0].preset,'normal-cut');
    assert.equal(f.view.resolvedPlan.elements[0].visualState.textStyle.fontSizePx,87);
  }
});
test('adoption, all-cue/atom/clock coverage and opaque Core view cannot be substituted',async()=>{
  const edits=[(f:any)=>f.expected.cues--,(f:any)=>f.expected.atoms--,(f:any)=>f.expected.frames--,
    (f:any)=>f.expected.audioSamples--,(f:any)=>f.adoption.decisions[0].decision='suppress',
    (f:any)=>f.adoption.sourceClockSha256='0'.repeat(64),(f:any)=>f.adoption.sourceSelectionRecordSha256='0'.repeat(64),
    (f:any)=>f.adoption.approval.userMessageId='',(f:any)=>f.selection.entries.reverse(),
    (f:any)=>f.adoption.decisions[0].reason='',(f:any)=>f.view=structuredClone(f.view)];
  for(const edit of edits){const f=staticFixture(['custom-4','custom-8','custom-15']);edit(f);await assert.rejects(validateApprovedJ16StaticInputV001(f));}
});
test('static feature gate rejects Pulse, Motion, Panel, unresolved and black separator without fallback',()=>{
  const f=staticFixture(['no-fixed-number-x','no-fixed-number-y','no-fixed-number-z']);
  assert.equal(stage.assertJ16StaticManufacturingViewV001(f.view),f.view);
  const edits=[(v:any)=>v.resolvedPlan.elements[0].presentationPulse={},(v:any)=>v.resolvedPlan.elements[0].presentationMotion={},
    (v:any)=>v.resolvedPlan.elements[0].presentationPanel={},(v:any)=>v.resolution.counts.captions.unresolved=1,
    (v:any)=>v.projection.connections[0].preset='black-separator'];
  for(const edit of edits){const v=structuredClone(f.view);edit(v);assert.throws(()=>stage.assertJ16StaticManufacturingViewV001(v));}
});
test('J16 binds its original Core style instead of applying a different Digest typography formula',()=>{
  const f=staticFixture(['font-input-a','font-input-b','font-input-c'],133),style=projectApprovedJ16BoundCoreStyleV001(structuredClone(f.plan),f.plan);
  assert.equal(style.instructions[0].visualState.textStyle.fontSizePx,133);
  assert.equal(style.instructions[0].visualState.textStyle.borderWidthPx,5);assert.equal(style.instructions[0].visualState.textStyle.glowWidthPx,7);
  const changed=structuredClone(f.plan);changed.elements[0].visualState.textStyle.glowWidthPx=4;
  assert.throws(()=>projectApprovedJ16BoundCoreStyleV001(changed,f.plan));
  assert.throws(()=>projectApprovedJ16BoundCoreStyleV001({fontSizePx:133},f.plan));
});

/** Reads the saved candidate through the real opaque job/input readers. These
 * controls qualify JSON only: no owner, permit, environment or media operation.
 * All original artifacts remain read-only; only the UUID fixture is removed. */
test('saved J16 input qualifies through the opaque byte boundary and re-reads the identical display selection',async()=>{
  const {readFile,writeFile,mkdir,rm,lstat,realpath}=await import('node:fs/promises');
  const {randomUUID}=await import('node:crypto');
  const {execFile}=await import('node:child_process');
  const {promisify}=await import('node:util');
  const exec=promisify(execFile),id='test-approved-j16-'+randomUUID(),relative='runtime/artifacts/'+id;
  const jobModule=await import('./digest-approved-job-v001.js');
  const inputModule=await import('./digest-approved-inputs-v001.js');
  const runner=await import('./digest-approved-job-runner-v001.js');
  const savedStorage=JSON.parse(await readFile(root+'/runtime/artifacts/digest-SJvP9jhEdyI-20261004-v001/inputs-v001/approved-display-job-v001/job.json','utf8')).storage;
  const storage={...savedStorage,guestDevice:(await lstat(savedStorage.guestRoot)).dev,hostDevice:(await lstat(savedStorage.hostRoot)).dev};
  assert.equal(await realpath(storage.guestRoot),storage.guestRoot);
  await exec('git',['check-ignore','-q',relative+'/job.json'],{cwd:root});
  const controlDirectory=root+'/'+relative,currentPrefix=relative+'/current-inputs-v001',inputDirectory=storage.guestRoot+'/'+currentPrefix;
  let ownsControl=false,ownsInput=false;
  try {
    await mkdir(controlDirectory);ownsControl=true;
    await mkdir(storage.guestRoot+'/'+relative);ownsInput=true;await mkdir(inputDirectory);
    const bind=async(p:string,base=root)=>{const b=await readFile(base+'/'+p);return {path:p,fileSha256:createHash('sha256').update(b).digest('hex'),sizeBytes:b.length};};
    const copy=async(name:string,p:string)=>{const b=await readFile(root+'/'+p);await writeFile(inputDirectory+'/'+name,b,{flag:'wx',mode:0o600});return bind(currentPrefix+'/'+name,storage.guestRoot);};
    const original='runtime/artifacts/openai-decisions-j16-staged-v001/live-five-scenes-20261009-v001-candidate/files.json';
    const adoptionRoot='runtime/artifacts/openai-decisions-j16-staged-v001/cue69-explicit-visibility-20261010-v001';
    const candidateManifestBinding={...await bind(original),schemaVersion:'presentation-j16-live-candidate-files-v001'};
    const visibilitySelectionBinding=await copy('selection.json',adoptionRoot+'/visibility-selection.json');
    const visibilityAdoptionBinding=await copy('adoption.json',adoptionRoot+'/individual-adoption-record.json');
    const closure=await stage.readJ16LiveCandidateClosureV001(path.dirname(root+'/'+original));
    const typographySettingsBinding=await copy('original-core-plan.json',path.relative(root,closure.source.planRef.path));
    const rendererTemplateBinding=await copy('original-renderer-job.json','runtime/artifacts/digest-new-material-20260926-v001/caption-attempt-003/renderer-job.json');
    const normal=JSON.parse(closure.source.planBytes),timeline=JSON.parse(closure.source.timelineBytes);
    const codePaths=['runner/src/digest-approved-job-v001.ts','runner/src/digest-approved-job-runner-v001.ts','runner/src/digest-approved-inputs-v001.ts',
      'runner/src/digest-formal-handoff-v001.ts','runner/src/digest-caption-registration-migration-v001.ts','runner/src/digest-approved-record-finalize-v001.ts',
      'evals/clip_composition/adopted_media_manufacturing_v001.mts','evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs',
      'evals/clip_composition/run_presentation_instruction_renderer_job_v002.ts','evals/clip_composition/render_presentation_v002.mjs',
      'tools/digest-quality/original-resolution-low-memory-composite.mjs','tools/digest-quality/original-resolution-full-supervisor-v002.py',
      'evals/clip_composition/digest_representative_completion_v001.mjs',...['presentation_j16_staged_boundary_v001.mjs','presentation_orchestration_v001.mjs','presentation_orchestration_projection_v001.mjs','presentation_orchestration_background_v001.mjs'].map(p=>'evals/clip_composition/'+p)];
    const nodePath=await realpath(process.execPath),nodeBytes=await readFile(nodePath);
    const job={schemaVersion:'digest-approved-job-v002',planId:id,outputRoot:relative+'/attempt-001',
      inputs:{kind:'j16-staged-static-v001',inputRoot:storage.guestRoot,inputPrefix:currentPrefix,candidateManifestBinding,visibilitySelectionBinding,visibilityAdoptionBinding,typographySettingsBinding,rendererTemplateBinding},storage,
      expected:{frames:closure.view.projection.displayFrameCount,audioSamples:closure.view.projection.displayPlaybackSampleCount,
        groups:timeline.segments.length,atoms:normal.elements.flatMap((r:any)=>r.targetProvenance.sourceAtomIds).length,cues:normal.elements.length},
      implementation:{sha:(await exec('git',['rev-parse','HEAD'],{cwd:root})).stdout.trim(),bindings:await Promise.all(codePaths.map(p=>bind(p))),nodeBinding:{path:nodePath,fileSha256:createHash('sha256').update(nodeBytes).digest('hex'),sizeBytes:nodeBytes.length}},
      guard:{...DIGEST_APPROVED_JOB_GUARD_V001},allocationBudget:{baseBuildBytes:1,rendererPreparationBytes:1},
      verificationPolicy:{schemaVersion:'digest-representative-verification-policy-v001',mode:'representative-plus-rules-v001',representativeInstructionIds:[normal.elements[0].instructionId],permittedMethods:['still-frame'],confirmationRecordPath:relative+'/attempt-001/confirmation.json'}};
    const saveControl=async(name:string,value:unknown)=>{await writeFile(controlDirectory+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});const b=await bind(relative+'/'+name);return {...b,path:root+'/'+b.path};};
    const jobBinding=await saveControl('job.json',job);
    const authorization={schemaVersion:'digest-approved-job-authorization-v002',recordId:id+'-synthetic-json-only',
      userApproval:{at:new Date().toISOString(),messageId:'TEST-SYNTHETIC-NO-HUMAN-GRANT',sourceThreadId:'TEST-JSON-QUALIFICATION-ONLY',text:'SYNTHETIC TEST CONTROLS ONLY. No manufacturing grant; no owner, permit, supervisor, environment or media operation.'},
      actions:['manufacture-one-approved-plan'],jobBinding,planId:job.planId,manifestBinding:candidateManifestBinding,typographySettingsBinding,
      inputKind:job.inputs.kind,visibilitySelectionBinding,visibilityAdoptionBinding,rendererTemplateBinding,
      outputRoot:job.outputRoot,storage,guard:job.guard,implementation:job.implementation,normalCandidates:1,verificationPolicy:job.verificationPolicy};
    const authorizationBinding=await saveControl('synthetic-json-only-authorization.json',authorization);
    const q=await jobModule.readQualifiedDigestApprovedJobV001({workspaceRoot:root,jobBinding,authorizationBinding,
      trustedJobSha256:jobBinding.fileSha256,trustedAuthorizationSha256:authorizationBinding.fileSha256});
    const inputs=await inputModule.readApprovedDigestInputsV001(q);
    await inputModule.assertApprovedDigestInputsV001(inputs,q);
    assert.equal(inputs.kind,'j16-staged-static-v001');assert.equal(inputs.normalPlan.elements.length,job.expected.cues);
    assert.equal(inputs.j16View.resolvedPlan.elements.length,job.expected.cues);
    assert.deepEqual(inputs.normalPlan,normal);assert.deepEqual(inputs.typographySettings,normal);
    const selected=await inputModule.buildApprovedDigestCaptionVisibilitySelectionV001(inputs,q,inputs.j16View.resolvedPlan);
    assert(selected,'J16 explicit selection must be present');
    const reread=await inputModule.readApprovedDigestCaptionVisibilitySelectionV001(q,inputs.j16View.resolvedPlan);
    assert.deepEqual(reread,selected);assert.deepEqual(selected.entries,inputs.visibilitySelection.entries);
    assert.deepEqual(selected.counts,inputs.visibilitySelection.counts);
    assert.deepEqual(selected.adoptionBinding,visibilityAdoptionBinding);
    assert.deepEqual(selected.manifestBinding,candidateManifestBinding);
    for(const [i,row] of inputs.j16View.resolvedPlan.elements.entries()) {
      assert.equal(row.text,normal.elements[i].text);assert.deepEqual(row.targetProvenance,normal.elements[i].targetProvenance);
    }
    await assert.rejects(inputModule.readApprovedDigestInputsV001({...q}),/QUALIFIED_APPROVED_DIGEST_JOB_REQUIRED/);
    await assert.rejects(inputModule.assertApprovedDigestInputsV001(structuredClone(inputs),q),/QUALIFIED_APPROVED_DIGEST_INPUTS_REQUIRED/);
    await assert.rejects(runner.resolveQualifiedApprovedJ16DrawingV001({approvedJob:q,outputRoot:job.outputRoot,assertCurrent:async()=>{}}),/QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED/);
    const altered=structuredClone(inputs.j16View.resolvedPlan);altered.elements[0].endFrameExclusive++;
    await assert.rejects(inputModule.buildApprovedDigestCaptionVisibilitySelectionV001(inputs,q,altered));
    // Read the actual formal timeline independently, and deny substituted
    // bytes/paths without changing the original timeline or candidate files.
    const templatePath=inputDirectory+'/original-renderer-job.json',templateBytes=await readFile(templatePath);
    const template=JSON.parse(templateBytes.toString()),formalTimeline=template.cropAppliedBaseMedia.timeline;
    assert.deepEqual(await q.readBinding(formalTimeline),timeline);
    await assert.rejects(q.readBinding({...formalTimeline,fileSha256:'0'.repeat(64)}),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
    await assert.rejects(q.readBinding({...formalTimeline,path:currentPrefix+'/missing-timeline.json'}),(e:any)=>e.code==='ENOENT');
    await assert.rejects(q.readBinding({...formalTimeline,path:'../timeline.json'}),/APPROVED_JOB_PATH_INVALID/);
    template.cropAppliedBaseMedia.timeline={...formalTimeline,path:currentPrefix+'/substituted-timeline.json'};
    await writeFile(templatePath,JSON.stringify(template)+'\n');
    await assert.rejects(inputModule.assertApprovedDigestInputsV001(inputs,q),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
    await writeFile(templatePath,templateBytes);await inputModule.assertApprovedDigestInputsV001(inputs,q);
    await assert.rejects(q.readBinding({...candidateManifestBinding,fileSha256:'0'.repeat(64)}),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
    // Even a self-consistent synthetic JSON-only control cannot relabel a
    // copied saved manifest as another original candidate directory.
    const originalManifestBytes=await readFile(root+'/'+original);
    await writeFile(controlDirectory+'/files.json',originalManifestBytes,{flag:'wx',mode:0o600});
    const movedManifestBinding={...candidateManifestBinding,path:relative+'/files.json'};
    const movedJob={...job,inputs:{...job.inputs,candidateManifestBinding:movedManifestBinding}};
    const movedJobBinding=await saveControl('moved-manifest-job.json',movedJob);
    const movedAuthorization={...authorization,jobBinding:movedJobBinding,manifestBinding:movedManifestBinding};
    const movedAuthorizationBinding=await saveControl('moved-manifest-synthetic-authorization.json',movedAuthorization);
    const moved=await jobModule.readQualifiedDigestApprovedJobV001({workspaceRoot:root,jobBinding:movedJobBinding,authorizationBinding:movedAuthorizationBinding,
      trustedJobSha256:movedJobBinding.fileSha256,trustedAuthorizationSha256:movedAuthorizationBinding.fileSha256});
    await assert.rejects(inputModule.readApprovedDigestInputsV001(moved),/state.json/);
    const selectionPath=inputDirectory+'/selection.json',originalBytes=await readFile(selectionPath);
    await writeFile(selectionPath,Buffer.concat([originalBytes,Buffer.from(' ')]));
    await assert.rejects(q.assertCurrent(),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
    await assert.rejects(inputModule.assertApprovedDigestInputsV001(inputs,q),/APPROVED_JOB_ACTUAL_HASH_CHANGED/);
    await assert.rejects(lstat(storage.guestRoot+'/'+job.outputRoot),(e:any)=>e.code==='ENOENT');
    await closure.assertCurrent();
  } finally {
    if(ownsInput)await rm(storage.guestRoot+'/'+relative,{recursive:true});
    if(ownsControl)await rm(controlDirectory,{recursive:true});
  }
});

/** Q4 C-all request and raw-first reply acceptance. No model/API invocation. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAutoPresentationContextV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {createOrchestrationContextV001,createOrchestrationJudgmentInputV001,fixOrchestrationJudgmentV001,resolveOrchestrationDrawingViewV001,
  exportOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)), repo=path.resolve(here,'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const shaFile=async file=>{const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');};
const CAL_BASE_SHA='0de24b8c9b18d33d38e163f0e1eaed8a35aaeea4b2411c507d7947c992545c04';

async function sourceContext(source) {
  assert.equal(source.mediaRef.fileSha256,CAL_BASE_SHA,'Q4 fresh route is explicitly bound to C-all base media');
  assert.equal(source.playbackSampleRate,48000); assert.equal(source.observationSampleRate,16000);
  const timing=source.captionContext.pulseTimingEvidence;
  const refs=[source.planRef,source.timelineRef,source.mediaRef,source.captionContext.decisionInputRef,
    ...(timing?[timing.sourceRef,timing.candidatesRef,timing.peaksRef]:[])];
  for(const ref of refs)assert.equal(await shaFile(ref.path),ref.fileSha256,'Q4 saved source bytes changed: '+ref.path);
  const loaded=await loadAutoPresentationContextV001({baselinePath:source.planRef.path,
    decisionInputPath:source.captionContext.decisionInputRef.path});
  assert.deepEqual(loaded.context,source.captionContext,'Q4 actual source context differs');
  const context=createOrchestrationContextV001(source);
  assert.equal(context.captionIds.length,325); assert.equal(context.connectionIds.length,11);
  return context;
}

export async function verifyQ4RequestFiles(directory) {
  const request=await json(path.join(directory,'request.json'));
  assert.equal(request.schemaVersion,'digest-quality-q4-request-v001');
  const files={};
  for(const name of ['source-bindings.json','judgment-input.json','judgment-prompt.md']) {
    files[name]=await readFile(path.join(directory,name));
    assert.equal(hash(files[name]),request.files[name],`Q4 saved request differs: ${name}`);
  }
  const source=JSON.parse(files['source-bindings.json']),input=JSON.parse(files['judgment-input.json']);
  assert.equal(input.inputSha256,request.inputSha256);
  assert.equal(source.mediaRef.fileSha256,request.baseMediaSha256);
  assert.equal(input.connectionPolicy,'preserve-normal-cut','C-all existing connections must remain fixed');
  return {source,input,request};
}
export async function verifyQ4Request(directory) {
  const checked=await verifyQ4RequestFiles(directory);
  const context=await sourceContext(checked.source);
  assertQ4FreshInput(context,checked.input);
  return {...checked,context};
}
export function assertQ4FreshInput(context,input) {
  const evidence=Object.fromEntries(['productionPurpose','captions','contexts','observations','audioEvidence','audioCandidates'].map(key=>[key,input[key]]));
  const expected=createOrchestrationJudgmentInputV001({context,evidence,connectionPolicy:'preserve-normal-cut'});
  assert.deepEqual(input,expected,'Q4 fresh input must match current bound source, all evidence, mode and hash');
}

export async function prepareQ4Request({sourcePath,inputPath,outputDirectory}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});
  const sourceBytes=await readFile(sourcePath),inputBytes=await readFile(inputPath),prompt=await readFile(path.join(here,'q4-judgment-prompt.md'));
  const source=JSON.parse(sourceBytes),input=JSON.parse(inputBytes);
  const context=await sourceContext(source);
  assert.equal(input.schemaVersion,'presentation-orchestration-judgment-input-v002');
  assert.equal(input.connectionPolicy,'preserve-normal-cut');
  assertQ4FreshInput(context,input);
  await mkdir(outputDirectory);
  const files={'source-bindings.json':sourceBytes,'judgment-input.json':inputBytes,'judgment-prompt.md':prompt};
  for(const [name,bytes]of Object.entries(files))await writeFile(path.join(outputDirectory,name),bytes,{flag:'wx'});
  const request={schemaVersion:'digest-quality-q4-request-v001',kind:'fresh-codex-meaning-judgment',
    files:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,hash(bytes)])),
    inputSha256:input.inputSha256,baseMediaSha256:source.mediaRef.fileSha256,captions:input.captions.length,
    priorConcretePresentationLabelsProvided:false,approvedHumanPolicyProvided:true,
    newExternalMediaTransmission:false,humanQualityApproved:false};
  await save(path.join(outputDirectory,'request.json'),request);
  await verifyQ4Request(outputDirectory);
  return request;
}

export async function acceptQ4Reply({directory,replyPath}) {
  const raw=await readFile(replyPath);
  await writeFile(path.join(directory,'judgment-reply.raw.json'),raw,{flag:'wx'});
  try {
    const {source,input,context}=await verifyQ4Request(directory);
    const state=fixOrchestrationJudgmentV001({context,input,replyBytes:raw});
    const view=resolveOrchestrationDrawingViewV001({context,state});
    assert(view.resolution.connections.every(row=>row.preset==='normal-cut'),'C-all connection changed');
    assert.equal(view.projection.displayFrameCount,44408);
    assert.equal(view.projection.sourceClock.playbackSampleRate,48000);
    for(const [name,value]of Object.entries(state))await save(path.join(directory,name+'.json'),value);
    await save(path.join(directory,'drawing-evidence.json'),exportOrchestrationDrawingViewEvidenceV001(view));
    const result={schemaVersion:'digest-quality-q4-accepted-v001',status:'complete',rawReplySha256:hash(raw),
      inputSha256:input.inputSha256,sourceMediaSha256:source.mediaRef.fileSha256,
      selectionRecordSha256:state.selectionRecord.recordSha256,viewSha256:view.viewSha256,
      counts:view.resolution.counts,connectionsPreserved:true,humanQualityApproved:false};
    await save(path.join(directory,'judgment-validation.json'),result);
    return result;
  }catch(error){await save(path.join(directory,'judgment-rejection.json'),{rawReplySha256:hash(raw),message:error.message,outputVideoGenerated:false});throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,...args]=process.argv.slice(2);
  const action=command==='prepare'&&args.length===3?()=>prepareQ4Request({sourcePath:path.resolve(args[0]),inputPath:path.resolve(args[1]),outputDirectory:path.resolve(args[2])})
    :command==='accept'&&args.length===2?()=>acceptQ4Reply({directory:path.resolve(args[0]),replyPath:path.resolve(args[1])})
    :()=>{throw new Error('Usage: q4-run.mjs prepare <source.json> <input.json> <new-directory> | accept <request-directory> <raw-reply.json>');};
  Promise.resolve().then(action).then(value=>console.log(JSON.stringify(value,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}

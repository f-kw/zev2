/** Recover this run's complete QC evidence from successful child-process records and their unchanged outputs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile, stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {fileSha256V002} from './presentation_renderer_qc_v002.mjs';
import {buildPresentationNativeFrameQcRecipeV001, buildPresentationNativeFrameBatchPlanV001,
  readPresentationNativeFrameBatchOutputsV001, buildPresentationNativeLayerPlanV001,
  buildPresentationNativeFrameBatchExtractionArgumentsV001, buildPresentationNativeLayerArgumentsV001,
  buildPresentationNativeLayerDecodeArgumentsV001, buildPresentationNativeReferenceExecutionV001,
  buildPresentationNativeReferenceArgumentsV001, classifyPresentationNativeReferenceFilesV001,
  validatePresentationNativeFrameQcEvidenceV001, verifyPresentationNativeInputRefV001,
  PRESENTATION_NATIVE_FRAME_QC_SCHEMA_V001 as schema, PRESENTATION_NATIVE_FRAME_QC_BASIS_V001 as basis,
  PRESENTATION_NATIVE_FRAME_EXECUTION_V001 as method} from './presentation_native_frame_qc_v001.mjs';
import {getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from './presentation_caption_motion_v001.mjs';

const hash = (bytes: any) => createHash('sha256').update(bytes).digest('hex');
const digest = (value: any) => hash(canonicalJson(value));
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const ref = async (p: string) => ({path: p, fileSha256: await fileSha256V002(p)});
const checked = (r: any) => ({role: r.role, path: r.path, fileSha256: r.fileSha256,
  ...(r.canonicalSha256 === undefined ? {} : {canonicalSha256: r.canonicalSha256})});

export async function recoverNativeEvidence({c, qcRoot, tools}: any) {
  const started = performance.now();
  const failure = await read(path.join(qcRoot, 'qc-execution.json'));
  assert.equal(failure.status, 'failed'); assert.match(failure.error, /Invalid string length/);
  const failureLog = await readFile(path.join(path.dirname(qcRoot), '..', 'qc-resume-attempt-002.log'), 'utf8');
  assert.match(failureLog, /at save .*run_new_material_digest_20260926_qc_resume/);
  // The original inspector completed its post-read hashes before the caller attempted JSON.stringify.
  const work = path.join(qcRoot, 'native/native-frame-qc-Dddalc');
  const orchestrationInput = await read(path.join(path.dirname(c.video), '../scratch/native-qc-preparation/orchestration-input.json'));
  const baselinePlan = c.view.projectedNormalPlan, plan = c.plan;
  const recipe = buildPresentationNativeFrameQcRecipeV001({plan, baselinePlan, records: c.prepared.records, orchestrationDrawingView: c.view});
  assert.equal(recipe.samples.length, 424);
  const declared = c.prepared.provenance.inputRefs.map(checked);
  const normalRef = declared.find((r: any) => r.role === 'baseline-plan');
  const planRef = declared.find((r: any) => r.role === 'plan');
  const decisionRef = declared.find((r: any) => r.role === 'orchestration-input');
  assert(normalRef && planRef && decisionRef);
  const originalBaseline = await read(normalRef.path);
  const refs = [...declared.filter((r: any) => !['plan','baseline-plan','auto-input','orchestration-input'].includes(r.role)),
    {...planRef, canonicalSha256: digest(plan)}, {...normalRef, canonicalSha256: digest(originalBaseline)},
    {...decisionRef, canonicalSha256: digest(orchestrationInput)},
    checked({role: 'base-media', ...c.background.outputs.background}), checked({role: 'completed-media', ...c.videoRef}),
    {role: 'tool-ffmpeg', ...await ref(tools.ffmpegPath)}, {role: 'tool-imagemagick', ...await ref(tools.imageMagickPath)},
    ...recipe.sceneBindings.flatMap((g: any) => [...g.states, ...g.alternates]).map((b: any) => ({role: 'png-' + b.bindingId, path: b.pngPath, fileSha256: b.pngSha256}))]
    .sort((a: any,b: any) => a.role.localeCompare(b.role, 'en'));
  // Match the original byte-wise role ordering, including punctuation.
  refs.sort((a: any,b: any) => a.role < b.role ? -1 : a.role > b.role ? 1 : 0);
  assert.equal(new Set(refs.map((r: any) => r.role)).size, refs.length);
  const manifest: any = {planCanonicalSha256: digest(plan), baselinePlanCanonicalSha256: digest(baselinePlan),
    orchestrationInputCanonicalSha256: digest(orchestrationInput), inputRefs: refs, inputRefsCanonicalSha256: digest(refs), before: [], after: []};
  for (const r of refs) {await verifyPresentationNativeInputRefV001(r); manifest.before.push({role:r.role,path:r.path,fileSha256:r.fileSha256});}
  const frameExtraction = buildPresentationNativeFrameBatchPlanV001({samples: recipe.samples, directory: path.join(work,'frames')});
  const nativeLayers = buildPresentationNativeLayerPlanV001({samples: recipe.samples, sceneBindings: recipe.sceneBindings,
    directory: path.join(work,'layers'), canvas: plan.canvas});
  const referenceDirectory = path.join(work,'references');
  const directories = (await readdir(path.join(qcRoot,'processes'))).sort();
  const processes: any[] = [], outputArtifacts: any[] = [], versions: any = {}; let cursor=0;
  async function recorded(command: string, args: string[], purpose: string, stdout = Buffer.alloc(0)) {
    const directory = path.join(qcRoot,'processes',directories[cursor++]);
    const request = await read(path.join(directory,'request.json')), timing = await read(path.join(directory,'timing.json'));
    assert.equal(request.command,command); assert.deepEqual(request.args,args);
    assert.equal(timing.label,'native-qc-'+purpose); assert.equal(timing.code,0); assert.equal(timing.signal,null);
    assert.equal((await readFile(path.join(directory,'exit-code.txt'),'utf8')).trim(),'0');
    assert.equal((await readFile(path.join(directory,'signal.txt'),'utf8')).trim(),'none');
    const stderr=await readFile(path.join(directory,'stderr.txt'));
    processes.push({purpose,command,args,argumentsCanonicalSha256:digest(args),wallClockMs:timing.childMilliseconds,
      code:0,signal:null,stdoutSha256:hash(stdout),stderrSha256:hash(stderr)});
  }
  for (const [name, command] of [['ffmpeg',tools.ffmpegPath],['imageMagick',tools.imageMagickPath]]) {
    const observation=await promisify(execFile)(command,['-version'],{encoding:'buffer'});
    versions[name]=observation.stdout.toString('utf8');
    await recorded(command,['-version'],'tool-version',observation.stdout);
  }
  const frames=frameExtraction.frames.map((r:any)=>r.mediaFrame);
  await recorded(tools.ffmpegPath,buildPresentationNativeFrameBatchExtractionArgumentsV001(c.background.outputs.background.path,frames,frameExtraction.baseOutputPattern),'source-frames-extract');
  await recorded(tools.ffmpegPath,buildPresentationNativeFrameBatchExtractionArgumentsV001(c.video,frames,frameExtraction.completedOutputPattern),'completed-frames-extract');
  const extracted=new Map();
  for (const row of await readPresentationNativeFrameBatchOutputsV001(frameExtraction)) {
    extracted.set(row.frame,{baseFrame:row.baseFrame,completedFrame:row.completedFrame});outputArtifacts.push(row.baseFrame,row.completedFrame);
  }
  const groups=(layers:any[])=>{const m=new Map();for(const l of layers){if(!m.has(l.sourceSha256))m.set(l.sourceSha256,[]);m.get(l.sourceSha256).push(l);}return [...m.values()];};
  for (const group of groups(nativeLayers.layers.filter((r:any)=>r.generated))) {
    await recorded(tools.ffmpegPath,buildPresentationNativeLayerArgumentsV001(group),'native-layer-prepare');
    for(const layer of group)outputArtifacts.push(await ref(layer.outputPath));
  }
  for (const group of groups(nativeLayers.layers)) {
    await recorded(tools.ffmpegPath,buildPresentationNativeLayerDecodeArgumentsV001(group),'native-layer-decode');
    for(const layer of group){assert.equal((await stat(layer.decodedPath)).size,layer.width*layer.height*4);outputArtifacts.push(await ref(layer.decodedPath));}
  }
  const samples:any[]=[], referenceFiles=new Map(), distanceCache=new Map(), counts:any={};
  for (const [i,original] of recipe.samples.entries()) {
    const sample={...original,...extracted.get(original.frame)}, crop=sample.crop;
    const cropArgs=[sample.completedFrame.path,'-crop',crop.width+'x'+crop.height+'+'+crop.left+'+'+crop.top,'+repage','-alpha','off','-depth','8','rgb:-'];
    const completedRgb=await ref(path.join(work,'sample-'+i+'-completed.rgb')), bytes=await readFile(completedRgb.path);
    assert.equal(bytes.length,crop.width*crop.height*3);
    await recorded(tools.imageMagickPath,cropArgs,'completed-rgb-crop',bytes);outputArtifacts.push(completedRgb);
    const executions=buildPresentationNativeReferenceExecutionV001({sample,sceneBindings:recipe.sceneBindings,nativeLayers,directory:referenceDirectory});
    const fresh=[...new Map(executions.filter((r:any)=>!referenceFiles.has(r.key)).map((r:any)=>[r.key,r])).values()] as any[];
    if(fresh.length){
      await recorded(tools.ffmpegPath,buildPresentationNativeReferenceArgumentsV001({sample:{...sample,references:fresh.map(r=>r.reference)},sceneBindings:recipe.sceneBindings,baseFramePath:sample.baseFrame.path,nativeLayers,outputPaths:fresh.map(r=>r.path)}),'native-reference-composite');
      for(const row of fresh){assert.equal((await stat(row.path)).size,bytes.length);const r=await ref(row.path);referenceFiles.set(row.key,r);outputArtifacts.push(r);}
    }
    const decision=await classifyPresentationNativeReferenceFilesV001({completedRgb:bytes,completedRgbRef:completedRgb,
      references:executions.map((r:any)=>({id:r.reference.id,...referenceFiles.get(r.key)})),distanceCache,counts});
    samples.push({...sample,completedRgb,completedRgbSha256:completedRgb.fileSha256,...decision,
      references:sample.references.map((r:any,index:number)=>({...r,...decision.references[index],rgbPath:executions[index].path}))});
    if((i+1)%10===0)console.log(JSON.stringify({reclassifiedFrames:i+1,total:424,newVideoEncodes:0,newReferenceComposites:0}));
  }
  assert.equal(cursor,directories.length);
  for(const r of refs){await verifyPresentationNativeInputRefV001(r);manifest.after.push({role:r.role,path:r.path,fileSha256:r.fileSha256});}
  for(const artifact of outputArtifacts)assert.equal(hash(await readFile(artifact.path)),artifact.fileSha256);
  const inspections=c.prepared.records.map((record:any)=>{
    const element=record.element;
    const representativeFrame=element.presentationPulse ? getPresentationPulseProgramV001({element,canvas:plan.canvas}).maximumFrame
      : element.presentationMotion ? getPresentationCaptionMotionProgramV001({element,canvas:plan.canvas}).representativeFrame
      : element.startFrame+Math.floor(element.displayFrameCount/2);
    const result={...structuredClone(record.inspection),visibilityComparisonBasis:basis,representativeFrame,nativeFrameQc:{schemaVersion:schema,instructionId:element.instructionId,baselinePlan,
      autoPresentation:undefined,orchestrationInput,inputManifest:manifest,renderRange:null,sceneBindings:recipe.sceneBindings,samples:samples.filter(s=>s.instructionId===element.instructionId)}};
    delete result.changedPixelsAgainstInstructionOmittedFrame;return result;
  });
  const violations=inspections.flatMap((inspection:any)=>validatePresentationNativeFrameQcEvidenceV001({plan,inspection,renderRange:null}).violations);
  const recovery={newVideoEncodes:0,newOverlayRenders:0,newReferenceComposites:0,reclassifiedFrames:samples.length,
    historicalProcessCount:processes.length,toolVersionReadsRepeated:2,wallClockMs:performance.now()-started,
    method:'Reclassified preserved RGB with current unchanged validators; historical successful commands/outputs verified; no assertion that original serialization succeeded'};
  await writeFile(path.join(qcRoot,'evidence-recovery-summary.json'),JSON.stringify(recovery,null,2)+'\n',{flag:'wx'});
  return {status:violations.length?'failed':'passed',violations,inspections,
    evidence:{schemaVersion:schema,inputManifest:manifest,baselinePlan,autoPresentation:undefined,orchestrationInput,renderRange:null,
      sceneBindings:recipe.sceneBindings,samples,processes,executionMethod:method,frameExtraction,nativeLayers,referenceDirectory,outputArtifacts,executableVersions:versions},
    performance:recovery};
}

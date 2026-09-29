/** This saved-material 7B execution uses finite explicit source decisions.
 * No STT, new Prospect selection, external AI, full-source proxy or 1080p run. */
import assert from 'node:assert/strict';
import {readFile,mkdir,realpath,statfs} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256} from './clock.mjs';
import {createDigestStructureAutoPlanV001,createDigestStructureOverridesV001,resolveDigestStructureV001,
  exportDigestStructureStateV001,restoreDigestStructureStateV001,editDigestStructureOverrideV001,resetDigestStructureOverrideV001} from './digest-structure-policy.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save,
  digestStructureNewCaptionInputV001,readDigestStructureDrawingEvidenceV001} from './digest-structure-evidence.mjs';
import {buildDigestStructureCaptionPlansV001,createDigestStructureDrawingViewV001,digestStructureConnectionsV001} from './digest-structure-view.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001} from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const directory=path.join(root,'runtime/artifacts/digest-structure-20260929-v001');
const oldRoot=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const write=(name,value)=>save(path.join(directory,name),value);
const plain=({path,fileSha256})=>({path,fileSha256});
const disk=async()=>{const s=await statfs(root);return {observedAt:new Date().toISOString(),freeBytes:s.bavail*s.bsize};};
const gitHead=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();

async function original() {
  const job=await json(path.join(root,'runtime/artifacts/caption-readability-full-20260929-v001/job.json'));
  await verify(job.renderOptions.drawingEvidenceRef);
  await verifyEditedOrchestrationDrawingRulesRefV001(job.renderOptions.drawingRulesRef);
  return {job,view:restoreOrchestrationDrawingViewEvidenceV001(await json(job.renderOptions.drawingEvidenceRef.path))};
}
async function state() {
  const saved=await json(path.join(directory,'structure-state.json'));
  return {saved,...restoreDigestStructureStateV001({saved,
    transcriptBytes:await readFile(saved.autoPlan.transcriptRef.path),priorEditPlanBytes:await readFile(saved.autoPlan.priorEditPlanRef.path)})};
}
async function prepare() {
  assert.equal(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(),'main');
  const transcriptPath=path.join(oldRoot,'transcript.json'),priorPath=path.join(oldRoot,'edit-plan.json');
  const transcript=await json(transcriptPath),prior=await json(priorPath);
  const inspectionPath=path.join(oldRoot,'base-attempt-002/source-media-inspection.json'),inspection=await json(inspectionPath);
  const rowsFor=ids=>transcript.segments.filter(s=>ids.includes(s.id));
  const extra=(role,a,b,reason)=>{const rows=transcript.segments.filter(s=>s.id>=a&&s.id<=b);return {
    segmentId:'structure-'+role,candidateId:null,role,sourceStartMs:rows[0].startMs,sourceEndMs:rows.at(-1).endMs,
    sourceSegmentIds:rows.map(s=>s.id),reason,evidence:{sourceSegmentIds:rows.map(s=>s.id),excerpt:rows.map(s=>s.text).join('')}};};
  const segments=[extra('intro',68,172,'ホラーゲームを始める説明と心霊現象の噂への反応。犬がお化けから守る話へつながる。'),
    ...prior.segments.map((s,i)=>({...s,role:i<3?'main':i===3?'exclude-goods':'exclude-superchat',
      reason:i<3?'採用済み本編を内部変更せず維持。':i===3?'バッグの販売・使い方の紹介はホラー監視ゲームの本編に直接関係しない。':'スパチャ読みに入った後のダンス質問と回答は今回の本編に直接関係しない。',
      evidence:{sourceSegmentIds:s.sourceSegmentIds,excerpt:rowsFor(s.sourceSegmentIds).map(r=>r.text).join('')}})),
    extra('closure',43937,43984,'配信の終了挨拶と「お化けには気をつけてね」。ゲームクリア宣言ではない。後半除外の解除時も元時刻順を保持。')];
  const sourceRef=await bind(path.join(oldRoot,'source/source-video.mp4'));
  assert.equal(sourceRef.fileSha256,inspection.sourceVideoBinding.fileSha256);
  const autoPlan=createDigestStructureAutoPlanV001({sourceRef,transcriptRef:await bind(transcriptPath),
    transcriptBytes:await readFile(transcriptPath),priorEditPlanRef:await bind(priorPath),priorEditPlanBytes:await readFile(priorPath),
    theme:'夏のホラー監視ゲームと、その怖さに対する宝鐘マリンの反応',segments,
    sourceClock:{fps:inspection.media.fps,decodedFrameCount:inspection.media.decodedFrameCount,
      logicalFrameCount:inspection.media.logicalFrameCount,presentationOffsetMs:inspection.media.videoClock.presentationOffsetMs},audioClock:inspection.media.audioClock});
  const overrides=createDigestStructureOverridesV001({autoPlan}),resolution=resolveDigestStructureV001({autoPlan,overrides});
  await mkdir(directory,{recursive:true});
  const saved=exportDigestStructureStateV001({autoPlan,overrides});
  for(const [file,data] of [['structure-state.json',saved],['structure-resolution.json',resolution]]) {
    try {assert.deepEqual(await json(path.join(directory,file)),data,'existing selection differs');}
    catch(error){if(error.code!=='ENOENT')throw error;await write(file,data);}
  }
  const old=await original(),profileId='dev-proxy-540p-v001';
  const tools={ffmpegPath:await realpath('/opt/homebrew/bin/ffmpeg'),ffprobePath:await realpath('/opt/homebrew/bin/ffprobe'),
    imageMagickPath:await realpath('/opt/homebrew/bin/magick'),remotionPath:path.join(root,'runner/node_modules/@remotion/cli/remotion-cli.js'),
    chromiumPath:path.join(root,'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
    tsxPath:path.join(root,'runner/node_modules/tsx/dist/cli.mjs')};
  const job={schemaVersion:'digest-structure-run-v001',head:gitHead(),startedAt:new Date().toISOString(),profileId,tools,
    structureStateRef:await bind(path.join(directory,'structure-state.json')),sourceInspectionRef:await bind(inspectionPath),
    sourceDrawingEvidenceRef:old.job.renderOptions.drawingEvidenceRef,preservedDrawingRules:old.job.renderOptions.drawingRulesRef,
    preservedVideo:await bind(path.join(old.job.renderOptions.outputDirectory,'presentation-rendered-v002.mp4')),
    disk:await disk(),opEd:{status:'not-established-from-saved-records',used:false,
      evidence:'metadata has no chapters; transcript silence does not establish OP/ED; no music/visual inference'},
    scope:'selected source ranges only; saved three main Prospects preserved; development 540p candidate; no human quality adoption'};
  await write('job.json',job);return {status:'prepared',frameCountBeforeConnections:resolution.frameCount,selectedSegments:resolution.selectedSegments.length,disk:job.disk};
}
async function stage(name,callback) {
  const job=await json(path.join(directory,'job.json')),started=performance.now();
  await verify(job.structureStateRef);
  const start={stage:name,startedAt:new Date().toISOString(),head:gitHead(),disk:await disk()};await write(name+'-start.json',start);
  try {const result=await callback(job);const record={...start,status:'passed',endedAt:new Date().toISOString(),
    wallSeconds:(performance.now()-started)/1000,parentMaxRssBytes:process.resourceUsage().maxRSS*1024,
    memoryScope:'Node parent only',diskAfter:await disk(),result};await write(name+'-result.json',record);
    console.log(JSON.stringify({stage:name,status:'passed',wallSeconds:record.wallSeconds,output:result.mediaRef??result.completionRef??null}));return record;
  } catch(error) {await write(name+'-failure.json',{...start,status:'incomplete',message:error.message,stack:error.stack});throw error;}
}
async function base(job) {
  const {buildPresentationDevProxyStructureBaseV001}=await import('../../evals/clip_composition/presentation_dev_proxy_structure_background_v001.mjs');
  const s=await state();return buildPresentationDevProxyStructureBaseV001({sourceRef:s.autoPlan.sourceRef,
    sourceInspectionRef:job.sourceInspectionRef,segments:s.resolution.baseMappings,profileId:job.profileId,
    tools:{ffmpegPath:job.tools.ffmpegPath,ffprobePath:job.tools.ffprobePath},outputDirectory:path.join(directory,'base')});
}
async function baseResume(job) {
  const {buildPresentationDevProxyStructureBaseV001}=await import('../../evals/clip_composition/presentation_dev_proxy_structure_background_v001.mjs');
  const s=await state();
  const videoRecovery={schemaVersion:'presentation-dev-proxy-aac-origin-recovery-v001',
    failureRef:await bind(path.join(directory,'base/failure.json')),
    implementationRef:await bind(path.join(directory,'base/source-before-aac-origin-fix.mjs')),
    pieces:await Promise.all([0,1].map(async pieceIndex=>({pieceIndex,
      mediaRef:await bind(path.join(directory,'base',`piece-${String(pieceIndex+1).padStart(4,'0')}.nut`))})))};
  return buildPresentationDevProxyStructureBaseV001({sourceRef:s.autoPlan.sourceRef,sourceInspectionRef:job.sourceInspectionRef,
    segments:s.resolution.baseMappings,profileId:job.profileId,tools:{ffmpegPath:job.tools.ffmpegPath,ffprobePath:job.tools.ffprobePath},
    outputDirectory:path.join(directory,'base-resume-v001'),videoRecovery});
}
async function completedBase() {
  try{return (await json(path.join(directory,'base-resume-result.json'))).result;}
  catch(error){if(error.code!=='ENOENT')throw error;return (await json(path.join(directory,'base-result.json'))).result;}
}
async function captions(job) {
  const {prepareDigestStructureNewCaptionsV001,measureDigestStructureNewCaptionWidthsV001,
    buildDigestStructureNewCaptionsV001,saveDigestStructureNewCaptionsV001}=await import('./digest-structure-new-captions.mjs');
  const s=await state(),old=await original(),base=await completedBase();
  const oldTimeline=await json(old.view.sourceRefs.timelineRef.path);
  const timeline={...oldTimeline,timelineId:'7b-structure-'+s.resolution.resolutionSha256.slice(0,24),
    baseMedia:{artifactId:'7b-selected-development-base',path:base.mediaRef.path,fileSha256:base.mediaRef.fileSha256,
      frameRate:'30/1',expectedFrameCount:s.resolution.frameCount},segments:s.resolution.baseMappings.map(({audioSamples,...row})=>row)};
  const timelineRef=await write('timeline.json',timeline);
  const semanticDecisions=await json(path.join(directory,'semantic-decisions.json'));
  const input=await digestStructureNewCaptionInputV001({transcript:await json(s.autoPlan.transcriptRef.path),timeline,
    sourceView:old.view,resolution:s.resolution,semanticDecisions});
  const prepared=prepareDigestStructureNewCaptionsV001(input);
  const measurements=await measureDigestStructureNewCaptionWidthsV001({prepared,repositoryRoot:root,chromiumPath:job.tools.chromiumPath});
  const newCaptions=buildDigestStructureNewCaptionsV001({prepared,measurements});
  const newCaptionPackageRef=await saveDigestStructureNewCaptionsV001({input,saved:newCaptions,outputPath:path.join(directory,'new-captions.json')});
  const sourcePlans=buildDigestStructureCaptionPlansV001({sourceView:old.view,timeline,newCaptions,structureResolution:s.resolution});
  const sourcePlansRef=await write('source-plans.json',sourcePlans),planRef=await write('base-normal-plan.json',sourcePlans.normalPlan);
  const projectionInput={digestRef:{version:'digest-structure-v001',sha256:s.resolution.resolutionSha256},planRef:plain(planRef),
    timelineRef:plain(timelineRef),mediaRef:plain(base.mediaRef),planBytes:await readFile(planRef.path,'utf8'),timelineBytes:await readFile(timelineRef.path,'utf8'),
    playbackSampleRate:44100,observationSampleRate:16000,connections:digestStructureConnectionsV001({sourceView:old.view,timeline,structureResolution:s.resolution})};
  const semanticDecisionsRef=await bind(path.join(directory,'semantic-decisions.json'));
  const refs=[job.structureStateRef,job.sourceDrawingEvidenceRef,timelineRef,sourcePlansRef,planRef,
    base.mediaRef,newCaptionPackageRef,semanticDecisionsRef,s.autoPlan.sourceRef,s.autoPlan.transcriptRef,s.autoPlan.priorEditPlanRef];
  const view=createDigestStructureDrawingViewV001({sourceView:old.view,timeline,newCaptions,sourcePlans,projectionInput,
    structureResolution:s.resolution,structureStateSha256:s.saved.stateSha256,sourceReferences:refs});
  const body={schemaVersion:'digest-structure-drawing-evidence-v001',structureStateRef:job.structureStateRef,
    sourceDrawingEvidenceRef:job.sourceDrawingEvidenceRef,timelineRef,sourcePlansRef,planRef,baseMediaRef:base.mediaRef,
    newCaptionPackageRef,semanticDecisionsRef,expectedViewSha256:view.viewSha256};
  const evidenceRef=await write('drawing-evidence.json',{...body,evidenceSha256:canonicalSha256(body)});
  const reread=await readDigestStructureDrawingEvidenceV001({evidenceRef});assert.deepEqual(reread,view);
  await write('projection.json',view.projection);
  return {evidenceRef,projectionRef:await bind(path.join(directory,'projection.json')),newCaptionPackageRef,
    captionCount:view.resolvedPlan.elements.length,preservedCaptionCount:view.preserved.length,newCaptionCount:newCaptions.normalPlan.elements.length,
    frameCount:view.projection.displayFrameCount,viewSha256:view.viewSha256};
}
async function background(job) {
  const {buildPresentationDevProxyStructureBackgroundV001}=await import('../../evals/clip_composition/presentation_dev_proxy_structure_background_v001.mjs');
  const b=await completedBase(),c=(await json(path.join(directory,'captions-result.json'))).result;
  const view=await readDigestStructureDrawingEvidenceV001({evidenceRef:c.evidenceRef});
  const result=await buildPresentationDevProxyStructureBackgroundV001({baseManifestRef:b.manifestRef,projection:view.projection,
    profileId:job.profileId,tools:{ffmpegPath:job.tools.ffmpegPath,ffprobePath:job.tools.ffprobePath},outputDirectory:path.join(directory,'background')});
  const backgroundProofRef=await write('background-proof.json',result.backgroundProof);return {...result,backgroundProofRef};
}
async function render(job) {
  const {renderPresentationDevProxyV001}=await import('../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs');
  const b=(await json(path.join(directory,'background-result.json'))).result,c=(await json(path.join(directory,'captions-result.json'))).result;
  return renderPresentationDevProxyV001({drawingEvidenceRef:c.evidenceRef,profileId:job.profileId,baseProxyManifestRef:b.manifestRef,
    backgroundProofRef:b.backgroundProofRef,outputDirectory:path.join(directory,'candidate'),tools:job.tools,
    onProgress:row=>{if(row.phase!=='proxy-overlays'||row.index%25===0)console.log(JSON.stringify(row));}});
}
async function reread() {
  const {readPresentationDevProxyV001}=await import('../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs');
  const r=(await json(path.join(directory,'render-result.json'))).result;return readPresentationDevProxyV001({completionRef:r.completionRef});
}
async function overridesCheck() {
  const s=await state(),checks=[];
  for(const segment of s.autoPlan.segments.filter(s=>s.role!=='main')) {
    const include=segment.role.startsWith('exclude-');
    const changed=editDigestStructureOverrideV001({autoPlan:s.autoPlan,overrides:s.overrides,segmentId:segment.segmentId,include});
    const restored=restoreDigestStructureStateV001({saved:exportDigestStructureStateV001({autoPlan:s.autoPlan,overrides:changed}),
      transcriptBytes:await readFile(s.autoPlan.transcriptRef.path),priorEditPlanBytes:await readFile(s.autoPlan.priorEditPlanRef.path)});
    assert.equal(restored.resolution.effectiveSelection.find(r=>r.segmentId===segment.segmentId).include,include);
    const reset=resetDigestStructureOverrideV001({autoPlan:s.autoPlan,overrides:changed,segmentId:segment.segmentId});
    assert.deepEqual(reset,s.overrides);assert.deepEqual(resolveDigestStructureV001({autoPlan:s.autoPlan,overrides:reset}),s.resolution);
    checks.push({segmentId:segment.segmentId,changeSavedAndRestored:true,resetExactOriginal:true,
      frameCount:restored.resolution.frameCount});
  }
  return {checks,status:'passed',newContentSelectionCalls:0};
}
async function preserved(job) {
  await verify(job.preservedVideo);await verify(job.sourceDrawingEvidenceRef);
  await verifyEditedOrchestrationDrawingRulesRefV001(job.preservedDrawingRules);
  const s=await state();await verify(s.autoPlan.sourceRef);await verify(s.autoPlan.transcriptRef);await verify(s.autoPlan.priorEditPlanRef);
  return {status:'all-preserved',drawingSourceFiles:job.preservedDrawingRules.files.length,video:job.preservedVideo};
}
const mode=process.argv[2];
if(mode==='prepare')console.log(JSON.stringify(await prepare()));
else if({base,'base-resume':baseResume,captions,background,render,reread,overrides:overridesCheck,preserved}[mode])
  await stage(mode,{base,'base-resume':baseResume,captions,background,render,reread,overrides:overridesCheck,preserved}[mode]);
else throw Error('use prepare | base | base-resume | captions | background | render | reread | overrides | preserved');

/** Numeric Q4 short-clip observations. No new semantic, visual or listening judgment. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bindQ4File,selectQ4Ranges,assertQ4CandidateCompletion} from './q4-candidates.mjs';
import {measureCompletedPcm} from './measure-pcm.mjs';
import {rational} from './clock.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const qualityRoot=path.join(repo,'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/quality-q4-20260920-v001');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const range=(startFrame,endFrameExclusive)=>({startFrame,endFrameExclusive});
const overlaps=(a,b)=>a.startFrame<b.endFrameExclusive&&b.startFrame<a.endFrameExclusive;
const integer=n=>Number.isSafeInteger(n)&&n>=0;

export function buildQ4ObservationUnits({candidate,captions,timeline,originalClock}) {
  assert.equal(originalClock.schemaVersion,'q4-c-all-original-clock-v001');
  assert.equal(originalClock.fps,30);assert.equal(originalClock.playbackSampleRate,48000);
  assert.equal(originalClock.observationSampleRate,16000);
  assert.equal(originalClock.connectionPolicy,'preserve-normal-cut');
  assert.equal(originalClock.insertedFrameCount,0);
  assert.equal(originalClock.frameCount,timeline.baseMedia.expectedFrameCount);
  assert.equal(originalClock.playbackSampleCount,originalClock.frameCount*1600);
  assert.equal(originalClock.spans.length,timeline.segments.length);
  assert.equal(timeline.sourceFrameClock.inputFrameRate,'60/1');
  assert.equal(timeline.sourceFrameClock.logicalFrameRate,'30/1');
  assert.equal(timeline.sourceFrameClock.extractionRuleId,'source-frame-60fps-global-even-v001');
  let previous=0;
  for(const [index,segment]of timeline.segments.entries()) {
    const {audioSamples,...saved}=originalClock.spans[index];assert.deepEqual(saved,segment);
    assert.equal(segment.outputStartFrame,previous);previous=segment.outputEndFrame;
    assert.equal(segment.sourceEndFrame30-segment.sourceStartFrame30,segment.outputEndFrame-segment.outputStartFrame);
    assert.deepEqual(audioSamples,{sourceStart:segment.sourceStartFrame30*1600,sourceEnd:segment.sourceEndFrame30*1600,
      outputStart:segment.outputStartFrame*1600,outputEnd:segment.outputEndFrame*1600});
  }
  assert.equal(previous,originalClock.frameCount);
  const clip=candidate.range;
  assert(integer(clip.startFrame)&&integer(clip.endFrameExclusive)&&clip.startFrame<clip.endFrameExclusive
    &&clip.endFrameExclusive<=originalClock.frameCount,'invalid short range');
  const rows=captions.filter(c=>overlaps(c.range,clip)).sort((a,b)=>a.range.startFrame-b.range.startFrame);
  assert.deepEqual(rows,candidate.includedCaptions,'selected short context differs from its complete caption inventory');
  assert(rows.some(c=>c.captionId===candidate.target.captionId),'target caption missing');
  const units=[];let cursor=clip.startFrame,gap=0;
  const add=(kind,start,end,caption=null)=>{
    const mapped=timeline.segments.filter(s=>s.outputStartFrame<=start&&s.outputEndFrame>=end);
    assert.equal(mapped.length,1,'an observation unit must remain within its retained segment');
    const segment=mapped[0],sourceStart=segment.sourceStartFrame30+start-segment.outputStartFrame;
    const sourceEnd=sourceStart+end-start;
    units.push({id:kind==='caption'?caption.captionId:`${candidate.id}-no-caption-${++gap}`,kind,
      isTarget:caption?.captionId===candidate.target.captionId,
      ...(caption?{caption:structuredClone(caption)}:{}),
      range:range(start-clip.startFrame,end-clip.startFrame),digestRange:range(start,end),
      localAudio:{sampleRate:48000,startSample:(start-clip.startFrame)*1600,endSampleExclusive:(end-clip.startFrame)*1600},
      digestAudio:{sampleRate:48000,startSample:start*1600,endSampleExclusive:end*1600},
      savedObservationAudio:{sampleRate:16000,startSample:rational(BigInt(start)*1600n,3n),endSampleExclusive:rational(BigInt(end)*1600n,3n)},
      originalSource:{sourceRef:timeline.sourceRef,segmentId:segment.segmentId,logical30fps:range(sourceStart,sourceEnd),
        native60fps:{firstFrameIndex:sourceStart*2,frameIndexStep:2,lastFrameIndex:(sourceEnd-1)*2,endBoundaryFrameIndex:sourceEnd*2},
        audio:{sampleRate:48000,startSample:sourceStart*1600,endSampleExclusive:sourceEnd*1600}}});
  };
  for(const row of rows) {
    assert(integer(row.range.startFrame)&&integer(row.range.endFrameExclusive)&&row.range.startFrame<row.range.endFrameExclusive);
    const start=Math.max(row.range.startFrame,clip.startFrame),end=Math.min(row.range.endFrameExclusive,clip.endFrameExclusive);
    assert(start>=cursor,'overlapping captions cannot become one partition');
    if(cursor<start)add('no-caption',cursor,start);
    add('caption',start,end,row);cursor=end;
  }
  if(cursor<clip.endFrameExclusive)add('no-caption',cursor,clip.endFrameExclusive);
  assert.equal(units.reduce((n,u)=>n+u.range.endFrameExclusive-u.range.startFrame,0),clip.endFrameExclusive-clip.startFrame);
  return units;
}

const rect=value=>{
  const result=Object.fromEntries(['left','top','right','bottom'].map(k=>[k,value?.[k]]));
  assert(Object.values(result).every(Number.isFinite)&&result.left<result.right&&result.top<result.bottom,'invalid measured bounds');
  return result;
};
const center=b=>({x:(b.left+b.right)/2,y:(b.top+b.bottom)/2});

export function summarizeQ4CaptionPlacement({candidate,done}) {
  assert.equal(done.finalQc.status,'passed');assert.equal(done.completedFrameQc.status,'passed');
  const inspections=done.completedFrameQc.inspections;
  const scenes=done.completedFrameQc.evidence.finiteState.sceneBindings;
  return candidate.includedCaptions.map(caption=>{
    const matches=inspections.filter(i=>i.instructionId===caption.captionId);
    const sceneMatches=scenes.filter(i=>i.instructionId===caption.captionId);
    assert.equal(matches.length,1);assert.equal(sceneMatches.length,1);
    const inspection=matches[0],scene=sceneMatches[0];
    assert.equal(inspection.lineAlphaBounds.length,caption.lineCount);
    const lines=inspection.lineAlphaBounds.map(rect),union={left:Math.min(...lines.map(r=>r.left)),top:Math.min(...lines.map(r=>r.top)),
      right:Math.max(...lines.map(r=>r.right)),bottom:Math.max(...lines.map(r=>r.bottom))};
    const result={captionId:caption.captionId,background:caption.background,selectedRole:caption.selection.role,
      qcComparisonMethod:inspection.visibilityComparisonBasis,representativeDigestFrame:inspection.representativeFrame,
      representativeLocalFrame:inspection.representativeFrame-candidate.range.startFrame,
      overlay:{relativePath:inspection.overlayFile,fileSha256:inspection.overlaySha256,
        appliedPropertiesSha256:inspection.appliedOverlayPropsCanonicalSha256},
      compositeAlphaBounds:rect(inspection.alphaBounds),visibleLineAlphaBounds:lines,visibleTextUnionBounds:union,
      logicalLineRects:structuredClone(inspection.lineRects),panel:null};
    assert(result.representativeLocalFrame>=0&&result.representativeLocalFrame<done.expectedFrameCount);
    if(caption.selection.role==='Panel accent') {
      assert.equal(scene.selectedKind,'panel');assert.equal(scene.states.length,1);
      assert.equal(scene.states[0].pngSha256,inspection.overlaySha256);
      assert.equal(scene.states[0].propsCanonicalSha256,inspection.appliedOverlayPropsCanonicalSha256);
      assert.deepEqual(rect(scene.states[0].alphaBounds),result.compositeAlphaBounds);
      const omitted=scene.alternates.filter(s=>s.kind==='panel-plate-omitted');assert.equal(omitted.length,1);
      assert.deepEqual(rect(omitted[0].alphaBounds),union,'saved plate-omitted bounds must match the visible text union');
      const plate=result.compositeAlphaBounds,p= center(plate),t=center(union);
      assert(union.left>=plate.left&&union.right<=plate.right&&union.top>=plate.top&&union.bottom<=plate.bottom);
      result.panel={referenceMethod:'Saved native composite alpha bounds, with contained text and matching plate-omitted diagnostic bounds; not a newly isolated plate mask.',
        compositeCenter:p,visibleTextUnionCenter:t,visibleLineHorizontalCenterOffsetsPx:lines.map(line=>center(line).x-p.x),
        visibleTextUnionVerticalCenterOffsetPx:t.y-p.y,
        visibleTextMarginsPx:{left:union.left-plate.left,right:plate.right-union.right,top:union.top-plate.top,bottom:plate.bottom-union.bottom},
        savedPlateOmittedPngSha256:omitted[0].pngSha256,
        savedPlateOmittedTextBoundsMatch:true};
    }
    return result;
  });
}

export async function observeQ4Candidates({candidateDirectory,outputDirectory,originalClockPath,
  ffmpegPath='/opt/homebrew/bin/ffmpeg',ffprobePath='/opt/homebrew/bin/ffprobe'}) {
  candidateDirectory=path.resolve(candidateDirectory);outputDirectory=path.resolve(outputDirectory);
  for(const directory of [candidateDirectory,outputDirectory])assert(directory.startsWith(qualityRoot+path.sep),'Q4 managed directory required');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});
  const refs=[];
  const bind=async file=>{const ref=await bindQ4File(file);refs.push(ref);return ref;};
  const read=async file=>{await bind(file);return json(file);};
  const bindings=await read(path.join(candidateDirectory,'bindings.json'));
  for(const ref of Object.values(bindings).flat())assert.deepEqual(await bind(ref.path),ref,'fixed candidate binding changed');
  const plan=await json(bindings.preRenderSelectionRef.path),drawingRulesRef=await json(bindings.drawingRulesRef.path);
  const drawingEvidence=await json(bindings.drawingEvidenceRef.path);
  const view=restoreOrchestrationDrawingViewEvidenceV001(drawingEvidence);
  const timeline=JSON.parse(drawingEvidence.source.timelineBytes),normalPlan=JSON.parse(drawingEvidence.source.planBytes);
  assert.equal(view.projection.sourceClock.playbackSampleRate,48000);
  assert(view.resolution.connections.every(row=>row.preset==='normal-cut'));
  assert.deepEqual(plan,selectQ4Ranges({view,normalPlan,timeline,selectionRecord:drawingEvidence.state.selectionRecord}));
  const originalClock=await read(originalClockPath),ready=[];
  for(const candidate of plan.candidates) {
    const completionPath=path.join(candidateDirectory,candidate.id+'-evidence/completion.json');
    const done=await read(completionPath);assertQ4CandidateCompletion({done,candidate,view,drawingRulesRef});
    assert.deepEqual(await bind(done.candidateVideo.path),done.candidateVideo);
    const units=buildQ4ObservationUnits({candidate,captions:plan.captions,timeline,originalClock});
    const placements=summarizeQ4CaptionPlacement({candidate,done});
    for(const placement of placements) {
      const file=path.resolve(path.dirname(done.candidateVideo.path),placement.overlay.relativePath);
      assert(file.startsWith(path.dirname(done.candidateVideo.path)+path.sep),'overlay outside published candidate');
      placement.overlay.publishedRef=await bind(file);
      assert.equal(placement.overlay.publishedRef.fileSha256,placement.overlay.fileSha256);
    }
    ready.push({candidate,done,units,placements,completionRef:refs.find(ref=>ref.path===completionPath)});
  }
  await mkdir(outputDirectory);
  try {
    const observations=[];
    for(const {candidate,done,units,placements,completionRef}of ready) {
      const measured=await measureCompletedPcm({media:{path:done.candidateVideo.path,sha256:done.candidateVideo.fileSha256,
        audioSampleRate:48000,fpsNum:30,fpsDen:1,frameCount:done.expectedFrameCount},units},
      {outputDir:path.join(outputDirectory,candidate.id+'-pcm'),ffmpegPath,ffprobePath});
      assert.equal(measured.details.measurements.channels,2,'C-all short audio must preserve both native channels');
      assert.equal(measured.details.videoSampleCount,done.expectedFrameCount*1600);
      const pcmDetailsRef=await bindQ4File(path.join(outputDirectory,candidate.id+'-pcm/pcm-measurements.json'));
      observations.push({candidateId:candidate.id,target:structuredClone(candidate.target),conditions:candidate.conditions,
        range:candidate.range,localFrameCount:done.expectedFrameCount,completionRef,mediaRef:done.candidateVideo,
        placements,units:units.map(unit=>({...unit,pcm:measured.details.measurements.intervals.find(m=>m.unitId===unit.id)})),
        audio:{sampleRate:48000,channels:2,logicalSampleCount:measured.details.videoSampleCount,
          decodedSampleCount:measured.decodedSampleCount,decoderTailSamples:measured.details.decoderTailSamples,
          lastIntervalFollowingSampleScope:measured.details.decoderTailSamples>0?'first-decoder-tail-sample-outside-video':'no-decoded-next-sample',
          pcmRef:{...measured.reference,id:candidate.id+'-completed-pcm'},measurementRef:pcmDetailsRef},
        commonQc:{finalStatus:done.finalQc.status,completedFrameStatus:done.completedFrameQc.status,
          finalViolationCount:done.finalQc.violations.length,completedFrameViolationCount:done.completedFrameQc.violations.length}});
    }
    for(const ref of refs)assert.deepEqual(await bindQ4File(ref.path),ref,'observation input changed during measurement');
    const result={schemaVersion:'digest-quality-q4-short-observations-v001',status:'technical-observations-recorded',
      viewSha256:view.viewSha256,inputReferences:refs,sourceClock:{fps:30,playbackSampleRate:48000,
        savedObservationSampleRate:16000,sourceRef:timeline.sourceRef,originalSourceFrameClock:timeline.sourceFrameClock,
        originalClockRef:refs.find(ref=>ref.path===path.resolve(originalClockPath))},
      candidateCount:observations.length,candidates:observations,
      limitations:['短尺候補だけを音声復号した。全24分の再描画・再復号は行っていない。',
        '字幕なし区間は保存字幕の表示区間の補集合であり、無音または発話なしという判断ではない。',
        'PCMは左右チャンネル別の混合音声。音の意味、聞きやすさ、字幕との意味上の一致を判定していない。',
        '文字と背景の位置は保存された共通QCのalpha外接矩形。元映像の重要部分との重なり、デザインの自然さを判定していない。',
        '元配信のフレーム・音声対応は保存済みの保持区間と48kHz標本対応を使用し、ミリ秒から丸めて推定していない。',
        '復号末尾の余剰標本は動画の論理区間と区間内のRMS・最大値・標本数から除外する。最後の区間の直後標本は、余剰があればその先頭標本として明示して残す。'],
      semanticQualityApproved:false,humanQualityApproved:false,newVisualOrListeningJudgment:false};
    await save(path.join(outputDirectory,'observation-record.json'),result);return result;
  } catch(error) {
    await save(path.join(outputDirectory,'failure.json'),{status:'failed',message:String(error),inputReferences:refs});throw error;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [candidateDirectory,outputDirectory,originalClockPath,...extra]=process.argv.slice(2);
  if(!candidateDirectory||!outputDirectory||!originalClockPath||extra.length)throw new Error('Usage: q4-observations.mjs <candidate-dir> <new-Q4-output-dir> <saved-original-clock.json>');
  observeQ4Candidates({candidateDirectory,outputDirectory,originalClockPath}).then(result=>console.log(JSON.stringify({
    status:result.status,candidateCount:result.candidateCount,recordPath:path.resolve(outputDirectory,'observation-record.json')},null,2)))
    .catch(error=>{console.error(error.stack);process.exitCode=1;});
}

/** Q4 pre-render selection and standard Point Review for the fixed C-all result. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyQ4Request} from './q4-run.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001} from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {canonical,validateReview,blankAnswers,validateAnswers} from '../point-review/core.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function bindQ4File(file) {
  const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);
  return {path:path.resolve(file),bytes:(await stat(file)).size,fileSha256:h.digest('hex')};
}
const background=selection=>({'provisional-panel':'plain','provisional-panel-graph-paper':'graph-paper',
  'provisional-panel-comic-frame':'comic-frame'}[selection.presentation]??null);
const rangeOf=e=>({startFrame:e.startFrame,endFrameExclusive:e.endFrameExclusive});
const overlaps=(a,b)=>a.startFrame<b.endFrameExclusive&&b.startFrame<a.endFrameExclusive;

export function selectQ4Ranges({view,normalPlan,timeline,selectionRecord}) {
  assert.equal(view.projection.displayFrameCount,44408);
  assert.equal(view.projection.sourceClock.playbackSampleRate,48000);
  assert(view.resolution.connections.every(row=>row.preset==='normal-cut'));
  const rows=normalPlan.elements.filter(e=>e.kind==='speech-caption').map(e=>{
    const selected=view.effectiveSelections.find(row=>row.captionId===e.instructionId);
    const judgment=selectionRecord.captions.find(row=>row.captionId===e.instructionId);
    assert(selected&&judgment,'fixed caption selection missing');
    assert.equal(selected.hasOverride,false,'pre-render selection must use the unchanged automatic result');
    const segment=timeline.segments.find(s=>s.outputStartFrame<=e.startFrame&&s.outputEndFrame>=e.endFrameExclusive);
    assert(segment,'caption must belong to one retained segment');
    return {captionId:e.instructionId,text:e.text,range:rangeOf(e),lineCount:e.indexedLines.length,
      maximumLogicalLineWidth:Math.max(...e.indexedLines.map(line=>line.logicalWidth)),
      judgmentStatus:judgment.status,selection:selected.selection,background:background(selected.selection),segmentId:segment.segmentId};
  });
  assert.equal(rows.length,325);
  const panels=rows.filter(row=>row.selection.role==='Panel accent');
  const byNarrow=(a,b)=>a.maximumLogicalLineWidth-b.maximumLogicalLineWidth||a.range.startFrame-b.range.startFrame;
  const byWide=(a,b)=>b.maximumLogicalLineWidth-a.maximumLogicalLineWidth||a.range.startFrame-b.range.startFrame;
  const oneLine=panels.filter(row=>row.lineCount===1),multiLine=panels.filter(row=>row.lineCount>1);
  const requests=[{condition:'short-single-line-panel',reason:'自動Panelの1行字幕のうち、保存Normal計画の論理幅が最小の字幕。',row:[...oneLine].sort(byNarrow)[0]},
    {condition:'wide-single-line-panel',reason:'自動Panelの1行字幕のうち、保存Normal計画の論理幅が最大の字幕。',row:[...oneLine].sort(byWide)[0]},
    {condition:'multi-line-panel',reason:'自動Panelの複数行字幕のうち、保存Normal計画の最大行論理幅が最大の字幕。',row:[...multiLine].sort(byWide)[0]}];
  const chosen=new Map(),absent=[];
  for(const request of requests) {
    if(!request.row){absent.push({condition:request.condition,reason:'この条件に一致する自動選択結果がない。手で追加しない。'});continue;}
    const existing=chosen.get(request.row.captionId);
    if(existing){existing.conditions.push(request.condition);existing.reasons.push(request.reason);}
    else chosen.set(request.row.captionId,{target:request.row,conditions:[request.condition],reasons:[request.reason]});
  }
  const withContext=entry=>{
    const index=rows.findIndex(row=>row.captionId===entry.target.captionId);
    const neighbors=rows.slice(Math.max(0,index-1),index+2).filter(row=>row.segmentId===entry.target.segmentId);
    return {...entry,range:{startFrame:neighbors[0].range.startFrame,endFrameExclusive:neighbors.at(-1).range.endFrameExclusive},
      includedCaptions:neighbors};
  };
  let candidates=[...chosen.values()].map(withContext);
  const isNormal=row=>row.judgmentStatus==='resolved'&&row.selection.role==='Normal';
  if(!candidates.some(c=>c.includedCaptions.some(isNormal))) {
    const row=rows.find(isNormal);
    if(row)candidates.push(withContext({target:row,conditions:['normal-control'],reasons:['意味判断で通常表示を選んだ最初の字幕。適用不能の通常表示への代替とは分ける。']}));
    else absent.push({condition:'normal-control',reason:'固定案に意味判断で通常表示を選んだ対象がない。'});
  }
  candidates=candidates.sort((a,b)=>a.range.startFrame-b.range.startFrame).map((c,i)=>({...c,id:`Q4-C${String(i+1).padStart(3,'0')}`}));
  const panelCounts=Object.fromEntries(['plain','graph-paper','comic-frame'].map(b=>[b,panels.filter(p=>p.background===b).length]));
  return {schemaVersion:'digest-quality-q4-pre-render-selection-v001',viewSha256:view.viewSha256,
    selectionRecordedBeforeAnyNewImage:true,manualPresentationOverrides:false,
    criteria:'全325件の実判断を固定後、保存Normal計画の行数と論理幅で選定。同幅は元の表示順。対象と同じ保持区間にある直前・直後の字幕を文脈に含める。背景の種類を選定目標にしない。',
    geometryMethod:'保存Normal計画の論理幅。文字幅推定であり、実フォント・画素の測定ではない。',
    conditionsAbsent:absent,automaticPanelBackgroundCounts:panelCounts,
    backgroundsWithinSelectedRanges:[...new Set(candidates.flatMap(c=>rows.filter(r=>r.background&&overlaps(r.range,c.range)).map(r=>r.background)))],
    captions:rows,candidates,humanQualityApproved:false};
}

export async function prepareQ4Candidates({requestDirectory,outputDirectory}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});
  const {source,input}=await verifyQ4Request(requestDirectory);
  const accepted=await json(path.join(requestDirectory,'judgment-validation.json'));
  assert.equal(accepted.schemaVersion,'digest-quality-q4-accepted-v001');
  assert.equal(accepted.status,'complete');
  assert.equal(accepted.inputSha256,input.inputSha256);
  assert.equal(accepted.sourceMediaSha256,source.mediaRef.fileSha256);
  const drawingEvidenceRef=await bindQ4File(path.join(requestDirectory,'drawing-evidence.json'));
  const evidence=await json(drawingEvidenceRef.path),view=restoreOrchestrationDrawingViewEvidenceV001(evidence);
  assert.deepEqual(evidence.source,source);
  assert.deepEqual(evidence.state.selectionRecord.input,input,'fixed result must answer this saved request');
  assert.equal(view.viewSha256,accepted.viewSha256);
  assert.equal(view.selectionRecordSha256,accepted.selectionRecordSha256);
  assert.equal((await bindQ4File(path.join(requestDirectory,'judgment-reply.raw.json'))).fileSha256,accepted.rawReplySha256);
  for(const [name,value]of Object.entries(evidence.state))assert.deepEqual(await json(path.join(requestDirectory,name+'.json')),value);
  assert.equal(hash(evidence.state.selectionRecord.replyBytes),accepted.rawReplySha256);
  const plan=selectQ4Ranges({view,normalPlan:JSON.parse(source.planBytes),timeline:JSON.parse(source.timelineBytes),selectionRecord:evidence.state.selectionRecord});
  await mkdir(outputDirectory);
  await save(path.join(outputDirectory,'pre-render-selection.json'),plan);
  const drawingRulesRef=await buildEditedOrchestrationDrawingRulesRefV001();
  await save(path.join(outputDirectory,'drawing-rules.json'),drawingRulesRef);
  for(const candidate of plan.candidates)await save(path.join(outputDirectory,`${candidate.id}-job.json`),{
    drawingEvidenceRef,outputDirectory:path.join(outputDirectory,candidate.id+'-render'),
    evidenceDirectory:path.join(outputDirectory,candidate.id+'-evidence'),range:candidate.range,drawingRulesRef,
    nativeAssetReuse:{directory:path.join(outputDirectory,'native-assets')}});
  const previousReviewRefs=await Promise.all(['docs/reports/digest-quality-q1-q2-20260920-v001/review-main-v001.json',
    'docs/reports/digest-quality-q3-20260920-v001/review-v001.json'].map(file=>bindQ4File(path.join(repo,file))));
  await save(path.join(outputDirectory,'bindings.json'),{preRenderSelectionRef:await bindQ4File(path.join(outputDirectory,'pre-render-selection.json')),
    drawingEvidenceRef,rawReplyRef:await bindQ4File(path.join(requestDirectory,'judgment-reply.raw.json')),
    inputRef:await bindQ4File(path.join(requestDirectory,'judgment-input.json')),drawingRulesRef:await bindQ4File(path.join(outputDirectory,'drawing-rules.json')),
    previousReviewRefs});
  return {outputDirectory,candidates:plan.candidates.map(c=>({id:c.id,target:c.target,range:c.range,conditions:c.conditions})),
    automaticPanelBackgroundCounts:plan.automaticPanelBackgroundCounts,conditionsAbsent:plan.conditionsAbsent};
}

export async function prepareQ4Review(outputDirectory) {
  const plan=await json(path.join(outputDirectory,'pre-render-selection.json'));
  const bindings=await json(path.join(outputDirectory,'bindings.json'));
  for(const ref of Object.values(bindings).flat())assert.deepEqual(await bindQ4File(ref.path),ref);
  const drawingRulesRef=await json(bindings.drawingRulesRef.path);
  const view=restoreOrchestrationDrawingViewEvidenceV001(await json(bindings.drawingEvidenceRef.path));
  assert.equal(view.viewSha256,plan.viewSha256);
  const media=[],points=[],completionRefs=[];
  for(const candidate of plan.candidates) {
    const completionPath=path.join(outputDirectory,candidate.id+'-evidence/completion.json');
    const done=await json(completionPath);
    assertQ4CandidateCompletion({done,candidate,view,drawingRulesRef});
    assert.deepEqual(await bindQ4File(done.candidateVideo.path),done.candidateVideo);
    completionRefs.push(await bindQ4File(completionPath));
    const target=candidate.target,normal=target.selection.role==='Normal';
    media.push({media_id:candidate.id,label:'C-allの新しい固定自動案',path:done.candidateVideo.path,sha256:done.candidateVideo.fileSha256,
      fps_num:30,fps_den:1,total_frames:done.expectedFrameCount,timeline_id:'C-all-Q4-v001',timeline_start_frame:candidate.range.startFrame});
    points.push({point_id:candidate.id,review_id:candidate.id.replace('Q4-C','HR-Q4-'),related_review_ids:normal?[]:['HRC-001','HRC-002'],
      title:normal?'通常表示を保った箇所':`${target.lineCount>1?'複数行':candidate.conditions.includes('short-single-line-panel')?'短い字幕':'横長の字幕'}の自動背景`,
      question:normal?`「${target.text}」は、通常の字幕表示のままで自然ですか。`:`「${target.text}」に選ばれた背景と文字のまとまりは、自然に見えますか。`,
      target_function:normal?'内容に応じた通常表示の維持':'内容に応じたPanel背景の自動選択と文字のまとまり',
      change_summary:'全字幕から新しく判断して固定した自動案です。この候補の表現や背景を手で選び直していません。',
      why_human_review:'画面の重要な内容との重なりや、発話と表示の関係が自然かは、保存された字幕と数値だけでは判定できません。',
      scope:{level:'point',applies_to:[`${target.text}：この字幕に選ばれた背景と文字のまとまり。前後は発話の流れを確認するために再生します。`],
        does_not_apply_to:['隣接字幕の採否への回答転用','Q1の未回答への回答転記','HR-Q3-001の未回答への回答転記','Panel機能の使用許可の取り直し','Normal／Black／Softの採用の再判定','動き表現の94px対応','字幕本文・改行・表示区間・保持順序の変更','全24分の品質合格']},
      views:[{view_id:candidate.id+'-current',label:'新しい自動案（前後の文脈を含む）',role:'candidate',media_id:candidate.id,
        start_frame:0,end_frame:done.expectedFrameCount,
        context_start_frame:0,context_end_frame:done.expectedFrameCount}]});
  }
  if(!points.length){const result={status:'no-review-examples',selectionRef:bindings.preRenderSelectionRef,humanQualityApproved:false};
    await save(path.join(outputDirectory,'review-verification.json'),result);return result;}
  const review=validateReview({schema_version:'zev-point-review-v001',batch_id:'HRB-Q4-001',revision:'v001',
    title:'別のDigestでの自動背景の確認',intro:'各動画は対象字幕の前後から再生します。質問に書かれた字幕の背景と文字のまとまりを確認してください。Q1・Q3の未回答はそのまま保持しています。',media,points});
  await save(path.join(outputDirectory,'review-v001.json'),review);
  const reviewRef=await bindQ4File(path.join(outputDirectory,'review-v001.json')),reviewSha256=hash(canonical(review));
  const answers=blankAnswers(review,reviewSha256);
  validateAnswers(answers,review,reviewSha256);
  await save(path.join(outputDirectory,'answers-pending-v001.json'),answers);
  const wrong=structuredClone(answers);wrong.answers[0].offered_views[0].sha256='0'.repeat(64);
  assert.throws(()=>validateAnswers(wrong,review,reviewSha256),/対象動画/);
  const anotherRevision=structuredClone(answers);anotherRevision.revision='v002';
  assert.throws(()=>validateAnswers(anotherRevision,review,reviewSha256),/別のレビュー版/);
  const report={schemaVersion:'digest-quality-q4-review-verification-v001',reviewRef,reviewSha256,completionRefs,
    playbackSelection:plan.candidates.map(c=>({candidateId:c.id,defaultRange:c.range,targetCaptionId:c.target.captionId,targetRange:c.target.range,
      reason:'描画前に固定した前後区間を既定再生。対象字幕の元の表示時間を保ち、隣接字幕へ回答を転用しない。'})),
    allPending:answers.answers.every(a=>a.source===null&&a.choice===null),mixedMediaRejected:true,mixedRevisionRejected:true,
    previousReviewRefs:bindings.previousReviewRefs,humanQualityApproved:false};
  await save(path.join(outputDirectory,'review-verification.json'),report);
  return report;
}

export function assertQ4CandidateCompletion({done,candidate,view,drawingRulesRef}) {
  const frames=candidate.range.endFrameExclusive-candidate.range.startFrame;
  assert.equal(done.schemaVersion,'presentation-edited-render-completion-v001');
  assert.equal(done.status,'passed');assert.equal(done.viewSha256,view.viewSha256);assert.deepEqual(done.range,candidate.range);
  assert.deepEqual(done.drawingRulesRef,drawingRulesRef,'candidate drawing implementation differs from its fixed job');
  assert.deepEqual(done.fourSavedSha256,view.fourSavedSha256);
  assert.equal(done.projectionSha256,view.projection.projectionSha256);
  assert.equal(done.expectedFrameCount,frames);
  assert.equal(done.outputMedia.video.frameCount,frames);
  assert.equal(done.finalQc.status,'passed');assert.equal(done.completedFrameQc.status,'passed');
  assert.equal(done.finalAudioClock.status,'passed');assert.equal(done.finalAudioClock.sampleRate,48000);
  assert.equal(done.finalAudioClock.logicalDecodedSampleCount,frames*1600);
  assert.equal(done.scope.playbackStartSample,candidate.range.startFrame*1600);
  assert.equal(done.scope.playbackEndSampleExclusive,candidate.range.endFrameExclusive*1600);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,...args]=process.argv.slice(2);
  const action=command==='prepare'&&args.length===2?()=>prepareQ4Candidates({requestDirectory:path.resolve(args[0]),outputDirectory:path.resolve(args[1])})
    :command==='review'&&args.length===1?()=>prepareQ4Review(path.resolve(args[0]))
    :()=>{throw new Error('Usage: q4-candidates.mjs prepare <request-dir> <new-output-dir> | review <output-dir>');};
  Promise.resolve().then(action).then(value=>console.log(JSON.stringify(value,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}

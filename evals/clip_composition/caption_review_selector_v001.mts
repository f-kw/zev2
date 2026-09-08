import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ROOT, bind, type Json} from './run_candidate_discovery_digest_skill_e2e_v001.mts';
import {readRepairBoundBytesV001, loadCaptionRepairContextV001} from './caption_local_repair_common_v001.mts';
import {selectCaptionReviewV001, CAPTION_REVIEW_SIGNALS_V001, type CaptionReviewFeaturesV001} from '../../packages/shared/src/caption-review-selector-v001.js';
import type {CaptionRepairSourceV001} from '../../packages/shared/src/caption-local-repair-v001.js';

export const REVIEW_WORK_V001 = 'evals/clip_composition/outputs/presentation/work-caption-review-selector-20260908-v001';
export const REVIEW_FIXTURE_PATH_V001 = 'evals/clip_composition/fixtures/caption-review-selector-v001.json';
const read = async (ref: any) => JSON.parse((await readRepairBoundBytesV001(ref)).toString('utf8'));
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const save = async (name: string, value: unknown) => writeFile(path.join(ROOT, REVIEW_WORK_V001, name), JSON.stringify(value, null, 2)+'\n', {flag:'wx'});

/** Historical manifests are read adapters, never detection conditions. No human file is read here. */
export async function loadCaptionReviewInputsV001() {
  const fixture = JSON.parse(await readFile(path.join(ROOT, REVIEW_FIXTURE_PATH_V001), 'utf8'));
  const acoustic = await read(fixture.acoustic);
  const acousticSource = await read(acoustic.sourceBindings.find((r: Json) => r.path.endsWith('/acoustic-preflight-v001.json')));
  // Only raw token observations are eligible. Aggregate cue diagnoses and repair provenance are not features.
  const units: Json[] = acoustic.chunks.flatMap((c: Json) => c.units);
  const cases = [];
  for (const def of fixture.cases) {
    const manifest = await read(def.manifest), refs = manifest.caption?.artifacts ?? manifest.artifacts;
    const old: Json = {};
    for (const [key, ref] of Object.entries(refs)) old[key] = await read(ref);
    const base = old.rendererJob.cropAppliedBaseMedia;
    const timeline = await read(base.timeline), generation = await read(base.generationManifest);
    assert.equal(timeline.baseMedia.frameRate, '30/1');
    const transcript = await read(old.meaning.transcriptBinding);
    assert(acousticSource.sourceBindings.some((r: Json) => path.resolve(ROOT,r.path) === path.resolve(ROOT,old.meaning.transcriptBinding.path)
      && r.fileSha256 === old.meaning.transcriptBinding.fileSha256), 'ACOUSTIC_TRANSCRIPT_SOURCE_MISMATCH');
    const stt = new Map<number, Json>(transcript.segments.map((s: Json) => [s.id, s]));
    const atoms = new Map<string, Json>(old.meaning.atomOccurrences.map((a: Json) => [a.atomOccurrenceId, a]));
    const instructions: Json[] = old.instruction.instructions;
    const rows = instructions.map((ins, index) => {
      const textIds: string[] = ins.targetProvenance.atomOccurrenceIds;
      const selected = textIds.map(id => {const a = atoms.get(id); assert(a); return a;});
      assert.equal(selected.map(a => a.text).join(''), ins.content.text);
      const raw = selected.map(a => {const s = stt.get(a.sourceSegmentId); assert(s); assert.equal(s.text, a.text); return s;});
      const segmentIds = [...new Set(selected.flatMap(a => a.retainedSpans.map((s: Json) => s.timelineSegmentId)))];
      assert.equal(segmentIds.length, 1);
      const segment = timeline.segments.find((s: Json) => s.segmentId === segmentIds[0]); assert(segment);
      const matching = units.filter(u => u.sourceSegmentIds.some((id: number) => raw.some(s => s.id === id)));
      const first = units.filter(u => u.sourceSegmentIds.includes(raw[0].id));
      const last = units.filter(u => u.sourceSegmentIds.includes(raw.at(-1)!.id));
      const startResolved = first.length === 1 && first[0].sourceSegmentIds[0] === raw[0].id
        && first[0].startTimeRole === 'acoustic-token-boundary';
      const endResolved = last.length === 1 && last[0].sourceSegmentIds.at(-1) === raw.at(-1)!.id;
      // The same logical 30 fps source-frame grid as the admitted timeline. No fitted offset.
      const toOutput = (ms: number) => ms * 30 / 1000 - segment.sourceStartFrame30 + segment.outputStartFrame;
      const outside = matching.filter(u => u.endMs <= segment.sourceStartMs
        || (u.startTimeRole === 'acoustic-token-boundary' && u.startMs >= segment.sourceEndMs));
      const features: CaptionReviewFeaturesV001 = {
        sttIntervals: raw.map(s => ({startMs:s.startMs,endMs:s.endMs})), display: ins.outputTime,
        previousEndFrame: index ? instructions[index-1].outputTime.endFrameExclusive : null,
        nextStartFrame: index+1<instructions.length ? instructions[index+1].outputTime.startFrame : null,
        mappingAvailable: true,
        acoustic: {available: matching.length > 0, startResolved, endResolved,
          startOutputFrame:startResolved?toOutput(first[0].startMs):null,
          endOutputFrame:endResolved?toOutput(last[0].endMs):null, whollyOutsideAdoptedUnitCount:outside.length},
      };
      return {caseId:def.id, instructionId:ins.instructionId, text:ins.content.text, textIds,
        displayDurationFrames:ins.outputTime.endFrameExclusive-ins.outputTime.startFrame,
        displayDurationMs:(ins.outputTime.endFrameExclusive-ins.outputTime.startFrame)*1000/30,
        sourceRecognition:raw, features, acousticEvidence:{binding:fixture.acoustic,units:matching,
          firstBoundaryUnitIds:first.map(u=>u.unitId),lastBoundaryUnitIds:last.map(u=>u.unitId)},
        adoptedPosition:{...segment, startDistanceFrames:ins.outputTime.startFrame-segment.outputStartFrame,
          endDistanceFrames:segment.outputEndFrame-ins.outputTime.endFrameExclusive},
        neighbors:{previousInstructionId:index?instructions[index-1].instructionId:null,
          nextInstructionId:index+1<instructions.length?instructions[index+1].instructionId:null,
          precedingGapFrames:index?ins.outputTime.startFrame-instructions[index-1].outputTime.endFrameExclusive:null,
          followingGapFrames:index+1<instructions.length?instructions[index+1].outputTime.startFrame-ins.outputTime.endFrameExclusive:null},
        audioCorrespondence:{sampleRate:generation.audio.sampleRate, packetSha256:generation.audio.encoded.packetPayloadSha256,
          outputStartSample:ins.outputTime.startFrame*generation.audio.sampleRate/30,
          outputEndSample:ins.outputTime.endFrameExclusive*generation.audio.sampleRate/30,
          meaning:'Existing frame/sample grid; no new acoustic measurement or perceptual approval.'}};
    });
    const source: CaptionRepairSourceV001 = {schemaVersion:'caption-local-repair-source-v001',sourceId:`caption-review-${def.id}`,
      completedMedia:manifest.renderer.video,base,artifacts:Object.fromEntries(['meaning','sourcePackage','selection','instruction','rendererJob','lineEndProjection','cueEndProjection'].map(k=>[k,refs[k]])) as any,
      audioPacketSha256:generation.audio.encoded.packetPayloadSha256,allowedTargets:[]};
    cases.push({def,source,rows,frameCount:timeline.baseMedia.expectedFrameCount});
  }
  return {fixture,cases};
}

/** The only function that opens saved human answers. Output is not accepted by the selector. */
export async function reconstructCaptionReviewTruthV001(inputs: Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>) {
  const labels: Json[] = [], nonCaptionFacts: Json[] = [];
  for (const c of inputs.cases) {
    const h = await read(c.def.human);
    const put = (id: string, text: string, result: string, evidence: Json, frames?: Json, textIds?: string[]) => {
      const row = c.rows.find(r=>r.instructionId===id); assert(row, 'LABEL_CAPTION_NOT_FOUND');
      assert.equal(row.text,text); if(frames)assert.deepEqual(row.features.display,frames);if(textIds)assert.deepEqual(row.textIds,textIds);
      assert(!labels.some(l=>l.caseId===c.def.id&&l.instructionId===id),'DUPLICATE_LABEL');
      labels.push({caseId:c.def.id,instructionId:id,textIds:row.textIds,text,display:row.features.display,
        completedMedia:c.source.completedMedia,result,evidence:{file:c.def.human,...evidence}});
    };
    if(c.def.id==='digest-before') {
      const groups = await read(c.def.humanTargets);
      for(const [i,r] of h.captionReviews.entries()) {
        const target = groups.flatMap((g:Json)=>g.targets??[]).find((t:Json)=>t.id===r.id);assert(target);
        const row=c.rows[r.ordinal-1]; assert(row);
        const result=r.start==='問題なし'&&r.end==='問題なし'?'no-issue':'issue';
        // Only the explicitly saved non-good values in this historical fixture map to an issue.
        if(result==='issue')assert(['早い','遅い'].includes(r.start)||['早い','遅い'].includes(r.end));
        put(row.instructionId,r.text,result,{pointer:`/captionReviews/${i}`,answer:r,targets:c.def.humanTargets},
          {startFrame:target.startFrame,endFrameExclusive:target.endFrame});
      }
    } else if(c.def.id==='distant-before') {
      assert.equal(h.completedMediaBinding.fileSha256,c.source.completedMedia.fileSha256);
      h.captionTimingIssues.forEach((r:Json,i:number)=>put(r.instructionId,r.text,'issue',{pointer:`/captionTimingIssues/${i}`,answer:r}));
    } else if(c.def.id==='digest-after') {
      assert.equal(h.completedMediaBinding.fileSha256,c.source.completedMedia.fileSha256);
      h.confirmedReviews.forEach((r:Json,i:number)=>{
        const t=r.targetBinding;
        if(!t.repairedInstructionId) {nonCaptionFacts.push({caseId:c.def.id,evidence:c.def.human,pointer:`/confirmedReviews/${i}`,record:r});return;}
        assert.deepEqual(r.answers,{start:'問題なし',end:'問題なし'});
        put(t.repairedInstructionId,t.text,'no-issue',{pointer:`/confirmedReviews/${i}`,answer:r.answers},t.repairedOutputFrames,t.originalAtomOccurrenceIds);
      });
    } else if(c.def.id==='distant-after') {
      assert.equal(h.completedMediaBinding.fileSha256,c.source.completedMedia.fileSha256);
      h.evaluations.forEach((r:Json,i:number)=>{if(!r.instructionId)return;assert.equal(r.answer,'問題なし');
        put(r.instructionId,r.formalText,'no-issue',{pointer:`/evaluations/${i}`,answer:r.answer},r.frames,r.textIds);});
    } else assert.fail('UNRECOGNIZED_HISTORICAL_LABEL_SHAPE');
  }
  return {labels,nonCaptionFacts,newHumanJudgment:false,unevaluatedPolicy:'Absent labels remain unevaluated; no quality or cross-version propagation.'};
}

export function evaluateCaptionReviewsV001(inputs: Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>, truth: {labels:Json[]}) {
  return inputs.cases.map(c=>{
    const rows=c.rows.map(r=>({...r,result:selectCaptionReviewV001(r.features),humanEvaluation:truth.labels.find(l=>l.caseId===c.def.id&&l.instructionId===r.instructionId)??null}));
    const counts = (filter:(r:typeof rows[number])=>boolean) => rows.filter(filter).length;
    const bySignal=Object.keys(CAPTION_REVIEW_SIGNALS_V001).map(signal=>({signal,
      selected:counts(r=>r.result.signals.includes(signal as any)),
      issues:counts(r=>r.result.signals.includes(signal as any)&&r.humanEvaluation?.result==='issue'),
      noIssues:counts(r=>r.result.signals.includes(signal as any)&&r.humanEvaluation?.result==='no-issue')}));
    return {caseId:c.def.id,phase:c.def.phase,total:rows.length,evaluated:counts(r=>!!r.humanEvaluation),
      issues:counts(r=>r.humanEvaluation?.result==='issue'),noIssues:counts(r=>r.humanEvaluation?.result==='no-issue'),
      reviewRequired:counts(r=>r.result.status==='review-required'),insufficientEvidence:counts(r=>r.result.status==='insufficient-evidence'),
      caughtIssues:counts(r=>r.result.status==='review-required'&&r.humanEvaluation?.result==='issue'),
      extraNoIssues:counts(r=>r.result.status==='review-required'&&r.humanEvaluation?.result==='no-issue'),
      missedIssues:rows.filter(r=>r.humanEvaluation?.result==='issue'&&r.result.status!=='review-required').map(r=>({instructionId:r.instructionId,text:r.text,
        result:r.result,features:r.features,explanation:'None of the frozen technical contradictions fired. These observations do not establish perceived onset/end or whether the supplied text was actually spoken.'})),bySignal,rows};
  });
}

/** Reuses saved review windows only after selection. They are never detector inputs. */
export async function createSelectedCaptionReviewCasesV001(inputs: Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>) {
  const cases=[];
  for(const c of inputs.cases.filter(c=>c.def.phase==='before')) {
    const chosen=c.rows.map(row=>({row,result:selectCaptionReviewV001(row.features)})).filter(r=>r.result.status==='review-required');
    if(!chosen.length)continue;
    const windows: Json[] = c.def.humanTargets ? await read(c.def.humanTargets) : [];
    const source=structuredClone(c.source);
    source.allowedTargets=chosen.map(({row})=>{
      const ordinal=c.rows.indexOf(row)+1;
      const savedWindow=windows.find(w=>w.kind==='caption'&&w.targets.some((t: Json)=>t.ordinal===ordinal
        && t.text===row.text&&t.startFrame===row.features.display.startFrame&&t.endFrame===row.features.display.endFrameExclusive));
      return {instructionId:row.instructionId,operations:['change-start','change-end','exclude-caption'],
        reviewWindow:savedWindow?{startFrame:savedWindow.startFrame,endFrameExclusive:savedWindow.endFrame}:
          {startFrame:Math.max(0,row.features.display.startFrame-row.displayDurationFrames),
            endFrameExclusive:Math.min(c.frameCount,row.features.display.endFrameExclusive+row.displayDurationFrames)}};
    });
    const context=await loadCaptionRepairContextV001(source);
    cases.push({id:c.def.id,title:c.def.family==='digest'?'ダイジェスト：要確認字幕':'遠方接続：要確認字幕',context,
      reviewCandidates:chosen.map(({row,result})=>({instructionId:row.instructionId,reasons:result.reasons})),source});
  }
  return cases;
}

export function captionReviewSummaryV001(inputs: Awaited<ReturnType<typeof loadCaptionReviewInputsV001>>) {
  return inputs.cases.filter(c=>c.def.phase==='before').map(c=>{
    const results=c.rows.map(r=>selectCaptionReviewV001(r.features)), selected=results.filter(r=>r.status==='review-required').length,
      insufficient=results.filter(r=>r.status==='insufficient-evidence').length;
    return `${c.def.family==='digest'?'ダイジェスト':'遠方接続'}：全${results.length}字幕中、要確認${selected}字幕、観測不足${insufficient}字幕。`
      +(insufficient?'観測不足の字幕は確認不要とは判断できず、この系統の絞り込みは未成立です。':'抽出されなかった字幕の同期合格を保証するものではありません。');
  }).join('\n');
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const inputs=await loadCaptionReviewInputsV001();
  if(process.argv.includes('--inventory')) {
    const truth=await reconstructCaptionReviewTruthV001(inputs);
    await save('ground-truth-v001.json',truth);
    await save('features-v001.json',{cases:inputs.cases.map(c=>({caseId:c.def.id,source:c.source,rows:c.rows})),groundTruthIsNotAFeature:true});
    console.log(JSON.stringify({captionInstances:inputs.cases.reduce((n,c)=>n+c.rows.length,0),evaluated:truth.labels.length,issues:truth.labels.filter(l=>l.result==='issue').length}));
  } else if(process.argv.includes('--evaluate')) {
    const truth=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'ground-truth-v001.json'),'utf8'));
    const freeze=JSON.parse(await readFile(path.join(ROOT,REVIEW_WORK_V001,'signal-freeze-v001.json'),'utf8'));
    assert.equal(sha(await readFile(path.join(ROOT,freeze.selector.path))),freeze.selector.fileSha256,'FROZEN_SELECTOR_CHANGED');
    const results=evaluateCaptionReviewsV001(inputs,truth);await save('evaluation-v001.json',{signalFreeze:freeze,results});
    console.log(JSON.stringify(results.map(({rows,bySignal,...r})=>r),null,2));
  } else if(process.argv.includes('--ui')) {
    const {startCaptionRepairUIV001}=await import('./caption_local_repair_ui_v001.mts');
    const cases=await createSelectedCaptionReviewCasesV001(inputs);
    const ui=await startCaptionRepairUIV001({cases,purpose:'ui-verification',reviewSummary:captionReviewSummaryV001(inputs),
      outputRoot:`${REVIEW_WORK_V001}/ui-verification-v001`});console.log(ui.url);
  } else throw new Error('--inventory, --evaluate or --ui required');
}

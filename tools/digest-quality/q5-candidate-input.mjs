/** Q5-1 candidate input: reference the complete saved C-all evidence once.
 * No presentation answer, human quality answer, or generated comparison is input. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyQ4Request} from './q4-run.mjs';
import {canonicalSha256} from './clock.mjs';
import {fileSha256} from './prepare.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const bind=async file=>{const raw=await readFile(file);return{path:file,bytes:raw.length,fileSha256:sha(raw)};};

export function extractQ5CandidateInput({source,input,sourceRefs}) {
  const plan=JSON.parse(source.planBytes),timeline=JSON.parse(source.timelineBytes);
  assert.equal(plan.elements.length,325);assert.equal(timeline.segments.length,12);
  assert.equal(input.captions.length,325);assert.equal(input.contexts.length,12);
  assert.equal(input.audioEvidence.allAsrSegments.length,462);
  assert.equal(input.audioEvidence.sampleRate,16000);
  const captions=input.captions.map(caption=>{
    const original=plan.elements.find(row=>row.instructionId===caption.captionId);
    assert(original);assert.equal(caption.text,original.text);
    assert.equal(caption.startFrame,original.startFrame);assert.equal(caption.endFrameExclusive,original.endFrameExclusive);
    assert.equal(original.visualState.textStyle.fontSizePx,94);
    return{captionId:caption.captionId,text:caption.text,lines:original.indexedLines.map(line=>line.renderedText),
      contextId:caption.contextId,startFrame:caption.startFrame,endFrameExclusive:caption.endFrameExclusive};
  });
  const contexts=input.contexts.map((context,index)=>{
    const segment=timeline.segments[index];
    assert.equal(context.contextId,'c-all-'+segment.segmentId);
    assert(captions.filter(row=>row.contextId===context.contextId).every(row=>row.startFrame>=segment.outputStartFrame
      &&row.endFrameExclusive<=segment.outputEndFrame));
    return{...context,segmentId:segment.segmentId,range:{startFrame:segment.outputStartFrame,endFrameExclusive:segment.outputEndFrame},
      originalSourceFrames:{startFrame:segment.sourceStartFrame30,endFrameExclusive:segment.sourceEndFrame30}};
  });
  const body={schemaVersion:'digest-quality-q5-1-candidate-input-v001',sourceRefs,
    original:{completedMedia:input.audioEvidence.sourceRef,baseMedia:source.mediaRef,normalPlan:source.planRef,timeline:source.timelineRef,
      digestRef:source.digestRef,frameCount:44408,fps:30,normalFontSizePx:94,playbackSampleRate:48000,channels:2,
      observationSampleRate:16000,asrRef:input.audioEvidence.asrRef,measurementRefs:input.audioEvidence.measurementRefs},
    task:'同じ保持場面内の近接した説明の重複候補。残す説明と省く説明を対で示し、未採用の一箇所省略案の候補を探す。',
    captions,contexts,asrSegments:structuredClone(input.audioEvidence.allAsrSegments),
    limitations:['全325字幕・全12保持場面・保存ASR462区間を入力する。過去の具体演出回答と品質レビュー回答は入力しない。',
      '保存文脈の保持理由は元版の意図であり省略案の正解ではない。依存する意味を落とさないか確認する。',
      'ASRは元の通常完成版の音声を16kHzで観測した結果。保存秒値を保持し、確定した語の切断frameとは扱わない。',
      '新しい映像の意味観測・音声聴取は実施しない。未知の映像情報や反復の演技的意味は不足・正常な別説明として残す。',
      '初回判断は候補の意味と関連発話の範囲だけ。実際の切断frameは周辺PCM・字幕境界・編集計画と照合後に別途固定する。']};
  return{...body,inputSha256:canonicalSha256(body)};
}

export async function prepareQ5CandidateRequest({q4Directory,outputDirectory}) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});
  const {source,input}=await verifyQ4Request(q4Directory);
  const sourceRefs={q4Request:await bind(path.join(q4Directory,'request.json')),
    q4SourceBindings:await bind(path.join(q4Directory,'source-bindings.json')),
    q4SemanticInput:await bind(path.join(q4Directory,'judgment-input.json'))};
  const asrRaw=await readFile(input.audioEvidence.asrRef.path);
  assert.equal(sha(asrRaw),input.audioEvidence.asrRef.fileSha256);
  const asr=JSON.parse(asrRaw);assert.deepEqual(asr.segments,input.audioEvidence.allAsrSegments);
  assert.equal(asr.source.sha256,input.audioEvidence.sourceRef.fileSha256);
  assert.equal(await fileSha256(input.audioEvidence.sourceRef.path),input.audioEvidence.sourceRef.fileSha256);
  const candidateInput=extractQ5CandidateInput({source,input,sourceRefs});
  const prompt=await readFile(path.join(here,'q5-candidate-prompt.md'));
  await mkdir(outputDirectory,{recursive:true});
  await save(path.join(outputDirectory,'input.json'),candidateInput);
  await writeFile(path.join(outputDirectory,'prompt.md'),prompt,{flag:'wx'});
  const request={schemaVersion:'digest-quality-q5-1-candidate-request-v001',input:await bind(path.join(outputDirectory,'input.json')),
    prompt:await bind(path.join(outputDirectory,'prompt.md')),inputSha256:candidateInput.inputSha256,sourceRefs,
    originalMediaVerified:true,completeCaptionCount:325,completeContextCount:12,completeAsrCount:462,
    oldConcretePresentationLabelsProvided:false,oldHumanQualityAnswersProvided:false,
    newSemanticMediaObservation:false,contentEditAdopted:false};
  await save(path.join(outputDirectory,'request.json'),request);
  return request;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [q4Directory,outputDirectory,...extra]=process.argv.slice(2);
  if(!q4Directory||!outputDirectory||extra.length)throw new Error('Usage: q5-candidate-input.mjs <saved-q4-request-dir> <unused-q5-candidate-dir>');
  prepareQ5CandidateRequest({q4Directory:path.resolve(q4Directory),outputDirectory:path.resolve(outputDirectory)})
    .then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}

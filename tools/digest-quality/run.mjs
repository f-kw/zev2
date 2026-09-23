import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareQualityInput} from './prepare.mjs';
import {measureCompletedPcm} from './measure-pcm.mjs';
import {canonicalHash, validateQualityInput, validateQualityReply, verifyReferences} from './validate.mjs';
import {convertQualityReview} from './review.mjs';
import {buildReview} from '../point-review/build.mjs';
import {blankAnswers} from '../point-review/core.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=async (file,value)=>writeFile(file,`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});

export async function verifySavedRequest(outputDir) {
  const bytes=await readFile(path.join(outputDir,'judgment-input.json'));
  const prompt=await readFile(path.join(outputDir,'judgment-prompt.md'));
  const request=await json(path.join(outputDir,'request.json'));
  const packet=JSON.parse(bytes.toString('utf8'));
  if (request.schemaVersion!=='digest-quality-request-v001' || request.inputFileSha256!==hash(bytes) ||
      request.inputSha256!==packet.inputSha256 || request.promptSha256!==hash(prompt) ||
      request.mediaSha256!==packet.media?.sha256) throw new Error('Q3 saved judgment request does not match input, prompt or media');
  return packet;
}

export async function prepareRun(outputDir) {
  outputDir=path.resolve(outputDir);
  await mkdir(path.dirname(outputDir),{recursive:true}); await mkdir(outputDir);
  const packet=await prepareQualityInput({outputDir:path.join(outputDir,'source-inputs')});
  const pcm=await measureCompletedPcm(packet,{outputDir:path.join(outputDir,'pcm')});
  packet.references.push(pcm.reference); packet.evidence.push(...pcm.evidence);
  for (const unit of packet.units) unit.evidenceIds.push(`pcm-${unit.id}`);
  packet.clock.provenance.completedPcm={probedEffectiveStreamSamples:packet.media.audioSampleCount,
    decodedSamples:pcm.decodedSampleCount,decoderTailSamples:pcm.details.decoderTailSamples,
    referenceId:pcm.reference.id,method:'unchanged-channel float32 decode; video-bounded target intervals'};
  packet.media.audioSampleCount=pcm.decodedSampleCount;
  packet.limitations.push('完成動画全区間のPCM数値は測定したが、新規の意味的映像観測・聴覚レビューは行っていない。');
  delete packet.inputSha256; packet.inputSha256=canonicalHash(packet);
  validateQualityInput(packet);
  const checked=await verifyReferences(packet);
  const prompt=await readFile(path.join(here,'judgment-prompt.md'));
  await save(path.join(outputDir,'judgment-input.json'),packet);
  await writeFile(path.join(outputDir,'judgment-prompt.md'),prompt,{flag:'wx'});
  const receipt={schemaVersion:'digest-quality-request-v001',method:'current-Codex-text-and-observation-judgment',
    inputSha256:packet.inputSha256,inputFileSha256:hash(await readFile(path.join(outputDir,'judgment-input.json'))),
    promptSha256:hash(prompt),mediaSha256:packet.media.sha256,units:packet.units.length,evidence:packet.evidence.length,
    checkedReferences:checked,initialJudgmentPriorHumanAnswersProvided:false,initialJudgmentGenerationReasonsProvided:false,
    newExternalMediaTransmission:false,qualityApproved:false};
  await save(path.join(outputDir,'request.json'),receipt);
  return {outputDir,inputSha256:packet.inputSha256,mediaSha256:packet.media.sha256,units:packet.units.length,evidence:packet.evidence.length};
}

export async function acceptRun(outputDir,replyPath) {
  outputDir=path.resolve(outputDir);
  const raw=await readFile(replyPath);
  // Retain the received bytes before JSON parsing or semantic validation.
  const saved=path.join(outputDir,'judgment-reply.raw.json');
  await writeFile(saved,raw,{flag:'wx'});
  try {
    const packet=await verifySavedRequest(outputDir);
    await verifyReferences(packet);
    const accepted=validateQualityReply(packet,raw);
    await save(path.join(outputDir,'judgment-validation.json'),accepted);
    return {status:accepted.status,reviewEligible:accepted.reviewEligible,...accepted.counts,rawReplySha256:accepted.rawReplySha256};
  } catch(error) {
    await save(path.join(outputDir,'judgment-rejection.json'),{schemaVersion:'digest-quality-rejection-v001',rawReplySha256:hash(raw),message:error.message,reviewCreated:false});
    throw error;
  }
}

export async function reviewRun(outputDir,comparisonPath) {
  outputDir=path.resolve(outputDir);
  const packet=await verifySavedRequest(outputDir);
  await verifyReferences(packet);
  const comparison=await json(comparisonPath);
  for (const ref of comparison.references ?? []) {
    if (typeof ref.path!=='string'||hash(await readFile(ref.path))!==ref.sha256) throw new Error('Q3 post-comparison reference changed');
  }
  const result=convertQualityReview(packet,await readFile(path.join(outputDir,'judgment-reply.raw.json')),comparison);
  const reviewDir=path.join(outputDir,'review'); await mkdir(reviewDir);
  await save(path.join(reviewDir,'result.json'),{...result,review:result.review ? 'review.json' : null});
  if (!result.review) return result;
  const dataPath=path.join(reviewDir,'review.json'); await save(dataPath,result.review);
  const built=await buildReview({dataPath,outputPath:path.join(reviewDir,'index.html')});
  await save(path.join(reviewDir,'build.json'),built);
  await save(path.join(reviewDir,'blank-answers.json'),blankAnswers(result.review,built.review_sha256));
  return {status:result.status,...built};
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,outputDir,inputPath]=process.argv.slice(2);
  let action;
  if (command==='prepare'&&outputDir&&!inputPath) action=()=>prepareRun(outputDir);
  else if (command==='accept'&&outputDir&&inputPath) action=()=>acceptRun(outputDir,inputPath);
  else if (command==='review'&&outputDir&&inputPath) action=()=>reviewRun(outputDir,inputPath);
  else action=()=>{throw new Error('Usage: node tools/digest-quality/run.mjs prepare <new-directory> | accept <directory> <actual-reply.json> | review <directory> <post-comparison.json>');};
  Promise.resolve().then(action).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.stack);process.exitCode=1;});
}

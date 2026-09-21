import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonical} from './core.mjs';
import {sha256} from './build.mjs';
import {buildReviewSession,verifySessionDigests,verifySessionRetryBundle} from './session-build.mjs';
import {validateSessionAnswers,mergeSessionAnswers,mergeRetrySessionAnswers,recordNumberedChatAnswers} from './session-core.mjs';

const read=async path=>JSON.parse(await readFile(path,'utf8'));
export function summarizeSessionAnswers(session,answers){
  validateSessionAnswers(session,answers);
  const counts={answered:0,good:0,change_requested:0,both_usable:0,no_decision:0,comment_only:0,unanswered:0};
  let number=0;
  const points=answers.batches.flatMap(batch=>batch.review.points.map(point=>{
    const answer=batch.answers.answers.find(a=>a.point_id===point.point_id);number++;
    if(answer.source===null)counts.unanswered++;else{counts.answered++;counts[answer.choice??'comment_only']++;}
    return {number,batch_id:batch.review.batch_id,revision:batch.review.revision,review_sha256:batch.review_sha256,
      point_id:point.point_id,review_id:point.review_id,title:point.title,target_function:point.target_function,
      question:point.question,scope:point.scope,answer};
  }));
  return {session_id:session.session_id,total:points.length,counts,points,automatic_edits_applied:false,formal_adoption:false};
}
async function saveReceipt(session,answers,outputDir,receivedVia){
  validateSessionAnswers(session,answers);
  const output=resolve(outputDir);await mkdir(output,{recursive:false});
  await mkdir(join(output,'by-review'));
  const save=(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  await save(join(output,'session-answers.json'),answers);
  const perReview=[];
  for(const batch of answers.batches){
    const path=join(output,'by-review',`${batch.review.batch_id}-${batch.review.revision}-answers.json`);
    await save(path,batch.answers);perReview.push({path,batch_id:batch.review.batch_id,review_sha256:batch.review_sha256,answers_sha256:sha256(canonical(batch.answers))});
  }
  const summary=summarizeSessionAnswers(session,answers);await save(join(output,'summary.json'),summary);
  const reread=await read(join(output,'session-answers.json'));validateSessionAnswers(session,reread);
  if(canonical(answers)!==canonical(reread))throw new Error('保存した回答が一致しません');
  await save(join(output,'receipt.json'),{schema_version:'zev-point-review-session-receipt-v001',received_via:receivedVia,
    saved_at:new Date().toISOString(),session_id:session.session_id,display_review_sha256:session.display_review_sha256,
    answers_sha256:sha256(canonical(answers)),per_review:perReview,counts:summary.counts,automatic_edits_applied:false,formal_adoption:false});
  return {output_dir:output,counts:summary.counts};
}
export async function runSessionCommand(args){
  const [command,...paths]=args;
  if(command==='build'&&paths.length===2)return buildReviewSession({manifestPath:resolve(paths[0]),outputDir:resolve(paths[1])});
  if(command==='verify'&&paths.length===2){const session=verifySessionDigests(await read(paths[0])),answers=await read(paths[1]);return summarizeSessionAnswers(session,answers);}
  if(command==='import-retry'&&paths.length===4){
    const bundle=verifySessionRetryBundle(await read(paths[0])),current=await read(paths[1]),packet=await read(paths[2]);
    const answers=mergeRetrySessionAnswers(bundle.session_package,bundle.retry,current,packet);
    return saveReceipt(bundle.session_package,answers,paths[3],'returned-retry-answer-file');
  }
  if(['import','chat'].includes(command)&&paths.length===4){
    const session=verifySessionDigests(await read(paths[0])),current=await read(paths[1]),incoming=await read(paths[2]);
    validateSessionAnswers(session,current);
    const answers=command==='import'?mergeSessionAnswers(session,current,incoming):recordNumberedChatAnswers(session,current,incoming);
    return saveReceipt(session,answers,paths[3],command==='import'?'returned-session-answer-file':'chat');
  }
  throw new Error('Usage: session-run.mjs build MANIFEST NEW_DIR | verify PACKAGE ANSWERS | import|chat PACKAGE CURRENT INCOMING NEW_DIR | import-retry BUNDLE CURRENT INCOMING NEW_DIR');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))runSessionCommand(process.argv.slice(2)).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});

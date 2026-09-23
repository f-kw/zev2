import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,stat} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Script} from 'node:vm';
import {validateAnswers,canonical} from './core.mjs';
import {verifySessionDigests,createReviewSessionRetryBundle} from './session-build.mjs';
import {blankSessionAnswers,recordNumberedChatAnswers,packRetrySessionAnswers} from './session-core.mjs';

// Tests only the new entry against the prepared ten-point package. Hypothetical
// answers are confined to technical-fixtures; the human pending file is read-only.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const output=join(root,'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/human-review-batch-10-20260921-v001');
const packagePath=join(output,'session-package.json'),pendingPath=join(output,'answers-pending.json');
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const save=async(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
function cli(...args){
  const result=spawnSync(process.execPath,[join(root,'tools/point-review/session-run.mjs'),...args],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);return {pid:result.pid,value:JSON.parse(result.stdout)};
}

test('actual ten-point package: unchanged originals, unanswered rows and executable shared template',async()=>{
  const session=verifySessionDigests(await read(packagePath));
  const pending=await read(pendingPath),summary=cli('verify',packagePath,pendingPath);
  assert.equal(summary.value.total,10);assert.equal(summary.value.counts.answered,0);assert.equal(summary.value.counts.unanswered,10);
  const manifest=await read(join(root,'docs/reports/human-review-batch-10-20260921-v001/input-manifest-v001.json'));
  for(let i=0;i<manifest.sources.length;i++){
    assert.deepEqual(session.sources[i].review,await read(manifest.sources[i].review_path));
    assert.deepEqual(session.sources[i].initial_answers,await read(manifest.sources[i].answers_path));
    assert.deepEqual(pending.batches[i].answers,session.sources[i].initial_answers);
  }
  assert.deepEqual(session.display_review.points.map(p=>p.point_id),manifest.point_order);
  assert.equal(session.display_review.points[0].review_id,session.display_review.points[1].review_id);
  const html=await readFile(join(output,'review.html'),'utf8'),embedded=JSON.parse(html.match(/id="review-package">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(embedded.session_package,session);assert.equal((html.match(/<video /g)||[]).length,1);
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});

test('separate processes preserve numbered chat raw text, original batches and remaining unanswered points',async()=>{
  const folder=await mkdtemp(join(output,'technical-fixtures-'));
  const received='2026-09-21T04:00:00.000Z'; // Fictional test timestamp, not a human receipt.
  const entries=[[1,'good',''],[2,'change_requested','文字が少し下'],[5,'no_decision',''],[9,'both_usable','']].map(([number,choice,comment])=>({number,choice,comment,
    raw_response:`【技術検査用の架空回答。本人の回答ではありません】${number}: ${choice}${comment}`,source:'chat',answered_at:received}));
  const input=join(folder,'hypothetical-chat.json');await save(input,entries);
  const saved=cli('chat',packagePath,pendingPath,input,join(folder,'received'));
  const resultPath=join(folder,'received/session-answers.json'),reread=cli('verify',packagePath,resultPath);
  assert.notEqual(saved.pid,reread.pid);
  assert.deepEqual(reread.value.counts,{answered:4,good:1,change_requested:1,both_usable:1,no_decision:1,comment_only:0,unanswered:6});
  assert.equal(reread.value.points[8].answer.choice,'both_usable');assert.equal(reread.value.points[9].answer.source,null);
  for(const entry of entries){const answer=reread.value.points[entry.number-1].answer;assert.equal(answer.raw_response,entry.raw_response);assert.equal(answer.answered_at,received);}
  const session=await read(packagePath),envelope=await read(resultPath);
  for(let i=0;i<session.sources.length;i++){
    const source=session.sources[i],split=await read(join(folder,'received/by-review',`${source.review.batch_id}-${source.review.revision}-answers.json`));
    validateAnswers(split,source.review,source.review_sha256);assert.deepEqual(split,envelope.batches[i].answers);
  }
  const imported=cli('import',packagePath,resultPath,pendingPath,join(folder,'blank-import'));
  assert.equal(imported.value.counts.answered,4);
  assert.equal(canonical(await read(join(folder,'blank-import/session-answers.json'))),canonical(envelope));
  await save(join(folder,'observations.json'),{test_only:true,human_answers_received:false,save_pid:saved.pid,reread_pid:reread.pid,counts:reread.value.counts});
  assert.equal(cli('verify',packagePath,pendingPath).value.counts.answered,0);
});

test('wrong original review, altered media clock and duplicate chat number are rejected before output',async()=>{
  const folder=await mkdtemp(join(output,'technical-rejections-')),blank=await read(pendingPath);
  const cases=[
    {name:'other-review',command:'import',value:(()=>{const value=structuredClone(blank);[value.batches[3],value.batches[4]]=[value.batches[4],value.batches[3]];return value;})()},
    {name:'wrong-clock',command:'import',value:(()=>{const value=structuredClone(blank);value.batches[4].answers.answers[0].offered_views[1].start_frame=1;return value;})()},
    {name:'duplicate-number',command:'chat',value:[1,1].map(number=>({number,choice:'good',comment:'',raw_response:'【架空試験】1は良い',source:'chat',answered_at:'2026-09-21T04:00:00.000Z'}))},
  ];
  for(const entry of cases){
    const input=join(folder,entry.name+'.json'),destination=join(folder,entry.name);await save(input,entry.value);
    const result=spawnSync(process.execPath,[join(root,'tools/point-review/session-run.mjs'),entry.command,packagePath,pendingPath,input,destination],{encoding:'utf8'});
    assert.equal(result.status,1);await assert.rejects(stat(destination),{code:'ENOENT'});
  }
});

test('retry file import binds the received state, updates only requested answers, and is readable in a separate process',async()=>{
  const folder=await mkdtemp(join(output,'technical-retry-import-')),session=await read(packagePath);
  const html=await readFile(join(output,'review.html'),'utf8'),bundle=JSON.parse(html.match(/id="review-package">([\s\S]*?)<\/script>/)[1]);
  const entries=session.display_review.points.map((point,index)=>({number:index+1,choice:[2,8].includes(index)?'no_decision':'good',comment:'',
    raw_response:`【技術検査用の架空回答。本人の回答ではありません】${index+1}`,source:'chat',answered_at:'2026-09-21T04:00:00.000Z'}));
  const current=recordNumberedChatAnswers(session,blankSessionAnswers(session),entries),before=canonical(current);
  const retry=createReviewSessionRetryBundle(bundle,current,[{point_id:session.display_review.points[2].point_id,initial_view_id:'background-graph-paper'},
    {point_id:session.display_review.points[8].point_id,initial_view_id:'Q5-AFTER-VIEW'}]);
  const draft=blankSessionAnswers(retry.session_package),empty=packRetrySessionAnswers(retry.session_package,retry.retry,draft);
  Object.assign(draft.batches[0].answers.answers[2],{choice:'change_requested',comment:'技術検査用',raw_response:'直したい\n技術検査用',source:'local_form',answered_at:'2026-09-21T05:00:00.000Z'});
  Object.assign(draft.batches[3].answers.answers[0],{choice:'both_usable',comment:'技術検査用',raw_response:'両方使える\n技術検査用',source:'local_form',answered_at:'2026-09-21T05:00:00.000Z'});
  const packet=packRetrySessionAnswers(retry.session_package,retry.retry,draft);
  const retryPath=join(folder,'retry-bundle.json'),currentPath=join(folder,'hypothetical-current.json'),packetPath=join(folder,'hypothetical-returned.json'),emptyPath=join(folder,'hypothetical-empty.json');
  await save(retryPath,retry);await save(currentPath,current);await save(packetPath,packet);await save(emptyPath,empty);
  const saved=cli('import-retry',retryPath,currentPath,packetPath,join(folder,'received'));
  const reread=cli('verify',packagePath,join(folder,'received/session-answers.json'));
  assert.notEqual(saved.pid,reread.pid);
  assert.deepEqual(reread.value.counts,{answered:10,good:8,change_requested:1,both_usable:1,no_decision:0,comment_only:0,unanswered:0});
  const imported=await read(join(folder,'received/session-answers.json'));
  const allBefore=current.batches.flatMap(batch=>batch.answers.answers),allAfter=imported.batches.flatMap(batch=>batch.answers.answers);
  for(let index=0;index<10;index++)if(![2,8].includes(index))assert.deepEqual(allAfter[index],allBefore[index]);
  cli('import-retry',retryPath,currentPath,emptyPath,join(folder,'empty-return'));
  assert.deepEqual(await read(join(folder,'empty-return/session-answers.json')),current);
  const wrong=structuredClone(packet);wrong.retry_sha256='f'.repeat(64);await save(join(folder,'wrong-retry.json'),wrong);
  const stale=structuredClone(current);stale.batches[3].answers.answers[0].raw_response+='別の受領';await save(join(folder,'stale-current.json'),stale);
  for(const [name,beforePath,inputPath]of[['old-format',currentPath,currentPath],['wrong-retry',currentPath,join(folder,'wrong-retry.json')],['stale',join(folder,'stale-current.json'),packetPath]]){
    const destination=join(folder,'rejected-'+name),result=spawnSync(process.execPath,[join(root,'tools/point-review/session-run.mjs'),'import-retry',retryPath,beforePath,inputPath,destination],{encoding:'utf8'});
    assert.equal(result.status,1);await assert.rejects(stat(destination),{code:'ENOENT'});
  }
  assert.equal(canonical(await read(currentPath)),before);
  await save(join(folder,'observations.json'),{test_only:true,human_answers_received:false,save_pid:saved.pid,reread_pid:reread.pid,counts:reread.value.counts,unchanged_answer_count:8});
});

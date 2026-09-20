import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {REVIEW_SCHEMA, ANSWERS, canonical, validateReview, blankAnswers, validateAnswers, recordAnswer, frameRange, saveAnswers, loadAnswers, storageKey} from './core.mjs';
import {createSegmentPlayer} from './player.mjs';
import {mountReview} from './app.mjs';
import {buildReview, sha256} from './build.mjs';

// Synthetic code-test data only. These byte fixtures are not reviewable videos.
function fixture(batch='TEST-A') {
  const media=(media_id,total_frames,timeline_start_frame)=>({media_id,label:`試験 ${media_id}`,path:`${media_id}.mp4`,sha256:sha256(media_id),fps_num:30,fps_den:1,total_frames,timeline_id:'TEST-TIMELINE',timeline_start_frame});
  const view=(view_id,role,media_id,start_frame,end_frame,context_start_frame,context_end_frame)=>({view_id,label:`試験 ${view_id}`,role,media_id,start_frame,end_frame,context_start_frame,context_end_frame});
  const point=(point_id,review_id,views)=>({point_id,review_id,related_review_ids:['HR-001'],title:'試験の整列',question:'試験の文字と背景は整って見えるか',target_function:'Panelの整列',change_summary:'試験用の修正',why_human_review:'見た目の最終判断は人間へ残す',scope:{level:'point',applies_to:['このポイントのセンタリング'],does_not_apply_to:['フェード','全編','機能の使用許可']},views});
  return {schema_version:REVIEW_SCHEMA,batch_id:batch,revision:'v001',title:'コード試験専用',intro:'実動画レビューではありません',media:[media('before',900,0),media('after',180,450)],points:[point('POINT-1','HRC-001',[view('before-view','before','before',450,510,420,540),view('after-view','after','after',0,60,0,90)]),point('POINT-2','HRC-003',[view('motion','candidate','after',90,150,60,180)])]};
}
const binding=review=>sha256(canonical(review));
const localAnswer=(choice='good',comment='')=>({choice,comment,raw_response:[choice===null?'':ANSWERS[choice],comment].filter(Boolean).join('\n'),source:'local_form',answered_at:'2026-09-20T00:00:00.000Z'});
class MemoryStorage {
  values=new Map();getItem(key){return this.values.get(key)??null;}setItem(key,value){this.values.set(key,value);}
}
test('fixed format: every point starts unanswered; each video has its own clock',()=>{
  const review=validateReview(fixture()),answers=blankAnswers(review,binding(review));
  assert.ok(answers.answers.every(a=>a.choice===null&&a.source===null&&a.answered_at===null));
  const [before,after]=review.points[0].views;
  assert.equal(frameRange(review,before).start,15);assert.equal(frameRange(review,after).start,0);
  assert.equal(frameRange(review,before).timeline_start_frame,frameRange(review,after).timeline_start_frame);
  assert.equal(frameRange(review,after,true).end,3);
  assert.equal(frameRange(review,review.points[1].views[0],true).start,2);
});
test('reject duplicate IDs, missing media, invalid ranges, loose fields, remote paths and orphan comparison',()=>{
  const mutations=[r=>r.points.push(structuredClone(r.points[0])),r=>r.media.push(structuredClone(r.media[0])),r=>r.points[0].views.push(structuredClone(r.points[0].views[0])),r=>r.points[0].views[0].media_id='missing',r=>r.points[0].views[1].end_frame=999,r=>r.points[0].views[1].start_frame=60,r=>r.points[0].views[0].context_start_frame=500,r=>r.points[0].views[0].start_frame=1.2,r=>r.points[0].views.pop(),r=>r.points[0].adopted=true,r=>r.media[0].path='https://example.com/movie.mp4',r=>r.media[0].fps_den=0];
  for(const mutate of mutations){const review=fixture();mutate(review);assert.throws(()=>validateReview(review));}
});
test('answers stay bound to exact batch, version, points, scope, SHA and ranges',()=>{
  const review=fixture(),sha=binding(review),blank=blankAnswers(review,sha);
  const answers=recordAnswer(blank,review,sha,'POINT-1',localAnswer('good','中央は良い'));
  assert.equal(answers.answers[0].raw_response,'良い\n中央は良い');assert.equal(answers.answers[1].source,null);
  assert.equal('decision' in answers.answers[0],false);assert.equal('adopted' in answers.answers[0],false);
  assert.equal(blank.answers[0].choice,null);
  for(const mutate of [a=>a.revision='v002',a=>a.batch_id='TEST-B',a=>a.review_sha256='a'.repeat(64),a=>a.answers[0].scope.applies_to.push('全用途'),a=>a.answers[0].offered_views[0].sha256='b'.repeat(64),a=>a.answers[0].offered_views[0].start_frame=1,a=>a.answers[0].review_id='HR-005',a=>a.answers.push(a.answers[0]),a=>a.answers[1].point_id='MISSING',a=>a.answers.pop(),a=>a.answers[0].choice='ADOPT',a=>a.answers[0].raw_response='異なる原文']){const bad=structuredClone(answers);mutate(bad);assert.throws(()=>validateAnswers(bad,review,sha));}
  const revised=fixture();revised.points[0].question='別の問い';assert.throws(()=>validateAnswers(answers,revised,binding(revised)));
});
test('bundle answer and chat original remain a single scoped record; both-usable only has two offered views',()=>{
  const review=fixture();review.points[1].scope.level='bundle';review.points[1].related_review_ids=['HR-002','HR-003','HR-004'];
  const sha=binding(review),raw='動き全体は良い。細かい種類ごとは判断しない。';
  const answers=recordAnswer(blankAnswers(review,sha),review,sha,'POINT-2',{choice:'good',comment:'',raw_response:raw,source:'chat',answered_at:'2026-09-20T02:00:00.000Z'});
  assert.equal(answers.answers.length,2);assert.equal(answers.answers[1].review_id,'HRC-003');assert.equal(answers.answers[1].raw_response,raw);assert.equal(answers.answers[1].scope.level,'bundle');
  assert.equal(answers.answers[0].source,null);assert.throws(()=>recordAnswer(answers,review,sha,'POINT-2',localAnswer('both_usable')));
  const both=recordAnswer(answers,review,sha,'POINT-1',localAnswer('both_usable'));
  assert.equal(both.answers[0].offered_views.length,2);assert.deepEqual(both.answers[0].scope,review.points[0].scope);
});
test('local persistence round-trips raw answers; other revisions remain unanswered; corrupt stored data rejected',()=>{
  const review=fixture(),sha=binding(review),storage=new MemoryStorage();
  const answers=recordAnswer(blankAnswers(review,sha),review,sha,'POINT-1',localAnswer('no_decision'));
  saveAnswers(storage,answers,review,sha);assert.deepEqual(loadAnswers(storage,review,sha),answers);
  const next=fixture();next.revision='v002';assert.equal(loadAnswers(storage,next,binding(next)).answers[0].source,null);
  storage.setItem(storageKey(sha),'{not json}');assert.throws(()=>loadAnswers(storage,review,sha));
  assert.throws(()=>saveAnswers({setItem(){throw new Error('disabled');}},answers,review,sha),/disabled/);
});

class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners=new Map();this.attributes=new Map();this.textContent='';this.value='';this.disabled=false;this.hidden=false;this.classList={add:()=>{},remove:()=>{},toggle:()=>{}};}
  addEventListener(name,fn){const listeners=this.listeners.get(name)||[];listeners.push(fn);this.listeners.set(name,listeners);}
  async emit(name){for(const fn of this.listeners.get(name)||[])await fn({target:this});}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes.set(name,value);}getAttribute(name){return this.attributes.get(name)??null;}
  querySelector(){return this.children.flatMap(c=>c.children||[]).find(c=>c.tagName==='input'&&c.checked)??null;}
  focus(){this.focused=true;}click(){return this.emit('click');}remove(){}
}
class Video extends Element {
  constructor(){super('video');this.currentTime=0;this.duration=30;this.readyState=1;this.paused=true;this.playbackRate=1;this.pauseCount=0;this.loadCount=0;this.playCount=0;}
  set src(value){this.attributes.set('src',value);}get src(){return this.attributes.get('src');}
  load(){this.loadCount++;this.readyState=0;this.currentTime=0;this.paused=true;}
  pause(){this.pauseCount++;if(!this.paused){this.paused=true;void this.emit('pause');}}
  async play(){this.playCount++;this.paused=false;}
}
function scheduler(){let sequence=0;const frames=new Map(),timers=new Map();return {frames,timers,raf:fn=>{frames.set(++sequence,fn);return sequence;},cancelRaf:key=>frames.delete(key),setTimer:fn=>{timers.set(++sequence,fn);return sequence;},clearTimer:key=>timers.delete(key)};}
test('segment controller stops at boundary, clips external seeks, and cancels playback when switching media',async()=>{
  const video=new Video(),schedule=scheduler(),started=[];
  const player=createSegmentPlayer(video,{...schedule,onStarted:id=>started.push(id)});
  player.select({src:'file:///before.mp4',view_id:'before',start:15,end:17});video.readyState=1;await video.emit('loadedmetadata');
  assert.equal(video.currentTime,15);assert.equal(player.state.ready,true);
  await player.play();assert.equal(video.paused,false);assert.deepEqual(started,['before']);
  video.currentTime=17.1;await video.emit('timeupdate');assert.equal(video.paused,true);assert.equal(video.currentTime,17);assert.equal(player.state.running,false);
  await player.play();assert.equal(video.currentTime,15);
  player.select({src:'file:///after.mp4',view_id:'after',start:0,end:2});assert.equal(video.paused,true);assert.equal(schedule.frames.size,0);assert.equal(schedule.timers.size,0);
  video.duration=6;video.readyState=1;await video.emit('loadedmetadata');await player.play();video.currentTime=-1;await video.emit('seeking');assert.equal(video.currentTime,0);
  video.currentTime=2;for(const fn of [...schedule.timers.values()])fn();assert.equal(video.paused,true);assert.equal(video.currentTime,2);
  player.select({src:'file:///short.mp4',view_id:'short',start:0,end:20});video.duration=6;await video.emit('loadedmetadata');assert.equal(player.state.ready,false);assert.equal(await player.play(),false);
});
test('late play promise cannot revive a previous point or play after pause',async()=>{
  const video=new Video(),schedule=scheduler();let resolvePlay;
  video.play=()=>new Promise(resolve=>{resolvePlay=()=>{video.paused=false;resolve();};});
  const player=createSegmentPlayer(video,schedule);player.select({src:'file:///a.mp4',view_id:'a',start:0,end:2});await video.emit('loadedmetadata');
  const pending=player.play();player.select({src:'file:///b.mp4',view_id:'b',start:5,end:7});resolvePlay();assert.equal(await pending,false);assert.equal(video.paused,true);assert.equal(player.state.running,false);
});
function fakePage(){
  const nodes=new Map(),video=new Video(),storage=new MemoryStorage(),schedule=scheduler(),events=new Map(),downloads=[];
  const document={body:new Element('body'),hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,id==='video'?video:new Element());return nodes.get(id);},createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),addEventListener(name,fn){events.set(name,fn);}};
  const window={localStorage:storage,requestAnimationFrame:schedule.raf,cancelAnimationFrame:schedule.cancelRaf,setTimeout:schedule.setTimer,clearTimeout:schedule.clearTimer,addEventListener(name,fn){events.set(name,fn);},Blob,URL:{createObjectURL(blob){downloads.push(blob);return 'blob:local-test';},revokeObjectURL(){}}};
  return {document,window,nodes,video,storage,downloads,events};
}
test('DOM-model integration: fixed controls navigate two datasets, save/read/export, stop segments, and reject foreign imports',async()=>{
  for(const batch of ['TEST-A','TEST-B']){
    const review=fixture(batch),sha=binding(review),page=fakePage();
    const app=mountReview(page.document,page.window,{review,review_sha256:sha,media_sources:{before:'file:///before.mp4',after:'file:///after.mp4'}}),$=id=>page.document.getElementById(id);
    assert.equal($('answer-state').textContent,'未回答');assert.equal(page.video.src,'file:///after.mp4');
    page.video.duration=6;await page.video.emit('loadedmetadata');await $('play').click();assert.equal(page.video.paused,false);
    page.video.currentTime=2.1;await page.video.emit('timeupdate');assert.equal(page.video.paused,true);assert.equal(page.video.currentTime,2);
    await $('view-controls').children[0].click();assert.equal(page.video.src,'file:///before.mp4');assert.equal(page.video.paused,true);
    page.video.duration=30;await page.video.emit('loadedmetadata');await $('replay').click();assert.equal(page.video.currentTime,15);
    await $('context').click();assert.equal(page.video.paused,true);assert.equal(app.player.state.selection.start,14);assert.equal(app.player.state.selection.end,18);
    const good=$('choices').children[0].children[0];good.checked=true;await good.emit('change');$('comment').value='文字位置だけ良い';await $('comment').emit('input');
    assert.equal(app.getAnswers().answers[0].raw_response,'良い\n文字位置だけ良い');assert.equal(loadAnswers(page.storage,review,sha).answers[0].choice,'good');
    await $('next').click();assert.equal($('answer-state').textContent,'未回答');assert.equal($('view-controls').hidden,true);assert.equal($('choices').children[2].children[0].disabled,true);
    await $('previous').click();assert.equal($('comment').value,'文字位置だけ良い');
    await $('export').click();assert.deepEqual(JSON.parse(await page.downloads[0].text()),app.getAnswers());
    const old=app.getAnswers(),foreign=structuredClone(old);foreign.revision='different';$('import-file').files=[{text:async()=>JSON.stringify(foreign)}];await $('import-file').emit('change');assert.deepEqual(app.getAnswers(),old);assert.match($('save-status').textContent,/拒否/);
    const imported=recordAnswer(old,review,sha,'POINT-2',localAnswer('change_requested','動きを確認したい'));$('import-file').files=[{text:async()=>JSON.stringify(imported)}];await $('import-file').emit('change');assert.deepEqual(app.getAnswers(),imported);
    page.document.hidden=true;await page.events.get('visibilitychange')();assert.equal(page.video.paused,true);
    const reload=fakePage();reload.window.localStorage=page.storage;const restored=mountReview(reload.document,reload.window,{review,review_sha256:sha,media_sources:{before:'file:///before.mp4',after:'file:///after.mp4'}});assert.deepEqual(restored.getAnswers(),imported);
  }
});
test('builder reuses exact template for two datasets; rejects forged media SHA/frame count and output overwrite',async()=>{
  const temp=await mkdtemp(join(tmpdir(),'zev-point-review-code-test-'));
  try{
    await writeFile(join(temp,'before.mp4'),'before');await writeFile(join(temp,'after.mp4'),'after');
    const probe=async path=>({fps_num:30,fps_den:1,total_frames:path.endsWith('before.mp4')?900:180});
    const results=[];
    for(const batch of ['TEST-A','TEST-B']){
      const review=fixture(batch);if(batch==='TEST-B'){review.points=review.points.slice(1);review.title='別Batch';review.points[0].question='別の問い </script> <script>unsafe()</script>';}
      const dataPath=join(temp,`${batch}.json`),outputPath=join(temp,`${batch}.html`);await writeFile(dataPath,JSON.stringify(review));
      const result=await buildReview({dataPath,outputPath,probe}),html=await readFile(outputPath,'utf8');results.push(result);
      assert.equal(result.browser_checked,false);assert.equal(result.human_quality_checked,false);assert.ok(!html.includes('/*__DATA__*/'));assert.ok(!html.includes('fetch('));
      const embedded=JSON.parse(html.match(/id="review-package">([\s\S]*?)<\/script>/)[1]);assert.deepEqual(embedded.review,review);assert.equal(embedded.review_sha256,binding(review));
      assert.match(embedded.media_sources.before,/^file:\/\//);assert.equal((html.match(/<video /g)||[]).length,1);
      const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];assert.doesNotThrow(()=>runInNewContext(script,{document:{getElementById(){return {textContent:''};}},structuredClone,console}));
      await assert.rejects(buildReview({dataPath,outputPath,probe}),/EEXIST/);
    }
    assert.equal(results[0].template_sha256,results[1].template_sha256);assert.notEqual(results[0].review_sha256,results[1].review_sha256);
    const bad=fixture();bad.media[0].sha256='a'.repeat(64);const dataPath=join(temp,'bad.json');await writeFile(dataPath,JSON.stringify(bad));await assert.rejects(buildReview({dataPath,outputPath:join(temp,'bad.html'),probe}),/SHA-256/);
    bad.media[0].sha256=sha256('before');bad.media[0].total_frames=901;await writeFile(dataPath,JSON.stringify(bad));await assert.rejects(buildReview({dataPath,outputPath:join(temp,'bad2.html'),probe}),/frame/);
  }finally{await rm(temp,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {renderReviewSessionHtml,createReviewSessionRetryBundle} from './session-build.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const output=resolve(root,'evals/clip_composition/outputs/presentation/stage4-editing-20260918-v001/human-review-batch-10-20260921-v001');
class PlaybackTestElement{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners=new Map();this.attributes=new Map();this.textContent='';this.value='';this.disabled=false;this.hidden=false;this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(name,fn){const list=this.listeners.get(name)||[];list.push(fn);this.listeners.set(name,list);}
  async emit(name){for(const fn of this.listeners.get(name)||[])await fn({target:this});}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attributes.set(name,value);}getAttribute(name){return this.attributes.get(name)??null;}
  querySelector(){return this.children.flatMap(c=>c.children||[]).find(c=>c.tagName==='input'&&c.checked)??null;}
  focus(){}async click(){if(!this.disabled)await this.emit('click');}remove(){}
}
class GestureLoadedVideo extends PlaybackTestElement{
  constructor(durations){super('video');this.durations=durations;this.duration=NaN;this.currentTime=0;this.readyState=0;this.paused=true;this.playbackRate=1;this.error=null;this.networkState=0;}
  set src(value){this.attributes.set('src',value);}get src(){return this.attributes.get('src');}get currentSrc(){return this.src;}
  load(){this.readyState=0;this.duration=NaN;this.currentTime=0;this.paused=true;this.error=null;this.networkState=2;}
  pause(){const wasRunning=!this.paused;this.paused=true;if(wasRunning)void this.emit('pause');}
  async play(){
    // Simulate a browser that defers metadata until the user's play request.
    // No real file, decoder, browser, sound or video is used by this code test.
    if(this.readyState===0){this.duration=this.durations.get(this.src);this.readyState=1;await this.emit('loadedmetadata');}
    this.readyState=3;this.networkState=1;await this.emit('loadeddata');await this.emit('canplay');
    this.paused=false;await this.emit('playing');
  }
}
function playbackTestPage(bundle,durationOverride){
  const durations=durationOverride??new Map(bundle.review.media.map(media=>[bundle.media_sources[media.media_id],media.total_frames*media.fps_den/media.fps_num]));
  const video=new GestureLoadedVideo(durations),nodes=new Map(),values=new Map(),callbacks=new Map();let serial=0;
  const document={hidden:false,body:new PlaybackTestElement('body'),getElementById(id){if(!nodes.has(id))nodes.set(id,id==='video'?video:new PlaybackTestElement());return nodes.get(id);},createElement:tag=>new PlaybackTestElement(tag),createTextNode:text=>({textContent:text}),addEventListener(){}};
  document.getElementById('review-package').textContent=JSON.stringify(bundle);
  const schedule=fn=>{callbacks.set(++serial,fn);return serial;},cancel=id=>callbacks.delete(id);
  const window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},requestAnimationFrame:schedule,cancelAnimationFrame:cancel,setTimeout:schedule,clearTimeout:cancel,addEventListener(){},Blob,URL:{createObjectURL(){return 'blob:code-test';},revokeObjectURL(){}}};
  return {document,window,video,values};
}

test('saved broken page disables points 2 and 3 while their metadata waits for a play gesture',async()=>{
  const html=await readFile(resolve(output,'review-before-repair-v001.html'),'utf8');
  const bundle=JSON.parse(html.match(/id="review-package">([\s\S]*?)<\/script>/)[1]),page=playbackTestPage(bundle);
  const $=id=>page.document.getElementById(id);
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:page.document,window:page.window,structuredClone,setTimeout,clearTimeout,console});
  page.video.duration=page.video.durations.get(page.video.src);page.video.readyState=1;await page.video.emit('loadedmetadata');
  assert.equal($('play').disabled,false);
  for(const number of [2,3]){
    await $('point-nav').children[number-1].click();
    assert.equal($('play').disabled,true);assert.match($('playback-status').textContent,/読み込み中/);
    await $('play').click();assert.equal(page.video.readyState,0);assert.equal(page.video.paused,true);
  }
});

test('generated ten-point page permits gesture-loaded playback and stops all 17 original view intervals',async()=>{
  const oldHtml=await readFile(resolve(output,'review-before-repair-v001.html'),'utf8');
  const bundle=JSON.parse(oldHtml.match(/id="review-package">([\s\S]*?)<\/script>/)[1]);
  const rendered=await renderReviewSessionHtml(bundle),script=rendered.html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const page=playbackTestPage(bundle),$=id=>page.document.getElementById(id);
  runInNewContext(script,{document:page.document,window:page.window,structuredClone,setTimeout,clearTimeout,console});
  assert.equal($('point-nav').children.length,10);
  let checked=0;
  for(let pointIndex=0;pointIndex<bundle.review.points.length;pointIndex++){
    const point=bundle.review.points[pointIndex];await $('point-nav').children[pointIndex].click();
    assert.equal($('question').textContent,point.question);
    for(let viewIndex=0;viewIndex<point.views.length;viewIndex++){
      const view=point.views[viewIndex],media=bundle.review.media.find(m=>m.media_id===view.media_id);
      await $('view-controls').children[viewIndex].click();
      assert.equal($('play').disabled,false,`${point.point_id}/${view.view_id}: metadata待ちで再生を封鎖しない`);
      await $('play').click();
      assert.equal(page.video.paused,false,`${point.point_id}/${view.view_id}`);
      assert.equal(page.video.currentTime,view.start_frame*media.fps_den/media.fps_num);
      assert.match($('playback-status').textContent,/再生中/);
      page.video.currentTime=view.end_frame*media.fps_den/media.fps_num;await page.video.emit('timeupdate');
      assert.equal(page.video.paused,true);checked++;
    }
  }
  assert.equal(checked,17);
  for(const stored of page.values.values())for(const batch of JSON.parse(stored).batches)for(const answer of batch.answers.answers){assert.equal(answer.choice,null);assert.equal(answer.source,null);}
});

test('generated error-only page uses recorded decimal durations for points 3 and 9 and preserves eight received answers',async()=>{
  const oldHtml=await readFile(resolve(output,'review-before-repair-v001.html'),'utf8');
  const original=JSON.parse(oldHtml.match(/id="review-package">([\s\S]*?)<\/script>/)[1]);
  const report=resolve(root,'docs/reports/human-review-batch-10-20260921-v001');
  const received=JSON.parse(await readFile(resolve(report,'answers-received-v002/session-answers.json'),'utf8'));
  const diagnosis=JSON.parse(await readFile(resolve(report,'media-end-diagnosis-v001.json'),'utf8'));
  const bundle=createReviewSessionRetryBundle(original,received,[{point_id:'Q1-PANEL-BACKGROUND-VARIANTS',initial_view_id:'background-graph-paper'},
    {point_id:'Q5-1-C001',initial_view_id:'Q5-AFTER-VIEW'}]);
  const durations=new Map(original.review.media.map(media=>[original.media_sources[media.media_id],diagnosis.cases.find(item=>item.mediaPath===media.path).storedDuration.containerDecimalSeconds]));
  const rendered=await renderReviewSessionHtml(bundle),page=playbackTestPage(bundle,durations),$=id=>page.document.getElementById(id);
  runInNewContext(rendered.html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:page.document,window:page.window,structuredClone,setTimeout,clearTimeout,console});
  assert.equal($('point-nav').children.length,2);assert.match($('point-number').textContent,/POINT 3 \/ 10/);
  assert.equal($('view-label').textContent,'方眼紙（手選択）');
  let checked=0;
  for(const [position,index]of [2,8].entries()){
    await $('point-nav').children[position].click();
    const point=original.review.points[index];assert.equal($('question').textContent,point.question);
    for(const [viewIndex,view]of point.views.entries()){
      await $('view-controls').children[viewIndex].click();await $('play').click();
      assert.equal(page.video.paused,false,view.view_id);assert.match($('playback-status').textContent,/再生中/);
      const media=original.review.media.find(item=>item.media_id===view.media_id);
      assert.equal(page.video.currentTime,view.start_frame*media.fps_den/media.fps_num);
      if(view.end_frame===media.total_frames){page.video.currentTime=page.video.duration;page.video.ended=true;await page.video.emit('ended');}
      else{page.video.currentTime=view.end_frame*media.fps_den/media.fps_num;await page.video.emit('timeupdate');}
      assert.equal(page.video.paused,true,view.view_id);checked++;
    }
  }
  assert.equal(checked,5);
  const before=received.batches.flatMap(batch=>batch.answers.answers);
  for(const stored of page.values.values()){
    const after=JSON.parse(stored).batches.flatMap(batch=>batch.answers.answers);
    for(let index=0;index<10;index++)if([2,8].includes(index)){assert.equal(after[index].choice,null);assert.equal(after[index].source,null);}
    else assert.deepEqual(after[index],before[index]);
  }
});

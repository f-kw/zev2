// The builder strips these imports and embeds the same modules in every batch.
import {ANSWERS, validateReview, blankAnswers, loadAnswers, saveAnswers, validateAnswers, recordAnswer, frameRange} from './core.mjs';
import {createSegmentPlayer} from './player.mjs';

export function mountReview(document, window, bundle) {
  const {review, review_sha256: reviewSha, media_sources: mediaSources} = bundle;
  validateReview(review);
  const $ = (name) => document.getElementById(name);
  const text = (name, value) => { $(name).textContent = value; };
  let pointIndex = 0, viewIndex = 0, expanded = false;
  let answers = blankAnswers(review, reviewSha), storage = null;
  function saveStatus(message, error = false) { text('save-status', message); $('save-status').classList.toggle('error', error); }
  try { storage = window.localStorage; answers = loadAnswers(storage, review, reviewSha); saveStatus('この端末の回答を読み込みました。未回答は未回答のまま残ります。'); }
  catch (error) { saveStatus(`端末の保存を読み込めませんでした。回答ファイルの取り出しは使えます。\n${error.message}`, true); }
  const point = () => review.points[pointIndex];
  const answer = () => answers.answers.find(a => a.point_id === point().point_id);
  function summary() {
    const count = answers.answers.filter(a => a.source !== null).length;
    text('summary', `${count} / ${review.points.length} ポイントに回答あり。未回答 ${review.points.length-count}。正式採用・課題完了は自動認定しません。`);
    text('answer-state', answer().source === null ? '未回答' : answer().choice === null ? 'コメントあり' : ANSWERS[answer().choice]);
  }
  function persist() {
    try {
      if (!storage) throw new Error('このブラウザーでは端末保存を利用できません。');
      saveAnswers(storage, answers, review, reviewSha); saveStatus('この端末へ保存しました。回答ファイルも取り出せます。');
    } catch (error) { saveStatus(`端末へ保存できません。ページを閉じる前に「回答を取り出す」を使ってください。\n${error.message}`, true); }
    summary();
  }
  const player = createSegmentPlayer($('video'), {
    raf: window.requestAnimationFrame.bind(window), cancelRaf: window.cancelAnimationFrame.bind(window),
    setTimer: window.setTimeout.bind(window), clearTimer: window.clearTimeout.bind(window),
    onStatus(state) {
      $('play').disabled = $('replay').disabled = !state.ready;
      if (state.error) { text('playback-status', state.error); $('playback-status').classList.add('error'); return; }
      $('playback-status').classList.remove('error');
      if (!state.selection) return;
      const duration = state.selection.end-state.selection.start;
      const elapsed = Math.max(0,Math.min(duration,state.current-state.selection.start));
      $('progress').value = elapsed/duration;
      text('playback-status', state.ready ? `${state.running ? '再生中' : '停止中'} · この区間 ${elapsed.toFixed(1)} / ${duration.toFixed(1)} 秒${expanded ? '（前後を含む）' : ''}` : '動画を読み込み中…');
    },
    onStarted(viewId) {
      const a = answer(); if (!a.playback_started_view_ids.includes(viewId)) a.playback_started_view_ids.push(viewId);
      persist();
    },
  });
  function selectView() {
    const p = point(), view = p.views[viewIndex], range = frameRange(review, view, expanded);
    const source = mediaSources[view.media_id];
    if (typeof source !== 'string' || !source.startsWith('file:///')) throw new Error('対象動画のローカル参照がありません');
    player.select({...range, view_id:view.view_id, src:source});
    text('view-label', view.label);
    $('view-controls').replaceChildren(...p.views.map((v, index) => {
      const button = document.createElement('button'); button.textContent = ['before','after'].includes(v.role) ? `${v.role === 'before' ? 'Before' : 'After'} · ${v.label}` : v.label;
      button.setAttribute('aria-pressed', String(index === viewIndex));
      button.addEventListener('click', () => { viewIndex = index; selectView(); }); return button;
    }));
    $('view-controls').hidden = p.views.length === 1;
    const canExpand = view.context_start_frame !== view.start_frame || view.context_end_frame !== view.end_frame;
    $('context').disabled = !canExpand; $('context').setAttribute('aria-pressed', String(expanded));
    $('context').textContent = expanded ? '元の区間に戻す' : '前後を少し広げる';
    text('technical', `${p.point_id} / ${p.review_id} · ${p.target_function} · ${p.scope.level === 'bundle' ? 'まとまりへの回答（関連項目へ個別配布しません）' : 'このポイントへの回答'}\n${view.media_id}: フレーム ${range.start_frame}–${range.end_frame}（終端を含まず） / 元時計 ${range.timeline_start_frame}–${range.timeline_end_frame}\nSHA-256: ${review.media.find(m => m.media_id === view.media_id).sha256}`);
  }
  function readForm() {
    const selected = $('choices').querySelector('input:checked');
    const choice = selected?.value ?? null, enteredComment = $('comment').value;
    const comment = choice === null && !enteredComment.trim() ? '' : enteredComment;
    const raw = [choice === null ? '' : ANSWERS[choice], comment].filter(Boolean).join('\n');
    answers = recordAnswer(answers, review, reviewSha, point().point_id, {choice,comment,raw_response:raw,source:raw.trim() ? 'local_form' : null,answered_at:raw.trim() ? new Date().toISOString() : null});
    persist();
  }
  function renderPoint(focus = false) {
    player.pause(); viewIndex = Math.max(0, point().views.findIndex(v => v.role === 'after' || v.role === 'candidate')); expanded = false;
    const p = point(), a = answer();
    text('point-number', `POINT ${pointIndex+1} / ${review.points.length} · ${p.point_id}`);
    text('point-title', p.title); text('question', p.question); text('change-summary', p.change_summary); text('why-review', p.why_human_review);
    text('applies-to', p.scope.applies_to.join(' ／ ')); text('does-not-apply', p.scope.does_not_apply_to.join(' ／ '));
    $('choices').replaceChildren(...Object.entries(ANSWERS).map(([value, label]) => {
      const wrap = document.createElement('label'); wrap.className = 'answer-label';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'answer'; input.value = value; input.checked = a.choice === value;
      input.disabled = value === 'both_usable' && p.views.length !== 2;
      input.addEventListener('change', readForm); wrap.append(input, document.createTextNode(label)); return wrap;
    }));
    $('comment').value = a.comment;
    $('previous').disabled = pointIndex === 0; $('next').disabled = pointIndex === review.points.length-1;
    $('point-nav').replaceChildren(...review.points.map((item,index) => {
      const button=document.createElement('button'); button.textContent=`${index+1}. ${item.title}`;
      if(index === pointIndex) button.setAttribute('aria-current','step');
      button.addEventListener('click',()=>{pointIndex=index;renderPoint(true);}); return button;
    }));
    selectView(); summary(); if(focus) $('point-title').focus();
  }
  text('batch-title', review.title); text('intro', review.intro);
  text('binding', `${review.batch_id} / ${review.revision} · レビュー版 SHA-256: ${reviewSha}`);
  $('play').addEventListener('click', () => player.play()); $('replay').addEventListener('click', () => player.play()); $('pause').addEventListener('click', () => player.pause());
  $('context').addEventListener('click', () => { expanded=!expanded; selectView(); });
  $('previous').addEventListener('click', () => { if(pointIndex>0){pointIndex--;renderPoint(true);} });
  $('next').addEventListener('click', () => { if(pointIndex<review.points.length-1){pointIndex++;renderPoint(true);} });
  $('comment').addEventListener('input',readForm);
  $('export').addEventListener('click', () => {
    player.pause(); validateAnswers(answers, review, reviewSha);
    const url=window.URL.createObjectURL(new window.Blob([JSON.stringify(answers,null,2)+'\n'],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`${review.batch_id}-${review.revision}-answers.json`;document.body.append(anchor);anchor.click();anchor.remove();
    window.setTimeout(()=>window.URL.revokeObjectURL(url),0); saveStatus('回答ファイルを取り出しました。保存先はブラウザーのダウンロード一覧で確認できます。');
  });
  $('import').addEventListener('click',()=>{player.pause();$('import-file').click();});
  $('import-file').addEventListener('change',async()=>{
    const file=$('import-file').files[0];if(!file)return;
    try { const incoming=validateAnswers(JSON.parse(await file.text()),review,reviewSha); answers=structuredClone(incoming);persist();renderPoint(); }
    catch(error){saveStatus(`読み込みを拒否しました。現在の回答は保持しています。\n${error.message}`,true);}
    finally{$('import-file').value='';}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
  window.addEventListener('pagehide',()=>player.pause());
  renderPoint();
  return {player, getAnswers:()=>structuredClone(answers)};
}

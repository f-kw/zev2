import assert from 'node:assert/strict';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {ROOT, readJson, readBound, fileSha} from './run_candidate_discovery_digest_skill_e2e_v001.mts';

const output = 'evals/clip_composition/outputs/presentation/work-digest-caption-sync-internal-edit-20260907-v001/internal-edit-v001';
const manifest = await readJson(`${output}/manifest.json`), verified = await readJson(`${output}/final-verification.json`);
assert.equal(verified.technicalStatus, 'passed');
const adoption = await readBound(manifest.machineAdoption), plan = await readBound(manifest.planBinding);
const parent = await readBound(plan.priorManifest), parentAdoption = await readBound(parent.machineAdoption);
const before = await readBound(parent.baseMedia.timeline), after = await readBound(manifest.baseMedia.timeline);
const video = [manifest.previousVideo, manifest.syncComparisonVideo, manifest.renderer.video];
for (const v of video) assert.equal(await fileSha(path.join(ROOT, v.path)), v.fileSha256);
const url = (p: string) => path.relative(output, p).split(path.sep).map(encodeURIComponent).join('/');
const escape = (s: string) => s.replace(/[&<>"']/gu, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]!));
const clock = (ms: number) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, '0')}`;
const scenes = parentAdoption.selectedCandidates.map((p: any, i: number) => {
  const selected = adoption.segments.filter((s: any) => s.candidateId === p.candidateId);
  const first = after.segments.find((s: any) => s.segmentId === selected[0].segmentId);
  const old = before.segments.find((s: any) => s.segmentId === p.timelineSegmentId);
  return {title: `場面${i + 1}: ${p.title}`, beforeSeconds: old.outputStartFrame / 30, afterSeconds: first.outputStartFrame / 30,
    meaning: adoption.candidates[i].meaningPreserved};
});
const currentDuration = verified.counts.durationMs, previousDuration = before.baseMedia.expectedFrameCount * 1000 / 30;
const unresolved = verified.cueTraces.filter((cue: any) => cue.startResolution !== 'resolved' || cue.endResolution !== 'resolved');
const unresolvedTable = unresolved.map((cue: any) => {
  const boundary = [cue.startResolution !== 'resolved' ? '開始' : '', cue.endResolution !== 'resolved' ? '終了' : ''].filter(Boolean).join('・');
  return `| ${clock(cue.rendererFrames.startFrame * 1000 / 30)} | ${cue.text.replaceAll('|', '\\|')} | ${boundary} |`;
}).join('\n');
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ダイジェストの比較</title><style>
body{font:16px/1.7 system-ui,sans-serif;background:#f5f6f8;color:#192330;max-width:1200px;margin:32px auto;padding:0 24px}h1{font-size:28px;margin-bottom:8px}h2{font-size:18px;margin:0 0 12px}p{margin:8px 0 18px}.players{display:grid;grid-template-columns:1fr 1fr;gap:20px}.card{background:white;border:1px solid #d8dee6;border-radius:12px;padding:18px}video{display:block;width:100%;max-height:56vh;background:#111;border-radius:6px}button,select{font:inherit;cursor:pointer;padding:8px 12px;border:1px solid #b7c4d3;border-radius:6px;background:white;color:#192330}button:hover{background:#e8f0fb}nav{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}section{margin-top:24px}.note{color:#536376;font-size:14px}li{margin:6px 0}details{background:white;border:1px solid #d8dee6;border-radius:8px;padding:12px 18px;margin-top:12px}summary{cursor:pointer;font-weight:600}a{color:#175da8}@media(max-width:760px){.players{grid-template-columns:1fr}body{padding:0 14px;margin-top:20px}}
</style><h1>ダイジェストの比較</h1><p>旧版 ${clock(previousDuration)} → 内部編集版 ${clock(currentDuration)}。場面の見どころを保ちながら、重複する説明や別の話題を除いた編集案です。</p>
<p class="note">技術検査は合格。内容の自然さと字幕の同期は、人間による確認待ちです。字幕時刻には未確定の境界が残っています。</p>
<label>左側の比較対象 <select id="compare"><option value="0">旧版（元の字幕）</option><option value="1">字幕修正版（映像は旧版と同じ）</option></select></label>
<nav>${scenes.map((s: any, i: number) => `<button data-scene="${i}">場面${i + 1}から比較</button>`).join('')}</nav>
<div class="players"><div class="card"><h2 id="leftTitle">旧版</h2><video id="left" controls preload="metadata" src="${url(video[0].path)}"></video></div><div class="card"><h2>内部編集版</h2><video id="right" controls preload="metadata" src="${url(video[2].path)}"></video></div></div>
<p class="note">各動画は個別に再生してください。場面ボタンは、それぞれの版の同じ場面の冒頭へ移動します。</p>
<section class="card"><h2>確認する5点</h2><ol>${manifest.humanDecision.questions.map((q: string) => `<li>${escape(q)}</li>`).join('')}</ol></section>
<section><h2>残した内容</h2>${scenes.map((s: any) => `<details><summary>${escape(s.title)}</summary><p>${escape(s.meaning)}</p></details>`).join('')}</section>
<p class="note"><a href="review.md">比較の説明と動画ファイル</a> · <a href="${url('docs/reports/digest-caption-sync-and-internal-edit-20260907-v001.md')}">詳しい検証報告</a></p>
<script>
const scenes=${JSON.stringify(scenes)}, sources=${JSON.stringify(video.slice(0,2).map(v=>url(v.path)))};
const left=document.getElementById('left'),right=document.getElementById('right');let scene=0;
function seek(v,t){v.pause();if(v.readyState>=1)v.currentTime=t;else v.addEventListener('loadedmetadata',()=>v.currentTime=t,{once:true});}
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>{scene=Number(b.dataset.scene);seek(left,scenes[scene].beforeSeconds);seek(right,scenes[scene].afterSeconds);}));
document.getElementById('compare').addEventListener('change',e=>{left.src=sources[Number(e.target.value)];document.getElementById('leftTitle').textContent=Number(e.target.value)?'字幕修正版':'旧版';seek(left,scenes[scene].beforeSeconds);});
</script></html>`;
const md = `# ダイジェスト比較\n\n旧版 ${clock(previousDuration)} と内部編集版 ${clock(currentDuration)} を比較する。字幕修正版は旧版と同じ映像・音声で、字幕時刻だけを変更した比較対象。\n\n- [比較画面](${path.join(ROOT, output, 'review.html')})\n- [旧版 ${clock(previousDuration)}](${path.join(ROOT, video[0].path)})\n- [字幕修正版 ${clock(previousDuration)}](${path.join(ROOT, video[1].path)})\n- [内部編集版 ${clock(currentDuration)}](${path.join(ROOT, video[2].path)})\n\n## 同じ場面を比べる位置\n\n| 場面 | 旧版・字幕修正版 | 内部編集版 |\n|---|---:|---:|\n${scenes.map((s: any) => `| ${s.title} | ${clock(s.beforeSeconds * 1000)} | ${clock(s.afterSeconds * 1000)} |`).join('\n')}\n\n## 人間レビュー\n\n${manifest.humanDecision.questions.map((q: string) => `- ${q}`).join('\n')}\n\n技術検査合格は人間品質の合格ではない。内部編集版の字幕 ${verified.counts.captions} 件の開始・終了 ${verified.counts.captions * 2} 境界のうち、音響観測へ対応付けた境界は ${verified.counts.resolvedCaptionEndpoints} 点。残りは元の時刻を未確定として保持している。新しく切断した境界はすべて検証済み音響観測へ対応し、旧候補の外端を継承した箇所は音響補正未適用として記録した。\n\n${scenes.map((s: any) => `### ${s.title}\n\n${s.meaning}`).join('\n\n')}\n`;
await writeFile(path.join(ROOT, output, 'review.html'), html, {flag: 'wx'});
await writeFile(path.join(ROOT, output, 'review.md'), `${md}\n## 字幕同期で重点確認する箇所\n\n次は音響観測で確定できず、元の字幕時刻を維持した箇所。時刻は新版内の表示位置であり、発声の正解時刻ではない。\n\n| 新版内の位置 | 字幕 | 未確定の境界 |\n|---|---|---|\n${unresolvedTable}\n`, {flag: 'wx'});
console.log(JSON.stringify({status: 'created', path: `${output}/review.html`, previousDurationMs: previousDuration, currentDurationMs: currentDuration, scenes}));

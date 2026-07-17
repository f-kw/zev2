import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '../..');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function clock(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function renderLayer1PairReviewHtml(items) {
  const itemHtml = items.length === 0
    ? '<section class="empty"><h2>比較対象なし</h2><p>層1がカット指示を1件も出さなかったため、人間へ比較判断を要求しません。</p></section>'
    : items.map((item, index) => `
      <section class="card" data-item="${index}">
        <h2>確認${index + 1}: ${escapeHtml(item.fixtureId)} / expected ${item.expectedIndex}</h2>
        <p class="muted">同じ外側区間です。意味・溜め・反応・余韻と、各繋ぎ目の自然さを確認してください。</p>
        <div class="media-grid">
          <div><h3>詰め前</h3><video controls preload="metadata" src="${escapeHtml(item.beforePath)}"></video></div>
          <div><h3>詰め後</h3><video controls preload="metadata" src="${escapeHtml(item.afterPath)}"></video></div>
        </div>
        <details><summary>繋ぎ目の番号</summary><ol>${item.seams.map((seam) => `<li><strong>#${seam.number}</strong> ${clock(seam.startMs)}〜${clock(seam.endMs)}　${escapeHtml(seam.beforeText)} → ${escapeHtml(seam.afterText)}</li>`).join('')}</ol></details>
        <div class="choices">
          ${['詰め後が良い', '差はない', '詰め前が良い'].map((label) => `<label><input type="radio" name="decision-${index}" value="${label}"> ${label}</label>`).join('')}
        </div>
        <label class="note">繋ぎ目に違和感のある箇所があれば番号をメモ（任意）
          <input type="text" data-seam-note="${index}" placeholder="例: #2 語尾が切れて聞こえる">
        </label>
        <label class="note">その他メモ（任意）<textarea data-note="${index}" rows="2"></textarea></label>
      </section>`).join('');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>層1 詰め前/詰め後 比較</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#18202a;background:#f3f5f8}body{margin:0;padding:24px}.wrap{max-width:1120px;margin:auto}.lead,.card,.empty{background:#fff;border:1px solid #d8dee8;border-radius:14px;padding:20px;margin-bottom:18px}.media-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.media-grid video{width:100%;max-height:45vh;background:#111}.choices{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}.choices label{padding:12px 16px;border:1px solid #bcc6d4;border-radius:10px}.note{display:block;margin:12px 0}.note input,.note textarea{box-sizing:border-box;width:100%;margin-top:6px;padding:10px;font:inherit}.muted{color:#5b6777}button{font:inherit;padding:12px 18px;border:0;border-radius:10px;background:#135ec4;color:#fff}.result{white-space:pre-wrap;background:#0f1720;color:#f1f5f9;padding:14px;border-radius:10px;min-height:48px}@media(max-width:760px){body{padding:10px}.media-grid{grid-template-columns:1fr}}
</style></head><body><main class="wrap">
<section class="lead"><h1>層1 詰め前/詰め後 比較</h1><p>${items.length}件です。時間は測りません。判定はいつでも変更でき、サーバーへ自動保存しません。</p><p>「繋ぎ目の自然さ」は判定を増やさず、違和感がある場合だけ番号を任意記入してください。</p></section>
${itemHtml}
${items.length ? '<section class="card"><button id="make-result">結果を作る</button><button id="copy-result">結果をコピー</button><pre id="result" class="result"></pre></section>' : ''}
</main><script>
const items=${JSON.stringify(items.map((item) => ({ fixtureId: item.fixtureId, expectedIndex: item.expectedIndex })))};
function resultText(){const lines=['層1 詰め前/詰め後 ペア比較結果'];items.forEach((item,index)=>{const decision=document.querySelector('input[name="decision-'+index+'"]:checked')?.value||'未回答';const seam=document.querySelector('[data-seam-note="'+index+'"]')?.value.trim()||'なし';const note=document.querySelector('[data-note="'+index+'"]')?.value.trim()||'なし';lines.push('確認'+(index+1)+': '+decision+' / '+item.fixtureId+' / expected '+item.expectedIndex);lines.push('繋ぎ目違和感: '+seam);lines.push('メモ: '+note)});return lines.join('\\n')}
document.getElementById('make-result')?.addEventListener('click',()=>document.getElementById('result').textContent=resultText());
document.getElementById('copy-result')?.addEventListener('click',async()=>{const text=resultText();document.getElementById('result').textContent=text;await navigator.clipboard.writeText(text)});
</script></body></html>`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const stderr = [];
    const child = spawn(command, args);
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code})\n${Buffer.concat(stderr).toString('utf8')}`)));
  });
}

async function renderRange(sourcePath, range, outputPath) {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(range.startMs / 1000), '-t', String((range.endMs - range.startMs) / 1000), '-i', sourcePath, '-map', '0:v:0', '-map', '0:a:0?', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputPath]);
}

async function renderRanges(sourcePath, ranges, outputPath) {
  const filters = [];
  const concatInputs = [];
  const inputStartMs = Math.min(...ranges.map((range) => range.startMs));
  ranges.forEach((range, index) => {
    const start = (range.startMs - inputStartMs) / 1000;
    const end = (range.endMs - inputStartMs) / 1000;
    filters.push(`[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale='min(1280,iw)':-2[v${index}]`);
    filters.push(`[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`);
    concatInputs.push(`[v${index}][a${index}]`);
  });
  filters.push(`${concatInputs.join('')}concat=n=${ranges.length}:v=1:a=1[outv][outa]`);
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(inputStartMs / 1000), '-i', sourcePath, '-filter_complex', filters.join(';'), '-map', '[outv]', '-map', '[outa]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outputPath]);
}

export async function buildLayer1PairReview(resultPath, outputRoot) {
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  fs.mkdirSync(outputRoot, { recursive: true });
  const mediaRoot = path.join(outputRoot, 'media');
  fs.mkdirSync(mediaRoot, { recursive: true });
  const items = [];
  for (const [index, selection] of result.humanReview.selections.entries()) {
    const stem = `item-${String(index + 1).padStart(2, '0')}`;
    const beforeName = `${stem}-before.mp4`;
    const afterName = `${stem}-after.mp4`;
    const sourcePath = path.join(ROOT, selection.sourcePath);
    await renderRange(sourcePath, selection.outerRange, path.join(mediaRoot, beforeName));
    await renderRanges(sourcePath, selection.remainingSourceRanges, path.join(mediaRoot, afterName));
    items.push({
      fixtureId: selection.fixtureId,
      expectedIndex: selection.expectedIndex,
      beforePath: `media/${beforeName}`,
      afterPath: `media/${afterName}`,
      seams: selection.cutDirectives.map((cut, seamIndex) => ({ number: seamIndex + 1, ...cut }))
    });
  }
  fs.writeFileSync(path.join(outputRoot, 'review-data.json'), `${JSON.stringify({ kind: 'layer1_pair_review', items }, null, 2)}\n`);
  fs.writeFileSync(path.join(outputRoot, 'review.html'), renderLayer1PairReviewHtml(items));
  return { itemCount: items.length, reviewPath: path.join(outputRoot, 'review.html') };
}

async function main() {
  const resultPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(import.meta.dirname, 'outputs/internal-edit/20260717-layer1-trim-v001/result.json');
  const outputRoot = process.argv[3] ? path.resolve(process.argv[3]) : path.join(path.dirname(resultPath), 'human-pair-review');
  console.log(JSON.stringify(await buildLayer1PairReview(resultPath, outputRoot), null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}

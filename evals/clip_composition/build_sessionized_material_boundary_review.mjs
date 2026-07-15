import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = workspaceRoot();
const options = parseOptions(process.argv.slice(2));
const maximumIndependentDecisionsPerSession = 5;
const decisionsPerBoundary = 4;

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const inlineIndex = item.indexOf('=');
    if (inlineIndex >= 0) {
      values.set(item.slice(2, inlineIndex), item.slice(inlineIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) values.set(key, 'true');
    else {
      values.set(key, next);
      index += 1;
    }
  }
  const materialBlocks = resolveRequired(values, 'materialBlocks');
  const outputId = sanitize(values.get('outputId') || 'human-review-sessions-v001');
  return {
    materialBlocks,
    outputId,
    checkedBy: values.get('checkedBy')?.trim() || 'kawafmm',
    checkedAt: values.get('checkedAt')?.trim() || localDate(new Date())
  };
}

function resolveRequired(values, key) {
  const value = values.get(key)?.trim();
  if (!value) throw new Error(`--${key} を指定してください`);
  return path.isAbsolute(value) ? value : path.join(root, value);
}

function sanitize(value) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) throw new Error(`安全でないoutputIdです: ${value}`);
  return value;
}

function localDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function relativeMediaPath(sessionDirectory, mediaPath) {
  const absolute = path.isAbsolute(mediaPath) ? mediaPath : path.join(root, mediaPath);
  assert(existsSync(absolute), `確認動画がありません: ${absolute}`);
  return path.relative(sessionDirectory, absolute).split(path.sep).join('/');
}

function buildSessions(boundaries) {
  const sessions = [];
  for (const boundary of boundaries) {
    const current = sessions.at(-1);
    if (!current || current.independentDecisionCount + decisionsPerBoundary > maximumIndependentDecisionsPerSession) {
      sessions.push({ boundaries: [boundary], independentDecisionCount: decisionsPerBoundary });
    } else {
      current.boundaries.push(boundary);
      current.independentDecisionCount += decisionsPerBoundary;
    }
  }
  const final = sessions.at(-1);
  assert(final, '境界がありません');
  assert(final.independentDecisionCount + 1 <= maximumIndependentDecisionsPerSession, '最終セッションへ固定テーマを追加できません');
  final.includesFixedTheme = true;
  final.independentDecisionCount += 1;
  return sessions;
}

function select(field, question) {
  return `<label class="answer"><span>${question}</span><select data-field="${field}"><option value="">選んでください</option><option value="true">はい</option><option value="false">いいえ</option><option value="unresolved">わからない</option></select></label>`;
}

function videoCard(number, title, description, source) {
  return `<section class="media-card"><h2>${number}. ${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><video controls preload="metadata" src="${escapeHtml(source)}"></video></section>`;
}

function buildHtml({ clipId, sourceVideoId, boundary, asset, sessionNumber, sessionCount, includesFixedTheme, sessionDirectory }) {
  const videos = asset.videos;
  const clipContext = relativeMediaPath(sessionDirectory, videos.clipContext.path);
  const sourceSequence = relativeMediaPath(sessionDirectory, videos.sourceSequence.path);
  const beforeMatch = relativeMediaPath(sessionDirectory, videos.beforeMatch.path);
  const afterMatch = relativeMediaPath(sessionDirectory, videos.afterMatch.path);
  const storageKey = `zev-material-review-${options.outputId}-session-${sessionNumber}`;
  const fixedTheme = includesFixedTheme ? `<label class="theme"><span>固定テーマ（この切り抜きの内容を1文で）</span><input id="fixed-theme" placeholder="例：マリンが視聴者参加型のLiar's Barで遊ぶ"></label>` : '';
  const item = JSON.stringify({
    clipId, sourceVideoId, boundaryIndex: boundary.boundaryIndex,
    beforeBlockIndex: boundary.beforeBlockIndex, afterBlockIndex: boundary.afterBlockIndex,
    clipBefore: formatTime(boundary.clipBeforeEndMs), clipAfter: formatTime(boundary.clipAfterStartMs),
    sourceBefore: formatTime(boundary.sourceBeforeEndMs), sourceAfter: formatTime(boundary.sourceAfterStartMs)
  });
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第三素材 素材対応確認 ${sessionNumber}/${sessionCount}</title>
<style>
:root{--ink:#172033;--muted:#526071;--line:#d7dee8;--blue:#1d4ed8;--soft:#eff6ff;--ok:#166534;--bad:#991b1b}*{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}.wrap{max-width:1050px;margin:auto;padding:24px 20px 230px}header,.media-card,.answer-panel,.result{background:white;border:1px solid var(--line);border-radius:14px;padding:20px;margin:0 0 18px}h1{font-size:1.55rem;margin:0 0 8px}h2{font-size:1.15rem;margin:0 0 8px}p{margin:7px 0}.purpose{font-weight:700}.muted{color:var(--muted)}video{display:block;width:100%;max-height:520px;background:#111;border-radius:10px;margin-top:12px}.answer-panel{position:sticky;bottom:0;z-index:5;box-shadow:0 -8px 26px rgba(15,23,42,.12);margin-bottom:0}.answer-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.answer,.theme{display:flex;flex-direction:column;gap:6px;font-weight:700}.answer select,.theme input,textarea{font:inherit;border:1px solid #9aa7b8;border-radius:9px;padding:11px;background:white}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}button{font:inherit;font-weight:700;border:0;border-radius:9px;padding:11px 16px;background:var(--blue);color:white;cursor:pointer}button.secondary{background:#e7edf5;color:var(--ink)}button.good{background:var(--ok)}button.danger{background:var(--bad)}.status{font-weight:700;margin-top:10px}.result{display:none}.result.show{display:block}.result textarea{width:100%;min-height:260px}.theme{margin-top:14px}@media(max-width:720px){.answer-grid{grid-template-columns:1fr}.wrap{padding:14px 12px 310px}.answer-panel{padding:14px}}
</style></head><body><main class="wrap">
<header><h1>第三素材 素材対応確認 ${sessionNumber}/${sessionCount}</h1><p class="purpose">目的：この切り抜きの前後が、元配信の正しい場面に対応しているか確認します。</p><p>今回は境界${boundary.boundaryIndex}（素材候補${boundary.beforeBlockIndex}→${boundary.afterBlockIndex}）だけです。4本の短い動画を見て、画面下の4項目を答えてください。</p><p class="muted">見ないこと：細かな編集の上手さ、口元の完全同期、同じ素材内の無音や詰め。時刻入力も不要です。</p></header>
${videoCard(1, '切り抜きの前後', `切り抜き ${formatTime(boundary.clipBeforeEndMs)} 付近から ${formatTime(boundary.clipAfterStartMs)} 付近。途中を飛ばして別の時刻へ移ったように見えるかを確認します。`, clipContext)}
${videoCard(2, '元配信の前側→後側', `元配信 ${formatTime(boundary.sourceBeforeEndMs)} 付近の2秒と ${formatTime(boundary.sourceAfterStartMs)} 付近の2秒を人工的につないだ動画です。実際の連続再生ではありません。別の位置かを確認します。`, sourceSequence)}
${videoCard(3, '境界の前側を左右比較', '左が切り抜き、右が元配信です。同じ会話・場面かを確認します。', beforeMatch)}
${videoCard(4, '境界の後側を左右比較', '左が切り抜き、右が元配信です。同じ会話・場面かを確認します。', afterMatch)}
<section id="result" class="result"><h2>このセッションは終了です</h2><p>結果をコピーしてチャットへ貼ってください。コピー後も回答を直して再コピーできます。次のセッションへは自動で進みません。</p><button id="copy-result">結果をコピー</button><textarea id="output" readonly></textarea></section>
</main>
<section class="answer-panel"><div class="answer-grid">
${select('clipSwitch', '1. 切り抜きは、途中を飛ばして別の時刻へ移ったように見えますか？')}
${select('sourceSwitch', '2. 元配信の前側と後側は、別の位置ですか？')}
${select('beforeMatches', '3. 前側の左右は、同じ会話・場面ですか？')}
${select('afterMatches', '4. 後側の左右は、同じ会話・場面ですか？')}
</div>${fixedTheme}<label class="theme"><span>気づいたこと（任意）</span><textarea id="note" rows="2" placeholder="違う・わからない場合は、どこが気になったか"></textarea></label>
<div class="actions"><button class="good" id="all-yes">4項目すべて「はい」</button><button id="make-result">回答を確認して結果を作る</button><button class="secondary" id="clear">入力を消してやり直す</button></div><p id="status" class="status">未回答です</p></section>
<script>
const item=${item};const sessionNumber=${sessionNumber};const sessionCount=${sessionCount};const includesFixedTheme=${includesFixedTheme};const storageKey=${JSON.stringify(storageKey)};const fields=['clipSwitch','sourceSwitch','beforeMatches','afterMatches'];const controls=Object.fromEntries(fields.map(field=>[field,document.querySelector('[data-field="'+field+'"]')]));const note=document.getElementById('note');const theme=document.getElementById('fixed-theme');
function load(){try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');for(const field of fields)controls[field].value=saved[field]||'';note.value=saved.note||'';if(theme)theme.value=saved.fixedTheme||''}catch{}}
function state(){return Object.fromEntries([...fields.map(field=>[field,controls[field].value]),['note',note.value],['fixedTheme',theme?theme.value:'']])}
function save(){localStorage.setItem(storageKey,JSON.stringify(state()));updateStatus()}
function label(value){return value==='true'?'true':value==='false'?'false':'unresolved'}
function problemStatus(s){return fields.every(field=>s[field]==='true')?'問題なし':fields.some(field=>s[field]==='false')?'違う可能性あり':'わからない'}
function outputText(){const s=state();const lines=['第三素材 '+item.clipId+' 素材対応確認','セッション: '+sessionNumber+'/'+sessionCount,'確認者: ${escapeHtml(options.checkedBy)}','確認日: ${escapeHtml(options.checkedAt)}','', '確認'+item.boundaryIndex+': '+problemStatus(s)+' / clip連続再生='+label(s.clipSwitch)+' / source位置切替='+label(s.sourceSwitch)+' / 前側対応='+label(s.beforeMatches)+' / 後側対応='+label(s.afterMatches)];if(s.note.trim())lines[lines.length-1]+=' / メモ='+s.note.trim();if(includesFixedTheme)lines.push('固定テーマ: '+s.fixedTheme.trim());lines.push('次のセッションへ進める: はい');return lines.join('\\n')}
function updateStatus(){const s=state();const answered=fields.filter(field=>s[field]).length;const themeReady=!includesFixedTheme||Boolean(s.fixedTheme.trim());document.getElementById('status').textContent=answered+'/4項目回答済み'+(includesFixedTheme?(themeReady?'・固定テーマ入力済み':'・固定テーマ未入力'):'')}
document.querySelectorAll('select,input,textarea').forEach(control=>control.addEventListener('input',save));
document.getElementById('all-yes').addEventListener('click',()=>{for(const field of fields)controls[field].value='true';save()});
document.getElementById('make-result').addEventListener('click',()=>{const s=state();if(fields.some(field=>!s[field])){document.getElementById('status').textContent='4項目すべて選んでください';return}if(includesFixedTheme&&!s.fixedTheme.trim()){document.getElementById('status').textContent='固定テーマを1文で入力してください';return}const output=document.getElementById('output');output.value=outputText();document.getElementById('result').classList.add('show');document.getElementById('result').scrollIntoView({behavior:'smooth'})});
document.getElementById('copy-result').addEventListener('click',async(event)=>{const output=document.getElementById('output');output.value=outputText();try{await navigator.clipboard.writeText(output.value);event.target.textContent='コピーしました'}catch{output.focus();output.select();event.target.textContent='文章を選択しました。Command+Cでコピー'}});
document.getElementById('clear').addEventListener('click',()=>{localStorage.removeItem(storageKey);for(const field of fields)controls[field].value='';note.value='';if(theme)theme.value='';document.getElementById('result').classList.remove('show');document.getElementById('output').value='';updateStatus()});
load();updateStatus();
</script></body></html>`;
}

async function main() {
  const material = JSON.parse(await readFile(options.materialBlocks, 'utf8'));
  assert(material.kind === 'clip_composition_material_blocks', '素材ブロック結果ではありません');
  assert(Array.isArray(material.boundaries) && material.boundaries.length > 0, '境界がありません');
  assert(Array.isArray(material.boundaryAssets), '確認媒体がありません');
  const assetsByBoundary = new Map(material.boundaryAssets.map((asset) => [asset.boundaryIndex, asset]));
  const sessions = buildSessions(material.boundaries);
  const sourceDirectory = path.dirname(material.outputs.htmlPackage);
  const outputDirectory = path.join(root, sourceDirectory, options.outputId);
  await mkdir(outputDirectory, { recursive: true });
  const sessionEntries = [];
  for (let index = 0; index < sessions.length; index += 1) {
    const session = sessions[index];
    assert(session.boundaries.length === 1, '現在の確認契約では1セッション1境界です');
    const boundary = session.boundaries[0];
    const asset = assetsByBoundary.get(boundary.boundaryIndex);
    assert(asset, `境界${boundary.boundaryIndex}の確認媒体がありません`);
    const sessionNumber = index + 1;
    const sessionDirectory = path.join(outputDirectory, `session-${String(sessionNumber).padStart(2, '0')}`);
    await mkdir(sessionDirectory, { recursive: true });
    const html = buildHtml({
      clipId: material.clipId, sourceVideoId: material.sourceVideoId, boundary, asset,
      sessionNumber, sessionCount: sessions.length, includesFixedTheme: Boolean(session.includesFixedTheme), sessionDirectory
    });
    assert(!html.includes('startedAt'), '時間計測コードを含めてはいけません');
    assert(!html.includes('fetch('), 'サーバー保存を含めてはいけません');
    assert(html.includes('結果をコピー'), '結果コピー導線がありません');
    assert(html.includes('入力を消してやり直す'), '回答修正導線がありません');
    const htmlPath = path.join(sessionDirectory, 'index.html');
    await writeFile(htmlPath, html, 'utf8');
    sessionEntries.push({
      sessionNumber,
      boundaryIndexes: [boundary.boundaryIndex],
      independentDecisionCount: session.independentDecisionCount,
      includesFixedTheme: Boolean(session.includesFixedTheme),
      html: path.relative(root, htmlPath).split(path.sep).join('/')
    });
  }
  const manifest = {
    kind: 'clip_composition_sessionized_material_boundary_review',
    packageId: options.outputId,
    generatedAt: new Date().toISOString(),
    clipId: material.clipId,
    sourceVideoId: material.sourceVideoId,
    materialBlocks: path.relative(root, options.materialBlocks).split(path.sep).join('/'),
    humanWork: {
      boundaryCount: material.boundaries.length,
      decisionsPerBoundary,
      fixedThemeDecisionCount: 1,
      totalIndependentDecisionCount: material.boundaries.length * decisionsPerBoundary + 1,
      maximumIndependentDecisionsPerSession,
      sessionCount: sessions.length,
      estimatedMinutesPerSession: '1-2',
      estimatedMinutesTotal: '6-12',
      timeTrackingInUi: false
    },
    answerStatus: 'awaiting-human-review',
    productionImpact: { fixtureWrites: false, expectedWrites: false, confirmedPairWrites: false },
    sessions: sessionEntries
  };
  const manifestPath = path.join(outputDirectory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: 'ready-for-human-review', manifest: path.relative(root, manifestPath), sessions: sessionEntries }, null, 2));
}

await main();

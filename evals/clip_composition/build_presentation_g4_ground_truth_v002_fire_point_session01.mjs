import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const evalRoot = resolve(repoRoot, "evals/clip_composition");
const outputRoot = join(evalRoot, "outputs/presentation/g4-g7-ground-truth-v002-availability-preflight-v001");
const stage1Root = join(outputRoot, "human-review-g4-session-01");
const reviewRoot = join(outputRoot, "human-review-g4-fire-point-session-01");
const mediaRoot = join(reviewRoot, "media");
mkdirSync(mediaRoot, { recursive: true });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const repoPath = (path) => relative(repoRoot, path).replaceAll("\\", "/");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const formatTime = (ms, withMillis = false) => {
  const safeMs = Math.max(0, Math.round(ms));
  const total = Math.floor(safeMs / 1000);
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return withMillis ? `${hh}:${mm}:${ss}.${String(safeMs % 1000).padStart(3, "0")}` : `${hh}:${mm}:${ss}`;
};

const sourceMediaByFixture = {
  nOEWCNc77MI_multiblock_material_v001: "evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4",
  "9dtwF5Exu5w_multiblock_material_v001": "evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4"
};

const stage1Manifest = readJson(join(stage1Root, "review-manifest.json"));
const stage1Result = readJson(join(stage1Root, "result.json"));
if (stage1Result.status !== "human_confirmed_candidate_level_labels") throw new Error("Stage 1 human result is not confirmed");

const decisionByKey = new Map(stage1Result.judgments.map((judgment) => [
  `${judgment.fixtureId}__candidate-${String(judgment.candidateId).padStart(3, "0")}`,
  judgment.decision
]));
const positives = stage1Manifest.items.filter((item) => decisionByKey.get(item.candidateKey) === "emphasis_present");
const negatives = stage1Manifest.items.filter((item) => decisionByKey.get(item.candidateKey) === "g4_not_applicable");
if (positives.length !== 4 || negatives.length !== 1) {
  throw new Error(`Expected 4 positive and 1 negative, got ${positives.length} positive and ${negatives.length} negative`);
}

const extract = ({ source, startMs, endMs, destination }) => {
  if (!existsSync(source)) throw new Error(`Missing source media: ${source}`);
  if (!(endMs > startMs)) throw new Error(`Invalid range: ${startMs}-${endMs}`);
  const result = spawnSync("ffmpeg", [
    "-y", "-ss", (startMs / 1000).toFixed(3), "-i", source,
    "-t", ((endMs - startMs) / 1000).toFixed(3),
    "-vf", "scale='min(960,iw)':-2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", destination
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
};

const items = positives.map((item, index) => {
  const sourcePath = resolve(repoRoot, sourceMediaByFixture[item.fixtureId]);
  const sourceBlockPath = join(mediaRoot, `item-${String(index + 1).padStart(2, "0")}-source-block.mp4`);
  extract({
    source: sourcePath,
    startMs: item.teacherBlock.sourceStartMs,
    endMs: item.teacherBlock.sourceEndMs,
    destination: sourceBlockPath
  });
  return {
    reviewNumber: index + 1,
    stage1ReviewNumber: item.reviewNumber,
    candidateKey: item.candidateKey,
    fixtureId: item.fixtureId,
    candidateId: item.candidateId,
    teacherBlock: item.teacherBlock,
    teacherMedia: `../human-review-g4-session-01/${item.teacherMedia}`,
    sourceBlockMedia: `media/${sourceBlockPath.split("/").at(-1)}`,
    teacherBlockDisplay: `${formatTime(item.teacherBlock.clipStartMs)}〜${formatTime(item.teacherBlock.clipEndMs)}`,
    sourceBlockDisplay: `${formatTime(item.teacherBlock.sourceStartMs)}〜${formatTime(item.teacherBlock.sourceEndMs)}`,
    sourceBlockSha256: sha256(sourceBlockPath),
    teacherMediaSha256: item.teacherSha256
  };
});

const manifest = {
  schemaVersion: "presentation-g4-ground-truth-v002-fire-point-human-review-v001",
  createdAt: "2026-07-20",
  status: "awaiting_human_fire_point_mapping",
  sourceStage1Result: repoPath(join(stage1Root, "result.json")),
  target: "第1段で強調ありと認定された4件だけ",
  question: "教師側で追加演出が始まる瞬間と、元配信側の同じ意味・動作の瞬間を選び、2点が対応するかを判定する",
  independentJudgments: 4,
  pointSelectionsPerJudgment: 2,
  timeMeasurement: false,
  manualTimeEntry: false,
  sourceContextAdded: false,
  sourceMediaPolicy: "canonical候補内に丸ごと含まれる、人間確認済み対応ブロックだけを直接切り出す。前後文脈や新しい対応候補は足さない。",
  items
};
writeFileSync(join(reviewRoot, "review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(outputRoot, "progress-v002.json"), `${JSON.stringify({
  schemaVersion: "presentation-g4-g7-ground-truth-v002-progress-v001",
  updatedAt: "2026-07-20",
  status: "awaiting_human_g4_fire_point_mapping",
  stage1: {
    status: "human_confirmed",
    result: repoPath(join(stage1Root, "result.json")),
    emphasisPresent: positives.length,
    g4NotApplicable: negatives.length
  },
  stage2: {
    status: "awaiting_human_review",
    manifest: repoPath(join(reviewRoot, "review-manifest.json")),
    independentJudgments: items.length,
    pointSelectionsPerJudgment: 2,
    timeMeasurement: false
  },
  blockedUntilHumanResult: ["G4正解凍結", "意味検出器実装", "LLM実走"]
}, null, 2)}\n`);

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>G4 発火点対応確認 1/1</title>
<style>
:root{color-scheme:dark;--bg:#0e1117;--panel:#171c24;--line:#303847;--text:#f2f5f9;--sub:#b9c2cf;--accent:#6ea8fe;--ok:#2fbf71;--bad:#e06666}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:154px}header,main{max-width:1280px;margin:auto;padding:12px 18px}h1{font-size:21px;margin:0 0 8px}.purpose{margin:0;color:var(--sub);line-height:1.55}.counter{color:var(--accent);font-weight:700;margin-top:8px}.item{display:none}.item.active{display:block}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px}.card h2{font-size:16px;margin:0 0 3px}.card p{font-size:13px;color:var(--sub);margin:0 0 7px}video{width:100%;max-height:31vh;object-fit:contain;background:#000;border-radius:8px}.actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.actions button{padding:8px 10px}.selected-point{margin-top:7px;padding:8px;border-radius:8px;background:#10151d;color:var(--sub);min-height:37px}.selected-point.ready{color:#c9f6dc;border:1px solid #286544}.question{margin-top:10px;padding:10px 12px;border-left:4px solid var(--accent);background:#151a22;line-height:1.5}.dock{position:fixed;left:0;right:0;bottom:0;background:rgba(14,17,23,.98);border-top:1px solid var(--line);padding:10px 16px;z-index:10}.choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:1280px;margin:auto}.choice{background:#202734;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:11px 8px;font-weight:700}.choice.selected{outline:3px solid var(--accent);background:#263956}.nav{max-width:1280px;margin:8px auto 0;display:flex;gap:8px;align-items:center}.nav button{padding:8px 14px}.spacer{flex:1}.muted{font-size:12px;color:var(--sub)}.copy{background:var(--ok);color:#06140c;border:0;border-radius:8px;font-weight:700}.results{display:none;max-width:900px;margin:18px auto;padding:0 18px}.results.active{display:block}.results textarea{width:100%;height:360px;background:#11151c;color:var(--text);border:1px solid var(--line);padding:12px;font:13px/1.5 ui-monospace,monospace}.results-actions{display:flex;gap:8px;margin-top:8px}
@media(max-width:800px){body{padding-bottom:195px}.grid{grid-template-columns:1fr}.card{padding:7px}video{max-height:22vh}.choices{grid-template-columns:1fr}header,main{padding-left:9px;padding-right:9px}}
</style></head><body>
<header><h1>G4 発火点と元配信対応点の確認</h1><p class="purpose"><strong>見ること:</strong> 左で「追加演出が始まる最初の瞬間」を選び、右で「元配信の同じ意味・動作が始まる瞬間」を選びます。時刻は入力しません。演出が数秒続く場合も最初を選びます。2点が同じ出来事でなければ「対応が違う」を選んでください。</p><div class="counter" id="counter"></div></header>
<main id="items"></main>
<section class="results" id="results"><h2>確認結果</h2><p>選択内容を確認し、コピーしてチャットへ貼ってください。回答へ戻って修正できます。</p><textarea id="resultText" readonly></textarea><div class="results-actions"><button id="backFromResults">回答へ戻る</button><button class="copy" id="copyResult">結果をコピー</button></div></section>
<div class="dock" id="dock"><div class="choices" id="choices"></div><div class="nav"><button id="prev">前の候補</button><span class="muted" id="answered"></span><span class="spacer"></span><button id="next">次の候補</button><button class="copy" id="showResult">結果を確認</button></div></div>
<script>
const items=${JSON.stringify(items)};
const choices=[{value:"対応している",label:"2点は対応している"},{value:"対応が違う",label:"対応が違う"},{value:"判断できない",label:"判断できない"}];
let index=0;const state={};
const itemsEl=document.getElementById("items"),choicesEl=document.getElementById("choices"),counter=document.getElementById("counter"),answered=document.getElementById("answered"),dock=document.getElementById("dock"),results=document.getElementById("results"),resultText=document.getElementById("resultText");
function ensure(key){if(!state[key])state[key]={teacherLocalMs:null,sourceLocalMs:null,decision:null};return state[key]}
function fmt(ms){if(ms==null)return "未選択";const total=Math.floor(ms/1000),hh=String(Math.floor(total/3600)).padStart(2,"0"),mm=String(Math.floor((total%3600)/60)).padStart(2,"0"),ss=String(total%60).padStart(2,"0"),mmm=String(Math.round(ms)%1000).padStart(3,"0");return hh+":"+mm+":"+ss+"."+mmm}
itemsEl.innerHTML=items.map((item,i)=>'<section class="item" data-index="'+i+'"><div class="grid"><article class="card"><h2>1. 切り抜き師の追加演出</h2><p>教師動画 '+item.teacherBlockDisplay+'</p><video controls preload="metadata" data-kind="teacher" src="'+item.teacherMedia+'"></video><div class="actions"><button data-action="restart" data-kind="teacher">最初から再生</button><button data-action="choose" data-kind="teacher">現在位置を発火点にする</button><button data-action="jump" data-kind="teacher">選んだ位置へ戻る</button></div><div class="selected-point" data-point="teacher">発火点: 未選択</div></article><article class="card"><h2>2. 元配信の同じ瞬間</h2><p>確認済み対応ブロック '+item.sourceBlockDisplay+'</p><video controls preload="metadata" data-kind="source" src="'+item.sourceBlockMedia+'"></video><div class="actions"><button data-action="restart" data-kind="source">最初から再生</button><button data-action="choose" data-kind="source">現在位置を対応点にする</button><button data-action="jump" data-kind="source">選んだ位置へ戻る</button></div><div class="selected-point" data-point="source">対応点: 未選択</div></article></div><div class="question"><strong>選んだ2点は、同じ意味・動作の瞬間ですか？</strong> 点を選ぶ前でも回答は変更できます。不確実なら判断できないを選んでください。</div></section>').join("");
choicesEl.innerHTML=choices.map(choice=>'<button class="choice" data-value="'+choice.value+'">'+choice.label+'</button>').join("");
function currentSection(){return document.querySelector('.item[data-index="'+index+'"]')}
function stopAll(){document.querySelectorAll("video").forEach(video=>video.pause())}
function absoluteMs(item,kind,localMs){return kind==="teacher"?item.teacherBlock.clipStartMs+localMs:item.teacherBlock.sourceStartMs+localMs}
function render(){document.querySelectorAll(".item").forEach((el,i)=>el.classList.toggle("active",i===index));const item=items[index],answer=ensure(item.candidateKey),section=currentSection();counter.textContent='候補 '+(index+1)+' / '+items.length;answered.textContent='回答済み '+Object.values(state).filter(value=>value.decision).length+' / '+items.length;document.getElementById("prev").disabled=index===0;document.getElementById("next").disabled=index===items.length-1;choicesEl.querySelectorAll(".choice").forEach(button=>button.classList.toggle("selected",answer.decision===button.dataset.value));for(const kind of ["teacher","source"]){const local=kind==="teacher"?answer.teacherLocalMs:answer.sourceLocalMs;const box=section.querySelector('[data-point="'+kind+'"]');box.classList.toggle("ready",local!=null);box.textContent=(kind==="teacher"?"発火点: ":"対応点: ")+(local==null?"未選択":fmt(absoluteMs(item,kind,local)));}}
itemsEl.addEventListener("click",event=>{const button=event.target.closest("[data-action]");if(!button)return;const item=items[index],answer=ensure(item.candidateKey),kind=button.dataset.kind,video=currentSection().querySelector('video[data-kind="'+kind+'"]');if(button.dataset.action==="restart"){video.currentTime=0;video.play().catch(()=>{})}else if(button.dataset.action==="choose"){const local=Math.round(video.currentTime*1000);if(kind==="teacher")answer.teacherLocalMs=local;else answer.sourceLocalMs=local;render()}else{const local=kind==="teacher"?answer.teacherLocalMs:answer.sourceLocalMs;if(local!=null)video.currentTime=local/1000;}});
choicesEl.addEventListener("click",event=>{const button=event.target.closest(".choice");if(!button)return;ensure(items[index].candidateKey).decision=button.dataset.value;render()});
document.getElementById("prev").onclick=()=>{if(index>0){stopAll();index--;render()}};
document.getElementById("next").onclick=()=>{if(index<items.length-1){stopAll();index++;render();const video=currentSection().querySelector('video[data-kind="teacher"]');video.currentTime=0;video.play().catch(()=>{})}};
function result(){const lines=["G4 正解候補v002 第2段 発火点対応確認結果","確認者: kawafmm","確認日: 2026-07-20","時間計測: なし",""];for(let i=0;i<items.length;i++){const item=items[i],answer=ensure(item.candidateKey),teacherAbs=answer.teacherLocalMs==null?null:absoluteMs(item,"teacher",answer.teacherLocalMs),sourceAbs=answer.sourceLocalMs==null?null:absoluteMs(item,"source",answer.sourceLocalMs);lines.push('確認'+(i+1)+': '+(answer.decision||"未回答")+' / '+item.fixtureId+' / candidate '+item.candidateId);lines.push('教師発火点: '+(teacherAbs==null?"未選択":fmt(teacherAbs)+' / '+teacherAbs+'ms'));lines.push('元配信対応点: '+(sourceAbs==null?"未選択":fmt(sourceAbs)+' / '+sourceAbs+'ms'));}return lines.join("\\n")}
document.getElementById("showResult").onclick=()=>{resultText.value=result();document.querySelectorAll(".item").forEach(el=>el.classList.remove("active"));results.classList.add("active");dock.style.display="none";counter.textContent='回答済み '+Object.values(state).filter(value=>value.decision).length+' / '+items.length};
document.getElementById("backFromResults").onclick=()=>{results.classList.remove("active");dock.style.display="block";render()};
document.getElementById("copyResult").onclick=async()=>{resultText.value=result();try{await navigator.clipboard.writeText(resultText.value)}catch{resultText.focus();resultText.select();document.execCommand("copy")}};
items.forEach(item=>ensure(item.candidateKey));render();
</script></body></html>`;

writeFileSync(join(reviewRoot, "review.html"), html);
writeFileSync(join(reviewRoot, "README.md"), `# G4 v002 第2段 発火点対応確認\n\n第1段で強調ありになった4件だけを確認する。教師側の追加演出開始点と、元配信側の同じ意味・動作の開始点を、時刻手入力なしで選ぶ。\n\n人間作業: 4判断、各2点選択、1セッション。既存の境界選択基準3分/件を上限目安として4件で最大約12分。時間計測なし。\n\n回答まで正解凍結、検出器実装、LLM実走へ進まない。\n`);

console.log(JSON.stringify({
  stage1PositiveCount: positives.length,
  stage1NegativeCount: negatives.length,
  reviewItems: items.map((item) => item.candidateKey),
  reviewHtml: repoPath(join(reviewRoot, "review.html"))
}, null, 2));

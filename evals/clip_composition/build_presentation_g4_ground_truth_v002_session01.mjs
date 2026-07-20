import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const evalRoot = resolve(repoRoot, "evals/clip_composition");
const outputRoot = join(evalRoot, "outputs/presentation/g4-g7-ground-truth-v002-availability-preflight-v001");
const reviewRoot = join(outputRoot, "human-review-g4-session-01");
const mediaRoot = join(reviewRoot, "media");
mkdirSync(mediaRoot, { recursive: true });

const readJson = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
const repoPath = (path) => relative(repoRoot, path).replaceAll("\\", "/");
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const compareCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const formatTime = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(total / 3600)).padStart(2, "0");
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const sources = [
  {
    manifestPath: "evals/clip_composition/outputs/human-boundary-trim/20260713-trial-v002/manifest.json",
    rankingPath: "evals/clip_composition/outputs/candidate-ranking/20260713-character-context-run1-v002/final-result.json"
  },
  {
    manifestPath: "evals/clip_composition/outputs/human-boundary-trim/20260716-third-material-trial-v002/manifest.json",
    rankingPath: "evals/clip_composition/outputs/candidate-ranking/20260716-third-material-run1-v002/result.json"
  }
];

const fixtures = {
  nOEWCNc77MI_multiblock_material_v001: {
    expectedPath: "evals/clip_composition/expected/nOEWCNc77MI_multiblock_material_v001.json",
    sourceMedia: "evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4",
    teacherMedia: "evals/clip_composition/research/downloads/nOEWCNc77MI/nOEWCNc77MI.mp4"
  },
  "9dtwF5Exu5w_multiblock_material_v001": {
    expectedPath: "evals/clip_composition/expected/9dtwF5Exu5w_multiblock_material_v001.json",
    sourceMedia: "evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4",
    teacherMedia: "evals/clip_composition/research/downloads/9dtwF5Exu5w/9dtwF5Exu5w.mp4"
  },
  nE_bNeBNp4E_multiblock_material_v001: {
    expectedPath: "evals/clip_composition/expected/nE_bNeBNp4E_multiblock_material_v001.json",
    sourceMedia: "evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4",
    teacherMedia: "evals/clip_composition/research/downloads/nE_bNeBNp4E/nE_bNeBNp4E.mp4"
  }
};

const candidateById = new Map();
for (const source of sources) {
  const ranking = readJson(source.rankingPath);
  for (const task of readJson(source.manifestPath).tasks) {
    if (task.rank == null || candidateById.has(task.id)) continue;
    candidateById.set(task.id, {
      candidateKey: task.id,
      fixtureId: task.fixtureId,
      sourceVideoId: task.sourceVideoId,
      candidateId: task.candidateId,
      candidateStartMs: task.provisionalStartMs,
      candidateEndMs: task.provisionalEndMs,
      canonicalRangeSource: source.manifestPath,
      upstreamRankingSource: source.rankingPath,
      generationSystem: ranking.generationSystem ?? "candidate-ranking-v002@gemini-web-flash"
    });
  }
}

const candidates = [...candidateById.values()].sort((a, b) =>
  compareCodePoint(a.sourceVideoId, b.sourceVideoId)
  || a.candidateStartMs - b.candidateStartMs
  || a.candidateId - b.candidateId
);

if (candidates.length !== 15) throw new Error(`Expected 15 canonical candidates, got ${candidates.length}`);

for (const candidate of candidates) {
  const fixture = fixtures[candidate.fixtureId];
  if (!fixture) throw new Error(`Unknown fixture: ${candidate.fixtureId}`);
  const expected = readJson(fixture.expectedPath);
  const containedBlocks = expected.expectedCuts.flatMap((cut, index) => {
    const isConfirmed = cut.verificationStatus === "multiblock_material_human_confirmed";
    const isContained = candidate.candidateStartMs <= cut.sourceStartMs && candidate.candidateEndMs >= cut.sourceEndMs;
    if (!isConfirmed || !isContained) return [];
    return [{
      expectedIndex: index + 1,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      clipStartMs: cut.clipStartMs,
      clipEndMs: cut.clipEndMs,
      sourceVideoId: cut.sourceVideoId,
      clipId: cut.clipId,
      verificationStatus: cut.verificationStatus
    }];
  });
  candidate.availabilityGate = {
    status: containedBlocks.length > 0 ? "passed_g4_teacher_correspondence" : "not_ready_no_fully_contained_confirmed_teacher_block",
    rule: "候補範囲が人間確認済み教師素材ブロックを丸ごと含む場合だけ通過。部分重複は、候補入力外の教師部分を正解へ混ぜるため不通過。",
    confirmedTeacherBlocks: containedBlocks
  };
}

const eligible = candidates.filter((candidate) => candidate.availabilityGate.status === "passed_g4_teacher_correspondence");
if (eligible.length !== 5) throw new Error(`Expected exactly 5 eligible candidates, got ${eligible.length}`);
if (eligible.some((candidate) => candidate.availabilityGate.confirmedTeacherBlocks.length !== 1)) {
  throw new Error("Session 1 expects exactly one confirmed teacher block per candidate");
}

const extract = ({ source, startMs, endMs, destination }) => {
  if (!existsSync(source)) throw new Error(`Missing media: ${source}`);
  const durationMs = endMs - startMs;
  if (!(durationMs > 0)) throw new Error(`Invalid extraction range: ${startMs}-${endMs}`);
  const result = spawnSync("ffmpeg", [
    "-y", "-ss", (startMs / 1000).toFixed(3), "-i", source,
    "-t", (durationMs / 1000).toFixed(3),
    "-vf", "scale='min(960,iw)':-2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", destination
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${destination}: ${result.stderr}`);
};

const reviewItems = eligible.map((candidate, index) => {
  const fixture = fixtures[candidate.fixtureId];
  const block = candidate.availabilityGate.confirmedTeacherBlocks[0];
  const key = `item-${String(index + 1).padStart(2, "0")}`;
  const sourceDestination = join(mediaRoot, `${key}-source.mp4`);
  const teacherDestination = join(mediaRoot, `${key}-teacher.mp4`);
  extract({
    source: resolve(repoRoot, fixture.sourceMedia),
    startMs: candidate.candidateStartMs,
    endMs: candidate.candidateEndMs,
    destination: sourceDestination
  });
  extract({
    source: resolve(repoRoot, fixture.teacherMedia),
    startMs: block.clipStartMs,
    endMs: block.clipEndMs,
    destination: teacherDestination
  });
  return {
    reviewNumber: index + 1,
    candidateKey: candidate.candidateKey,
    fixtureId: candidate.fixtureId,
    sourceVideoId: candidate.sourceVideoId,
    candidateId: candidate.candidateId,
    sourceRange: {
      startMs: candidate.candidateStartMs,
      endMs: candidate.candidateEndMs,
      display: `${formatTime(candidate.candidateStartMs)}〜${formatTime(candidate.candidateEndMs)}`
    },
    teacherBlock: block,
    sourceMedia: `media/${key}-source.mp4`,
    teacherMedia: `media/${key}-teacher.mp4`,
    sourceSha256: sha256(sourceDestination),
    teacherSha256: sha256(teacherDestination)
  };
});

const preflight = {
  schemaVersion: "presentation-g4-g7-ground-truth-v002-availability-preflight-v001",
  createdAt: "2026-07-20",
  status: "ready_for_human_g4_session_01",
  designSource: "evals/clip_composition/reports/presentation/normal-video-presentation-g4-g7-ground-truth-v002-availability-first-collection-design-20260720-v001.md",
  selectionContract: {
    universe: "candidate-ranking-v002の保存済みcanonical上位5×3素材=15件",
    sort: "sourceVideoIdのUnicodeコードポイント昇順、候補開始時刻、候補ID",
    semanticSelectionUsed: false,
    excludedSelectionSignals: ["title", "reason", "既知hit", "ランキング順位", "G4検出結果", "補助探索モデル"],
    gate: "候補範囲が人間確認済み教師素材ブロックを丸ごと含むこと",
    partialOverlapPolicy: "不通過。教師素材の一部が候補入力外になるため。"
  },
  counts: {
    canonicalCandidates: candidates.length,
    passedG4TeacherCorrespondence: eligible.length,
    notReady: candidates.length - eligible.length,
    session01Items: reviewItems.length,
    session01IndependentJudgments: reviewItems.length
  },
  candidates,
  session01CandidateKeys: reviewItems.map((item) => item.candidateKey)
};

writeFileSync(join(outputRoot, "preflight-manifest.json"), `${JSON.stringify(preflight, null, 2)}\n`);
writeFileSync(join(reviewRoot, "review-manifest.json"), `${JSON.stringify({
  schemaVersion: "presentation-g4-ground-truth-v002-human-review-session-v001",
  createdAt: "2026-07-20",
  status: "awaiting_human_review",
  question: "この対応部分で、切り抜き師は強い瞬間を追加演出で強調しましたか？",
  independentJudgments: 5,
  sessionCount: 1,
  timeMeasurement: false,
  titleAndReasonHidden: true,
  items: reviewItems
}, null, 2)}\n`);

const clientItems = reviewItems.map((item) => ({
  ...item,
  teacherBlockDisplay: `${formatTime(item.teacherBlock.clipStartMs)}〜${formatTime(item.teacherBlock.clipEndMs)}`
}));

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>G4 正解候補確認 1/1</title>
<style>
:root{color-scheme:dark;--bg:#0e1117;--panel:#171c24;--line:#303847;--text:#f2f5f9;--sub:#b9c2cf;--accent:#6ea8fe;--ok:#2fbf71;--warn:#f0ad4e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:148px}
header{padding:14px 20px 8px;max-width:1280px;margin:auto}h1{font-size:22px;margin:0 0 8px}.purpose{margin:0;color:var(--sub);line-height:1.55}.counter{font-weight:700;color:var(--accent);margin-top:8px}
main{max-width:1280px;margin:auto;padding:0 20px}.item{display:none}.item.active{display:block}.media-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.media-card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px}.media-card h2{font-size:16px;margin:0 0 4px}.media-card p{font-size:13px;color:var(--sub);margin:0 0 8px}video{display:block;width:100%;max-height:31vh;object-fit:contain;background:#000;border-radius:8px}.play-row{display:flex;gap:8px;margin-top:8px}.play-row button{padding:8px 12px}.question{margin:12px 0 0;background:#151a22;border-left:4px solid var(--accent);padding:10px 12px;line-height:1.5}.question strong{display:block;margin-bottom:4px}.question small{color:var(--sub)}
.dock{position:fixed;left:0;right:0;bottom:0;background:rgba(14,17,23,.97);border-top:1px solid var(--line);padding:10px 16px;z-index:10}.choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;max-width:1280px;margin:auto}.choice{border:1px solid var(--line);background:#202734;color:var(--text);padding:11px 8px;border-radius:9px;cursor:pointer;font-weight:650}.choice.selected{outline:3px solid var(--accent);background:#263956}.nav{max-width:1280px;margin:8px auto 0;display:flex;gap:8px;align-items:center}.nav button{padding:8px 14px}.nav .spacer{flex:1}.copy{background:var(--ok);color:#06140c;border:0;border-radius:8px;font-weight:700}.muted{color:var(--sub);font-size:12px}.results{display:none;max-width:900px;margin:18px auto;padding:0 20px}.results.active{display:block}.results textarea{width:100%;height:300px;background:#11151c;color:var(--text);border:1px solid var(--line);padding:12px;font:14px/1.5 ui-monospace,monospace}.results .actions{display:flex;gap:10px;margin-top:10px}
@media(max-width:800px){body{padding-bottom:210px}.media-grid{grid-template-columns:1fr}.media-card{padding:7px}video{max-height:23vh}.choices{grid-template-columns:1fr 1fr}header,main{padding-left:10px;padding-right:10px}}
</style>
</head>
<body>
<header><h1>G4 強調候補の正解づくり（1セッション目）</h1><p class="purpose"><strong>見ること:</strong> 元配信の候補と、切り抜き師が実際に使った対応部分を見比べ、強い瞬間への追加演出があるかを1つ選びます。題名やAIの理由は見ません。境界や面白さの採否は決めません。</p><div class="counter" id="counter"></div></header>
<main id="items"></main>
<section class="results" id="results"><h2>確認結果</h2><p>内容を確認し、コピーしてチャットへ貼ってください。前へ戻れば修正できます。</p><textarea id="resultText" readonly></textarea><div class="actions"><button id="backFromResults">回答へ戻る</button><button class="copy" id="copyResult">結果をコピー</button></div></section>
<div class="dock" id="dock"><div class="choices" id="choices"></div><div class="nav"><button id="prev">前の候補</button><span class="muted" id="answered"></span><span class="spacer"></span><button id="next">次の候補</button><button class="copy" id="showResult">結果を確認</button></div></div>
<script>
const items=${JSON.stringify(clientItems)};
const options=[
  {value:"強調している",label:"強調している",help:"顔アップ・大文字・効果音・背景などを足した"},
  {value:"強いが追加演出なし",label:"強いが追加演出なし",help:"強い瞬間だが素材のまま見せた"},
  {value:"G4該当なし",label:"G4該当なし",help:"対応部分に強調候補の瞬間がない"},
  {value:"判断不能",label:"判断できない",help:"対応や演出を判断できない"}
];
let index=0;const answers={};
const itemsEl=document.getElementById("items"),choicesEl=document.getElementById("choices"),counter=document.getElementById("counter"),answered=document.getElementById("answered"),dock=document.getElementById("dock"),results=document.getElementById("results"),resultText=document.getElementById("resultText");
itemsEl.innerHTML=items.map((item,i)=>'<section class="item" data-index="'+i+'"><div class="media-grid"><article class="media-card"><h2>切り抜き師が使った対応部分</h2><p>教師動画内 '+item.teacherBlockDisplay+'</p><video controls preload="metadata" src="'+item.teacherMedia+'"></video><div class="play-row"><button data-play="teacher">この対応部分を最初から再生</button></div></article><article class="media-card"><h2>元配信の候補全体</h2><p>'+item.sourceRange.display+'（候補の前後は足していません）</p><video controls preload="metadata" src="'+item.sourceMedia+'"></video><div class="play-row"><button data-play="source">候補全体を最初から再生</button></div></article></div><div class="question"><strong>この対応部分で、切り抜き師は強い瞬間を追加演出で強調しましたか？</strong><small>強調の種類は問いません。素材そのもののズーム等と、編集で足した強調を見分けてください。</small></div></section>').join("");
choicesEl.innerHTML=options.map(option=>'<button class="choice" data-value="'+option.value+'">'+option.label+'<br><span class="muted">'+option.help+'</span></button>').join("");
function stopAll(){document.querySelectorAll("video").forEach(video=>{video.pause();video.currentTime=0})}
function playCurrent(kind){const section=document.querySelector('.item[data-index="'+index+'"]');const video=section.querySelector(kind==="source"?".media-card:nth-child(2) video":".media-card:nth-child(1) video");video.currentTime=0;video.play().catch(()=>{});}
function render(){document.querySelectorAll(".item").forEach((el,i)=>el.classList.toggle("active",i===index));counter.textContent='候補 '+(index+1)+' / '+items.length;answered.textContent='回答済み '+Object.keys(answers).length+' / '+items.length;document.getElementById("prev").disabled=index===0;document.getElementById("next").disabled=index===items.length-1;choicesEl.querySelectorAll(".choice").forEach(button=>button.classList.toggle("selected",answers[items[index].candidateKey]===button.dataset.value));}
choicesEl.addEventListener("click",event=>{const button=event.target.closest(".choice");if(!button)return;answers[items[index].candidateKey]=button.dataset.value;render()});
itemsEl.addEventListener("click",event=>{const button=event.target.closest("[data-play]");if(button)playCurrent(button.dataset.play)});
document.getElementById("prev").onclick=()=>{if(index>0){stopAll();index--;render()}};
document.getElementById("next").onclick=()=>{if(index<items.length-1){stopAll();index++;render();playCurrent("source")}};
function buildResult(){return ["G4 正解候補v002 第1段 人間確認結果","確認者: kawafmm","確認日: 2026-07-20","時間計測: なし","",...items.map((item,i)=>'確認'+(i+1)+': '+(answers[item.candidateKey]??"未回答")+' / '+item.fixtureId+' / candidate '+item.candidateId)].join("\\n")}
document.getElementById("showResult").onclick=()=>{resultText.value=buildResult();document.querySelectorAll(".item").forEach(el=>el.classList.remove("active"));results.classList.add("active");dock.style.display="none";counter.textContent='回答済み '+Object.keys(answers).length+' / '+items.length};
document.getElementById("backFromResults").onclick=()=>{results.classList.remove("active");dock.style.display="block";render()};
document.getElementById("copyResult").onclick=async()=>{resultText.value=buildResult();try{await navigator.clipboard.writeText(resultText.value)}catch{resultText.focus();resultText.select();document.execCommand("copy")}};
render();
</script>
</body></html>`;

writeFileSync(join(reviewRoot, "review.html"), html);

const report = `# G4〜G7 v002 可用性preflightとG4第1セッション準備報告

日付: 2026-07-20
状態: 人間確認待ち

## 結果

- 保存済みcanonical候補は3素材×5件の15件。
- 題名、理由、既知hit、順位、検出器を選別に使わず、元配信ID・開始時刻・候補IDの固定順で検査した。
- 候補範囲が、人間確認済みの教師素材ブロックを丸ごと含む候補は5件だった。
- 部分的にだけ重なる候補は、候補入力外の教師部分を正解へ混ぜるため通過させていない。
- 5件はG4だけを確認する第1セッションへ固定した。G5〜G7を同じ画面で聞かず、独立判断は5件である。

## 人間作業

- 5判断・1セッション。
- 既存の同種正解認定で使った見積りを引き継ぎ、目安5〜10分。時間計測なし。
- 題名・理由・内部時刻・JSONは主画面へ出さない。
- 回答はいつでも戻って変更でき、サーバー保存せず最後に結果をコピーする。

## 停止点

人間回答を受領するまで、G4発火点の第2段認定、G5〜G7の確認、正解セット凍結、検出器実装、LLM実走へ進まない。
`;
writeFileSync(join(outputRoot, "preflight-report.md"), report);

console.log(JSON.stringify({
  outputRoot: repoPath(outputRoot),
  canonicalCandidates: candidates.length,
  eligibleCandidates: eligible.map((entry) => entry.candidateKey),
  reviewHtml: repoPath(join(reviewRoot, "review.html"))
}, null, 2));

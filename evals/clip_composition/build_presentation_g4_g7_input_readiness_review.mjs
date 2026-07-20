import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const evalRoot = resolve(repoRoot, "evals/clip_composition");
const outputRoot = resolve(evalRoot, "outputs/presentation/g4-g7-input-readiness-plan-a-v001");
const mediaRoot = join(outputRoot, "human-review-v001/media");
mkdirSync(mediaRoot, { recursive: true });

const readJson = (path) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
const repoPath = (path) => relative(repoRoot, path).replaceAll("\\", "/");
const overlaps = (a, b) => a.startMs < b.endMs && b.startMs < a.endMs;
const contains = (outer, inner) => outer.startMs <= inner.startMs && outer.endMs >= inner.endMs;
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const groundTruthPath = "evals/clip_composition/outputs/presentation/g4-g7-ground-truth-v001/ground-truth-v001.json";
const groundTruth = readJson(groundTruthPath);
const connectionManifestPath = "evals/clip_composition/outputs/theme-composition-connection/20260712-connection-main-v001/input-manifest.json";
const connectionManifest = readJson(connectionManifestPath);

const mappingCandidates = [
  {
    groundTruthId: "GT-01",
    grammar: "G4",
    teacherVideoId: "nE_bNeBNp4E",
    sourceVideoId: "qdczJpv8RCc",
    teacherEvidence: { shape: "point", anchorMs: 750000 },
    proposedSourceRange: { startMs: 4776126, endMs: 4779668 },
    method: "DP単語照合で、教師側の直前一致語「き」と直後一致語「何」に対応する元配信側の境界で挟んだ。点を比例換算していない。",
    evidence: {
      before: { teacher: { text: "き", startMs: 747273, endMs: 747293 }, source: { text: "き", startMs: 4775525, endMs: 4776126 } },
      after: { teacher: { text: "何", startMs: 751410, endMs: 752853 }, source: { text: "何", startMs: 4779668, endMs: 4781209 } }
    },
    status: "proposed-awaiting-human"
  },
  {
    groundTruthId: "GT-02",
    grammar: "G4-suppression",
    teacherVideoId: "9dtwF5Exu5w",
    sourceVideoId: "o8rZAhARXAc",
    teacherEvidence: { shape: "point", anchorMs: 949000 },
    proposedSourceRange: { startMs: 10957847, endMs: 10980390 },
    method: "教師側の長い無発話表示を、前後で一致する「ろ」と「犠牲フライ」の元配信境界で挟んだ。却下block 30は採用せず、点の比例換算もしていない。",
    evidence: {
      before: { teacher: { text: "ろ", startMs: 945655, endMs: 955739 }, source: { text: "ろ", startMs: 10957587, endMs: 10957847 } },
      after: { teacher: { text: "犠牲フライ", startMs: 940013, endMs: 940833, note: "教師編集で順序が前に移っているため映像確認必須" }, source: { text: "犠牲フライ", startMs: 10980390, endMs: 10981031 } }
    },
    status: "proposed-awaiting-human",
    caution: "教師編集で発話順序が入れ替わって見えるため、4件中もっとも不確実。映像で同じ顔アップ場面かを確認する。"
  },
  {
    groundTruthId: "GT-04",
    grammar: "G5",
    teacherVideoId: "UpRyakf5j80",
    sourceVideoId: "kNX-wQTvsws",
    teacherEvidence: {
      shape: "typed-interval-with-contrast",
      listenerComment: { startMs: 0, endMs: 12000 },
      streamerResponse: { startMs: 16000, endMs: 40000 }
    },
    proposedSourceRanges: {
      listenerComment: { startMs: 11364140, endMs: 11381180 },
      streamerResponse: { startMs: 11381340, endMs: 11404850 }
    },
    method: "固定済み55秒スライス内の字幕本文を教師側の発話本文と照合し、コメント読み上げと本人回答の字幕境界を採用した。時間の比例換算はしていない。",
    status: "proposed-awaiting-human"
  },
  {
    groundTruthId: "GT-05",
    grammar: "G6",
    teacherVideoId: "nOEWCNc77MI",
    sourceVideoId: "YE-faluP7zY",
    teacherEvidence: { shape: "interval", startMs: 110000, endMs: 114000 },
    proposedSourceRange: { startMs: 3185593, endMs: 3190315 },
    method: "DP単語照合で教師区間の開始・終了をまたぐ単語を含む元配信側境界へ対応させた。区間端を比例換算していない。",
    proposedSpeakerBindings: [
      { person: "マリン", startMs: 3185593, endMs: 3185773, text: "しっかりしてくれよ（末尾）" },
      { person: "ころね", startMs: 3185773, endMs: 3187193, text: "ごめんなさい" },
      { person: "マリン", startMs: 3187193, endMs: 3190315, text: "あなた、お前がちゃんとしないと" }
    ],
    status: "proposed-awaiting-human"
  }
];

function connectionUnits(fixtureId) {
  return connectionManifest.inputs
    .filter((entry) => entry.fixtureId === fixtureId)
    .map((entry) => {
      const promptInput = readJson(entry.payloadPath);
      const modelTranscript = typeof promptInput.modelInput?.transcript === "string"
        ? JSON.parse(promptInput.modelInput.transcript)
        : promptInput.modelInput?.transcript;
      const candidateSegments = (modelTranscript?.segments ?? []).filter((segment) => promptInput.candidateSpeechIds.includes(segment.speechId));
      const fallbackRange = candidateSegments.length === 0 ? [] : [{
        startMs: Math.min(...candidateSegments.map((segment) => segment.sourceStartMs)),
        endMs: Math.max(...candidateSegments.map((segment) => segment.sourceEndMs))
      }];
      const themeRanges = (promptInput.evidenceRanges ?? fallbackRange).map((range) => ({
        startMs: range.sourceStartMs ?? range.startMs,
        endMs: range.sourceEndMs ?? range.endMs
      }));
      const composedRuns = [];
      for (let run = 1; run <= connectionManifest.runsPerCandidate; run += 1) {
        const outputPath = resolve(repoRoot, entry.outputDir, `run-${String(run).padStart(2, "0")}-gemini-output.json`);
        const output = JSON.parse(readFileSync(outputPath, "utf8"));
        composedRuns.push({
          run,
          generationSystem: output.params?.generationSystem ?? connectionManifest.generationSystem,
          ranges: output.selectedCuts.map((cut) => ({ startMs: cut.sourceStartMs, endMs: cut.sourceEndMs })),
          sourcePath: repoPath(outputPath)
        });
      }
      return {
        candidateId: entry.candidateIndex,
        themeRanges,
        themeSourcePath: entry.payloadPath,
        composedRuns
      };
    });
}

const thirdThemePath = "evals/clip_composition/outputs/theme-generation/nE_bNeBNp4E_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260715-chat-velocity-top100-third-material-v001/run-01-gemini-output.json";
const thirdRankingPath = "evals/clip_composition/outputs/candidate-ranking/20260716-third-material-run1-v002/nE_bNeBNp4E_multiblock_material_v001/run-01-gemini-output.json";
const thirdThemes = readJson(thirdThemePath).themes;
const thirdTopFive = readJson(thirdRankingPath).rankedCandidates.map(({ candidateId, rank }) => ({
  candidateId,
  rank,
  title: thirdThemes[candidateId - 1].title,
  ranges: thirdThemes[candidateId - 1].evidenceRanges.map((range) => ({ startMs: range.sourceStartMs, endMs: range.sourceEndMs }))
}));

const gt01Range = mappingCandidates.find((item) => item.groundTruthId === "GT-01").proposedSourceRange;
const gt02Range = mappingCandidates.find((item) => item.groundTruthId === "GT-02").proposedSourceRange;
const gt05Range = mappingCandidates.find((item) => item.groundTruthId === "GT-05").proposedSourceRange;

function assessConnectionVisibility(fixtureId, targetRange) {
  const candidates = connectionUnits(fixtureId).map((candidate) => ({
    ...candidate,
    themeVisibility: {
      full: candidate.themeRanges.some((range) => contains(range, targetRange)),
      overlap: candidate.themeRanges.some((range) => overlaps(range, targetRange))
    },
    composedVisibilityByRun: candidate.composedRuns.map((entry) => ({
      run: entry.run,
      full: entry.ranges.some((range) => contains(range, targetRange)),
      overlap: entry.ranges.some((range) => overlaps(range, targetRange))
    }))
  }));
  return {
    mainComposed: {
      fullyVisible: candidates.some((candidate) => candidate.composedVisibilityByRun.some((entry) => entry.full)),
      visibleCandidateRuns: candidates.flatMap((candidate) => candidate.composedVisibilityByRun.filter((entry) => entry.full).map((entry) => ({ candidateId: candidate.candidateId, run: entry.run })))
    },
    secondaryTheme: {
      fullyVisible: candidates.some((candidate) => candidate.themeVisibility.full),
      visibleCandidateIds: candidates.filter((candidate) => candidate.themeVisibility.full).map((candidate) => candidate.candidateId)
    },
    candidates
  };
}

const gt02Visibility = assessConnectionVisibility("9dtwF5Exu5w_multiblock_material_v001", gt02Range);
const gt05Visibility = assessConnectionVisibility("nOEWCNc77MI_multiblock_material_v001", gt05Range);
const gt01Visible = thirdTopFive.filter((candidate) => candidate.ranges.some((range) => contains(range, gt01Range)));

const visibilityManifest = {
  schemaVersion: "presentation-g4-g7-input-visibility-v001",
  createdAt: "2026-07-20",
  status: "provisional-until-human-source-mapping-confirmation",
  groundTruthSource: groundTruthPath,
  upstreamGenerationPolicy: {
    newlyGeneratedUpstreamInputs: false,
    frozenBeforeGroundTruth: true,
    unitDecisionTiming: "The dual-unit visibility rule was fixed after some GT source positions were partially known.",
    note: "入力を追加・拡張せず、凍結前から保存済みの同一候補を合成後範囲（主）とテーマ根拠範囲（従）の二粒度で検査した。"
  },
  results: [
    {
      groundTruthId: "GT-01",
      targetSourceRange: gt01Range,
      mainUnit: "theme-range-only-because-no-frozen-connection-output",
      visible: gt01Visible.length > 0,
      visibleCandidateIds: gt01Visible.map((entry) => entry.candidateId),
      candidates: thirdTopFive,
      provisionalScoringStatus: gt01Visible.length > 0 ? "scorable_at_theme_range_granularity" : "unscorable_input_visibility"
    },
    {
      groundTruthId: "GT-02",
      targetSourceRange: gt02Range,
      mainUnit: "connection-v001-to-llm-v012-composed-range",
      main: gt02Visibility.mainComposed,
      secondary: gt02Visibility.secondaryTheme,
      candidates: gt02Visibility.candidates,
      provisionalScoringStatus: gt02Visibility.mainComposed.fullyVisible ? "scorable" : "unscorable_input_visibility"
    },
    {
      groundTruthId: "GT-04",
      targetSourceRanges: mappingCandidates.find((item) => item.groundTruthId === "GT-04").proposedSourceRanges,
      mainUnit: "frozen-55-second-source-slice",
      fixedSliceRange: { startMs: 11357000, endMs: 11412000 },
      visible: true,
      provisionalScoringStatus: "scorable_deterministic_plumbing"
    },
    {
      groundTruthId: "GT-05",
      targetSourceRange: gt05Range,
      mainUnit: "connection-v001-to-llm-v012-composed-range",
      main: gt05Visibility.mainComposed,
      secondary: gt05Visibility.secondaryTheme,
      candidates: gt05Visibility.candidates,
      provisionalScoringStatus: gt05Visibility.mainComposed.fullyVisible ? "scorable_deterministic_plumbing" : "unscorable_input_visibility"
    },
    {
      groundTruthId: "GT-03",
      provisionalScoringStatus: "held_input_not_ready",
      note: "案Aで保留。現行G7か再構成層かの文書判定を保留解除条件として保持する。"
    }
  ]
};

const gt04 = mappingCandidates.find((item) => item.groundTruthId === "GT-04");
const gt05 = mappingCandidates.find((item) => item.groundTruthId === "GT-05");
const structuredInputs = {
  schemaVersion: "presentation-g4-g7-structured-input-candidates-v001",
  status: "proposed-awaiting-human-confirmation",
  inputs: [
    {
      groundTruthId: "GT-04",
      sourceVideoId: "kNX-wQTvsws",
      informationSegments: [
        { informationType: "listener-comment", ...gt04.proposedSourceRanges.listenerComment, textSummary: "世界2位の記事を見たリスナーコメントの読み上げ" },
        { informationType: "streamer-response", ...gt04.proposedSourceRanges.streamerResponse, textSummary: "順位は変動するので素直に喜べないというマリン本人の回答" }
      ],
      derivation: "frozen-source-slice-caption-text-match",
      requiresHumanConfirmation: true
    },
    {
      groundTruthId: "GT-05",
      sourceVideoId: "YE-faluP7zY",
      speakerBindings: gt05.proposedSpeakerBindings,
      derivation: "teacher-source-word-alignment-plus-teacher-caption-color-and-video-review",
      requiresHumanConfirmation: true
    }
  ]
};

writeFileSync(join(outputRoot, "source-mapping-candidates.json"), `${JSON.stringify({ schemaVersion: "presentation-g4-g7-source-mapping-candidates-v001", status: "proposed-awaiting-human-confirmation", candidates: mappingCandidates }, null, 2)}\n`);
writeFileSync(join(outputRoot, "input-visibility-manifest.json"), `${JSON.stringify(visibilityManifest, null, 2)}\n`);
writeFileSync(join(outputRoot, "structured-input-candidates.json"), `${JSON.stringify(structuredInputs, null, 2)}\n`);

const clips = [
  { id: "gt01-teacher", source: "evals/clip_composition/research/downloads/nE_bNeBNp4E/nE_bNeBNp4E.mp4", startSec: 742, durationSec: 17 },
  { id: "gt01-source", source: "evals/clip_composition/research/downloads/nE_bNeBNp4E/sources/qdczJpv8RCc/qdczJpv8RCc.mp4", startSec: 4772, durationSec: 18 },
  { id: "gt02-teacher", source: "evals/clip_composition/research/downloads/9dtwF5Exu5w/9dtwF5Exu5w.mp4", startSec: 940, durationSec: 20 },
  { id: "gt02-source", source: "evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4", startSec: 10952, durationSec: 42 },
  { id: "gt04-teacher", source: "evals/clip_composition/research/downloads/UpRyakf5j80/UpRyakf5j80.mp4", startSec: 0, durationSec: 42.678 },
  { id: "gt04-source", source: "evals/clip_composition/research/downloads/UpRyakf5j80/sources/kNX-wQTvsws/kNX-wQTvsws_3h09m17s_55s_video.mp4", startSec: 0, durationSec: 50 },
  { id: "gt05-teacher", source: "evals/clip_composition/research/downloads/nOEWCNc77MI/nOEWCNc77MI.mp4", startSec: 104, durationSec: 16 },
  { id: "gt05-source", source: "evals/clip_composition/research/downloads/nOEWCNc77MI/sources/YE-faluP7zY/YE-faluP7zY.mp4", startSec: 3183, durationSec: 14 }
];

for (const clip of clips) {
  const destination = join(mediaRoot, `${clip.id}.mp4`);
  const source = resolve(repoRoot, clip.source);
  if (!existsSync(source)) throw new Error(`Missing source media: ${source}`);
  const result = spawnSync("ffmpeg", [
    "-y", "-ss", String(clip.startSec), "-i", source, "-t", String(clip.durationSec),
    "-vf", "scale='min(960,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", destination
  ], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${clip.id}: ${result.stderr}`);
}

const reviewItems = [
  {
    id: "GT-01", title: "意表を突かれた瞬間", question: "教師側の強調点と、元配信側の提示区間は同じ出来事ですか？",
    note: "教師 12:30。元配信は一致語「き」〜「何」の間（01:19:36〜01:19:39）を中心に表示します。",
    teacher: "media/gt01-teacher.mp4", source: "media/gt01-source.mp4",
    options: ["対応している", "違う", "わからない"]
  },
  {
    id: "GT-02", title: "顔アップだけで見せた抑制例", question: "教師側の顔アップ区間と、元配信側の提示区間は同じ出来事ですか？",
    note: "もっとも不確実な候補です。教師 15:49。元配信は前後一致語で挟んだ長い無発話区間（03:02:37〜03:03:00）を表示します。",
    teacher: "media/gt02-teacher.mp4", source: "media/gt02-source.mp4",
    options: ["対応している", "違う", "わからない"]
  },
  {
    id: "GT-04", title: "コメント読み上げと本人回答", question: "元配信側も、前半がリスナーコメント、後半がマリン本人の回答という区別で合っていますか？",
    note: "前半: 世界2位の記事を見たコメント。後半: 順位は変わるので喜べないという本人回答。",
    teacher: "media/gt04-teacher.mp4", source: "media/gt04-source.mp4",
    options: ["区別も対応も正しい", "対応は同じだが区別が違う", "対応が違う", "わからない"]
  },
  {
    id: "GT-05", title: "マリンところねの話者識別", question: "同じ場面ですか？ また「マリン→ころね→マリン」の発話者対応で合っていますか？",
    note: "提案: マリン『しっかりしてくれよ』→ころね『ごめんなさい』→マリン『あなた、お前がちゃんとしないと』。",
    teacher: "media/gt05-teacher.mp4", source: "media/gt05-source.mp4",
    options: ["対応も人物も正しい", "対応は正しいが人物が違う", "対応が違う", "わからない"]
  }
];

const escapedItems = JSON.stringify(reviewItems).replaceAll("</", "<\\/");
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>G4〜G7 元配信対応確認</title>
<style>
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#10131a;color:#f5f7fb}*{box-sizing:border-box}body{margin:0}.shell{max-width:1180px;margin:auto;padding:18px}.top{display:flex;gap:12px;align-items:center;justify-content:space-between}.badge{background:#25304a;border:1px solid #48618e;border-radius:999px;padding:7px 12px}.help{background:#171d29;border:1px solid #303a4f;border-radius:12px;padding:12px 14px;margin:12px 0;color:#d8deea}.card{background:#171d29;border:1px solid #303a4f;border-radius:16px;padding:16px}.videos{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pane{background:#0d1016;border-radius:12px;padding:10px}.pane h3{margin:0 0 8px;font-size:15px;color:#b9c9e8}video{display:block;width:100%;max-height:38vh;background:#000;border-radius:8px}.question{font-size:21px;font-weight:750;margin:16px 0 8px}.note{color:#c4cad6;margin-bottom:14px}.options{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px}.option{border:1px solid #52617d;background:#222b3d;color:#fff;border-radius:11px;padding:13px;font-size:16px;cursor:pointer}.option.selected{background:#2c67d8;border-color:#8ab2ff}.nav{position:sticky;bottom:0;background:linear-gradient(transparent,#10131a 24%);padding-top:24px;display:flex;gap:10px;justify-content:space-between;align-items:center}.nav button,.copy{border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer}.primary{background:#77a8ff;color:#081020}.secondary{background:#2a3242;color:#fff}.progress{font-variant-numeric:tabular-nums}.result{margin-top:14px;background:#0d1016;border:1px solid #303a4f;border-radius:12px;padding:12px;white-space:pre-wrap;display:none}.all{background:#214d39;color:#d7ffe8;border:1px solid #438461;border-radius:10px;padding:10px 14px;cursor:pointer}@media(max-width:780px){.videos{grid-template-columns:1fr}video{max-height:31vh}.question{font-size:18px}.shell{padding:10px}}
</style></head><body><main class="shell">
<div class="top"><h1>元配信対応の確認</h1><span class="badge">4件・1セッション</span></div>
<div class="help"><strong>見ること:</strong> 左の教師切り抜きと右の元配信が同じ出来事か。GT-04だけ情報種別、GT-05だけ人物対応も確認します。時間入力・保存操作・作業時間計測はありません。回答は後から変更できます。</div>
<div id="card" class="card"></div>
<div class="nav"><button id="prev" class="secondary">← 前へ</button><span id="progress" class="progress"></span><button id="next" class="primary">次へ →</button></div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button id="all" class="all">全件を提案どおりにする</button><button id="copy" class="copy secondary">結果をコピー</button></div>
<pre id="result" class="result"></pre>
</main><script>
const items=${escapedItems};let index=0;const answers={};
function render(){const item=items[index];document.querySelectorAll('video').forEach(v=>v.pause());document.getElementById('card').innerHTML=\`<h2>\${item.id}: \${item.title}</h2><div class="videos"><div class="pane"><h3>教師切り抜き</h3><video controls preload="metadata" src="\${item.teacher}"></video></div><div class="pane"><h3>対応候補の元配信</h3><video controls preload="metadata" src="\${item.source}"></video></div></div><div class="question">\${item.question}</div><div class="note">\${item.note}</div><div class="options">\${item.options.map(o=>\`<button class="option \${answers[item.id]===o?'selected':''}" data-answer="\${o}">\${o}</button>\`).join('')}</div>\`;document.querySelectorAll('.option').forEach(b=>b.onclick=()=>{answers[item.id]=b.dataset.answer;render()});document.getElementById('progress').textContent=\`\${index+1} / \${items.length}（回答 \${Object.keys(answers).length}件）\`;document.getElementById('prev').disabled=index===0;document.getElementById('next').textContent=index===items.length-1?'先頭へ':'次へ →';}
document.getElementById('prev').onclick=()=>{index=Math.max(0,index-1);render()};document.getElementById('next').onclick=()=>{index=index===items.length-1?0:index+1;render()};
document.getElementById('all').onclick=()=>{for(const item of items)answers[item.id]=item.options[0];render()};
function resultText(){return ['G4〜G7 採点入力対応確認結果','確認者: kawafmm','確認日: 2026-07-20','時間計測: なし','',...items.map((item,i)=>\`確認\${i+1}: \${answers[item.id]??'未回答'} / \${item.id} / \${item.title}\`)].join('\\n')}
document.getElementById('copy').onclick=async()=>{const text=resultText();let copied=false;try{await navigator.clipboard.writeText(text);copied=true}catch{}if(!copied){const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();copied=document.execCommand('copy');area.remove()}const box=document.getElementById('result');box.textContent=text;box.style.display='block';document.getElementById('copy').textContent=copied?'コピーしました':'下の結果を選択してコピー'};render();
</script></body></html>`;
const reviewPath = join(outputRoot, "human-review-v001/review.html");
mkdirSync(dirname(reviewPath), { recursive: true });
writeFileSync(reviewPath, html);

const packageManifest = {
  schemaVersion: "presentation-g4-g7-input-readiness-review-package-v001",
  createdAt: "2026-07-20",
  decisionCount: 4,
  sessionCount: 1,
  timeMeasurement: "none",
  checks: reviewItems.map(({ id, title, question, options }) => ({ groundTruthId: id, title, question, options })),
  files: {
    sourceMappingCandidates: "source-mapping-candidates.json",
    inputVisibilityManifest: "input-visibility-manifest.json",
    structuredInputCandidates: "structured-input-candidates.json",
    reviewPage: "human-review-v001/review.html"
  },
  media: clips.map((clip) => {
    const path = join(mediaRoot, `${clip.id}.mp4`);
    return { id: clip.id, path: repoPath(path), sha256: sha256(path) };
  })
};
writeFileSync(join(outputRoot, "package-manifest.json"), `${JSON.stringify(packageManifest, null, 2)}\n`);

console.log(JSON.stringify({ outputRoot: repoPath(outputRoot), reviewPage: repoPath(reviewPath), provisionalStatuses: visibilityManifest.results.map(({ groundTruthId, provisionalScoringStatus }) => ({ groundTruthId, provisionalScoringStatus })) }, null, 2));

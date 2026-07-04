# zev2 技術説明 — プロンプト設計と評価基盤の相談用

作成者: Claude (Fable 5) / 作成日: 2026-07-04
対象コミット時点: main (79f9715)
読者: コードを持っていない外部レビュアー。この文書だけでシステムの動作が追えることを目標にしている。
プロンプト本文と型定義はすべて原文引用(要約・言い換えなし)。プロンプト内の `${...}` はコード上のテンプレート挿入箇所。

zev2 は「配信アーカイブから切り抜きショート動画を、人間の承認を挟みながらAIエージェントに作らせる」個人プロジェクト。
設計原理は **LLMは意味判断のみ、数値・配置・タイミングはルールで決定的に**。座標や時刻をLLMに直接決めさせず、
LLMには「発話IDの選択」「候補IDの選択」「検出範囲の申告」だけをさせ、プログラム側が座標計算・検証・合成を行う。

---

## 1. パイプライン全体図

7工程が直列に走る。工程間の受け渡しはすべてJSONファイル(成果物)で、各工程の完了時にbackendが
スキーマ・MIME・参照整合を検証する。人間確認ゲートが3箇所(テーマ選択、切り口確認、動画生成前確認)。

```
配信動画(ローカルパス or YouTube URL)
  │
  ▼
[1] prepare_video ─ 入力: sourceUri
  │                処理: ローカル参照 or yt-dlpでダウンロード
  │                出力: source-video.json(参照メタ) + source-video.mp4
  │                担当: runner/src/steps/source-video.ts
  ▼
[2] run_stt ─ 入力: source-video.mp4
  │           処理: ffmpegで音声抽出(flac 16kHz mono) → ローカルSTTサーバー(外部、
  │                 POST /transcribe)へ送信。応答は【1文字=1セグメント】の粒度で、
  │                 話者分離ラベル付き(WhisperX系と推定される外部サーバー。本リポジトリ外)
  │           出力: transcript.json(下記 TranscriptArtifact)
  │           担当: runner/src/steps/transcript.ts
  ▼
[3] propose_clip_themes ─ 入力: transcript.json
  │           処理: 【現行コードはLLM不使用】。発話のまとまり(speechUnitGroups: 無音1.2秒超
  │                 または話者交代で分割、句点で確定)からテーマ候補を機械的に列挙する
  │                 (mode=transcript)か、保存済み固定テーマを返す(mode=fixed)。
  │                 ※過去にGeminiでテーマ生成するモードが存在した(§2-D参照)
  │           出力: themes.json(ThemeArtifact、テーマN件)
  │           担当: runner/src/steps/theme-options.ts
  ▼
【人間確認1: theme_selection】UIでテーマを1つ選択
  ▼
[4] build_clip_composition ─ 入力: themes.json + transcript.json + 選択されたテーマID
  │           処理: LLM不使用。選択テーマの relatedSpeechIds を含む発話まとまりを抽出し、
  │                 断片(導入/展開/結論)の時間範囲と文字起こしを決定的に組む
  │           出力: clip-composition.json(ClipCompositionArtifact)
  │           担当: runner/src/steps/composition.ts
  ▼
【人間確認2: material_confirmation】断片の切り口を確認
  ▼
[5] create_edit_plan ─ 入力: clip-composition.json + 元動画
  │           処理: 【LLM呼び出し2回】(§2-A, §2-B)。断片ごとにffmpegで640px幅の
  │                 確認用クリップを切り出してGemini APIへ送り、①タイトル・フック・
  │                 テロップ分割(発話ID指定)・画面パターン・顔/画面の検出範囲を生成、
  │                 ②検出範囲からプログラムが作った表示候補のプレビュー画像を再度送り
  │                 候補IDを選択させる
  │           出力: edit-plan.json(EditPlanArtifact)
  │           担当: runner/src/steps/edit-plan.ts
  ▼
[6] apply_adjustment ─ 現状は固定パススルー(編集判断なし。工程枠だけ残している)
  │           担当: runner/src/steps/patch.ts
  ▼
【人間確認3: render_readiness】動画生成前の最終確認
  ▼
[7] render_video ─ 入力: edit-plan.json + 元動画
  │           処理: LLM不使用。すべて決定的:
  │                 - 画面パターン(1080x1920の上下2分割等)と検出範囲からcrop/scaleの
  │                   ffmpegフィルタを構築(runner/src/screen-layout.ts)
  │                 - テロップはRemotionでPNG化(runner/src/telop-remotion.ts)、
  │                   検出された顔を避ける配置をルールで解決(runner/src/telop-placement.ts)
  │                 - テロップの表示開始=対応発話IDの最小開始時刻、終了=発話終了と
  │                   次テロップ開始の早い方(runner/src/steps/render-video.ts)
  │                 - 音声無音チェック(ffmpeg volumedetect)
  │           出力: output.mp4 + render-plan.json + telop-NNN.png
  ▼
完成動画 → 人間の最終判断(投稿候補として保存 / 作業完了)
  │
  └─(任意)Web Geminiレビューループ(§4): 完成動画を gemini.google.com に見せて
     演出レビューを受け、人間が採否を決めて [5] からやり直し
```

やり直しは「編集コピー」モデル: 既存データを書き換えず新しい依頼(draft)を複製し、完了済み工程の
成果物と承認済み確認を引き継いで、指定工程以降だけを再実行する。

---

## 2. LLM呼び出しの全箇所

現行コードでLLM(またはそれに準ずる外部知能)を呼ぶのは **3箇所**。ほかに削除済みが1箇所、
LLMではないが機械学習モデルが1箇所ある。リトライ機構は全箇所共通で **なし**(後述)。

### 2-A. 演出案作成(create_edit_plan 1回目)

- **(a) 目的**: 断片ごとの画面パターン選択・顔/画面の検出範囲・テロップ分割(発話ID列)・タイトル・冒頭フックの生成
- **(b) 使用モデル**: 既定 `gemini-3.5-flash`(`packages/shared/src/index.ts` の `DEFAULT_GEMINI_MODEL`)。
  依頼作成時にUIから `RequestDraft.settings.geminiModelName` で上書き可。環境変数 `ZEV2_GEMINI_MODEL` でも既定を変更可。
  API接続は APIキー(`GEMINI_API_KEY`) or Vertex AI(`GOOGLE_CLOUD_PROJECT`)。`responseMimeType: 'application/json'` を指定
- **(c) プロンプト定義**: `runner/src/steps/edit-plan.ts` の `buildGeminiEditPlanPrompt()`。全文:

```
複数の動画断片と文字起こしを見て、ショート動画の演出に必要な検出結果を作ってください。
候補選定は済んでいます。断片の順番と時間範囲は変えず、各断片の画面パターン、表示対象の検出範囲、テロップを決めてください。
最終的な切り出し位置はAIエージェント側で候補化します。ここでは候補選択やcrop座標を返さないでください。
画面パターンと検出範囲は添付動画を直接見て判断してください。文字起こしだけを根拠にした推測は禁止です。
テロップの表示タイミングは時間で指定しないでください。LLMは時間指定を間違えやすいため、必ず下の発話IDで指定してください。
telopPlan.sourceSpeechIds には、そのテロップが対応する発話IDだけを入れてください。存在しない発話ID、元動画秒数、atMs は返さないでください。
テロップの区切りは文脈を読んで決めてください。プログラム側では日本語の文節推定や例外処理で直しません。
文章の途中、語の途中、不自然な接続語だけで切らないでください。
1テロップには、表示文に対応する連続した複数の発話IDを入れてください。1 IDだけ、断片全体1件、時刻指定は禁止です。
断片全体の文字起こしを1つのテロップにまとめないでください。読点、句点、問いかけ、返答など、人間が自然に読める意味の区切りごとに複数のtelopPlanへ分けてください。
JSONだけを返してください。

画面枠:
- speaker_only: 話者1人だけ。話者を縦長の画面全体に表示する。
- screen_speaker: 画面と話者。上に画面、下に話者を横長の2枠で表示する。
- speaker_pair: 話者2人。話者1を上、話者2を下に横長の2枠で表示する。

detections:
- 座標は [ymin, xmin, ymax, xmax] の順で、0..1000 の整数にしてください。
- screen は、その断片で見えている画面全体です。
- speaker / speaker1 / speaker2 は face と body を返してください。
- face は顔全体、body は見えている人物全体です。face は必ず body の内側に収めてください。
- speaker_only では speaker を返してください。
- screen_speaker では screen と speaker を返してください。
- speaker_pair では speaker1 と speaker2 を返してください。
- final crop と selectedCandidateId は返さないでください。AIエージェントが検出結果から表示候補を作ります。

返すJSON:
{
  "title": "動画のタイトルになる短い文言",
  "hookText": "冒頭で見せる短い文言",
  "renderSegments": [
    {
      "role": "断片の役割",
      "caption": "断片に出す短いテロップ",
      "screenLayoutId": "screen_speaker",
      "detections": {
        "screen": [0, 0, 1000, 1000],
        "speaker": { "face": [0, 0, 300, 300], "body": [0, 0, 1000, 1000] }
      }
    }
  ],
  "telopPlan": [
    { "sourceSpeechIds": [1, 2, 3], "text": "表示するテロップ", "role": "表示意図" }
  ]
}

依頼目的: ${request.input.purpose}
選ばれたテーマ: ${composition.title}
テーマ概要: ${composition.themeSummary}

${partsText}
```

`${partsText}` は断片ごとに次の書式(発話に話者ラベルは含めていない):

```
断片${index + 1}
役割: ${part.role}
元動画時間: ${開始}秒 - ${終了}秒
参照する発話ID: ${part.speechIds.join(', ')}
文字起こし: ${part.transcriptText}
発話:
  - 発話ID ${speech.id}: ${開始}秒 - ${終了}秒 / ${speech.text}
```

- **(d) 入力**: 上記プロンプト(text part)+ 断片ごとに「テキストヘッダ(役割・時間・発話ID・文字起こし)+
  640px幅に縮小したmp4クリップ(inlineData, base64)」を交互に並べたマルチモーダルparts。
  **トランスクリプトは断片範囲のみ**(全文は渡さない)。チャットデータなし。動画は断片クリップそのもの
- **(e) 出力形式とパース**: JSON。`extractGeminiResponseText()`(candidates[0]のtext結合)→
  `parseGeminiJsonText()`(素のJSON.parse、失敗時は```jsonフェンス剥がしを1回試行)→
  `applyGeminiEditPlanResponse()` で検証。検証内容:
  - renderSegments件数が断片数と一致しないとエラー
  - 検出座標は `screen-layout.ts` で正規化(0..1000スケール判定、clamp、faceがbody内か等)
  - telopPlanは `speechIdsFromGeminiRequired()` で存在しない発話IDを拒否、
    `normalizeGeminiTelopPlan()` で「1件以上あること」「1テロップに複数発話ID」「断片全体を丸ごと1テロップにしていない」
    「表示文が空でない」を検証し、発話開始時刻順にソート。**テロップ文字数や表示時間長の上限検証はない**
  - captionは48文字にtruncate
- **(f) リトライ・再生成ループ**: **APIリトライなし**。検証エラーは throw され工程が failed になる。
  復旧は人間がUIから retry(編集コピーで同工程から再実行 = 実質もう1回ガチャ)。自動の再プロンプトや
  エラー内容のフィードバックループはない。応答生JSONは `gemini-edit-plan-response.json` として成果物保存される

### 2-B. 表示候補選択(create_edit_plan 2回目)

- **(a) 目的**: 2-Aの検出範囲からプログラムが決定的に生成した表示候補(顔中心crop / 人物全体crop等)の
  プレビュー静止画を見せ、断片ごとに1候補を選ばせる
- **(b) 使用モデル**: 2-Aと同じ(同一リクエスト設定)
- **(c) プロンプト定義**: `runner/src/steps/edit-plan.ts` の `buildGeminiCandidateSelectionPrompt()`。全文:

```
AIエージェントが、検出結果から最低条件を満たす表示候補を作りました。
各候補画像を見て、断片ごとに一番自然に見える候補IDだけを選んでください。
座標や新しい候補は作らないでください。必ず候補一覧にある selectedCandidateId を返してください。
判断基準は、顔が自然に見えること、画面情報が読めること、話の流れに対して主役が分かりやすいことです。
JSONだけを返してください。

返すJSON:
{
  "renderSegments": [
    { "selectedCandidateId": "候補ID", "reason": "その候補を選んだ短い理由" }
  ]
}

選ばれたテーマ: ${composition.title}
テーマ概要: ${composition.themeSummary}

${segmentText}
```

`${segmentText}` は断片ごとに:

```
断片${index + 1}
役割: ${segment.role}
テロップ: ${segment.caption}
画面パターン: ${candidateSet.displaySummary}
候補:
  - ${candidate.id}: ${candidate.label} / ${candidate.reason}
```

- **(d) 入力**: プロンプト + 候補ごとに「候補メタ(候補ID・候補名・意味)のtext part + 断片中間フレームに
  候補cropを適用したJPEGプレビュー(inlineData)」。動画は送らない(静止画のみ)
- **(e) 出力とパース**: JSON。件数一致検証 → `selectScreenLayoutCandidate()` が候補IDの存在を検証し、
  不正IDはエラー。選択理由は `selectionReason` として成果物に記録
- **(f) リトライ**: なし(2-Aと同じ扱い)。応答は `gemini-layout-candidate-response.json` に保存

### 2-C. Web Gemini演出レビュー(完成動画の外部レビュー)

- **(a) 目的**: 完成動画 output.mp4 を見せて演出(テロップ・レイアウト・テンポ)の改善指示を自由文で得る
- **(b) 使用モデル**: **APIではない**。Microsoft Edge を CDP(Chrome DevTools Protocol)+ AppleScript で
  自動操作し、`https://gemini.google.com/app?hl=ja`(Web版Gemini)へ動画をアップロードして依頼文を送信する。
  モデルはWeb UI側の既定(選択制御はしていない)。担当: `scripts/web-gemini-review-edge.mjs`
- **(c) プロンプト定義**: `packages/shared/src/index.ts` の `buildWebGeminiReviewPromptText()`。全文:

```
この動画をレビューしてください。対象は演出だけです。

動画の目的: ${readablePurposeForWebGeminiReview(purpose)}

編集で変更できること:
- タイトル、冒頭フック、断片ごとの短い説明文
- テロップの文言、区切り、読みやすさ、発話に合わせた表示開始と終了
- 断片単位の画面パターンの選択。話者のみ、画面+話者、話者2人のどれで見せるか
- 話者の顔を避ける表示枠、ゲーム画面やサブ画面側へ寄せるテロップ配置
- 同じ編集元場面の中で、見せ場が伝わるようにする強調やテンポの調整

編集で変更しないこと:
- テーマ、編集元場面、断片の順番、元動画の内容
- 元音声の品質、文字起こしの内容、投稿先、公開作業
- BGM追加、別素材追加、複雑なエフェクトなど、現在の演出作成工程にない作業
- 断片の途中だけ画面パターンを切り替える提案

テロップの制約:
- ショート動画なので、文字を小さくして重なりを避ける提案は禁止です。
- 重なりは、表示位置、改行、テロップ分割、画面パターン選択で解決してください。
- 根拠のない倍率、固定文字数、数値係数の提案は避けてください。

レビュー対象:
- テロップの読みやすさ、表示タイミング、消えるタイミング
- 顔、ゲーム画面、テロップが重ならない画面構成
- 複数シーンのつなぎ、テンポ、初見で意味が伝わるか
- ショート動画として見せ場が伝わるか

レビュー対象外:
- テーマ選択、編集元場面の選択
- 元動画、文字起こし、音声品質、エンコード、投稿可否、バグ調査

出力は、演出作成へ渡せる改善指示として箇条書きにしてください。
各項目は「変えること」「理由」「対象箇所の説明」が分かるようにしてください。
変更できないことへの助言や、実際の動画を見ていない一般論は入れないでください。
```

  (`readablePurposeForWebGeminiReview` は依頼目的の先頭有効行を返す。空なら「ショート動画を作成する」)

- **(d) 入力**: 依頼文 + 完成動画ファイルそのもの(Web UIのファイルアップロード。
  `DOM.setFileInputFiles` で input へ直接セット)。トランスクリプトも編集計画も渡していない —
  **Geminiは完成映像だけを見る**
- **(e) 出力とパース**: 自由文テキスト。`document.body.innerText` から依頼文以降を切り出すだけで、
  構造化パース・検証なし。backendの保存API(`POST /request-drafts/:id/web-gemini-review`,
  savedFrom=edge)で `state.json` に保存
- **(f) リトライ・ループ制御**: §4参照。反復は完全に人間駆動

### 2-D. 【削除済み】Geminiによるテーマ生成

現行コードのテーマ生成モードは `fixed | transcript` のみ(`ContentDiscoveryRuntimeMode`)でLLMを使わないが、
実行データ(`runtime/artifacts/draft_w4Lp9IJC6pQl3FsRfFL9t/`)には旧モード `gemini-api-theme-options` の
成果物(`themes.json`, `gemini-theme-options-response.json`)が残っている。旧モードはトランスクリプトから
Geminiにテーマ候補(タイトル・要約・代表発話ID)を生成させていた。「面白さの判断は人間がする。
AIは何があるかを説明する」という方針転換で削除された経緯があり、**切り抜き箇所の発見に再びLLMを使うか**は
今回の相談論点のひとつ。旧モード産テーマの実物(§5に関係):

```json
[
 { "id": "theme_1", "title": "歌うま企画に男気立候補したリオナ",
   "summary": "JPメンバーが決まらずに焦るペコラのもとへ、リオナが突然Discordで「男気立候補」をして救ってくれた熱い裏話。" },
 { "id": "theme_2", "title": "3D生配信中の極秘サイン「指ハート」",
   "summary": "配信中にどうしてもトイレに行きたくなったメンバーが、カメラに向けてこっそり行う裏ルール「指ハート」の面白い仕組みを暴露する。" },
 { "id": "theme_3", "title": "まつり「ぺこちゃん、私のこと嫌いなの？」",
   "summary": "楽屋から静かに逃げようとするコミュ障気味のペコラが、まつり先輩に「私のこと嫌いなの？」と捕まり、焦り倒す微笑ましいエピソード。" }
]
```

### 2-E. 【参考】ローカルSTTサーバー(LLMではない)

`run_stt` は外部のローカルSTTサーバー(本リポジトリ外、話者分離付き)へ音声を送る。プロンプトはなく、
パラメータは言語(`ja-JP`)のみ。応答は1文字=1セグメント粒度(§3, §5参照)。

---

## 3. データ構造(原文引用)

### トランスクリプト(runner/src/workflow-artifacts.ts)

```ts
export type SttSegment = {
  id: number;          // 発話ID。実データでは【1文字ごと】に振られる(§5参照)
  startMs: number;     // 元動画上の開始時刻
  endMs: number;       // 元動画上の終了時刻
  text: string;        // 実データでは1文字("生"、"配"、...)
  speaker?: string;    // 話者分離ラベル(SPEAKER_00等)。以降の工程では未使用
};

export type SpeechTimingRef = {
  id: number;              // SttSegment.id と同じ発話ID
  sourceStartMs: number;   // 元動画上の開始時刻
  sourceEndMs: number;     // 元動画上の終了時刻
  text: string;            // 発話テキスト
  speaker?: string;        // 話者ラベル(Geminiへは渡していない)
};

export type TranscriptArtifact = {
  kind: 'transcript_json';
  mode: TranscriptMode;              // 'zev-local-stt'(実STT) | 'zev-sample-stt'(固定)
  sourceUri: string;                 // 元動画の参照
  sampleSource?: { ... };            // 固定データの出所メタ(省略)
  notes: string[];                   // 人間向け注記
  generatedAt: string;
  language: string;                  // 'ja' 等
  durationSec: number;               // 元動画の長さ
  segmentCount: number;              // 発話(=文字)数。実データで3万超
  segments: SttSegment[];            // 全発話
  speechUnitGroups: number[][];      // 発話IDのまとまり。無音1.2秒超 or 話者交代で分割、句点で確定
  themeSeeds?: TranscriptThemeSeed[]; // 固定テーマの種(fixedモード用)
};
```

### テーマ候補と切り口(同ファイル)

```ts
export type ThemeArtifact = {
  kind: 'theme_json';
  mode: 'sample-theme-options' | 'transcript-content-options';
  generatedAt: string;
  sourceUri: string;
  themes: Array<{
    id: string;                        // テーマID(人間が選択する単位)
    title: string;                     // テーマ名
    summary: string;                   // 概要(UIに表示)
    representativeText: string;        // 代表発話の連結テキスト
    representativeSpeechIds: number[]; // 代表発話ID
    relatedSpeechIds: number[];        // このテーマに関係する発話ID(切り口の材料)
    whyItCanBeClipped: string;         // 切り抜ける根拠の説明
    compositionNote: string;           // 選択後にどう構成するかのメモ
    evidenceRefs: ControlReference[];  // 人間確認UIに出す根拠参照
  }>;
};

export type ClipCompositionArtifact = {
  kind: 'composition_json';
  mode: 'transcript-multi-part-composition';
  generatedAt: string;
  sourceUri: string;
  selectedThemeId: string;    // 人間が選んだテーマ
  title: string;
  themeSummary: string;
  sourceStartMs: number;      // 全断片の最小開始
  sourceEndMs: number;        // 全断片の最大終了
  parts: Array<{
    id: string;                   // part_1, part_2, ...
    sourceStartMs: number;        // 断片の元動画時間範囲
    sourceEndMs: number;
    role: string;                 // 導入 / 展開 / 結論(位置から機械的に付与)
    transcriptText: string;       // 断片の文字起こし連結
    speechIds: number[];          // 断片が含む発話ID
    speechUnits: SpeechTimingRef[]; // 発話ごとのタイミング(テロップ同期の正本)
    connectionNote: string;       // つなぎの意図メモ
  }>;
  assemblyPlan: string;       // 構成方針テキスト(探し直し指示が追記されることがある)
};
```

### 演出計画(同ファイル + runner/src/screen-layout.ts)

```ts
export type EditPlanArtifact = {
  kind: 'edit_plan_json';
  mode: 'gemini-api-edit-plan' | 'sample-edit-plan';
  generatedAt: string;
  selectedThemeId: string;
  title: string;              // Gemini生成の動画タイトル
  hookText: string;           // 冒頭フック文言(48文字上限)
  sourceStartMs: number;
  sourceEndMs: number;
  geminiApiInput: Array<{ sourceUri: string; sourceStartMs: number; sourceEndMs: number; purpose: string }>;
                              // Geminiへ送った断片の記録(監査用)
  renderSegments: Array<{
    sourceStartMs: number;
    sourceEndMs: number;
    role: string;
    caption: string;              // 断片単位の短い説明テロップ
    speechIds: number[];
    speechUnits: SpeechTimingRef[];
    screenLayout: ShortsScreenLayoutPlan;  // 下記。確定済み表示枠
  }>;
  telopPlan: Array<{
    sourceSpeechIds: number[];  // このテロップが対応する発話ID列(表示タイミングの唯一の根拠)
    text: string;               // 表示文言
    role: string;               // 表示意図(状況説明、リアクション等)
  }>;
};

export type ShortsScreenLayoutPlan = {
  screenLayoutId: ShortsScreenLayoutId;  // 'speaker_only' | 'screen_speaker' | 'speaker_pair'
  detections: ShortsRawScreenDetections; // Geminiが申告した検出範囲([ymin,xmin,ymax,xmax] 0..1000)
  viewports: Partial<Record<ShortsViewportKey, ViewportCoords>>; // 確定したcrop範囲(プログラム計算)
  displaySummary: string;                // 人間向け説明
  selectedCandidateId?: string;          // Geminiが選んだ候補ID
  candidateSummary?: string;
  selectionReason?: string;              // 候補選択の理由(Gemini申告)
  candidateOptions?: ShortsScreenLayoutCandidate[]; // 提示した候補一覧(監査用)
};
```

### Web Geminiレビュー(packages/shared/src/web-gemini-review.ts)

```ts
// 下書きごとのWeb Geminiレビュー一式。state.jsonが正本で、artifacts配下のファイルは人間確認用の書き出し
export interface WebGeminiReviewState {
  draftId: string;
  review: WebGeminiReviewArtifact | null;         // レビュー本文
  revisionBrief: WebGeminiRevisionBriefArtifact | null; // 人間が確定した再生成方針
  runLog: WebGeminiReviewRunLog | null;           // 実行状態
  promptText: string;                              // 送った依頼文
  updatedAt: string;
}

export interface WebGeminiReviewArtifact {
  draftId: string;
  source: 'edge-web-gemini';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;   // どの完成動画へのレビューか(整合チェックに使用)
  promptText: string;
  reviewText: string;       // Geminiの自由文レビュー全文
  instructionText: string;  // UI向け操作説明
}

export interface WebGeminiRevisionBriefArtifact {
  draftId: string;
  source: 'human-approved-web-gemini-review';
  status: 'ready';
  createdAt: string;
  outputVideoUri: string;
  reviewCreatedAt: string;  // 対応するレビューの作成時刻(ずれ検出用)
  briefText: string;        // 人間が「今回採用する変更だけ」に絞った方針文
}
```

### 全体状態(packages/shared/src/index.ts)

```ts
export interface Zev2State {
  requestDrafts: RequestDraft[];          // 依頼(1本のショート動画=1 draft、やり直しで複製)
  agentRequests: AgentRequest[];          // 工程実行単位(7工程×draft)
  fileRefs: FileRef[];                    // 成果物ファイル参照
  outputs: OutputEntity[];                // 完成物
  agentOperationLogs: AgentOperationLog[]; // API操作の監査ログ
  decisionLogs: DecisionLog[];            // AIの判断+根拠参照
  controlReviewItems: ControlReviewItem[]; // 人間確認ゲート
  humanReviewActions: HumanReviewAction[]; // 人間の承認/差し戻し
  finalReviewActions: FinalReviewAction[]; // 完成動画への最終判断
  webGeminiReviews: WebGeminiReviewState[]; // Web Geminiレビュー(上記)
}
```

---

## 4. Web Geminiレビューループの詳細

### 依頼文の生成

`buildWebGeminiReviewPromptText()`(§2-C全文)を、レビュー準備API
(`POST /request-drafts/:id/web-gemini-review/prepare`)が呼んで固定生成する。
可変部分は「動画の目的」1行のみ(依頼作成時の purpose 先頭行)。動画内容に応じた動的な調整はない。

### 実行フロー

1. UI「Geminiで演出レビューを依頼」→ prepare API が依頼文と実行ログ(status=prepared)を作る
2. `scripts/web-gemini-review-edge.mjs --execute` が Edge を CDP で操作:
   gemini.google.com を開く → output.mp4 をファイルアップロード → 依頼文を送信 →
   応答完了を `document.body.innerText` のポーリングで待つ → レビュー本文を切り出し
3. スクリプトは進行状態を run-status API(running/blocked/failed)、本文を保存API(savedFrom=edge)で
   backend に渡す(ファイル直書きなし)。ブロック時(ログイン要求等)は blockedReasons を残して人間に委ねる
4. 人間がUIでレビュー全文を確認し、**「今回採用する変更だけ残す」形で再生成方針(revisionBrief)を編集**して確定

### 反映(再生成)の方法

反映API(`POST /request-drafts/:id/apply-web-gemini-review`)が、確定方針から次のやり直し理由文を組み立て
(`backend/src/web-gemini/routes.ts` の `webGeminiReviewRestartReason()`、原文):

```
Web Geminiの演出レビューを確認し、人間が確定した方針で演出作成前から作り直す
レビュー対象動画: ${review.outputVideoUri}
レビュー保存日時: ${review.createdAt}
再生成方針の確定日時: ${revisionBrief.createdAt}

人間が確定した再生成方針:
${revisionBrief.briefText}
```

これを理由に **create_edit_plan からの編集コピー**(新draftへ複製、[1]〜[4]の成果物は引き継ぎ)を自動作成し、
runnerを起動する。この理由文は新draftの purpose に入るため、§2-Aプロンプトの「依頼目的:」行を通じて
**Geminiレビュー由来の方針が次回の演出案作成プロンプトへ届く**(これが唯一のフィードバック経路。
レビュー原文や具体的な発話ID対応は構造化されて渡らない)。

### 終了条件

自動の反復はない。1周 = 「レビュー→人間が方針確定→再生成」で、続けるかは毎回人間が決める。
機械的な停止条件は次の2つだけ:
- 同じレビューの再反映は409(runLog.status=applied ガード)。もう一度回すにはレビューの取り直しが必要
- 完成動画に final_complete(作業完了)を記録すると、その動画への変更操作はすべて拒否される

### 平均反復回数

**実測データなし。** 現在の state.json にはレビュー保存1件・反映0件しかなく、ループを最後まで
回した実績がまだない(レビュー取得の自動化と正本管理を直近で作り終えたところ)。評価基盤の相談では
「反復回数を測る仕組み自体がない」ことを前提にしてほしい。

---

## 5. 現状の品質問題(実物の失敗例)

前提: 実際にWeb Geminiに保存された唯一のレビュー(2026-07-04、draft_HB5zdd5lDOOSRJDhmfb1z の
output.mp4 に対するもの)が、品質問題の実物リストになっている。題材はホロライブ配信の
「トイレに行きたくなったら指ハート」の切り抜き(2断片、screen_speaker=上:手描きイラスト画面/下:話者)。

### 例1: テロップが話者の顔・見せ場のドアップに重なる

Geminiレビュー原文(抜粋):

> 2. 話者の顔および重要情報とテロップの重複回避
> 変えること：0:07〜0:11付近の「トイレのマークが指ハート / 指ハートわかるっしょ」のテロップ位置を、(中略)移動、または画面パターンを調整して重なりを防ぐ。
> 理由：現状の配置では、話者の顔のパーツ（口元や顎）にテロップの文字が完全に被ってしまっています。
>
> 4. ズーム演出時のテロップ位置・サイズ調整
> 変えること：0:19付近の「指ハートしてくださいって」で話者の顔が大きくズームアップされる際、テロップを話者の「目・鼻・口」に被らない位置(中略)へ即座に退避させる。
> 理由：最も見せたいはずの「見開いた目」や「開いた口」の真上に大きなテロップが重なってしまっており、表情の面白さが半減しています。

入力側(該当部分の edit-plan.json):

```
telopPlan(抜粋): { sourceSpeechIds: [8143..8161], text: "トイレのマークが指ハート" }
                 { sourceSpeechIds: [8222..8234], text: "指ハートしてくださいって" }
renderSegments:  { role: "結論", layout: "screen_speaker", selectedCandidateId: "screen_speaker_face" }
```

構造的な原因: テロップ配置は `telop-placement.ts` が検出範囲(face/body)から「顔を避ける安全域」を
静的に1回計算するだけで、**断片内の動き(顔のズームアップ)に追従しない**。検出範囲は断片ごとに1組しかなく、
時間変化する顔位置という概念がデータ構造(§3 `ShortsScreenLayoutPlan.detections`)に存在しない。

### 例2: 見せているもの(手描きイラスト)の中心をテロップが覆い続ける

Geminiレビュー原文(抜粋):

> 3. イラスト解説シーンにおける画面パターンとテロップ配置の変更
> 理由：0:14〜0:30付近にかけて、話者が一生懸命描いている「指ハートの図面」のまさに描いている中心部分に「こういう感じね」「誘導できるので」「何かあったら指ハート」といった大きなテロップが居座り続けています。これでは初見の視聴者が「何を描いているのか」を視覚的に理解できません。

入力側: telopPlan の該当3件(発話ID 8188〜8281)は screen 側に配置されたが、「screen のどこに
意味のある絵があるか」という情報がない。detections.screen は「画面全体」の矩形だけで、
画面内の注目領域(描いている場所)を検出・回避する仕組みがない。プロンプト(§2-A)も
「screen は、その断片で見えている画面全体です」としか要求していない。

### 例3: テロップの区切りが長すぎる/表示が発話に先行する

Geminiレビュー原文(抜粋):

> 1. テロップの表示タイミングおよび配置の最適化
> 変えること：0:00〜0:03付近の「生配信の途中で / トイレ行きたくなる人 / っているじゃん」のテロップについて、1行の文字数を減らすか、発話の細かな区切り(中略)に合わせて表示・消去のタイミングをよりタイトに分割する。
> 理由：現状では1フレーズの文字数が多く、かつ発話が始まる前に次のテロップが先行して表示されてしまっている部分があるため、視聴者が一瞬置いてきぼりになる感覚を与えます。

入力側の実物。まずSTTは1文字=1発話IDで返る(transcript.json、元動画1714秒付近):

```json
{ "id": 8083, "startMs": 1714337, "endMs": 1714357, "text": "生", "speaker": "SPEAKER_02" },
{ "id": 8084, "startMs": 1714357, "endMs": 1714657, "text": "配", "speaker": "SPEAKER_02" },
{ "id": 8085, "startMs": 1714657, "endMs": 1715118, "text": "信", "speaker": "SPEAKER_02" },
{ "id": 8086, "startMs": 1715118, "endMs": 1715298, "text": "の", "speaker": "SPEAKER_02" }
```

これに対し Gemini API 産の演出案(draft_w4Lp9IJC6pQl3FsRfFL9t、mode=gemini-api-edit-plan)のテロップは:

```
{ sourceSpeechIds: [8083〜8123 の41 ID], text: "生配信の途中でやっぱトイレ行きたくなる人とかってやっぱ出てきちゃう可能性あるじゃん" }  ← 40文字1テロップ
{ sourceSpeechIds: [8235〜8258 の24 ID], text: "指ハートしてくれたらあの私誘導できるのでみたいな" }
```

プロンプトは「意味の区切りごとに複数のtelopPlanへ分けて」と要求しているが、検証
(`normalizeGeminiTelopPlan`)が拒否するのは「断片全体を丸ごと1テロップ」だけで、
**40文字級のテロップは素通りする**。表示タイミングは「先頭発話IDの開始時刻」なので、区切りが粗いと
発話とテロップの同期が体感でずれる。フィラー(「やっぱ」「あの」)がそのまま入る問題も同根
(STT原文をほぼ連結しており、テロップ用の文言整形をLLMがしていない)。

### 補足: 上流(テーマ・切り口)の品質

上の3例はすべて演出(下流)の問題だが、外部レビュー(docs/chatgpt-review-content-selection-20260627)では
「何を切り抜くか」の上流も課題として挙がっている。現行のテーマ生成はLLM不使用の機械分割(§2-D)で、
「面白い箇所の発見」はテーマ候補の列挙精度に完全に依存している。旧Geminiテーマ生成(§2-Dの実物)は
タイトル・要約の質は高かったが、面白さ判断をLLMに委ねる懸念で削除された。ここをどう設計し直すかが
プロンプト相談のもう1つの論点。

---

## 6. 未使用だが取得可能なデータ

今はどのプロンプトにも渡していないが、取得手段があるもの:

| データ | 取得手段 | 現状 | 想定用途 |
|---|---|---|---|
| YouTubeチャットリプレイ | yt-dlp のライブチャット取得(`youtube_live_chat` ダウンローダ)。動画取得は既にyt-dlp | 未取得 | 盛り上がり箇所の検出(コメント密度・草の量)→テーマ候補のスコアリング、見せ場の根拠 |
| 話者ラベル(speaker) | STT応答に含まれ transcript.json に保持済み | 保持のみ。speechUnitGroups の分割にだけ使用し、Geminiプロンプトの発話行には**入れていない** | 誰の発言かをテーマ・テロップ生成に伝える(speaker_pair判断、リアクション帰属) |
| 話者分離の信頼度 | STT応答の `speakerConfidence` / `speakerCandidates`(重なり秒数付き) | 正規化時に**捨てている**(`normalizeSegments`が拾わない) | 話者交代検出の精度向上、被り(同時発話)=盛り上がりの検出 |
| 音声特徴量(音量・笑い・ピッチ) | source-audio.flac は STT用に抽出済み。ffmpegで音量系列は取れる(現在 volumedetect を無音検査だけに使用) | 未使用 | 叫び・笑いのピーク検出→切り抜き候補、テロップ強調スタイルの自動選択 |
| 元動画の全体映像 | 手元にある(source-video.mp4) | Geminiへは選択断片の640pxクリップのみ送信 | 断片外の文脈把握。ただしトークン・料金と要相談 |
| 配信メタデータ(タイトル・チャプター・概要欄) | yt-dlp の info JSON | 未取得 | テーマ候補の事前知識(企画名、出演者) |
| 完成動画の視聴指標 | 投稿後のYouTube Analytics | 対象外(投稿は手動) | 評価基盤の教師信号になり得るが、現段階では未接続 |

評価基盤の現状: 自動評価は存在しない。品質の判定手段は「人間確認ゲート3箇所 + 完成動画への人間の最終判断 +
Web Geminiレビュー(自由文)」のみで、生成物を採点する数値指標・回帰テスト・ゴールデン出力は未整備。
決定ログ(decisionLogs)と成果物(Gemini応答の生JSONを含む)は全件保存しているため、
評価データセットの材料は残っている。

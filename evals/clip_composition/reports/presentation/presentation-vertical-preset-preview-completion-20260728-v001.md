# 縦型ショート preset候補 preview 完了報告 v001

日付: 2026-07-28

対象: 宝鐘マリン Liar's Bar / `qdczJpv8RCc` / candidate 59

状態: **候補previewの製造と事前検査まで完了。正式presetへの昇格、正式描画経路への接続、縦型完成動画は未実施。**

## 1. 結論

縦型ショートの画面構成、文字造形、安全領域、行幅、タイトルと字幕の重ね方を、1本の実描画MP4と5判断ページで確認できる状態にした。

- preview: 1080×1920 / 30fps / 音声付き / 41.866016秒
- 比較内容: 文字96 / 79 / 74px、行幅16 / 20 / 24、安全領域A / B、タイトル上＋字幕下
- 画面構成: 旧crop方式が選んだ「上=元画面、下=話者全体」
- 人間作業: 1ページで5判断
- 正式preset昇格: **未承認**
- candidate 13 / 59の正式成果物: **520件すべて作業前から不変**

確認先:

- 5判断ページ: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview/review.html`
- preview MP4: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview/vertical-preset-review-v001.mp4`
- preview manifest: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview/preview-manifest.json`
- 事前検査: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview/preflight.json`

## 2. 旧crop資産の棚卸し

### 2.1 現存する3型

| 旧layout | 内容 | candidate 59での扱い |
|---|---|---|
| `speaker_only` | 話者だけを縦全画面に置く | 候補生成は可能だが今回は不採用 |
| `screen_speaker` | 上に画面、下に話者を置く | Geminiが選択した |
| `speaker_pair` | 話者2人を上下に置く | candidate 59は単一話者のため不採用 |

crop、scale、viewportの計算正本は`runner/src/screen-layout.ts`にあり、今回のpreviewもその計算を呼んだ。別のcrop計算は作っていない。

### 2.2 旧Gemini promptと入出力

使用したpromptは`runner/src/steps/edit-plan.ts`内の次の2関数である。

1. `buildGeminiEditPlanPrompt`
   - 入力: candidate 59の発話・時間情報、640px化した実動画
   - 出力: 画面型、画面範囲、話者の顔・全身範囲
2. `buildGeminiCandidateSelectionPrompt`
   - 入力: 機械計算したcrop候補の意味と実静止画
   - 出力: 採る候補IDと理由

現行sourceの関数本文を読み取り、TypeScriptの引数型だけを除いて同じ本文を実行した。prompt本文の変更は0件である。

promptと生応答は次へ保存した。

`evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/legacy-crop/`

### 2.3 実走結果

| 項目 | 結果 |
|---|---|
| model | `gemini-3.6-flash` |
| 生成呼出し | 2回 |
| 自動再試行 | 0回 |
| 選択layout | `screen_speaker` |
| 選択候補 | `screen_speaker_body` |
| 選択理由 | 下半分の話者で顔・衣装が切れず、自然に収まる |
| 推定費用 | US$0.0324915 |
| 実請求額 | 未確認 |
| 承認上限 | US$0.50 |

1回目は入力6,772 token、出力469 token、思考1,591 token。2回目は入力2,559 token、出力64 token、思考342 tokenだった。Standard単価の保存済み基準で計算し、思考tokenを出力側へ含めた。

2応答取得後、報告組立の変数名誤りで最初の処理が停止した。生応答を保存したまま、追加通信0回で判断成果物だけを復旧した。失敗記録も削除していない。

### 2.4 接続上の限界

今回のcrop runnerは、**一回限りの診断・preview製造用**であり、正式な縦型production入口ではない。

- crop候補の計算は既存正本を共用している。
- prompt本文は現行source由来だが、正式関数のimportではなくsource本文を抽出して実行した。
- API要求の組立、応答検査、候補静止画の製造は今回のrunner内にある。
- 固定出力先の衝突防止や、費用の通信前強制停止は正式運用水準ではない。

したがって、今回の結果をそのまま正式レンダラーへ接続しない。人間認定後に、共有入口と版付き契約を設計する。

## 3. 縦型preset候補

候補は正式台帳外の`vertical-preset-v001-candidate`として扱う。

### 3.1 文字造形

| 候補 | 文字 | 縁 | glow | 機械的な位置づけ |
|---|---:|---:|---:|---|
| 横型値 | 96px | 8px | 12px | 縦型の安全領域A/Bから外れる比較例 |
| B内最大 | 79px | 7px | 10px | 安全領域Bに収まる最大整数サイズ |
| A内最大 | 74px | 6px | 9px | 安全領域Aに収まる最大整数サイズ |

fontは横型で認定済みのLINE Seed JP ExtraBoldを使った。79pxと74pxは、正本描画処理で96pxから1pxずつ下げて全探索し、各安全領域へ収まる最大整数を採った。縁とglowは、認定済み96 / 8 / 12の比率を対象文字サイズへ適用して整数丸めした。

この機械的な収まりは見た目の認定ではない。どの文字造形がよいかはQ2で人間が決める。

### 3.2 安全領域

| 候補 | 上下 | 左右 | 由来 |
|---|---:|---:|---|
| A | 40px | 80px | 横型の人間認定済み絶対pixel余白 |
| B | 38px | 43px | 現行の正本描画処理が使う画面余白を1080×1920で再導出 |

A/Bは文字位置を変えていない。同じ描画に、QCで守る境界だけを重ねた比較である。配信先アプリのUI安全領域との適合は未確認。

### 3.3 行幅

行幅上限16 / 20 / 24を、candidate 59の実字幕で比較した。

| 上限 | 実字幕例 |
|---:|---|
| 16 | `あ、さあ船長さあ` |
| 20 | `でぐるぐる回りながら` |
| 24 | `何かやってる最中でもさあ` |

数値は品質目標ではなく、長すぎる1行を止める保険候補である。意味の切れ目と読みやすさの最終判定はQ4で人間が行う。

### 3.4 タイトルと字幕

preview用固定タイトルを上、発話字幕を下へ配置した。

`マリンのADHD的？な片付け事情と無意識の脱衣`

74px候補では、タイトルと字幕の実文字領域に正の交差は0件だった。タイトル内容の自動生成は今回の対象外であり、タイトル本文を正式正解とは扱わない。

## 4. 5判断ページ

1ページ内で次を判断できる。

| 問 | 判断内容 |
|---|---|
| Q1 | 旧LLM cropが選んだ上下構成でよいか、人間cropへ差し戻すか |
| Q2 | 96 / 79 / 74pxのどの文字造形がよいか |
| Q3 | 安全領域A / Bのどちらがよいか |
| Q4 | 行幅16 / 20 / 24のどれがよいか |
| Q5 | タイトル上・字幕下の重ね方でよいか |

9つのチャプターボタンで該当場面へ移動できる。5問が揃うまで結果コピーは有効にならない。

現在必要な人間作業は、**5判断・1ページ・1セッション**だけである。動画は41.866016秒。判断全体は過去の横型preset認定時と同じ5〜10分を事前目安にするが、今回の実測時間ではない。時間計測は求めない。

## 5. 機械検査と目視QA

### 5.1 合格した検査

- TypeScript全体検査: 合格
- preview manifest状態: `ready_for_five_human_judgments`
- 1080×1920 / 30fps: 合格
- 期待1,256 frame: 合格
- 音声48kHzの存在: 合格
- 文字・縁・glowの欠落: 0件
- 行の正の交差: 0件
- タイトルと字幕の正の交差: 0件
- 安全領域候補の想定分類: 96pxはA/B外、79pxはB内、74pxはA内
- ガイドの透明背景: 合格
- preview成果物へのAPI key完全一致混入: 0件
- 正式資産の作業前後照合: 520 / 520一致
- 確認ページ: Q1〜Q5、9チャプター、参照先3件、結果コピー条件を確認

preview MP4:

- SHA-256: `1613b1afaf8d677182d38884013000273f5be82535cd2bc577f014195ebdd528`
- 再生時間: 41.866016秒
- 映像: H.264 / 1080×1920 / 30fps
- 音声: AAC / 48kHz

### 5.2 目視した点

- 96px比較では左右の欠けが分かる。
- 74px・79pxでは縁とglowを含めて文字が収まる。
- 安全領域A/Bの破線は透明背景で、映像を白く覆わない。
- タイトルと字幕は上下で衝突しない。
- 上段の元画面、下段の話者全体が動画内容を残したまま見える。

これはエージェントの製造QAであり、人間の美的認定ではない。

## 6. 最短工程と人間作業

| 工程 | 現在地 | 人間作業 |
|---|---|---|
| 1. 画面構成の決定 | Q1用の実物まで完成 | Q1の1判断。下記5判断に含む |
| 2. preset preview製造 | 完了 | 0件 |
| 3. 人間認定 | 次の作業 | 合計5判断。既申告目安5〜10分、実測不要 |
| 4. 合成層実装 | 未着手。認定後に別設計 | 着手承認1判断。回答時間は未測定 |
| 5. 縦型一本 | 未着手 | 完成動画の目視1判断。視聴尺は生成後に実測 |

5判断で修正が出た場合は、該当する候補だけを別版previewへ直す。認定前の値を正式台帳、正式job、正式成果物へ混ぜない。

## 7. 事実・推測・未確認

### 事実

- 旧crop 3型と2本のpromptを棚卸しした。
- candidate 59に対してGeminiを2回実行し、`screen_speaker_body`を選択した。
- 推定費用US$0.0324915は承認上限US$0.50以内である。
- 実描画MP4と5判断ページを生成した。
- preview製造中の追加API通信は0回である。
- 正式asset 520件は不変である。

### 推測・提案

- 上に元画面、下に話者を置き、さらにタイトル上・字幕下を重ねる構成は、candidate 59の情報量と顔の見やすさを両立する候補である。
- 74pxまたは79pxが縦型の初期文字サイズ候補になり得る。
- 人間認定後は、既存のcrop・文字描画計算を共有入口から呼ぶ合成層が最短接続になる。

### 未確認

- 5候補判断の人間回答。
- 実際に請求されたAPI費用。
- 配信先アプリUIと安全領域A/Bの衝突。
- 正式縦型契約、preset registry、信頼binding、renderer、QCへの接続。
- 縦型完成動画での全編目視品質。

## 8. 停止点

ここで停止する。

- 正式preset昇格: 0件
- 正式動画生成: 0件
- candidate 13 / 59正式成果物の変更: 0件
- 追加外部通信: 0回
- 次に必要な人間作業: 5判断

# 縦型・動画種類別crop 完了報告 v001

- 日付: 2026-07-28
- 対象: `qdczJpv8RCc` candidate 59
- 目的: 固定の上下構成を全動画へ当てず、動画の種類を先に判別してから、その種類に対応するcropを選ぶ

## 事実

- 動画種類は `speaker_only / screen_speaker / speaker_pair` の3型へ閉じた。
- Web Geminiはcandidate 59を`一人トーク（speaker_only）`と判定した。
- 判定理由は「装飾枠・コメント欄・小さな静止パネルはあるが、場面理解に必要な独立映像はなく、話者単体が主役」である。
- `speaker_only`専用の2候補だけを生成し、Web Geminiは`人物全体の中心を優先`する候補を選んだ。
- 選択済みcrop決定のSHA-256は`4fba3f371412310fc5122ccfb58634e390a5725aec185172bcf041dd0152a4ed`。
- 新しい確認MP4は1080×1920、30fps、1,256 frame、41.866016秒、48kHz・2ch音声で生成した。
- 確認MP4のSHA-256は`cffca082673f67b5b7a353c61744922caffa6b0d98b9b2a2fadb155b948092bf`。
- 旧`screen_speaker`版は誤分類の診断記録として変更せず保持した。旧MP4のSHA-256は`1613b1afaf8d677182d38884013000273f5be82535cd2bc577f014195ebdd528`。
- 正式成果物の既存SHA照合は520/520一致、変更0件だった。

## 実装した処理

- 種類判別を検出座標より先に行い、独立したゲーム・共有画面等が本当に必要な場合だけ`screen_speaker`を選ぶpromptへ変更した。
- 背景・コメント欄・装飾・小さな静止パネルだけを独立画面として数えない。
- 同じ話者を含む元画面全体と話者を、上下へ重複表示しない。
- 種類ごとに必要な対象だけを検出し、その種類のcrop候補だけを生成する。
- `speaker_only`では、顔中心と人物全体中心の9:16候補を作り、候補画像から1つを選ぶ。
- 既存のcrop計算と描画処理を正本として再利用し、候補生成用と完成描画用で別計算を作っていない。

## 検査結果

- TypeScript型検査: 合格。
- 種類判別prompt契約: 10/10合格。
- `speaker_only` cropと既存2型の回帰: 9項目すべて合格。
- 新MP4: 寸法、fps、frame数、尺、音声形状、入力overlay SHAをすべて合格。
- 新しい描画段の外部通信: 0回。
- Web Geminiの観測は、動画分類3 attempt（うち最初の2件は保存処理の不成立記録）とcrop候補選択1 attempt。v006は同一byteの有効分類結果を再利用し、分類通信を追加していない。

## 推測

- candidate 59を`screen_speaker`ではなく`speaker_only`へ分類した結果は、「ゲーム画面がなく一人だけなので上下にする意味がない」という人間の判断と整合する。

## 未確認

- 最終的な見た目の自然さは人間の目視が正本である。
- 現在の閉じた3型で、別種類の縦型素材を十分に網羅できるかは未確認。
- 今回の確認MP4は既存の字幕比較sceneを再利用したもので、完成ショート全編ではない。

## 人間にお願いすること

- 1件だけ: 新しい確認ページの動画を見て、人物が自然に収まり、意味のない上下分割が消えたことを確認する。

## 成果物

- 確認ページ: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v002/review.html`
- 確認MP4: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v002/vertical-type-crop-review-v002.mp4`
- crop決定: `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006/crop-decision-v006.json`

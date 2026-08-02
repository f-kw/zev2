# candidate 59 縦型 `thoughtSignature`改訂後B6実走・B4停止報告 v001

日付: 2026-08-02  
対象: `qdczJpv8RCc` candidate 59 縦型一本

## 結論

`thoughtSignature`を生応答だけに保存する契約改訂は機能し、新しいGemini応答はB6とB1を通過した。B4は表示計画を作る前の意味入力再構築で拒否したため、承認済み停止条件に従って描画へ進まず停止した。完成mp4はまだない。

## 事実

### 契約改訂

- 本文partは、非空`text`だけ、または非空`text`と非空文字列`thoughtSignature`の組だけを受理する。
- keyの並び順には意味を持たせない。
- `thoughtSignature`は生応答だけに残し、意味回答・B1・B4・manifestへ渡さない。
- 未契約key、空または非文字列の`thoughtSignature`、`text`欠落は拒否する。
- 旧attemptの生応答と拒否記録は変更していない。

検査結果:

- B6共有入口: 10/10合格。
- B6正式job経路: 14/14合格。
- 横型candidate 13のB6二層回帰H03: 1/1合格。

### 新attempt

- job: `evals/clip_composition/outputs/presentation/caption-gate-b6-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b6-v002.json`
- job SHA-256: `5ea0d98c4e1c186df3b8cae223ee5d98073dc5d2eb4df2d520cda02c7f6db647`
- 固定request SHA-256: `6113191c82f2065d4b0c71f8530dea925c36e31d92fcb0642a0faf58a86d7e83`
- Gemini生成: 1回。
- 自動再試行: 0回。
- HTTP: 200。
- 応答model表記: `gemini-3.6-flash`。
- service tier観測: `standard`。
- 生応答: `evals/clip_composition/outputs/presentation/caption-gate-b6/qdczJpv8RCc-candidate-59-vertical-v002/generate-content-response.raw.json`
- 生応答SHA-256: `476c4d4e6a2e944354e0509530f0e9131af991259e803e2c7fcecef408541c65`
- 生応答は解析前に保存した。
- 不透明メタデータ固有byteは、生応答以外の6成果物で0件だった。

usage:

- 入力: 7,474 token。
- 回答本文: 1,425 token。
- thinking: 5,321 token。
- 合計: 14,220 token。
- 今回の公式Standard単価による使用量ベース見積り: US$0.0618060。
- 拒否済み初回attempt: US$0.0617085。
- 2 attempt累計見積り: US$0.1235145。
- 実請求額は未確認。

### B1とB4

- B1: 合格。
- 意味回答SHA-256: `944c1bbf4d150c67252af5901660ff12e58d0956daf5abae2466654d17c1d08d`。
- B1検査報告SHA-256: `b2342ad39eb2e6c0519337925aa8505875d8a8372919f7a95a814613041de826`。
- B4: 拒否。
- failure stage: `displayPlan`。
- 違反code: `SEMANTIC_COMPILER_REBUILD_FAILED`。
- B4報告SHA-256: `faccccff17bf3c1251ca5bd5c128f0350c6fd8a1b6139fd84292c9dfe0d7adbc`。
- 表示計画・指示書・配置検査・描画依頼は生成されていない。
- 描画とQCは0回。
- B6 manifest SHA-256: `09f1ef9bbcda6407674c35342e9f4a79761013041c23530472d77ee938d35a1e`。

### 不変確認

- candidate 13横型正式成果物: 95 path、tree SHA-256 `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`、認定tagから不変。
- candidate 59横型正式成果物: 91 path、tree SHA-256 `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`、認定tagから不変。

## 推測

なし。B4報告は再構築失敗の内側理由を空のdetailsでしか残しておらず、原因をこの記録から断定できない。

## 未確認

- `SEMANTIC_COMPILER_REBUILD_FAILED`の内側原因。
- 実請求額。
- 完成字幕の見た目と聴こえ方。mp4未生成のため人間目視対象はない。

このB4報告は、内側理由が上位報告へ透過されない既知のfatal観測性残件と同じ弱さを再度示した。ただし本報告では観測性契約を改訂しない。

## 人間作業

今回の必須人間作業は0件。次に進める場合の最小作業は、保存済み成果物だけを使ったB4再構築失敗の読み取り診断であり、API通信・費用・人間確認はいずれも0件である。

# candidate 59 縦型 B4再構築・正式描画 fatal停止報告 v001

日付: 2026-08-02  
対象: `qdczJpv8RCc` candidate 59 縦型一本

## 結論

案Aの限定修正と回帰は合格し、保存済みB1合格物からの正式B4再実行も合格した。表示計画は30まとまり・51行、最大論理幅14、正の時間重なり0件である。

その表示計画を既存の正式縦型レンダラーへ渡したところ、描画開始前後のどの段階かを示さない固定`fatal`で終了2となった。完成mp4と描画後QCは生成されていない。同じ実行点で修正・再試行せず停止した。

## 事実

### 案Aと回帰

- B4正常経路を含む検査: 13/13合格。
- 横型統合回帰: H01〜H06 6/6合格。
- B4本体SHA-256: `5cf01b4e4dc36b84be9b6938026be5849b61c0a28656d7864f8b5fd6c3991036`。
- B4 runner SHA-256: `c35e02a06a317e33613c16e8cd363805169040b16eef12344eb567e9b7357794`。

### 正式B4

- 新job: `evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v001.json`
- job SHA-256: `107d3b9a26bde567d998c364c42264164976a904bf6be4371ae026b8f5bb7900`。
- 実行回数: 1回。
- 終了コード: 0。
- 検査: 9/9合格、違反0件、状態`passed_pending_human_review`。
- 検査報告SHA-256: `655295fb98395c987d6780777c4368a681e86772af8bda1ce875328e31389562`。
- 表示計画SHA-256: `77459b6c86d964a9c750e6395e48a334a9843e83d95b1c27c0ae8365117e8d88`。
- 描画依頼SHA-256: `795811a4f62333d6965fa62b3ba816d6059b4a2a3a8cba35a44a139fb1a2e14e`。
- 281文字、2発話まとまり、30意味まとまり、30字幕、51行。
- 最大論理幅14、上限14、最大2行。
- 字幕の正の時間重なり0件。
- `speaker_only`、正式speaker-onlyプリセット、crop v006、基礎映像の対応は一致。

### B6来歴の閉じ方

- 既存B6 manifest SHA-256: `09f1ef9bbcda6407674c35342e9f4a79761013041c23530472d77ee938d35a1e`。
- 同manifestは当初B4不受理の履歴として不変のまま保持した。
- manifestを書き換えず、保存済みB1合格物、新B4 job、新B4検査報告、表示計画を本報告でSHA束縛した。これはcandidate 59横型の再検査前例と同じ記録閉包である。
- manifest自身を成功状態へ改変したとは主張しない。

### 正式縦型描画

- render job: `evals/clip_composition/outputs/presentation/vertical-review-render-jobs/qdczJpv8RCc-candidate-59-vertical-caption-b4-rebuild-v001.json`
- render job SHA-256: `fd4061c53dbfbe742d69443c54c62e83475c66eab401040828c7f821a51930dc`。
- 事前照合: job schema合格、実装29/29一致、実行tool 7/7一致。
- 正式実行回数: 1回。
- 終了コード: 2。
- stdoutは`presentation-formal-runner-fatal-v001`、`VERTICAL_RENDER_V001_RUNNER_FATAL`だけだった。
- 生stdout保存先: `evals/clip_composition/outputs/presentation/diagnostics/qdczJpv8RCc-candidate-59-vertical-render-fatal-20260802-v001/renderer-output.raw.json`
- 生stdout SHA-256: `f23ce48d77560e9bb3fd9b468fd0423478d8ba30029f313710bde5d2c94cf231`。
- 正式render出力directoryは作られていない。
- 完成mp4: 0本。
- QC: 未実行。

### 費用と不変範囲

- 今回のAPI通信: 0回。
- 今回の追加費用: US$0。
- 既存2 attemptの使用量ベース累計見積り: US$0.1235145（丸め表示US$0.1235）。
- 実請求額: 未確認。
- 停止後H01: candidate 13横型95 path・tree SHA `2c68a23d126586b5e071848858edba637e79839bcb5d0906613d4398e9c62464`、candidate 59横型91 path・tree SHA `983763b52a60e10fd99126265e7178e4a600fd3024e00614f8abfcc90a724397`で不変。
- commit、tag、JOURNAL、HANDOVER更新は行っていない。

## 推測

なし。固定fatalは内側段階を記録していないため、入力解決、crop、文字配置、描画準備、公開準備のどこで止まったかをこの結果から断定しない。

## 未確認

- `VERTICAL_RENDER_V001_RUNNER_FATAL`の内側原因。
- 完成mp4の見た目・聴こえ方。
- QC 6項目。
- 実請求額。

## 次の最小工程

保存済みjobと入力だけを使い、正式描画を再実行せず、fatalが発生した内部段階を読み取りで特定する診断。人間作業0件、API通信0回、費用US$0。診断または観測性契約の改訂は本報告では実施していない。

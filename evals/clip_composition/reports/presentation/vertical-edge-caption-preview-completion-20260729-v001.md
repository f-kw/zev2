# 縦型・余白を使い切る字幕 preview v008 完了報告

日付: 2026-07-29

## 結論

人間が「読みやすい」と確認した117px版のcropと実字幕を変えず、左右の余白をさらに文字へ使った134px版を生成した。

kawafmmが「これでOK」と人間目視で合格した。

## 事実

- 1行を最大7文字に短く刻む今回の表示条件を入力とした。
- 既存の実字幕3箇所だけを使い、本文・時刻・cropを変えていない。
- 全場面で文字134px、縁11px、glow 17pxを使用した。
- 最も横へ広い実字幕「これやばいよね」で実PNGを1pxずつ拡大した。
  - 134px: 既存の左右安全領域内。
  - 135px: 右端が安全領域を4px越えるため不採用。
- ほかの1行・2行字幕も134pxで安全領域内に収まった。
- 1080×1920、30fps、160 frame、5.333008秒、48kHz stereo。
- MP4 SHA-256: `24a632ff99acadf97c2a18762420a7db4ecbc4b4b374b9bcae3d0d41bd3fe650`
- kawafmmによる見た目の最終判定: 合格。
- 外部API通信0回、費用US$0。

## 検査結果

- 1行7文字以下・論理幅14以下: 合格
- 最大2行: 合格
- 3場面すべて同一の文字・縁・glow: 合格
- 実PNGが既存安全領域内: 合格
- 135pxが実PNGで安全領域外: 確認済み
- 行の正の交差0件: 合格
- crop不変: 合格
- 1080×1920・160 frame・尺・音声形状: 合格
- 人間確認済み117px版のSHA不変: 合格
- runnerの型検査: 合格

途中の133px版は実PNGに余白が残ったため最終候補にしなかった。135px探索では、基準にした実字幕より横へ広い別字幕を検査が拒否したため、最も広い実字幕へ探索基準を切り替えた。描画時のpnpm署名確認と制限環境の一時port利用で各1回停止したが、固定済みのローカルRemotion実体を外部通信なしで実行して最終版を生成した。

## 未確認

- 全281文字を7文字程度の短い意味単位へ再分割する処理は未実施。
- 今回の7文字・134pxは縦型candidate 59のpreset候補であり、別crop型や横型への適用は未確認。
- 正式preset台帳への昇格、縦型合成層の実装、正式な縦型完成動画の生成は未実施。

## 人間作業

- 完了判断: 1件
- 結果: 合格
- 追加の必須作業: 0件

## 確認媒体

- `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/review.html`
- `evals/clip_composition/outputs/presentation/vertical-preset-previews/qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/preview-v008/vertical-fullwidth-caption-review-v008.mp4`

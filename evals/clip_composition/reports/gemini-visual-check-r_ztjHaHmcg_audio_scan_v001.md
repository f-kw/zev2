# Gemini確認依頼 r_ztjHaHmcg audio scan v001

添付動画を見て、AとBが同じ元ネタ区間か確認してください。

## 添付動画

`evals/clip_composition/outputs/visual-check/r_ztjHaHmcg/gemini_ab_audio_scan_v001_r_ztjHaHmcg_then_-DwSCDMCWDQ_11m34s.mp4`

## 動画の構成

- 前半A: 切り抜き動画 `r_ztjHaHmcg`
- 後半B: 元動画候補 `-DwSCDMCWDQ` の `11:34.445` から、Aと同じ長さだけ切り出した区間

## 判断してほしいこと

1. AとBは、同じ話題、同じ発話内容、同じ流れの区間に見えるか。
2. Aの切り抜き全体に対応するB側開始時刻は、`11:34.445` で妥当そうか。
3. B側の開始位置を前後に動かしたほうがよさそうか。
4. B側の終了位置は、Aの切り抜き全体に対応する範囲として妥当そうか。
5. 編集、字幕、BGM、切り抜き師追加要素など、AとBの差分として見えるものは何か。

## 注意

- この確認は `expectedCuts` の自動確定ではありません。
- 音声粗スキャンの最上位候補を人間が見るための前段確認です。
- STTサーバー停止中の補助なので、確定には元動画側STT、音声比較、必要なら人間確認を追加します。
- AとBが同じ区間に見えない場合は、はっきり `rejected` としてください。
- 判断が弱い場合は `uncertain` としてください。

## 返答形式

JSONだけで返してください。Markdownやコードフェンスは不要です。

```json
{
  "status": "confirmed | uncertain | rejected",
  "sourceStartMs": 694445,
  "sourceEndMs": 819717,
  "confidenceReason": "判断理由",
  "alignmentNotes": [
    "一致または不一致として見えた点"
  ],
  "suggestedAdjustment": {
    "startMs": 694445,
    "endMs": 819717,
    "reason": "調整が必要なら理由。不要ならその理由"
  },
  "visibleDifferences": [
    "字幕、BGM、編集、追加要素など"
  ],
  "usableForExpectedCuts": false
}
```

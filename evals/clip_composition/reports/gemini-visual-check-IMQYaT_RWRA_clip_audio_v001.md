# Gemini目視確認依頼 IMQYaT_RWRA clip_audio_v001

## 確認対象

- 検証動画: `evals/clip_composition/outputs/visual-check/IMQYaT_RWRA/gemini_pair_clip_audio_v001_IMQYaT_RWRA_vs_8uuQldLptRE_33m17s_full.mp4`
- 前半A: バズった切り抜き `IMQYaT_RWRA` の全体 `0:00.000 - 0:18.622`
- 後半B: 元配信候補 `8uuQldLptRE` の `33:17.050 - 33:35.672`
- expectedCuts候補: `8uuQldLptRE` の `33:17.050 - 33:35.672`
- 発話アンカー: `8uuQldLptRE` の `33:18.363 - 33:26.530`
- 音声比較の芯: `8uuQldLptRE` の `33:22.113 - 33:26.138`

## Geminiへ依頼する文面

以下の動画は、前半Aがバズった切り抜き動画、後半Bが元配信候補の該当箇所です。

目的は、Aの切り抜き動画全体が、Bの元配信箇所から作られているかを確認することです。

注意点:

- AにはBGM、SE、字幕、編集、切り抜き師の加工が混ざる可能性があります。
- Aにある音がBにそのまま存在しないことは正常です。
- 確認したいのは、Aの主な発話、笑い、場面がBに対応しているかです。
- Bの時刻は、元配信 `8uuQldLptRE` の絶対時刻で答えてください。

確認してほしいこと:

1. Aの主な発話・笑い・場面が、Bのどの時刻に対応しているか。
2. AにはBにないBGM、SE、編集、字幕、切り抜き師の加工が混ざっているか。
3. expectedCuts候補 `33:17.050 - 33:35.672` は、A全体の元ネタ区間として妥当か。
4. もっと自然な開始位置・終了位置があるなら、Bの元配信絶対時刻で提案すること。
5. 判定を `confirmed` / `uncertain` / `rejected` のいずれかで返すこと。

返答フォーマット:

```json
{
  "status": "confirmed | uncertain | rejected",
  "recommendedSourceStartMs": 1997050,
  "recommendedSourceEndMs": 2015672,
  "reason": "短い理由",
  "matchedMoments": [
    {
      "clipMoment": "A側の見え方または聞こえ方",
      "sourceMoment": "B側の対応箇所",
      "confidence": "high | medium | low"
    }
  ],
  "notes": [
    "BGM、SE、編集差分など"
  ]
}
```

## 現在の機械判定

- STT照合では、再編集候補 `Rfsj5uHy_Bs` が文字列上の全体最上位。
- 元配信候補 `8uuQldLptRE` でも対応語が出ている。
- 音声比較では、元配信候補 `8uuQldLptRE` の発話部分が最も強い。
- 発話部分の音量包絡相関: `0.883568`
- 切り抜き全体にはBGMやSEが乗るため、全体波形相関だけでは確定しない。
- `IMQYaT_RWRA_clip_audio_v001` の期待区間は、切り抜き全体18.622秒を発話開始位置へ合わせて `33:17.050 - 33:35.672` として置いている。

## 確認後の反映

Geminiまたは人間の確認結果は、次のコマンドで `expected/IMQYaT_RWRA_clip_audio_v001.json` へ反映する。

```bash
pnpm --filter @zev2/agent-runner exec tsx ../evals/clip_composition/apply_visual_verification.ts \
  --fixture IMQYaT_RWRA_clip_audio_v001 \
  --status confirmed \
  --checkedBy gemini-web \
  --reportPath evals/clip_composition/reports/gemini-visual-check-IMQYaT_RWRA_clip_audio_v001.md \
  --sourceStartMs 1997050 \
  --sourceEndMs 2015672 \
  --note "Gemini確認結果をここへ入れる"
```

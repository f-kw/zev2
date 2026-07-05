# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v001
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","manualPrompt":"reports/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-130216/prompt.md","visualVerification":"outputs/IMQYaT_RWRA_clip_audio_v001/visual_verification/20260705-131357-gemini-web-flash.json"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-125714/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-131440/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: 固定テーマ「笑い声がトルコ行進曲に聞こえる女騎士いじり」に合致するよう、女騎士という反応の始まりから、物を投げているという言及、そしてその後の特徴的な笑い声の終わりまでの一連の流れを含めるため、全ての発話ID（1〜32）を網羅した最小の連続区間を選択しました。

## 期待区間

- 1997050ms - 2015672ms: 切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させた区間のため。

## 差分

- 開始位置のずれ: 0ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間と完全に一致しています

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側の候補選択差分はありません
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入り、LLMが選んだ区間も一致しています

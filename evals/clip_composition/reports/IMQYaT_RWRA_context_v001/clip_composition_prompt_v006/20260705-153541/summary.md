# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v006
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","manualPrompt":"reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153350/prompt.md","geminiChatUrl":"https://gemini.google.com/app/43801fd59c27dfba"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153350/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v006/20260705-153541/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: 「いるいる、最悪がやってきたって感じで女騎士だー」というフリと状況説明の発話（speechId 1-22）から開始し、少しの間を空けて「めっちゃ投げてる」（speechId 23-30）というテーマの中心となる描写につなげ、その後に続く笑い声の余韻（speechId 31-32）が収束するまでを一つの連続した切り抜き区間として選択しました。

## 期待区間

- 1997050ms - 2015672ms: 実在の切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させ、Web版Geminiで元ネタ区間として確認したため。

## 差分

- 開始位置のずれ: 0ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間と完全に一致しています

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側の候補選択差分はありません
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入り、LLMが選んだ区間も一致しています

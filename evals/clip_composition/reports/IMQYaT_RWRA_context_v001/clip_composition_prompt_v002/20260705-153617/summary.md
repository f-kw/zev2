# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v002
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","rescoreReason":"expected reset to full clip interval"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-131730/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v002/20260705-153617/result.json

## LLMが選んだ区間

- 1997803ms - 2015672ms: テーマである「女騎士いじり」と「笑い声」が単独で成立する最小の連続区間を選択。冒頭の言い淀み（speechId 1-4: いるいる）を除外し、「最悪がやってきたって感じで女騎士だー」と相手に反応する発話の開始位置（speechId 5）を起点とした。そこから、相手が何かを投げている描写（speechId 23-30: めっちゃ投げてる）を経て、テーマの核心である印象的な笑い声（speechId 31-32）の終了位置までを繋げることで、文脈とオチが綺麗に伝わる区間とした。

## 期待区間

- 1997050ms - 2015672ms: 実在の切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させ、Web版Geminiで元ネタ区間として確認したため。

## 差分

- 開始位置のずれ: +753ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間の中にLLMが選んだ区間が入っています

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

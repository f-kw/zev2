# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v004
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","rescoreReason":"expected reset to full clip interval"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-132945/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-153614/result.json

## LLMが選んだ区間

- 1997050ms - 2006530ms: compositionNoteの指示に基づき、相手への反応として「いるいる最悪がやってきたって感じで女騎士だー」と発話している範囲（speechId: 1〜22）と、それに続いて投げている描写である「めっちゃ投げてる」（speechId: 23〜30）を含めた連続区間を選択しました。末尾にある単独の笑い声（speechId: 31, 32）は、方針に従い反応の尾として除外しています。

## 期待区間

- 1997050ms - 2015672ms: 実在の切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させ、Web版Geminiで元ネタ区間として確認したため。

## 差分

- 開始位置のずれ: 0ms
- 終了位置のずれ: -9142ms
- 重なり: 期待区間の中にLLMが選んだ区間が入っています

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

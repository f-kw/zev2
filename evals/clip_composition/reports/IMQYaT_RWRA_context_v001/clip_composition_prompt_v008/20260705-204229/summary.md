# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v008
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":true,"runner":"node-type-strip"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-203250/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-204229/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: 判断方針に基づき、切り抜きとして単独で意味が通る一続きの最小連続区間を選択しました。開始位置は、相手への反応の始まりであり、その後の「女騎士だー」という見立てを理解するためのフリとなる「いるいる最悪がやってきたって感じで」（発話ID 1〜17）の先頭である発話ID 1を採用しています。終了位置は、「めっちゃ投げてる」という中心発話（発話ID 23〜30）の直後に続く笑い声の余韻（発話ID 31, 32）が収束する最後の時刻までを含めることで、切り抜きのオチとしての視聴感を作っています。

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

# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v005
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","manualPrompt":"reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-133208/prompt.md","geminiChatUrl":"https://gemini.google.com/app/2af786bda35b7701"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-133208/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v005/20260705-133448/result.json

## LLMが選んだ区間

- 1999464ms - 2006530ms: compositionNoteの「女騎士のように見えた相手への反応と投げている描写が単独で伝わる範囲」という指示に基づき、前置きの「いるいる最悪がやってきたって感じで」を削り、中心発話となる「女騎士だー」（SpeechId 18-22）の開始から、「めっちゃ投げてる」（SpeechId 23-30）の終了までを選択しました。末尾の単独の笑い声（SpeechId 31-32）は、方針に従い反応の尾として除外しています。

## 期待区間

- 1998363ms - 2006530ms: 音声比較で切り抜き発話と元配信候補の発話部分が強く一致し、候補窓の中で単独で意味が通る中心区間のため。

## 差分

- 開始位置のずれ: +1101ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間の中にLLMが選んだ区間が入っています

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

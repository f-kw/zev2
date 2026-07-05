# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v003
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","manualPrompt":"reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132659/prompt.md","geminiChatUrl":"https://gemini.google.com/app/e753d7b9250a4b0a"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132659/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132905/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: テーマである「笑い声がトルコ行進曲に聞こえる女騎士いじり」を成立させるため、女騎士への言及から、物を投げている描写、そしてその後の特徴的な長い笑い声（speechId: 31, 32）までの一連のシークエンスをすべて含む最小の連続区間として選択しました。笑い声そのものがテーマの核となっているため、末尾の笑い声も除外せず含めています。

## 期待区間

- 1998363ms - 2006530ms: 音声比較で切り抜き発話と元配信候補の発話部分が強く一致し、候補窓の中で単独で意味が通る中心区間のため。

## 差分

- 開始位置のずれ: -1313ms
- 終了位置のずれ: +9142ms
- 重なり: LLMが選んだ区間が期待区間を含んでいます

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v003
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"unknown","source":"web-gemini","rescoreReason":"expected reset to full clip interval"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-132659/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v003/20260705-153616/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: テーマである「笑い声がトルコ行進曲に聞こえる女騎士いじり」を成立させるため、女騎士への言及から、物を投げている描写、そしてその後の特徴的な長い笑い声（speechId: 31, 32）までの一連のシークエンスをすべて含む最小の連続区間として選択しました。笑い声そのものがテーマの核となっているため、末尾の笑い声も除外せず含めています。

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

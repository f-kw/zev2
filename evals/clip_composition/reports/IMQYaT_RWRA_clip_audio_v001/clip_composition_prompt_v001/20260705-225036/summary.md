# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v001
- 使用モデル名: rule-based-result-as-external
- 使用パラメータ: {"temperature":0,"source":"run_eval_verification"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-225028/result.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_clip_audio_v001/clip_composition_prompt_v001/20260705-225036/result.json

## LLMが選んだ区間

- 1: 1997050ms - 2015672ms: 選ばれたテーマ「笑い声がトルコ行進曲に聞こえる女騎士いじり」について、関連する発話まとまりを1個の編集元場面としてつないだ。 候補窓の中から、女騎士のように見えた相手への反応と投げている描写が単独で伝わる範囲だけを使う。

## 期待区間

- 1: 1997050ms - 2015672ms: 切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させた区間のため。

## 差分

- 開始位置のずれ: 0ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間と完全に一致しています
- 全体: 期待区間1件に対して選択区間1件。 完全一致1件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。

## 区間別差分

- 1: 期待区間と完全に一致しています / 開始 0ms / 終了 0ms / 重なり 18622ms

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側の候補選択差分はありません
- 候補範囲: 1997050ms - 2015672ms
- 判定理由: 期待区間はすべて選択済みテーマの候補範囲に入り、LLMが選んだ区間も同じ順番で一致しています

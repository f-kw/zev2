# clip_composition LLM出力採点サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v001
- 使用モデル名: rule-output-smoke
- 使用パラメータ: {"temperature":0,"source":"run_eval_result"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-124545/result.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v001/20260705-125215/result.json

## LLMが選んだ区間

- 1997050ms - 2015672ms: 選ばれたテーマ「笑い声がトルコ行進曲に聞こえる女騎士いじり」について、関連する発話まとまりを1個の編集元場面としてつないだ。 候補窓の中から、女騎士のように見えた相手への反応と投げている描写が単独で伝わる範囲だけを使う。

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

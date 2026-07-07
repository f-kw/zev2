# clip_composition LLM出力採点サマリー

- 入力fixture: aX-axQMWR3c_single_material_v001
- 生成系統: llm-v011
- 使用プロンプト版数: clip_composition_prompt_v011
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","runner":"edge-cdp-text-prompt","runIndex":1}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v011/20260707-102457/gemini-web-flash-output-run1.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v011/20260707-104510/result.json

## LLMが選んだ区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の体制や人数の変化に対する疑問・懸念を述べ始める最初の発話から開始するためです。終了根拠: 組織内あれこれの議論について、一期生との関係性を含めた最終的な安心感への着地が収束する発話の最後の時刻まで含めるためです。除外判断: 単一区間の素材ブロックとして意味の連続性が途切れず一連の流れを形成しているため、内部の区間を除外せずすべて含めて選択しました。

## 期待区間

- 1: 4922443ms - 5056495ms: 音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致した単一区間素材ブロックのため。

## 採点対象の選択区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の体制や人数の変化に対する疑問・懸念を述べ始める最初の発話から開始するためです。終了根拠: 組織内あれこれの議論について、一期生との関係性を含めた最終的な安心感への着地が収束する発話の最後の時刻まで含めるためです。除外判断: 単一区間の素材ブロックとして意味の連続性が途切れず一連の流れを形成しているため、内部の区間を除外せずすべて含めて選択しました。

## 採点対象外にした選択区間

- なし

## 採点対象外の期待側区間

- なし

## 時刻の数値妥当性

- 作られた疑いのある時刻: なし
- 許容範囲: 発話境界から5000ms以内
- なし

## 差分

- 開始位置のずれ: 0ms
- 終了位置のずれ: 0ms
- 重なり: 期待区間と完全に一致しています
- 全体: 期待区間1件に対して選択区間1件。 完全一致1件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。

## 区間別差分

- 1: 期待区間と完全に一致しています / 開始 0ms / 終了 0ms / 重なり 134052ms

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側の候補選択差分はありません
- 候補範囲: 4922443ms - 5056495ms
- 判定理由: 期待区間はすべて選択済みテーマの候補範囲に入り、LLMが選んだ区間も同じ順番で一致しています

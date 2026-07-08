# clip_composition LLM出力採点サマリー

- 入力fixture: aX-axQMWR3c_single_material_v001
- 生成系統: llm-v012
- 使用プロンプト版数: clip_composition_prompt_v012
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","runner":"edge-cdp-text-prompt","runIndex":3,"usedSpeechIdsFormat":"compressed-ranges","retryAfterCdpHang":true}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v012/20260708-115349/gemini-web-flash-run-03-output.json
- LLM出力の抽出状態: full_json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v012/20260708-122030/result.json

## LLMが選んだ区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の体制や上司の人数に違和感を持つ話題が始まる最初の発話から選択しているためです。終了根拠: 1期生に関しては自分たちが直接話を聞けるから安心であるという一連の組織内トークが収束する最後の発話まで含めるためです。除外判断: 単一区間素材ブロックとして意味の連続性が全編にわたり保たれているため、内部で区間を分けずすべて一続きの範囲として採用しました。

## 期待区間

- 1: 4922443ms - 5056495ms: 音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致した単一区間素材ブロックのため。

## 採点対象の選択区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の体制や上司の人数に違和感を持つ話題が始まる最初の発話から選択しているためです。終了根拠: 1期生に関しては自分たちが直接話を聞けるから安心であるという一連の組織内トークが収束する最後の発話まで含めるためです。除外判断: 単一区間素材ブロックとして意味の連続性が全編にわたり保たれているため、内部で区間を分けずすべて一続きの範囲として採用しました。

## 採点対象外にした選択区間

- なし

## 採点対象外の期待側区間

- 1: 4890622ms - 4922443ms: clip 0:00.000-0:27.258 はSTT出力と断片的なDP対応があるが、人間確認済みの素材対応ブロックではないため採点対象外として扱う。

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

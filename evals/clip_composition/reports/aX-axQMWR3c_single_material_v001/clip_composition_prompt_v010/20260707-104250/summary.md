# clip_composition LLM出力採点サマリー

- 入力fixture: aX-axQMWR3c_single_material_v001
- 生成系統: llm-v010
- 使用プロンプト版数: clip_composition_prompt_v010
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","runner":"edge-cdp-text-prompt","runIndex":3}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v010/20260707-102450/gemini-web-flash-output-run3.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v010/20260707-104250/result.json

## LLMが選んだ区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の不満や体制に関する話題が「欲しがってる人いるな」という発話から展開し始めるためです。終了根拠: 組織内あれこれの議論が「そこは安心できるんじゃないでしょうか」という結論の収束と余韻まで綺麗に閉じるためです。除外判断: 候補範囲内のすべての発話がテーマの文脈として一連の流れを構成しているため、途中の区間は除外せず単一の連続区間として選択しました。

## 期待区間

- 1: 4922443ms - 5056495ms: 音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致した単一区間素材ブロックのため。

## 採点対象の選択区間

- 1: 4922443ms - 5056495ms: 開始根拠: 組織内の不満や体制に関する話題が「欲しがってる人いるな」という発話から展開し始めるためです。終了根拠: 組織内あれこれの議論が「そこは安心できるんじゃないでしょうか」という結論の収束と余韻まで綺麗に閉じるためです。除外判断: 候補範囲内のすべての発話がテーマの文脈として一連の流れを構成しているため、途中の区間は除外せず単一の連続区間として選択しました。

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

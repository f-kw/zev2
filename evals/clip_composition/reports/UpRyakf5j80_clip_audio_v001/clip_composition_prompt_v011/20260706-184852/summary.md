# clip_composition LLM出力採点サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 生成系統: llm-v011
- 使用プロンプト版数: clip_composition_prompt_v011
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt","runs":3,"runIndex":3,"generationSystem":"llm-v011","scoringRevision":"overlap-matched-v001"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v011/20260706-184144/gemini-run3.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v011/20260706-184852/result.json

## LLMが選んだ区間

- 1: 11364140ms - 11404850ms: 開始根拠: リスナーが記事を取り上げて世界2位の話題を提示する発話から始めるためです。終了根拠: 順位は変動するものだからあまり喜べないという本人の冷静な結論が収束する発話まで含めるためです。除外判断: 冒頭のスパチャへのお礼発話（ID 1）と、末尾の次の話題へ移る相づち（ID 19の後半・20）はテーマと無関係なため除外しました。

## 期待区間

- 1: 11364500ms - 11407178ms: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。

## 採点対象の選択区間

- 1: 11364140ms - 11404850ms: 開始根拠: リスナーが記事を取り上げて世界2位の話題を提示する発話から始めるためです。終了根拠: 順位は変動するものだからあまり喜べないという本人の冷静な結論が収束する発話まで含めるためです。除外判断: 冒頭のスパチャへのお礼発話（ID 1）と、末尾の次の話題へ移る相づち（ID 19の後半・20）はテーマと無関係なため除外しました。

## 採点対象外にした選択区間

- なし

## 採点対象外の期待側区間

- なし

## 時刻の数値妥当性

- 作られた疑いのある時刻: なし
- 許容範囲: 発話境界から5000ms以内
- なし

## 差分

- 開始位置のずれ: -360ms
- 終了位置のずれ: -2328ms
- 重なり: 一部重なっています。重なりは40350ms、LLM選択は40710ms、期待区間は42678msです
- 全体: 期待区間1件に対して選択区間1件。 完全一致0件、重なりあり1件。 未選択の期待区間0件、余分な選択区間0件。

## 区間別差分

- 1: 一部重なっています。重なりは40350ms、LLM選択は40710ms、期待区間は42678msです / 開始 -360ms / 終了 -2328ms / 重なり 40350ms

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 11362439ms - 11409170ms
- 判定理由: 期待区間はすべて選択済みテーマの候補範囲に入っています

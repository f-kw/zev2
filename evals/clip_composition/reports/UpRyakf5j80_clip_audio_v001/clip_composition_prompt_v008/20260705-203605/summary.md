# clip_composition LLM出力採点サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v008
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":true,"runner":"node-type-strip"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203250/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203605/result.json

## LLMが選んだ区間

- 11364140ms - 11409170ms: 世界2位の話題が提示されるお便りの読み上げ（発話ID 2）を開始位置とし、変動する順位への冷静な本音を語るオチの反復（発話ID 19）の直後にある短い相づち（発話ID 20）までを含めました。発話ID 20の相づちは新しい話題や相談内容に移っておらず、切り抜き音声の自然な締め・余韻として機能するため、判断方針に基づき終了位置に採用しています。なお、冒頭のお礼（発話ID 1）は話題の前段階の断片であるため除外しています。

## 期待区間

- 11364500ms - 11407178ms: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。

## 差分

- 開始位置のずれ: -360ms
- 終了位置のずれ: +1992ms
- 重なり: LLMが選んだ区間が期待区間を含んでいます

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 11362439ms - 11409170ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

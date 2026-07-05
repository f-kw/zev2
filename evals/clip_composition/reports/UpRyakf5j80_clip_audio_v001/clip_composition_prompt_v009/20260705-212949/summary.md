# clip_composition LLM出力採点サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v009
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt","extraction":"existing-web-answer"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-211733/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json

## LLMが選んだ区間

- 11364140ms - 11409170ms: テーマである『世界2位』の話題提示が明確に始まる発話ID 2の開始時刻 (11364140ms) を開始位置とし、変動するものなので素直に喜べないという一連の結論・余韻が収束する発話ID 20の終了時刻 (11409170ms) までを最小の連続区間として選択しました。冒頭の発話ID 1は前文への挨拶でありテーマの本質ではないため除外しています。

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

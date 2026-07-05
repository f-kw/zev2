# clip_composition LLM出力採点サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v006
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":true}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v006/20260705-184458/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v006/20260705-184616/result.json

## LLMが選んだ区間

- 11364140ms - 11404850ms: お便りの「世界2位なんだと取り上げられているのを見ました」という話題提示の開始点（SpeechId 2）から、それに対して船長が「変動するものだから素直に喜べない」「どうせまた変わるし」と冷静な反応で締めくくる場面（SpeechId 18）までを一続きの連続区間として選択しました。冒頭の挨拶（SpeechId 1）や、最後の別の話題への移行の相槌（SpeechId 19-20）は除外しています。

## 期待区間

- 11364500ms - 11407178ms: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。

## 差分

- 開始位置のずれ: -360ms
- 終了位置のずれ: -2328ms
- 重なり: 一部重なっています。重なりは40350ms、LLM選択は40710ms、期待区間は42678msです

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 11362439ms - 11409170ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

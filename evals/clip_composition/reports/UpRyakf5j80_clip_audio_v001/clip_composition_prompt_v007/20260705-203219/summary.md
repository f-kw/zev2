# clip_composition LLM出力採点サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v007
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":true,"runner":"node-type-strip"}
- LLM出力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-185128/gemini-web-flash-output.json
- 評価結果JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-203219/result.json

## LLMが選んだ区間

- 11364140ms - 11405460ms: 世界2位として取り上げられたリスナーからのマシュマロ・コメント読み上げが始まる発話ID 2から、それに対する照れと、順位は変動するものだからあまり素直に喜べないという結論を言い直す発話ID 19までの区間が、テーマの「世界2位という話題提示から、変動するものなので素直に喜べないという結論までを一続きで使う」という条件に最も合致するため選択。冒頭の挨拶（発話ID 1）と、次の話題に移る相槌（発話ID 20）は除外しています。

## 期待区間

- 11364500ms - 11407178ms: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。

## 差分

- 開始位置のずれ: -360ms
- 終了位置のずれ: -1718ms
- 重なり: 一部重なっています。重なりは40960ms、LLM選択は41320ms、期待区間は42678msです

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い
- composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります
- 候補範囲: 11362439ms - 11409170ms
- 判定理由: 期待区間は選択済みテーマの候補範囲に入っています

# clip_composition v007 Gemini Flash 手動比較

- 入力fixture: `UpRyakf5j80_clip_audio_v001`
- 使用プロンプト版数: `clip_composition_prompt_v007`
- 使用モデル名: `gemini-web-flash`
- 使用パラメータ: `{"temperature":"web-default","source":"gemini-web","manualRun":true}`
- LLM出力JSON: `evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-185128/gemini-web-flash-output.json`
- scoreスクリプト採点: 未実行

## LLMが選んだ区間

- `11364140ms - 11405460ms`
- 使用発話: `2 - 19`
- 理由: 世界2位として取り上げられた話題提示から、順位は変動するものだからあまり素直に喜べないという結論を言い直す発話までを選んだ。冒頭の挨拶と、次の話題に移る相槌は除外した。

## 期待区間

- `11364500ms - 11407178ms`
- 根拠: 切り抜き全体の音声比較で元動画スライス内 `0:07.500 - 0:50.178` に強く一致し、Web版Geminiの左右映像確認でも同一元ネタと判定された区間。

## 差分

- 開始位置のずれ: `-360ms`
- 終了位置のずれ: `-1718ms`
- v006からの変化: 終端が `610ms` 後ろへ伸び、発話19を含むようになった。

## 暫定判定

- theme側: 期待区間は固定テーマの候補範囲に入っているため、theme側で正解区間が候補に入っていない可能性は低い。
- composition側: v007は「同じ結論の短い言い直し」を含める改善は効いた。ただし、音声比較で確認した切り抜き末尾まではまだ届いていない。
- 人間が見るべき差分: 発話20の短い `うん` を、次トピック移行として落とすべきか、切り抜き音声に残る締めとして含めるべきか。

## 未実行理由

`score_prompt_output.ts` の実行は、サンドボックス内では `tsx` の一時IPC作成が許可されず、外側実行は承認レビュー側の使用制限で拒否された。そのため、このファイルでは単純な時刻差分だけを手動で記録している。

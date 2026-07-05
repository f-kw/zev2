# clip_composition 音声根拠サマリー

- 入力fixture: UpRyakf5j80_clip_audio_v001
- 使用プロンプト版数: clip_composition_prompt_v009
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt","extraction":"existing-web-answer"}
- 採点結果: evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json
- 結果JSON: outputs/audio-evidence-UpRyakf5j80_clip_audio_v001-clip_composition_prompt_v009-20260705-v002.json

## 結論

開始差分は-360ms、終了差分は+1992msです。LLM選択区間は音声確認済み区間を含んでいます。終端は音声確認済み区間より後ろです。

## 音声確認済み区間

- 区間: 11364500ms - 11407178ms
- 長さ: 42678ms
- 理由: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。
- 音声確認状態: confirmed
- 確認方法: 切り抜き動画全体を、字幕照合で絞った元動画候補55秒区間の中で音量包絡比較した。
- 音声比較結果: evals/clip_composition/outputs/audio-compare-chunks-UpRyakf5j80_youtube_auto_source_slice_full_window_v001.json
- 音声比較レポート: evals/clip_composition/reports/audio-compare-chunks-UpRyakf5j80_youtube_auto_source_slice_full_window_v001.md
- 音声比較の読み取り: 保存済みの音声比較結果から、切り抜き音声が元動画候補範囲内のどこへ寄ったかを読み取りました。
- 音量包絡相関: 0.974592
- 包絡位置での生波形相関: -0.259884
- 音声比較から読める絶対範囲: 11364500ms - 11407178ms
- 音声確認メモ: 切り抜き全体の音量包絡は、元動画候補55秒区間内の7.500秒位置に強く一致した。負の直接波形相関は、音量包絡で見つけた位置での生波形比較であり、BGM、圧縮、編集差分の影響を受けるため、区間確認では音量包絡と映像確認を優先する。

## LLM選択区間

- 区間: 11364140ms - 11409170ms
- 長さ: 45030ms
- 理由: テーマである『世界2位』の話題提示が明確に始まる発話ID 2の開始時刻 (11364140ms) を開始位置とし、変動するものなので素直に喜べないという一連の結論・余韻が収束する発話ID 20の終了時刻 (11409170ms) までを最小の連続区間として選択しました。冒頭の発話ID 1は前文への挨拶でありテーマの本質ではないため除外しています。

## 差分

- 開始位置の差: -360ms
- 終了位置の差: +1992ms
- 長さの差: +2352ms
- 関係: prompt_includes_audio_confirmed_cut

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い / composition側: composition側で候補範囲から最終区間を選ぶ処理に差分がある可能性があります

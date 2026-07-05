# clip_composition 音声根拠サマリー

- 入力fixture: IMQYaT_RWRA_context_v001
- 使用プロンプト版数: clip_composition_prompt_v008
- 使用モデル名: gemini-web-flash
- 使用パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":true,"runner":"node-type-strip"}
- 採点結果: evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-204229/result.json
- 結果JSON: outputs/audio-evidence-IMQYaT_RWRA_context_v001-clip_composition_prompt_v008-20260705-v001.json

## 結論

開始差分は0ms、終了差分は0msです。LLM選択区間は音声確認済み区間と一致しています。終端は音声確認済み区間と同じです。

## 音声確認済み区間

- 区間: 1997050ms - 2015672ms
- 長さ: 18622ms
- 理由: 実在の切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させ、Web版Geminiで元ネタ区間として確認したため。
- 音声確認状態: speech_anchor_confirmed
- 確認方法: 切り抜き発話部分と元配信候補区間の音量包絡を比較し、発話一致を証拠として切り抜き動画全体の対応区間を元配信側へ置いた。
- 音声比較結果: evals/clip_composition/outputs/audio-compare-IMQYaT_RWRA_v001.json
- 音声比較レポート: evals/clip_composition/reports/audio-compare-IMQYaT_RWRA_v001.md
- 音声比較の読み取り: 保存済みの音声比較結果から、切り抜き内の発話アンカーが元動画候補へ寄ったことを読み取りました。
- 音量包絡相関: 0.883568
- 包絡位置での生波形相関: 0.051795
- 音声確認メモ: 発話一致区間は元ネタ照合の証拠として保持し、期待区間そのものは実在の切り抜き動画全体に対応する範囲とする。

## LLM選択区間

- 区間: 1997050ms - 2015672ms
- 長さ: 18622ms
- 理由: 判断方針に基づき、切り抜きとして単独で意味が通る一続きの最小連続区間を選択しました。開始位置は、相手への反応の始まりであり、その後の「女騎士だー」という見立てを理解するためのフリとなる「いるいる最悪がやってきたって感じで」（発話ID 1〜17）の先頭である発話ID 1を採用しています。終了位置は、「めっちゃ投げてる」という中心発話（発話ID 23〜30）の直後に続く笑い声の余韻（発話ID 31, 32）が収束する最後の時刻までを含めることで、切り抜きのオチとしての視聴感を作っています。

## 差分

- 開始位置の差: 0ms
- 終了位置の差: 0ms
- 長さの差: 0ms
- 関係: same_as_audio_confirmed_cut

## 暫定判定

- theme側: theme側で正解区間が候補に入っていない可能性は低い / composition側: composition側の候補選択差分はありません

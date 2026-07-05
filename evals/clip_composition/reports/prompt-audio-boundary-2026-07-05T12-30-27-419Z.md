# prompt選択区間と音声一致区間の境界確認

- fixture: UpRyakf5j80_clip_audio_v001
- prompt版数: clip_composition_prompt_v009
- モデル: gemini-web-flash
- パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt","extraction":"existing-web-answer"}
- 採点結果: evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json
- 文字起こし: evals/clip_composition/fixtures/UpRyakf5j80_clip_audio_v001/transcript.json
- 結果JSON: evals/clip_composition/outputs/prompt-audio-boundary-2026-07-05T12-30-27-419Z.json

## 音声比較で確認した切り抜き箇所

- 元動画上の対応区間: 11364500ms - 11407178ms (0:42.678)
- 元動画スライス内の一致開始: 7500ms
- 音量包絡の相関: 0.974592
- 生波形の直接相関: -0.259884
- 音声比較レポート: evals/clip_composition/reports/audio-compare-chunks-UpRyakf5j80_youtube_auto_source_slice_full_window_v001.md

## clip_composition_prompt_v009 が選んだ区間

- 選択区間: 11364140ms - 11409170ms (0:45.030)
- 期待区間: 11364500ms - 11407178ms (0:42.678)
- 音声一致区間との差: 選択開始は音声一致で確認した切り抜き開始より360ms前です。 選択終了は音声一致で確認した切り抜き終了より1992ms後です。
- 選択区間の長さ差: 2352ms

## 文字起こし境界

- 選択開始: 11364140ms / 発話2 / segment_start / 同時に重なる発話: 1, 2 / とある記事で船長は
- 選択終了: 11409170ms / 発話20 / segment_end / うん
- 期待開始: 11364500ms / 発話1 / inside_segment / 発話開始から2061ms、発話終了まで2260ms / 同時に重なる発話: 1, 2 / 香りどうもありがとうございます
- 期待終了: 11407178ms / 発話20 / inside_segment / 発話開始から1718ms、発話終了まで1992ms / うん

## usedSpeechIdsとの照合

- 選択開始を含む発話が理由側の発話一覧に入っているか: yes
- 選択終了を含む発話が理由側の発話一覧に入っているか: yes

## 読み取り

- 音声比較で確認した切り抜き全体は、expectedの区間としてすでに固定されている。
- このpromptの選択はexpectedを包含しているが、音声一致区間より前後へ広い。
- 次の改善対象はthemeではなくcomposition側の境界選択で、特に発話途中の終端を扱う入力粒度が足りていない。

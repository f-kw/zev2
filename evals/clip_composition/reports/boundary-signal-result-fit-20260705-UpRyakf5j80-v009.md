# 境界候補と採点結果の照合

- fixture: UpRyakf5j80_clip_audio_v001
- prompt版数: clip_composition_prompt_v009
- モデル: gemini-web-flash
- パラメータ: {"temperature":"web-default","source":"gemini-web","manualRun":false,"runner":"edge-cdp-text-prompt","extraction":"existing-web-answer"}
- 採点結果: evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v009/20260705-212949/result.json
- 境界候補payload: evals/clip_composition/outputs/boundary-signal-payload-UpRyakf5j80-v009-candidate-v001.json
- 結果JSON: outputs/boundary-signal-result-fit-20260705-UpRyakf5j80-v009.json
- 境界候補単位: 23
- 遷移: 22
- expected時刻のpayload混入: 0件

## 区間

- モデル選択: 11364140ms - 11409170ms
- 期待区間: 11364500ms - 11407178ms
- 開始差分: -360ms
- 終了差分: +1992ms

## 最寄り境界候補

- モデル開始に最も近い候補: 11364140ms transition_next_start transition_003/signal_004 (0ms)
- モデル終了に最も近い候補: 11409170ms transition_previous_end transition_022/signal_022 (0ms)
- 期待開始に最も近い候補: 11364140ms transition_next_start transition_003/signal_004 (-360ms)
- 期待終了に最も近い候補: 11407260ms transition_next_start transition_022/signal_023 (+82ms)

## 読み取り

- モデルの終了位置は 11409170ms transition_previous_end transition_022/signal_022 (0ms) に対応している。
- 音声比較で固定した終了位置に最も近い境界候補は 11407260ms transition_next_start transition_022/signal_023 (+82ms)。
- モデルは期待終了に最も近い候補ではなく、+1910ms 後ろの境界を選んでいる。
- 境界候補payloadにはexpectedの開始・終了値そのものは含まれていない。

## 注意

- この照合は採点後の分析であり、expectedの値をcomposition promptへ渡すものではない。
- 境界候補は正解ではなく、次のprompt入力を作るときにどの種類の境界が有効そうかを見る材料として扱う。

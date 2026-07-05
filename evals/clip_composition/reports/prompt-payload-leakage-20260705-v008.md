# prompt入力漏えい検査

- 実行時刻: 2026-07-05T12:03:13.664Z
- 結果JSON: evals/clip_composition/outputs/prompt-payload-leakage-20260705-v008.json
- 検査対象: 2件

## 目的

compositionプロンプトへ渡した入力に、採点用の正解理由や検証メタ情報が混ざっていないか確認する。
時刻の数値一致は、文字起こし区間の境界として自然に出る場合があるため、混入判定とは分けて読む。

## IMQYaT_RWRA_context_v001

- 状態: pass
- prompt版数: clip_composition_prompt_v008
- 入力: evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v008/20260705-203250/prompt-input.json
- 正解: evals/clip_composition/expected/IMQYaT_RWRA_context_v001.json

### 正解メタ情報のキー混入

- なし

### 正解理由または確認メモの本文混入

- なし

### 期待時刻と同じ数値

- 1997050ms (start) / modelInput.transcript.segments[0].sourceStartMs / number_value / transcript_boundary
- 2015672ms (end) / modelInput.transcript.segments[31].sourceEndMs / number_value / transcript_boundary

### 読み取り

- suspicious: 0件
- transcript boundary: 2件

## UpRyakf5j80_clip_audio_v001

- 状態: pass
- prompt版数: clip_composition_prompt_v008
- 入力: evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v008/20260705-203250/prompt-input.json
- 正解: evals/clip_composition/expected/UpRyakf5j80_clip_audio_v001.json

### 正解メタ情報のキー混入

- なし

### 正解理由または確認メモの本文混入

- なし

### 期待時刻と同じ数値

- なし

### 読み取り

- suspicious: 0件
- transcript boundary: 0件

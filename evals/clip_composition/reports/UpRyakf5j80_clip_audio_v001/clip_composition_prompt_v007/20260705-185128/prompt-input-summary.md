# clip_composition プロンプト入力レポート

- fixture: UpRyakf5j80_clip_audio_v001
- プロンプト版数: clip_composition_prompt_v007
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-185128/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v007/20260705-185128/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/UpRyakf5j80_clip_audio_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 11364500ms - 11407178ms: YouTube自動字幕のチャンク照合で同じ連続範囲に集まり、切り抜き全体の音声比較とWeb版Geminiの左右映像確認で同一元ネタと判定された区間のため。
- 確認状態: audio_confirmed_visual_confirmed
- compositionプロンプト評価に使えるか: はい

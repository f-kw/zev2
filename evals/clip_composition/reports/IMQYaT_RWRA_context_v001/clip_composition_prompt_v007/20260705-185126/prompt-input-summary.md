# clip_composition プロンプト入力レポート

- fixture: IMQYaT_RWRA_context_v001
- プロンプト版数: clip_composition_prompt_v007
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v007/20260705-185126/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v007/20260705-185126/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/IMQYaT_RWRA_context_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 1997050ms - 2015672ms: 実在の切り抜き動画全体18.622秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させ、Web版Geminiで元ネタ区間として確認したため。
- 確認状態: audio_anchor_confirmed_visual_confirmed
- compositionプロンプト評価に使えるか: はい

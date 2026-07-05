# clip_composition プロンプト入力レポート

- fixture: IMQYaT_RWRA_context_v001
- プロンプト版数: clip_composition_prompt_v004
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-132945/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/IMQYaT_RWRA_context_v001/clip_composition_prompt_v004/20260705-132945/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/IMQYaT_RWRA_context_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 1998363ms - 2006530ms: 音声比較で切り抜き発話と元配信候補の発話部分が強く一致し、候補窓の中で単独で意味が通る中心区間のため。
- 確認状態: audio_confirmed_visual_pending
- compositionプロンプト評価に使えるか: はい

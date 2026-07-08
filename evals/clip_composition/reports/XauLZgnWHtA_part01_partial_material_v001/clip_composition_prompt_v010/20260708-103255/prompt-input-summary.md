# clip_composition プロンプト入力レポート

- fixture: XauLZgnWHtA_part01_partial_material_v001
- 生成系統: llm-v010
- プロンプト版数: clip_composition_prompt_v010
- 予定実行回数: 3
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/XauLZgnWHtA_part01_partial_material_v001/clip_composition_prompt_v010/20260708-103255/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/XauLZgnWHtA_part01_partial_material_v001/clip_composition_prompt_v010/20260708-103255/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/XauLZgnWHtA_part01_partial_material_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 440672ms - 450696ms: 人間確認で切り抜き側と元配信側が同じ素材と判定された素材ブロックのため。
- 確認状態: partial_material_human_confirmed_with_unjudgeable_exclusions
- compositionプロンプト評価に使えるか: はい

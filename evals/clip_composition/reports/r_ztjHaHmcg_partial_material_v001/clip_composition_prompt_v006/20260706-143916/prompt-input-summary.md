# clip_composition プロンプト入力レポート

- fixture: r_ztjHaHmcg_partial_material_v001
- 生成系統: llm-v006
- プロンプト版数: clip_composition_prompt_v006
- 予定実行回数: 3
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v006/20260706-143916/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v006/20260706-143916/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/r_ztjHaHmcg_partial_material_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 2208172ms - 2224490ms: 素材対応の切り替わり点を境界とする定義に基づく、部分fixture用の素材ブロック草案。
- 確認状態: partial_material_boundaries_human_confirmed_with_unresolved_exclusion
- compositionプロンプト評価に使えるか: はい

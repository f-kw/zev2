# clip_composition プロンプト入力レポート

- fixture: aX-axQMWR3c_single_material_v001
- 生成系統: llm-v012
- プロンプト版数: clip_composition_prompt_v012
- 予定実行回数: 3
- プロンプト本文: /Users/kawafmm/workspace/zev2/evals/clip_composition/reports/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v012/20260708-115349/prompt.md
- モデル入力JSON: /Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/aX-axQMWR3c_single_material_v001/clip_composition_prompt_v012/20260708-115349/prompt-input.json
- 採点用期待値: /Users/kawafmm/workspace/zev2/evals/clip_composition/expected/aX-axQMWR3c_single_material_v001.json

## 分離方針

- プロンプト本文とモデル入力JSONには、期待区間を入れない。
- 代表発話本文と代表発話IDもモデル入力JSONには入れない。
- 期待区間は評価実行時の採点専用データとしてだけ読む。
- このスクリプトはLLM APIを呼ばない。

## 採点側の期待区間

- 4922443ms - 5056495ms: 音声分離確認で切り抜き側と元配信側の素材対応サンプルが全run一致した単一区間素材ブロックのため。
- 確認状態: material_block_audio_separated_human_confirmed
- compositionプロンプト評価に使えるか: はい

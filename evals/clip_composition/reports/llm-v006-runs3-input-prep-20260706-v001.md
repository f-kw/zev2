# llm-v006 実走入力準備

- 目的: 初回のLLM実測として、prompt v006相当を2fixtureで3回ずつ実行し、区間選択の揺れ幅を見る。
- 生成系統: llm-v006
- 区間を生成するもの: Web Gemini + clip_composition_prompt_v006
- 実行回数: 各fixture 3回
- 状態: 入力生成まで完了。Web Gemini実行は未実施。

## 入力

| fixture | model input | prompt | summary |
| --- | --- | --- | --- |
| UpRyakf5j80_clip_audio_v001 | `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v006/20260706-143906/prompt-input.json` | `/Users/kawafmm/workspace/zev2/evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v006/20260706-143906/prompt.md` | `/Users/kawafmm/workspace/zev2/evals/clip_composition/reports/UpRyakf5j80_clip_audio_v001/clip_composition_prompt_v006/20260706-143906/prompt-input-summary.md` |
| r_ztjHaHmcg_partial_material_v001 | `/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v006/20260706-143916/prompt-input.json` | `/Users/kawafmm/workspace/zev2/evals/clip_composition/reports/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v006/20260706-143916/prompt.md` | `/Users/kawafmm/workspace/zev2/evals/clip_composition/reports/r_ztjHaHmcg_partial_material_v001/clip_composition_prompt_v006/20260706-143916/prompt-input-summary.md` |

## 採点時の扱い

- Web Geminiの出力は、各fixtureで3件のJSONとして保存してから採点する。
- 採点結果の `generationSystem.id` は `llm-v006` とする。
- `baseline-rule` の結果とは混ぜず、比較レポート上で別系統として並べる。
- 期待区間はモデル入力に渡さず、採点時だけ読む。

## 次の実行コマンド例

```bash
pnpm tsx evals/clip_composition/score_prompt_output.ts --fixture UpRyakf5j80_clip_audio_v001 --promptVersion v006 --input <gemini-output-1.json> --model gemini-web-flash --params '{"temperature":0,"runs":3}'
pnpm tsx evals/clip_composition/score_prompt_output.ts --fixture r_ztjHaHmcg_partial_material_v001 --promptVersion v006 --input <gemini-output-1.json> --model gemini-web-flash --params '{"temperature":0,"runs":3}'
```


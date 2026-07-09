# theme-llm-v001 初実走サマリー

- generationSystem: `theme-llm-v001`
- prompt: `theme_generation_prompt_v001`
- model: `gemini-web-flash`
- params: `temperature=0`, `requestedThemeCount=8`, `source=gemini-web`
- runs: 3
- 採点対象: Gemini候補の根拠範囲が、人間が切り抜いた正解区間に重なるか。

## 入力と漏えい検査

- モデル入力は元配信STTと元配信メタ情報のみ。
- 漏えい検査: 12 payload中12 pass、fail 0。
- 4件目は未分割1.4MB入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った8窓へ分割した。
- 4件目の採用ブロックが属する元配信は、fixtureのexpected上は6 sourceVideoIdだったため6本を対象にした。

## 一段目範囲hit

| fixture | expected数 | run1 | run2 | run3 |
| --- | ---: | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 1 | 0/1 | 0/1 | 0/1 |
| r_ztjHaHmcg_partial_material_v001 | 6 | 1/6 | 0/6 | 0/6 |
| aX-axQMWR3c_single_material_v001 | 1 | 1/1 | 0/1 | 0/1 |
| XauLZgnWHtA_part01_partial_material_v001 | 6 | 0/6 | 1/6 | 0/6 |

範囲hit候補は合計3件だけ。これは既存の区間比較と同じ機械採点であり、人間確認は含めない。

## 期待区間2

r_ztjHaHmcgの期待区間2は3回とも範囲hitなし。composition側でテキスト希薄だった短区間は、theme生成の一段目でも拾えていない。

## 候補品質の扱い

機械的に確定できるのは、期待範囲に重なったかどうかだけ。過広範囲、別話題、根拠なしは候補の中心がどこにあるかを見る別の根拠検査が必要。

範囲hitした候補:

- r_ztjHaHmcg run1 candidate6
- aX-axQMWR3c run1 candidate6
- XauLZgnWHtA run2 candidate1

## runs 3の揺れ

候補数は大きく揺れた。

| fixture | run1 | run2 | run3 |
| --- | ---: | ---: | ---: |
| UpRyakf5j80_clip_audio_v001 | 3 | 8 | 1 |
| r_ztjHaHmcg_partial_material_v001 | 7 | 8 | 4 |
| aX-axQMWR3c_single_material_v001 | 6 | 5 | 6 |
| XauLZgnWHtA_part01_partial_material_v001 | 45 | 38 | 42 |

完全一致するtitle文字列で見ると、run間の重なりはほぼ0。テーマ生成の揺れは大きい。

## 窓分割

- UpRyakf5j80、r_ztjHaHmcg、aX-axQMWR3cは未分割で送信。
- XauLZgnWHtAは未分割入力が実用不可だったため、8窓へ分割。
- 窓間オーバーラップ: 180000ms。
- 統合は同一sourceVideoIdで根拠範囲が重なる候補だけ。意味ベース統合は未実施。
- XauLZgnWHtAはrunごとに45、38、42候補となり、候補数N=8のfixture単位比較としてはそのまま同列に置けない。これは窓分割運用の課題。

## 生成物

- 一段目採点: `evals/clip_composition/reports/theme-generation/theme-llm-v001-20260709-v001-range-score.md`
- 範囲hit証拠一覧: `evals/clip_composition/reports/theme-generation/theme-llm-v001-20260709-v001-range-hit-evidence.html`
- 漏えい検査: `evals/clip_composition/reports/theme-generation-payload-leakage-20260709-v001-windowed.md`
- 4件目窓計画: `evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/window-plan.md`
- Fixture別範囲hit証拠:
  - `evals/clip_composition/reports/theme-generation/r_ztjHaHmcg_partial_material_v001/theme-llm-v001/20260709-v001/range-hit-evidence.md`
  - `evals/clip_composition/reports/theme-generation/aX-axQMWR3c_single_material_v001/theme-llm-v001/20260709-v001/range-hit-evidence.md`
  - `evals/clip_composition/reports/theme-generation/XauLZgnWHtA_part01_partial_material_v001/theme-llm-v001/20260709-v001/range-hit-evidence.md`

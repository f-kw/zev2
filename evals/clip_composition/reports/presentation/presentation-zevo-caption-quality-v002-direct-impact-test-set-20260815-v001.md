# ZEVO字幕品質v002 直接影響回帰集合 v001

## 1. 導出方法

ZEVO字幕品質v002の正式8検査が宣言する実装path集合と、正式fixture package内の正常proof jobが束縛する51実装pathを合成した。各実装pathについて、同じbasenameの既存test pathが現物に存在するものを列挙し、今回の正式48件に含まれる新規testを除外した。

- 実装pathの供給元: 正式8検査の現物source、fixtureSet `zevo-caption-quality-v002-fu-formal-20260815-attempt-0005` の正常proof job
- 対応規則: `.mjs` / `.ts` / `.tsx` を除いたbasenameへ `.test.mjs` / `.test.ts` / `.test.tsx` を付け、現物存在を確認
- 除外: 正式48件の8 test path
- 結果: 直接影響する既存test 15 path

## 2. 固定集合

1. `evals/clip_composition/presentation_a_meaning_information_package_v002.test.mjs`
2. `evals/clip_composition/presentation_a_source_sequence_v002.test.mjs`
3. `evals/clip_composition/presentation_base_media_timeline_v002.test.mjs`
4. `evals/clip_composition/presentation_fatal_observation_v002.test.mjs`
5. `evals/clip_composition/presentation_meaning_information_package_v001.test.mjs`
6. `evals/clip_composition/presentation_output_base_media_v001.test.mjs`
7. `evals/clip_composition/presentation_output_contract_v001.test.mjs`
8. `evals/clip_composition/presentation_output_page_line_planner_v001.test.mjs`
9. `evals/clip_composition/presentation_output_page_line_planner_v002.test.mjs`
10. `evals/clip_composition/presentation_output_piecewise_timeline_v002.test.mjs`
11. `evals/clip_composition/presentation_output_render_plan_v001.test.mjs`
12. `evals/clip_composition/presentation_output_render_plan_v002.test.mjs`
13. `evals/clip_composition/presentation_output_style_resolver_v001.test.mjs`
14. `evals/clip_composition/presentation_retained_source_atoms_v001.test.mjs`
15. `evals/clip_composition/presentation_segmenter_boundary_evidence_v001.test.mjs`

## 3. 実行条件

固定Node、固定TSX CLI絶対path、`NODE_OPTIONS`不存在、native環境で15 pathを一つのNode test runner attemptとして頭から実行する。TAP、stderr、終了code、signalを独立保存する。不合格一件で停止し、同attempt内では修正しない。

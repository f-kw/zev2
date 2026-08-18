# ④.5 レンダリング疎結合化 作業path退避台帳 v001

## 1. 退避境界

- 退避root: `evals/clip_composition/reports/presentation/archive/presentation-rendering-decoupling-20260818-v001`
- 退避日時: 2026-08-18 JST
- 退避対象: 失敗・診断・旧attemptの証拠、旧job/control/render、機械生成work/lock、今回のbaseline実行で生じた未追跡failure/synthetic成果物、`/private/tmp`のjob製造helper
- 退避対象外: 最終attempt、最終job/control/render、正式44件証拠、baseline最終証拠、5 tree/A-v002最終証拠、注文書レビューページ、復元した3.38GB fixture

## 2. 退避結果

- manifest追加前file数: 1,582
- manifest追加前総byte: 699,650,201
- manifest追加前の全fileについて、相対path順に並べた`SHA-256  path`列のSHA-256: `db62b4add101f5fc53cf6f77babffd8884eb7309c47b76fe49c3b9e6c3722ca4`
- 削除: 0件
- 退避原本は各fileのworkspace相対pathを`workspace/`配下で維持した。

## 3. exact分類

次の境界内にある全pathを退避対象のexact集合とする。

1. `workspace/evals/clip_composition/reports/presentation/test-runs/` — 最終証拠として元位置へ残した10 root以外の本work-order test/diagnostic attempt。
2. `workspace/evals/clip_composition/reports/presentation/test-fixtures/` — 不合格となったfixture selftest staging 1 root。
3. `workspace/evals/clip_composition/reports/presentation/` — 停止報告v001〜v008、統合検証報告v009、baseline単独調査、行末裁定材料、着工前実験。
4. `workspace/evals/clip_composition/outputs/presentation/rendering-decoupling-caption-control/` — v001〜v005。v006は元位置に保持。
5. `workspace/evals/clip_composition/outputs/presentation/rendering-decoupling-caption-renders/` — v006の完成output以外の旧outputと全機械生成work/lock。
6. `workspace/evals/clip_composition/outputs/presentation/rendering-decoupling-title-control/` — landscape/vertical v017以外。
7. `workspace/evals/clip_composition/outputs/presentation/title-output-jobs/` — landscape/vertical v017以外の`*decoupled*` job。
8. `workspace/evals/clip_composition/outputs/presentation/title-output-renders/` — landscape/vertical v017完成output以外の`*decoupled*` outputと全機械生成work/lock。
9. `workspace/evals/clip_composition/outputs/presentation/base-media-failures/` — 本work-order中に生成され、git未追跡だったfailure成果物。
10. `workspace/evals/clip_composition/outputs/presentation/renderer-v002-synthetic-test/` — 本work-order中に生成され、git未追跡だったsynthetic case。
11. `private-tmp/manufacture_rendering_decoupling_title_jobs_v016.mjs` — 使用済みjob製造helper。

## 4. 元位置へ残した最終証拠

- test run 10 root: formal 44、caption v006、title横/縦v017、baseline attempt-0002、5 tree attempt-0004、A-v002 attempt-0002、renderer support、title compositor回帰、title runner回帰。
- final output 8 root: caption control/render各1、title control/job/render各横縦2。
- 復元fixture: `evals/clip_composition/outputs/presentation/base-media/.DmWu0jVQfTE-candidate-13-v002.work-ovnjGJ/source-grid.f32le`。

## 5. 判定

失敗証拠・停止報告・attempt記録は削除せず退避した。最終レビューが参照する9成果物はすべて元位置に残し、manifest記載SHAと再照合済みである。

# 縦型正式経路 未発火12違反code・旧名3件 整理案 v001

日付: 2026-08-02  
状態: 読み取り棚卸し。契約・実装・検査は変更していない。

## 結論

36件一覧のうち24件は拒否枝から同名codeを実測済み、12件は未発火または返却code未観測である。うち3件は、承認済み追補で現行名へ非互換置換されたのに縦型rendererの集約一覧だけに残った旧名である。現行名へ黙って読み替えて「36/36発火」とは扱えない。

## 根拠と基準点

- 実発火観測表:
  `evals/clip_composition/reports/presentation/presentation-vertical-formal-path-actual-violation-code-observations-20260730-v001.md`
- 同表SHA-256: `5f5604c56765c6cb79eb82dad08160c4ce88a56a369f3ebe080a26f33084be1e`。
- 旧名置換の承認済み正本:
  `evals/clip_composition/reports/presentation/presentation-vertical-formal-path-cost-spending-cap-amendment-20260729-v001.md`
- 同追補SHA-256: `d761d1ab40b2de97df01b3d92110773a19aefa643a44aa6b3b4f46a3dc79fefa`。§10は順23〜25の名前と意味を現行名へ置換すると確定している。
- 生TAPは92/92合格だが、静的な一覧確認を実発火へ数えず、拒否枝を実行して返却codeを同名で観測したものだけを24件と数えている。
- 2026-08-02のB4契約復元では3項目来歴の正常出力検査だけを追加しており、下記12 codeの拒否枝・返却code観測は追加していない。

## 12件の内訳

| 状態 | code |
|---|---|
| 一覧・設計にあるが現行実装の発火箇所なし | `DISPLAY_POLICY_BINDING_INVALID` |
| 同上 | `DISPLAY_POLICY_REGISTRY_MISMATCH` |
| 同上 | `DISPLAY_POLICY_WIDTH_MISMATCH` |
| 同上 | `DISPLAY_PRESET_BINDING_MISMATCH` |
| 拒否枝はあるが既存検査が返却codeを観測していない | `DISPLAY_FORMAT_BINDING_MISMATCH` |
| 同上 | `VERTICAL_RENDER_RUNTIME_BINDING_MISMATCH` |
| 同上 | `API_USAGE_BUDGET_VIOLATION` |
| 表示整形だけで検出枝を起動していない | `VERTICAL_LAYOUT_INPUT_HASH_MISMATCH` |
| 同上 | `VERTICAL_RENDER_INPUT_BINDING_MISMATCH` |
| 現行費用検査から除かれたが集約一覧に残る旧名 | `API_COUNT_TOKENS_BILLING_UNVERIFIED` |
| 同上 | `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED` |
| 同上 | `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED` |

## 旧名3件と現行名

| 旧名 | 現行名 | 現行名の実発火 |
|---|---|---|
| `API_COUNT_TOKENS_BILLING_UNVERIFIED` | `API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID` | 未観測。C02は正常受理のみ |
| `API_COUNT_TO_PROMPT_BOUND_UNVERIFIED` | `API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | C03/C20で観測済み |
| `API_MAX_OUTPUT_BILLING_BOUND_UNVERIFIED` | `API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID` | C04で観測済み |

## 整理案

1. 現在の一本完成を止めて12件を埋める作業は行わない。
2. 旧名3件は新しい製品判断を要しない。承認済み追補どおり集約一覧を現行名へ訂正し、旧名は改訂履歴だけに残す候補とする。
3. 現行の拒否枝がある5件と、現行code 23の負例は、productionを変えず、その枝を実際に起動して返却codeを観測する検査だけを追加候補にする。
4. 専用発火実装のない4件は、防御装置を増築せず、次の縦型契約改訂で一覧から削除して既存の汎用拒否へ一本化する案を推奨する。残す場合だけproduction側の所有改訂が必要になる。
5. 静的確認や代表枝の推測を「実発火」と数えない規律を維持する。

この整理方針自体は未承認であり、本書では一覧・実装・検査を変更しない。

## 今回の描画fatalとの関係

今回観測した`VERTICAL_RENDER_V001_RUNNER_FATAL`はこの12件とは別の外側fatalである。12件の整理によって今回の内側原因が判明するとは主張しない。

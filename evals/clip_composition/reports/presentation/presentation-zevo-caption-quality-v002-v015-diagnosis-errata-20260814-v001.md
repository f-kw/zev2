# ZEVO字幕品質v002 v015起草前診断 errata v001

- 日付: 2026-08-14
- 追加診断実行: 0回
- 訂正対象: v015起草前診断v001・同停止報告v001

v001は、診断sourceの`import(RELATIVE_FROM_DIAG)`を「相対literalの直接評価」と誤記した。実際にはruntime変数指定子であり、正式F productionの`import('./presentation_output_caption_cue_source_package_v001.mjs')`とはTSX変換上の同じ入力ではない。v001と停止報告を上書きせず失敗証拠として保持する。

保存済み証拠を正しく組み直すと、固定Node→固定TSX CLI→`--test`という同じ正式launcher形で次が成立する。

1. 正式F attempt-0007: relative literalをprivate loaderから評価し、`dependency-evaluate / ERR_UNSUPPORTED_RESOLVE_REQUEST`で失敗。
2. v015診断実行v001: F module URLから解決した絶対file URLを評価し、成功。

追加実行なしで、v015が必要とするrelative literal失敗とresolved URL成功の二枡を閉じる。正本診断recordはv002とする。


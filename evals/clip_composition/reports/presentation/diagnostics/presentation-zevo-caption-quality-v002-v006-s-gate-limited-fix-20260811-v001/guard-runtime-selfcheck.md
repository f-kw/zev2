# S test直接起動guard 実行時自己検査

- 日付: 2026-08-11
- production変更: 0件

## 直接起動側

- S testを直接起動し、登録検査数6件を確認した。
- fixture helperを通るZCQ002を実行し、1件合格・残る5件はname patternによりskipとなった。
- 名前解決失敗: 0件
- TAP: `/private/tmp/zevo-caption-quality-v002-s-guard-selfcheck-v001/direct.tap`

## B5/B6 import側

- B5/B6 testを直接起動し、S moduleを共用owner解決入口としてimportした。
- 登録検査数はB5/B6所有の11件だけで、S所有6件の追加登録は0件だった。
- 共用owner解決入口を使用するbefore hookは合格した。
- TAP: `/private/tmp/zevo-caption-quality-v002-s-guard-selfcheck-v001/imported-by-b5-b6.tap`

直接起動guardは、S直接起動時の6件登録と、B5/B6 import時のS登録0件を両立した。

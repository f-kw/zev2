# A-v002 縦型 layout-preflight 診断・最終周回修正設計 v001

## 1. 結論

縦型字幕の物理配置は、既存の縦型専用検査で8件すべて合格した。停止原因は字幕、style、契約ではない。proof runnerだけが、その合格結果を共通描画処理へ渡さず、縦型用の描画入力を横型用の汎用配置検査へ誤接続していた。

三分法の帰属は「実装が契約に届いていない」である。fixture・検査設営の欠陥でも、契約矛盾でもない。

## 2. 保存済み観測

- 正式attempt: `attempt-0011`
- job SHA-256: `9628f013a766c30f0c19b76e132f485d1c6227fdaf356e9eff7b1c02811af2e8`
- 終了: code 2
- 内側観測: `layout-preflight / CHILD_PROCESS_EXIT_NONZERO`
- checkpoint: 縦型の共通描画計画・媒体inspection・描画work取得までは完了し、`rendering-entered`の後で停止
- 保存された縦型配置入力: 6,152 byte、SHA-256 `3b0b0d2bc26858f2daa950ae188f4c8b3ba4fd700b8140273b5c066591f4e6b3`
- `layout-output.json`: 生成なし
- 横型第1号: SHA-256 `b12ec0af708af0a5afa69488b72bf55a6300bbed162877c59cc9154f79f14fcf`のまま保持

## 3. 値レベルの原因

保存入力の8 overlayは、縦型Remotion用の9 fieldだけを持つ。横型用検査器が要求する`schemaVersion`、`instructionId`、`visualState`等を持たない。保存入力を既存pure入口へ渡すと、横型用検査器は全件共通で`renderer overlay props schema mismatch`を返す。

同じrender planと縦型presetを既存の縦型専用検査へ渡すと、8/8合格、違反0件となる。したがって、縦型配置の不成立ではなく検査入口の取り違えである。

## 4. 修正

正式な縦型rendererが既に使う`inspectPresentationVerticalTextLayoutV001`をproof runnerから呼び、その合格結果を共通描画入口の`validatedLayoutInspection`へ渡す。

- 横型は従来どおり汎用配置検査を使う。
- 汎用検査器の受理範囲は広げない。
- 縦型入力を横型shapeへ変換・偽装しない。
- 検査skip、fallback、新しい計算を作らない。
- 縦型専用検査が不合格なら、既存の配置不成立として拒否する。

## 5. 最終周回

本修正は、checkpoint装備後の許可済み周回2/2である。修正後は正式92件を頭から一度実行し、合格した場合だけrunner SHAを更新した新版jobと未使用rootで正式proofを一度実行する。そのattemptでfatal、検査済み拒否、QC不合格が1件でも出た場合、3周目は行わず停止する。

## 6. 不変条件

- v007 root、v009 job、attempt-0011、renderer work、lock、一時媒体を証拠として保持する。
- 既存成果物、既存契約、schema、違反code、style、三つの切断時刻を変えない。
- API通信0回、費用US$0。
- 人間目視前にtagを発行しない。

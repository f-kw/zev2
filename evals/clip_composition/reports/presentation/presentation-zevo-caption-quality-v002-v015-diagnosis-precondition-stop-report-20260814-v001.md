# ZEVO字幕品質v002 v015起草前診断 不成立停止報告 v001

- 日付: 2026-08-14
- 判定: v015を起草せず停止
- 診断実行: 1回
- production・test・fixture・契約変更: 0件
- 外部API通信: 0回
- API費用: US$0

## 1. 結論

固定Nodeから登録済み固定TSX CLIを起動する同一の診断processで、最初のsource依存を二つの指定子形で一度ずつ評価した。

| 比較 | 実測 | code識別子 |
|---|---|---|
| 相対指定子の直接評価 | 成功 | `null` |
| F module基点で解決・検証した絶対file URLの評価 | 成功 | `null` |

解決済みfile URLによるimportが成功することは確認できた。しかし、裁定が要求した「同じ文脈では相対指定子だけが失敗する」という対照は再現しなかった。この診断だけでは、絶対URL化が成功の一意な原因だと証明できない。

したがって完全一致条件を満たさず、v015の起草、DECISIONSへの承認記録、production/test実装、F新attemptへ進んでいない。

## 2. 正式attemptとの違い

正式attempt-0007では、F test moduleが複数のproduction moduleを既にimportしたprocess内でF productionのprivate loaderを実行し、相対指定子が`ERR_UNSUPPORTED_RESOLVE_REQUEST`で失敗した。

今回の診断は固定Node・固定TSX CLI・`--test`を使ったが、fixture/output/stagingを使わない独立診断moduleである。そのprocessでは相対指定子も成功した。差は少なくとも、importer module、先行import集合、TSX変換済みmoduleの評価履歴に残る。どれが原因かは本診断から確定しない。

独立診断を正式F processと「同じ文脈」とみなして結果を上書きすることはしない。

## 3. 三分法

| 分類 | 判定 |
|---|---|
| production処理内容 | 本診断では不合格を観測していない |
| fixture・検査設営 | fixtureは不使用。診断moduleは正式Fのimport文脈を十分再現しなかった |
| 契約 | v015の前提証明が閉じていないため、契約改訂へ進めない |

帰属は「起草前診断の文脈再現不足」であり、正式attempt-0007の停止原因を否定・訂正するものではない。

## 4. 未実施

- v015起草: 0件
- v015完全一致監査: 0件
- DECISIONSのv015承認記録: 0件
- production/test修正: 0件
- F新attempt: 0件
- U、正式46件、回帰、tree照合: 0件
- API通信、費用、描画、stable tag: 0件

## 5. 証拠

- 診断record: `presentation-zevo-caption-quality-v002-v015-resolved-url-import-diagnosis-20260814-v001.json`
- TAP全文: `test-runs/20260814-zevo-caption-quality-v002-v015-import-diagnosis-v001/tap.log`
- stderr: `test-runs/20260814-zevo-caption-quality-v002-v015-import-diagnosis-v001/stderr.log`
- 終了code: `test-runs/20260814-zevo-caption-quality-v002-v015-import-diagnosis-v001/exit-code.txt`

## 6. 次に必要な判断

追加診断を行うなら、formal F processと同じ先行import集合・同じF module importer・同じprivate loader構造を再現しつつ、fixture/output/stagingを使わない観測入口が必要になる。その入口を一時診断で作るか、v014の観測装備を使う正式F側にresolved URL対照能力を追加するかは新たな設計判断である。


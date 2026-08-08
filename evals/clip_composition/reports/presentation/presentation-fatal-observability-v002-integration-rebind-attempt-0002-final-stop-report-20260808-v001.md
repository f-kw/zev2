# fatal観測性v002 統合再束縛 attempt-0002 最終停止報告 v001

- 日付: 2026-08-08
- 判定: **停止**
- 周回: 最終周回 2/2
- 通信: 0回
- 費用: US$0
- production・契約・正式成果物の変更: 0件
- commit A: 未作成

## 1. 到達結果

起動前に、ネイティブ環境、固定Node先頭PATH、固定TSX、`NODE_OPTIONS`不存在、Chromium起動可能、競合processなし、attempt root未使用を実測した。その後、直接影響130件をattempt-0002として頭から一度だけ実行した。

結果は **128/130** だった。不合格1件以上の停止条件に従い、同attempt内の修正をせず、green 287件、baseline exact、既存5 tree照合、commit Aへ進んでいない。3周目も実行しない。

## 2. 保存済み証拠

| 項目 | 値 |
| --- | --- |
| TAP | `evals/clip_composition/reports/presentation/test-runs/20260808-fatal-observability-v002-integration-rebind/attempt-0002/direct-impact-130.tap` |
| TAP SHA-256 | `ac3fa8453cce332de82dcda95388de1b7467db33fe4fa3afb1fd8dfc1df7b3cc` |
| stderr | `evals/clip_composition/reports/presentation/test-runs/20260808-fatal-observability-v002-integration-rebind/attempt-0002/direct-impact-130.stderr` |
| stderr byte | `0` |
| stderr SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| 合計 | 130 |
| 合格 | 128 |
| 不合格 | 2 |

OEE002の事前診断と起動条件の実測値は、`presentation-fatal-observability-v002-oee002-native-preflight-diagnosis-20260808-v001.md`へ保存した。

## 3. 解消した4件とOEE006

ネイティブ実行により、attempt-0001で残っていたOEE001、OEE005、OEE007、OEE008は合格した。共通描画childが本来の検査分岐より前で止まっていた環境要因という帰属が実測で成立した。

OEE006も合格した。期待を旧`unknown / UNCLASSIFIED`へ戻さず、productionが正式観測する`overlay-render / CHILD_PROCESS_EXIT_NONZERO / targetFile null`へ置換したことで、観測性向上をそのまま検査できた。

## 4. 残る2件

| ID | 実測 | 帰属 |
| --- | --- | --- |
| OEE002 | 正常縦型の期待`passed`に対し`rejected` | **未確定**。現行実装・fixtureではネイティブ環境だけで解消しなかった |
| OPF012 | 固定TSX loaderの期待が絶対path、実測が同じ実体を指す相対path | 実行commandの設営欠陥 |

OPF012では、実体SHAは固定値と一致しているが、正式検査が固定した起動引数は絶対pathである。attempt-0002を`--import ./runner/node_modules/tsx/dist/loader.mjs`で起動したため不合格になった。起動前checklistは「固定TSX実体」までしか照合せず、**起動引数のexact絶対path**を照合しなかった。

OEE002は、過去の制限環境不合格／ネイティブ合格の対照を現在にも適用できると事前判定したが、attempt-0002で反証された。過去の対照は当時のコードとfixtureに対しては正しいが、その後の承認済み変更を含む現在のOEE002の内側理由を証明していなかった。歴史的相関を現在の値レベル原因確定として扱った点が、今回の実現性調査の不足である。

## 5. 事実・推測・未確認

### 事実

- ネイティブ環境でOEE001、OEE005、OEE006、OEE007、OEE008は合格した。
- OEE002はネイティブ環境でも`rejected`だった。
- 現行OEE002は最初のstatus assertで停止し、内側の受入報告・違反内容をTAPへ残していない。
- OEE002のfixture成果物はtestの`finally`で削除されるため、attempt-0002後の作業treeに内側報告は残っていない。
- OPF012は固定loaderのbyteではなく、起動引数の相対／絶対表記差だけを検出した。

### 推測

- OEE002には、実行環境とは別の現在fixtureまたは入力束縛の不整合が残っている可能性がある。

### 未確認

- OEE002を`rejected`にした違反code、field、値。
- OEE002がproduction欠陥、fixture・検査設営欠陥、契約矛盾のどれに属するか。

## 6. 実現性調査の改訂点

正式commandの実現性調査では、ネイティブ環境、実体SHA、`PATH`、`NODE_OPTIONS`、Chromium起動だけでなく、**Nodeへ渡す固定TSX loaderの起動引数が契約どおりの絶対pathであること**まで実行直前に照合する必要がある。

過去の環境対照を現在の原因へ適用する場合は、対象コード・fixture・入力束縛が対照時点と同じ意味であることを値レベルで確認する。確認できない場合は「環境仮説を支持する」に留め、原因確定としない。

## 7. 範囲改訂案

3周目のformal attemptとして直ちに再実行せず、次を新しい範囲として人間判断へ戻す。

1. OEE002だけについて、現在の同じfixtureを一度構築し、cleanup前の受入報告・違反code・対象field・値を版付き診断pathへ保存する診断入口をtest側に限定して設ける。productionは変更しない。
2. 診断後、production欠陥／fixture・検査設営欠陥／契約矛盾の三分法を確定し、契約に触れる場合は修正せず提示停止する。
3. OPF012はコードを変えず、固定TSX loaderの契約済み絶対pathをformal commandへ渡す。起動前checklistで`process.execArgv`相当のexact値を実行前に照合する。
4. OEE002が契約に触れない限定修正で閉じた場合だけ、別の承認済み新計画として直接影響130件を頭から一度実行する。
5. 130/130の場合だけgreen 287、baseline exact、既存5 tree、commit A・18 path SHA表へ進む。

この範囲改訂は、失敗した最終周回の継続や3周目ではなく、原因未観測のOEE002へ診断可能性を追加してから改めて成立性を判断する計画である。

## 8. 停止点

本報告の提示で停止する。OEE002診断入口、追加診断、修正、再実行、green、baseline、tree照合、commit Aは実施しない。

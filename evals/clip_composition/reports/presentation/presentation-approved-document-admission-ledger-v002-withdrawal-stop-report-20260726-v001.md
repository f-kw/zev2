# approved-document-admission-ledger-v002 撤退停止報告 v001

- 日付: 2026-07-26
- 対象: 承認済み文書台帳v002の実装前preflight閉包後の実装
- 開始基準commit: `ccf268492c0966774b3c247473865fa408ede7b2`
- 結論: **文書統治層の独立停止2件目に到達したため、追加patchを行わず撤退する**
- 正式検査: **未実行**
- B5・token計測・API通信・Gemini実走: **未着手**

## 1. 本来の目的

今回の目的は、承認済み文書の内容と承認来歴を、Gitのcommit前後で改変不能な形に固定することだった。

その実装は、次の全条件を同時に満たして初めて成立する。

1. 承認済みの契約から実装者判断なしに処理を導ける。
2. 違反71件、fatal 7件、統合25件の正式103検査を、正規の入口から実際に発火させられる。
3. 検査のために本番index、本番成果物、本番出力先を壊さない。
4. 検査専用の非公開分岐や、承認されていない注入口を後付けしない。

正式103件を走らせる前の静的閉包で、2と3と4を同時に満たせないfatal検査2件を確認した。

## 2. 観測した未閉包

### 2.1 F006 `TOOL_GRAPH_EXECUTION_FAILED`

追補はF006の検査入力を、bootstrap commit前のindexから検査対象fileを1件欠落させる形として固定している。

一方、承認済みのoperator launcherは次を固定している。

- production repositoryの固定cwdで動く。
- productionのGit indexをmaterialize元として読む。
- 一時Git repositoryや別indexを渡すCLI引数・context・環境変数を持たない。
- 公開されている読み取り専用inspection入口は、入力不足をF006 fatalとして生成せず、呼出し不正として拒否する。

したがって、本番indexを変更せずに「検査対象fileが欠けたbootstrap index」をlauncherへ渡す正規入口がない。

### 2.2 F007 `REPORT_WRITE_FAILED`

追補はF007の検査入力を、bootstrap commit前の正式report親directoryを読み取り専用にする形として固定している。

一方、承認済み契約では次を固定している。

- report保存はmaterialize後checkerの内部責務である。
- 外側launcherはreportを保存しない。
- checkerのreport writerは公開検査入口ではない。
- production report path以外を渡す正式なfixture contextはない。

したがって、本番report directoryの権限を変更せずに保存失敗を実発火させる正規入口がない。

## 3. 採らなかった回避策

次の回避策はいずれも採らなかった。

| 回避策 | 採らない理由 |
|---|---|
| F006/F007を期待JSONの形だけで合格にする | fatalの実発火検査にならず、103件合格を偽装する |
| launcherまたはcheckerへ検査専用注入口を追加する | 承認済み契約にない公開面・分岐の追加になる |
| production indexから対象fileを一時的に外す | 本番indexの不可侵とfixture隔離に反する |
| production report directoryを一時的に読取専用にする | 本番出力先を検査のために変更する |
| 一時Git repositoryをlauncherへ黙って渡す | その受け渡し入口自体が新しい契約設計になる |
| F006/F007を正式103件から外す | 承認済み件数閉包とfatal全件発火契約を実測後に緩める |

## 4. 撤退条件への照合

### 停止1件目

2026-07-26の実装前preflightで、単一scannerの契約未閉包と、承認済み文書pathの非登録変更・復元を履歴検査が捉えない問題を同一監査パスで確認した。

人間裁定後、両方を一つの版付き追補へ閉じた。この時点で撤退カウンタは`1/2`だった。

### 停止2件目

本報告のF006/F007は、追補承認後に正式検査を実装へ写す別の監査パスで発見した。

- 前回のscanner・履歴遷移の未固定とは根因が異なる。
- 正規検査入口の不存在を解消するには新しい契約判断が必要である。
- 同じ入力から見つかったF006/F007を二つの停止へ水増しせず、まとめて独立停止1件と数える。

よって撤退カウンタは`2/2`となった。承認済み撤退契約どおり、追加patch、3件目の掘削、B5再開を行わない。

## 5. 実装・検査の到達状態

正式成果として成立したものはない。

| 項目 | 状態 |
|---|---|
| v002 schema・core・checker・runner | 未承認の途中実装。正式成果にしない |
| 単一scanner | 静的監査途中。正式検査なし |
| code 71履歴検査 | 途中実装。collectorとvalidatorの不一致が残る |
| 正式103件 | ID草案はあるが、F006/F007が実発火でないため正式検査として未完成 |
| 正式103件の実行 | 0回 |
| 既存6件の移行 | 0件 |
| 承認記録3件の生成 | 0件 |
| bootstrap commit前後検査 | 0回 |
| 台帳・job・正式reportの公開 | 0件 |
| stage・bootstrap commit | 0件 |

途中実装5fileはGitへ一度も登録せず、本報告の確定時に作業ツリーから除いた。途中物の結果を「部分合格」または将来互換資産として扱わない。

## 6. 撤退時に確認した未完了事項

撤退条件到達後は修正していない。読み取り監査で見えていた未完了は次のとおり。

1. 通常jobのstrict shapeと、正式commit path集合の参照が未完成。
2. commit前後のdiff取得が、契約上のbase→index／base→HEADの記録形と一致していない。
3. postcommitで差分0件を期待する誤りが残る。
4. reportのsource・evidenceのphase別null契約が一致していない。
5. 証拠projectionの版と、snapshot全体hashの正本が一致していない。
6. 登録commit候補数をOID総数ではなく行数として数える箇所がある。
7. 移行結果がbootstrap phase以外にも出る。
8. bootstrap自己証明のphaseと報告直列化の件数契約が一致していない。
9. I025は一時Git repositoryの正式collector経路へ未接続。

これらは3件目以降の掘削対象にせず、未完成であるという状態だけを記録する。

## 7. スケルトン設計へ戻す論点

本件は、文書台帳の防御が次の規模へ達したことを示した。

- JavaScriptのimport・re-export・dynamic import・`require`・`import.meta`を解釈する小型静的解析器。
- Git index、HEAD、first-parent履歴、文書identity遷移を同時に扱う検査器。
- launcher、materialize後checker、report writerの各失敗を、実物と同じ経路で独立発火させる検査環境。

これは単一の文書binding機能に対して防御層が大きくなりすぎている可能性を示す。将来のスケルトン設計では、patchを続ける前に次を決める。

1. どの種類の文書だけが台帳束縛を本当に必要とするか。
2. 直接指示・設計書・承認記録・停止報告を同じ強度で束縛する必要があるか。
3. fatal経路を本番と同一に検査するためのfixture境界を、production公開面を増やさずどこへ置くか。
4. 小型JavaScript静的解析器を文書統治層が持つ費用に見合うか。

## 8. 維持する安定状態

- 最新の検証済み撤退点: `stable/b4-complete-20260726`
- B3正式package、B4成果物、既存正式成果物: 不変
- B5: 再開しない
- token計測、API通信、Gemini実走、正式表示計画、演出指示書、描画: 未実施
- 新しいstable tag: 発行しない
- JOURNAL: 追記しない

台帳v002の文書設計commit `ccf268492c0966774b3c247473865fa408ede7b2`は経緯記録として保持するが、実装完了や検査済みを意味しない。

## 9. 人間作業

今回必須の人間作業は0件。

次に必要なのは実装の再承認ではなく、スケルトン設計で「どの文書を、どの強度で束縛するか」を決める方針判断である。現時点で検査や動画視聴を依頼しない。

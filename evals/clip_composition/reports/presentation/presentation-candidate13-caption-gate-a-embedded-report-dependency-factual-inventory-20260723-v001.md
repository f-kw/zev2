# candidate 13 ゲートA内包検査記録 依存関係実測 v001

- 作成日: 2026-07-23
- 区分: 人間待ち充填方式による副線・読み取り専用調査
- 主線: ゲートB方向設計と承認補足の一括判断待ち
- 状態: **事実確認のみ。契約未確定・未実装・未実走**
- 書き込み範囲: 本レポート1件だけ。共有文書、承認済み設計、コード、正式成果物は変更していない
- 人間作業: 0件。副線から新しい確認依頼は出さない

## 1. 調べた問い

ゲートB方向設計は、固定済みゲートAの境界生成処理、検査処理、検査報告の検証処理を再利用し、ゲートA形の検査記録をB1 packageへ内包する案を示している。

ここでは、そのうち次の一点だけを実装前に現物確認した。

> ゲートAの正式runnerを再実行せず、private処理を直接再利用したと偽らず、既存の検査判定を別実装で再現せず、現在exportされている入口だけで、既存の検査報告検証処理が正常受理する入力を組み立てられるか。

## 2. 結論

**現状のexport済み入口だけでは組み立てられない。**

境界証拠を作る処理、10観点・35違反種類で検査する処理、組み立て済み検査報告の相互一致を検証する処理はexportされている。しかし、次は正式runner内部のprivate処理である。

- job・実装3ファイル・入力3ファイルの安定読み取りと再読み取り。
- 実行環境の開始時・終了時束縛。
- 正式出力先と祖先directoryの前後監視。
- 同じ境界証拠の二度生成。
- 9項目のcontextから検査処理を呼ぶ順序。
- 検査結果と裏付け情報から10 fieldの検査報告を組み立てる処理。

export済みの検査報告検証処理は、checkerを再実行して報告を作る処理ではない。**すでに存在する報告を含む8項目の相互一致を再検証する述語**である。報告以外の裏付けは7項目である。

したがって、方向設計を採用する場合、B1実装契約には、ゲートA実装を変更せずに上記の組立を行う**B1側の版付き内包ゲートA記録組立入口**が必要になる。これとは別に、B1 job、漏洩、package、公開状態を検査する**B1 package検査・公開正本入口**が必要である。同じrunnerに置くかは未固定であり、本レポートでは決めない。

用語を次のように分ける。

- **直接再利用**: 既存byteを変更せず、export済みの境界生成処理、checker、report validator、読み取り専用ファイル操作面をimportして呼ぶこと。
- **B1新規組立**: 安定snapshot、実行環境束縛、読み取り専用監視、二度生成、checker context、検査報告を、B1の版付き契約と検査を持つ新しい処理として作ること。これはゲートA private helperの直接再利用とは呼ばない。
- **禁止する複製**: checkerの違反判定・帰属と、report validatorのschema・相互binding・自己整合判定を別実装で再現すること。privateコードの丸写しも直接再利用とは呼ばない。

実質的な検査判定の正本はcheckerである。report validatorは、組み立て済みゲートA報告のschema・相互binding・自己整合の正本であり、checkerを実際に呼んだ事実を単独で証明するものではない。B1 package全体の正本は、B1固有の検査入口が担う。

これは方向設計への反証ではない。既存正本を再利用する方向は維持できるが、「既存exportだけで内包記録まで既に作れる」という状態ではないことを確定した。

## 3. 現在のexportとprivate境界

### 3.1 export済み

| 処理の意味 | 現在の正本入口 |
|---|---|
| 354文字から境界証拠を作る | `buildPresentationSegmenterBoundaryEvidenceV001` |
| job、実装、入力、環境、境界証拠、期待投影、決定性、読み取り専用状態を検査する | `checkPresentationSegmenterBoundaryPreflightV001` |
| 検査名・35違反種類・module URLを参照する | ゲートA coreの公開定数 |
| 組み立て済み報告を含む8項目を照合する | `validatePresentationSegmenterBoundaryPreflightReportV001` |
| productionと同じ読み取り専用ファイル操作面を得る | `createPresentationSegmenterBoundaryProductionFilesystemAdapterV001` |
| job pathからゲートA正式preflight全体を実行する | programmatic runnerとCLI |

### 3.2 private

| private処理 | runner内の位置 | 作るもの |
|---|---:|---|
| jobの初回安定読み取り・再読み取り | 253、277行付近 | job本体、path、前後hash、問題状態 |
| 実装3ファイルの初回安定読み取り・再読み取り | 305、342行付近 | 実装path・hash・module実体 |
| 入力3ファイルの初回安定読み取り・再読み取り | 398、447行付近 | role、path、前後hash、JSON本体、問題状態 |
| 正式出力先・祖先directoryの前後監視 | 508、559行付近 | 読み取り専用監視結果 |
| Node実体・Node/ICU・日本語分割条件の前後確認 | 591、634行付近 | 実行環境束縛 |
| 同じ入力から境界証拠を二度作る | 653行付近 | 二つの境界証拠、生成失敗状態 |
| 検査報告の組立 | 816行付近 | 10 fieldの`presentation-segmenter-boundary-preflight-report-v001` |

runner moduleが現在exportするのは、ファイル操作面、report validator、programmatic runner、CLIの4件だけである。動的importでexport一覧も確認した。検査報告の組立処理はexportされていない。

### 3.3 現行runnerの実測処理順

現行の正常経路は次の順である。順序を入れ替えても同じゲートA形になるとは確認されていない。

1. jobを初回安定読み取りし、job本体と初回hashを得る。
2. 正式出力先と祖先directoryの監視前状態を採る。
3. 実装3ファイルを初回安定読み取りする。
4. 入力3ファイルを初回安定読み取りし、JSON本体を得る。
5. Node実体・Node/ICU・日本語分割条件の開始時束縛を得る。
6. **開始時の実行環境束縛**を使い、同じ境界証拠を二度生成する。
7. job、実装3ファイル、入力3ファイルを再読み取りする。
8. 実行環境束縛を終了時に再確認する。
9. 正式出力先と祖先directoryの監視後状態を採る。
10. job、job読取記録、実装読取束縛、入力読取記録、**終了時の実行環境束縛**、二度生成結果、生成失敗状態、読み取り専用監視、production指定の9項目をcheckerへ渡す。
11. checker結果と裏付けから検査報告を組み立てる。
12. 検査報告を含む8項目をreport validatorへ渡す。

境界証拠の生成が使うのは開始時の実行環境束縛であり、checkerとreport validatorへ渡るのは終了確認後の実行環境束縛である。正常時には一致すべきだが、同じ値だと仮定して一つに畳むことはできない。また、境界証拠生成は各ファイルの再読み取りより前に行われる。

## 4. report validatorが要求する8項目

`validatePresentationSegmenterBoundaryPreflightReportV001`は、外側objectに次の8項目がちょうど存在することを要求する。

| 入力 | 正常系での由来 | validatorが再確認する主な内容 | validatorだけでは作れない・再計算しない内容 |
|---|---|---|---|
| 検査報告 | privateな報告組立処理 | schema、10 field、strict JSON、status、最初の失敗段、各要約と裏付けの一致 | 報告そのものの生成 |
| 期待終了状態 | 報告の`passed`なら0、それ以外なら1 | 0/1だけ、0と`passed`の同値 | 実process終了の観測 |
| job本体 | jobファイルの初回安定読み取り | job ID、成果物ID、入力bindingとの対応 | job全schema、mode、実装・環境・期待投影の妥当性。これはchecker側 |
| job読取記録 | jobの初回・再読み取り | path、前後hash、変更状態、報告のjob要約 | ファイルからの安定取得、path安全性 |
| 入力3件の読取記録 | 入力の初回・再読み取り | role、path、前後hash、job期待hash、報告の入力要約 | JSON schema、source来歴、本文契約。これはchecker側 |
| 実行環境束縛 | 実行開始・終了時のNode実体確認 | 値の形、報告に載った値との一致 | job期待環境との一致。これはchecker側 |
| 二度生成した境界証拠 | privateな二度生成処理 | 1回目から報告hashを再計算、二度生成結果を改行付き整形JSONへ直列化したbyteの一致 | 境界候補のschema、source対応、期待投影。これはchecker側 |
| 読み取り専用監視結果 | 正式出力先・祖先directoryの前後監視 | 値の形、報告に載った値との一致 | 正式出力不存在、前後不変、job宣言との一致。これはchecker側 |

report validatorは、check reportの固定schema、10検査の順、違反種類の順・重複、違反から検査への帰属、全体statusも検証する。しかし、各違反が実際のjob・入力・環境・証拠・監視結果から正しく導かれたかを再計算はしない。それは先にexport済みcheckerを正しい9項目contextで呼んだことに依存する。

### 4.1 検査報告10 fieldの生成元と掲載条件

report validatorは成功報告だけでなく失敗報告も受理対象にする。検査報告の10 fieldは次のように組み立てられる。

| report field | 生成元 | 掲載条件・validatorの照合 |
|---|---|---|
| `schemaVersion` | runner内の固定値 | 固定schema名との一致 |
| `status` | checker全体status | checker statusと一致し、期待終了状態0なら`passed`、1なら`failed` |
| `failureStage` | 最初に`failed`となった検査名 | 成功時は`null`。失敗時は最初の失敗検査名 |
| `job` | job本体とjob読取記録 | 常にjob ID、job path、初回hashを掲載し、job読取記録と一致 |
| `inputs` | 入力読取記録の要約 | `inputBinding`合格時だけ3件を掲載。不合格時は`null` |
| `runtimeBinding` | 終了確認後の実行環境束縛 | runtime検査が上流不成立でなく、外部値がある場合に掲載。それ以外は`null` |
| `observedProjection` | checkerの観測投影 | segmentationとcoverageが共に合格した場合に存在。それ以外は報告とcheckerの双方で`null` |
| `evidence` | 1回目の境界証拠の要約 | segmentation合格時だけ、成果物IDと3 hashを掲載。不合格時は`null` |
| `readOnlyGuard` | 読み取り専用監視結果 | read-only検査が上流不成立でなく、外部値がある場合に掲載。それ以外は`null` |
| `checkReport` | export済みcheckerの出力 | 10検査、違反、status、投影、成果物IDの構造と相互整合を検証 |

条件分岐にも限界がある。

- `inputBinding`不合格時、validatorは`report.inputs === null`を求めるが、入力snapshot本体のschema・hashを正常系と同じ深さでは再検査しない。
- runtimeとread-only監視は、該当検査が`not_run_with_upstream_failure`か、外部値が`null`かで掲載条件が変わる。
- evidence要約の照合はsegmentation合格時、二度生成の直列化byte一致はdeterminism合格時に行う。
- 成功報告では、inputs、runtime、observed projection、evidence、read-only監視の全てが非`null`でなければならない。

## 5. checkerの9項目context

export済みcheckerをproduction条件で呼ぶには、次が必要である。

1. job本体。
2. job読取記録。
3. 実装3ファイルの読取束縛。
4. 入力3件の読取記録。
5. 実行環境束縛。
6. 二度生成した境界証拠。
7. 境界証拠生成時の失敗状態。
8. 読み取り専用監視結果。
9. production指定。

このうち、実装3ファイルの読取束縛、生成失敗状態、production指定は、report validatorの8項目には含まれない。つまり、8項目を揃えるだけではchecker結果を正当に再構成できない。

正式runnerは、private処理で9項目を組み立て、export済みcheckerを呼び、private処理で報告を組み立て、その後にexport済みreport validatorを呼ぶ。この順序全体が、現在の正常なゲートA形記録を作る経路である。

## 6. 合成検査が証明している範囲

現在のreport validator正常系検査も、runnerを使わずに報告を作ってはいない。

1. まずprogrammatic runnerを実行する。
2. runnerの標準出力から正常な検査報告を得る。
3. test側でjob・入力を読み直し、境界証拠を再生成する。
4. report validatorへ8項目を渡して`true`を確認する。
5. status、failure stage、job・入力・snapshotのhash、二度目の生成結果、観測投影など、複数のcross-fieldを個別に壊し、相互不一致を拒否できることを確認する。

この検査は、export済みvalidatorが相互不一致を検出することを実証している。一方、runner不使用で正常な検査報告を組み立てられることは実証していない。

また、workspace内には正式runnerが返した検査報告JSONの保存実体がない。schema文字列は設計文書に存在するが、再利用可能な正常report artifactは存在しない。既存reportを読み戻して内包する迂回もできない。

## 7. 固定済みゲートAを変更できない理由

ゲートA jobは、次の実装3ファイルの実byte hashを固定しており、現在の実byteと一致している。

| 役割 | 固定済み・実測一致SHA-256 |
|---|---|
| 境界生成・検査core | `dac613292e463897ee2757be75a7d64f3ece9928141765a195ba54a0ebc6007a` |
| 残存文字検査core | `11036f09ceac1d1f5e19f5487eeae8d39c84ec7675cc8f9d693a203182d27f28` |
| 正式runner | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` |

既存runnerへprivate helperのexportを足すとrunner byteが変わり、固定済みjobの実装bindingを壊す。したがって、「既存runnerへexportを少し足して再利用する」は、固定ゲートAを不変参照する方向設計と両立しない。

## 8. B1実装契約へ渡す確定事項

方向設計が承認された場合、B1の完全な実装契約は少なくとも次を一意にする必要がある。

1. ゲートA job、完了報告、実装3ファイル、入力3ファイルを安定読み取りするB1側の版付き入口。
2. 実装束縛、開始時・終了時の実行環境束縛、二度生成、生成失敗状態、読み取り専用監視を組み立てる順序。
3. export済みcheckerへ渡す9項目context。
4. checker結果と裏付けからゲートA形の内包報告を作る決定的な組立処理。
5. export済みreport validatorへ渡す8項目と、合否をB1 package側へどう記録するか。
6. 上記の組立処理が検査判定を複製せず、productionと合成検査で同じ正本入口を使うことの検査。
7. ゲートA形記録の合格を、B1 job・モデル可視入力・漏洩・package hash・原子的公開・公開後検品の合格へ拡張しない責務境界と、後者を検査するB1 package正本入口。

安定snapshotから9項目contextと検査報告を正当に作る一連の段取りは、新しいB1組立処理になる。一方、実質的な違反判定は既存checker、報告のschema・binding・自己整合判定は既存report validatorを正本として維持する。この役割を混同して、private処理の丸写しを「既存処理の直接再利用」と呼ばない。

正式出力先不存在を検査する読み取り専用監視の性質上、ゲートA形の内包検査はB1正式rootを公開する前に完了・固定する必要がある。公開後に同じゲートA検査を通す設計にはできない。

## 9. 主線への影響

- ゲートB方向設計を棄却する追加事実ではない。
- 方向設計と承認補足が「具体的な検査部品の構成はB1実装契約で固定する」とした範囲に収まる。
- 既存のB1契約準備棚卸し§3.1、§6.1と、B1権限マトリクス§4.3の未固定事項を、実コードと合成検査で裏付けた。
- 主線の承認判断へ新しい選択肢は追加しない。
- 承認された場合、次のB1設計で本レポートの7項目を実装契約完全性チェックへ入れる。

## 10. 今回行っていないこと

- ゲートB方向設計・承認補足の承認、改訂、追記。
- B1のschema、違反種類、入口、ファイル名、公開手順の決定。
- コード、testdata、runner、prompt、正式packageの作成。
- Gemini実走、v003対生成、描画。
- ゲートA正式runnerの再実行。
- `DECISIONS.md`、`docs/HANDOVER.md`、承認済み設計文書の変更。
- 人間への新しい確認依頼。

## 11. 人間作業

- 本調査: **0件。**
- 主線で既に必要な判断: ゲートB方向設計と承認補足の一括承認1件。
- 本副線から追加する判断: **0件。**

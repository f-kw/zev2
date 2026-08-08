# fatal観測性v002 source field接続 追加監査停止報告 v001

- 日付: 2026-08-07
- 状態: **STOP**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認済み追加監査停止報告SHA-256: `ef74feefcbc789ed3f69ef0e94017e3495f1f8e8b7c39d8fae82ed1125797bcc`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

前回承認されたF08・F11の限定修正を反映した後、正式81件の前提である追加監査6項目を開始した。監査4「全targetFileが固定許可fieldと検証済みsource recordへ接続する」で、新たな現物差を1件検出した。

F08の公開前再読入口は、job本体については既存strict decoderとjob validatorへ接続できた。一方、job以外の再読対象へ次の汎用名を付けている。

- `job.binding`
- `accepted-input-observation`
- `validated-graph-snapshot`

この3値はF01の`meaning-boundary-selection`固定許可field表に存在しない。そのため共通selectorは、対象fileのpathとSHAが正しく、jobが検証済みでも、必ず`targetFile: null`を返す。

指示された「新たな現物差または不合格1件で停止し、同attemptで直さない」に従い、追加修正、F03完成、正式81件へ進まず停止した。

## 2. 確定した事実

### 2.1 固定許可field

`presentation_fatal_observation_v002.mjs:147-160`は、意味終端境界で対象fileにできるsource fieldを具体的な12値へ固定している。例:

- `job.implementationBindings[*]`
- `job.approvedContractBindings[*]`
- `job.sourcePackageBinding`
- `job.b6ManifestBinding`
- `b6Manifest.b6JobBinding`
- `providerEnvelope.rawResponseBinding`

共通selectorは同file `283-309`で、渡された`sourceField`がこの表に無い場合に`null`を返す。

### 2.2 F08の現行接続

`presentation_meaning_boundary_selection_v001.mjs`では次の接続になっている。

| 再読対象 | 現行source field | 行 | 固定表との一致 | 結果 |
| --- | --- | ---: | --- | --- |
| job本体 | `job` | 698-702 | 一致 | 検証済みjobなら対象fileを保持できる |
| implementation／contract binding | `job.binding` | 707-712 | 不一致 | 常に`null` |
| 入力観測 | `accepted-input-observation` | 718-723 | 不一致 | 常に`null` |
| B5 graph snapshot | `validated-graph-snapshot` | 736-745 | 不一致 | 常に`null` |

正式runnerは同file `879-885`で、implementation／contract bindingを区別しない配列、source fieldを持たない入力観測、source fieldを持たないgraph snapshotを公開前再読入口へ渡している。このため、入口側だけでは固定表の具体的fieldへ安全に復元できない。

### 2.3 影響範囲

- 再読による変更検出そのものと`FILE_CHANGED_DURING_READ`の分類は動く。
- job本体の検証済み／未検証による対象file有無は今回のF08修正で分離できた。
- job以外の既知入力が変化した場合、pathとSHAが分かっていても対象fileが失われる。
- status、既存違反code、終了code、成功成果物byteへの変更は観測していない。

## 3. 今回成立した修正

### F08

- 公開前再読入口のjob byteを既存strict decoder・job validatorへ接続した。
- 未検証jobの変更では`targetFile: null`、検証済みjobではjob pathと元byte SHAを保持できる構造にした。
- 現在SHA-256: `9e091955e7e342b8b0909bd15e77586e1c859a77e4a25b177567f33372849ac0`

### F11

- 固定6 sentinelだけを保存先不正として維持した。
- staging取得後のno-replace競合を、write・I/Oと同じ公開失敗へ分離した。
- 現在SHA-256: `e6b88e7d14d6e1e155f24f5480487913d1deed2cbfca8a9fc1f6f11545329a4a`

### 検査準備

- F02の`FOVO002`を、未検証job変更では対象fileが`null`、検証済みjob変更では対象fileを保持する一ID二正例へ更新した。
- F03は実枝証明を完成するためのhelper準備途中で停止した。正式40 ID証明表は未完成である。

停止時SHA-256:

- F02: `9c9dff7c95a81a38e0701c40ba232d7e99351693c58c77343723fe14dbdb4db5`
- F03: `a2455decbc2c6e713544d51a30cd904e074a4cd4c7d0fe10e7716a479d1f9b27`

## 4. 追加監査の到達状況

| 項目 | 状態 | 観測 |
| --- | --- | --- |
| 1. 定義/import/export実在 | 未完了 | 監査4の不成立で全数監査を中断 |
| 2. rejectedとfatalのcatch分離 | PASS | 既存rejectedを先に返し、未処理例外だけfatalへ送る構造を確認 |
| 3. child stageと生出力非漏洩 | PASS | F18の全child callにstageがあり、生stdout/stderr・元Errorを親へ保持しない |
| 4. targetFileと検証済みsource record | **FAIL** | F08の3汎用fieldが固定表に存在しない |
| 5. target不正と公開失敗のowner分離 | PASS | F11を含むclaim／write／no-replace／公開失敗の分離を確認 |
| 6. 正常／rejected実経路 | 未完了 | F03実枝証明表が未完成 |

追加監査は3 PASS、1 FAIL、2未完了であり、6/6ではない。

## 5. 正式検査・成果物の状態

- 正式81件: **0回**
- 直接影響130件: **0回**
- green 287件: **0回**
- baseline 181件: **0回**
- 5 tree最終照合: **0回**
- 正式attempt path: 未作成
- commit A: 未作成
- 正式成果物変更: 0件

## 6. 帰属

本件は契約矛盾ではなく、F08のin-memory来歴接続が固定許可field表へ届いていないproduction実装・検査接続の不足である。F01の固定表を汎用名3件へ広げる案は、具体的な来歴を失わせて許可範囲を広げるため採らない。

現時点で、既存status、既存違反code、終了code、schema、正式成果物を変更する必要は確認していない。

## 7. 推奨する次attemptの限定修正

1. F08で、再読対象のsource fieldを検証済みjob、B5 manifest、B6 manifest、provider envelopeの既存bindingから決定的に導出する。
2. implementation bindingとapproved contract bindingを区別し、固定表のexact fieldを保持する。
3. 入力観測とgraph snapshotは、既存validatorに合格したsource record内のpath・SHAと一意に一致した場合だけexact fieldを付ける。一致0件・複数件・未検証recordでは対象fileを`null`にする。
4. 呼出側が任意の汎用fieldや許可fieldを自己申告する構造、新validator、新しい対象file計算、固定表の緩和を作らない。
5. F02／F03で、未検証jobはnull、検証済みjobと各来歴分類は一意target、表外・不一致・複数一致はnullであることを実枝から証明する。
6. 未完成のF03 40 ID実枝証明表を完成し、追加監査6項目を最初から再実行する。

この修正はF08と既存F02／F03内で閉じ、18 path上限を増やさない見込みである。

## 8. 再開に必要な判断

承認依頼文案:

> source field接続 追加監査停止報告v001の§7を承認する。F08は、検証済みjob・B5/B6 manifest・provider envelopeの既存bindingから公開前再読対象のexact source fieldを決定的に導出し、汎用fieldや呼出側自己申告を使わない。固定許可field表、新validator、対象file計算、既存status・違反code・終了code、正式成果物は変更しない。F02/F03の実枝証明とF03 40 ID表を完成後、追加監査6/6→正式81件の新attempt→直接影響130→green 287→baseline exact→5 tree→commit A・18 path SHA表付き完了報告まで進めてよい。不合格1件または新たな現物差で停止し、同attemptで直さない。

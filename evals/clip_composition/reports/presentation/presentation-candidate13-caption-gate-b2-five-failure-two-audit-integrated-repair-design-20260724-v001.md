# candidate 13 caption Gate B2 5不合格＋事後監査2件 統合修正設計 v001

- 日付: 2026-07-24
- 状態: **設計提示・実装未承認**
- 主線: package側132件中5不合格と、全件実行後の静的監査で見つかった2件を、確定済み契約へ戻す
- 停止点: 本文書の提示で停止。コード変更、検査再実行、正式package生成、Gemini実走は行わない
- 人間作業: 本設計の承認または却下1判断。動画視聴、時刻入力、正解生成は0件

## 1. 本来の目的

目的は、127/132を132/132へ見かけ上変えることではない。

目的は、次の4点を同時に成立させることである。

1. 検査データが、検査したい故障だけを一つ作る。
2. 合成ファイルシステムが、productionで前提とする安全な親ディレクトリを正しく再現する。
3. 公開後の成果物は、内容だけでなく、正式な公開先から読んだことまで検査する。
4. hash、参照関係、子ファイルI/Oの既に確定した意味を変えない。

検査器の意図を弱めない。期待値を実装へ合わせて緩めない。壊れた子を部分利用しない。新しい係数・許容差・違反コードを作らない。

## 2. 現在の証拠

### 2.1 停止attempt

- 実装・停止記録commit: `4d58f0ff`
- 停止報告:
  `presentation-candidate13-caption-gate-b2-four-cause-publication-revalidation-test-stop-report-20260724-v001.md`
- package側TAP:
  `test-runs/20260724-caption-b2-four-cause-publication-revalidation-v001/package.tap`
- TAP SHA-256:
  `b5d7e5b71af2597301adbb012d3b0de04b9e6f67d8fa1928b5312da2a9cb6350`
- 実測:
  132件中127合格、5不合格、cancel 0、skip 0、todo 0
- 不合格:
  118、119、123、124、132
- 未実行:
  意味回答側、Gate A回帰、残存source atom回帰、candidate 13読み取り専用preflight、正式package、Gemini、指示書、描画

### 2.2 修正前の固定hash

| 対象 | SHA-256 | 本設計での扱い |
|---|---|---|
| package検査本体 | `c1a757141303b5328bc6d64473586f047625b5d1666dea5a8170f1939b7ae479` | 公開元path束縛だけ変更候補 |
| package検査コード | `a598180612de5b7b80b14086965078b9217d814be6108449f52242327fc5b346` | fixture、oracle、合成FS、raw検査だけ変更候補 |
| package正式実行処理 | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` | 変更禁止 |
| Gate A実行・検証処理 | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` | 変更禁止 |

## 3. 確定済み原則

### 3.1 R2案A

壊れた子データは親集計へ部分利用しない。除外は隠さず、どの子のどの操作が失敗したかを違反として残す。子一件の不正を親全体の別名の不正へ潰さない。

### 3.2 hashと参照関係の区別

- file hash: 保存byte列のSHA-256
- canonical hash: strict JSONを正規化した意味内容のSHA-256
- binding: path、role、artifact ID、runtime、相互参照

一つを他の名前へ読み替えない。

### 3.3 公開観測

- ディレクトリ一覧: UTF-16ファイル名順
- 成果物読取: 正式7ファイルの固定製造順
- staging: 正式rootの`.work`
- published: 正式rootそのもの

内容が同じでも、別の安全なpathから読んだ成果物は正式公開物ではない。

### 3.4 test 132

test 132は独立原因ではない。先行testが途中停止したため、動的な違反×担当検査の観測が未登録になった派生である。期待集合の縮小、手動seed、単独修正を禁止する。

## 4. 5不合格＋事後監査2件の対応表

| ID | 観測 | 帰属 | 修正 | 検査意図の維持 |
|---|---|---|---|---|
| 118 | 独立したhash不一致が2件なのに1件だけ期待 | fixture／oracle | manifest成果物自身の宣言hashだけを壊す一原因fixtureへ戻し、違反列を完全一致 | hashをbindingへ変えず、余分なhash違反も許さない |
| 119 | 別packageの保存先が正式job契約外 | fixture | 別packageも必須`segmenter-boundary-evidence/`配下で正しく生成 | job path契約を緩めず、正しい別package差し替えを拒否する |
| 123 | 一覧欠落1件に全7子open失敗が併発 | 合成FS | 正式rootまでの中間親をvirtual directoryとして汎用生成 | 一覧欠落だけを作り、code 53だけを期待する本来の負例へ戻す |
| 124 | `staging-read`注入前にopen失敗 | 123と同じ合成FS | 中間親補完＋test専用fault trace | code 55の意味を変えず、注入位置と要約を一対一で検査する |
| 132 | `NONDETERMINISTIC / determinism`未観測 | 118の派生 | 直接修正なし | 118完走による自然な観測だけを認める |
| 監査P | 公開snapshotの内容は検査するが読取元pathを束縛しない | package検査本体の実装残り | job正本からstage別期待rootを作り、固定fileNameとの完全path一致を検査 | byte/hash/canonical/value検査を全て維持 |
| 監査B | hash対照が期待pathの存在だけを確認 | package検査コードの厳密性不足 | 違反列全体を1件の完全一致で固定 | hash/bindingの意味とproduction分類を変更しない |

## 5. 修正R118: 一原因fixtureと完全oracle

### 5.1 現在の問題

現在の`outerSelfHashMismatch`は、次を同時に変更する。

1. package manifest成果物自身の宣言file hash
2. package validation report内のmanifest参照hash

これは独立したhash不一致を二箇所作る。検査本体が二件を出すのは正しく、oracleの一件期待が誤っている。

### 5.2 修正

fixtureでは、package manifest成果物自身の宣言file hashだけを別の有効な64桁値へ変える。validation report内のmanifest参照hashとreport成果物は変更しない。

期待する違反列を次の一件へ完全一致させる。

```json
[
  {
    "code": "PACKAGE_HASH_MISMATCH",
    "path": "$.packageFiles[5]",
    "details": {}
  }
]
```

検査本体のhash分類、binding分類、重複除去は変更しない。二件を一件へ潰す修正も行わない。

### 5.3 test 132との関係

118の後半にある決定性負例が実行されれば、`NONDETERMINISTIC / determinism`が通常の観測経路から登録される。132へ直接値を追加しない。

## 6. 修正R119: 契約内の別package

### 6.1 現在の問題

自己整合した別packageを作るfixtureだけ、`formalOutputPath`が正式job必須階層の外にある。そのため、公開再照合へ到達する前にjob検査が正しく拒否している。

### 6.2 修正

別package IDを固定し、出力先を次の形にする。

```text
evals/clip_composition/outputs/presentation/
  segmenter-boundary-evidence/
  <alternate-package-id>
```

その後は次の既存順序を維持する。

1. job snapshotを更新する。
2. 別packageを二回再構築し、決定性を確認する。
3. 別packageの固定7成果物を、元packageの正規staging／published位置で観測したfixtureへ渡す。
4. stagingではcode 53、publishedではcode 56の既存完全一致を確認する。

job validator、正式出力先、違反コードを緩めない。

## 7. 修正R123/R124: 合成FSの親ディレクトリ

### 7.1 静的に確定した主因

合成FSはjob rootとjob file、最終的なwork／formal rootだけをvirtual登録する。正式出力先の中間親

```text
evals/clip_composition/outputs/presentation/segmenter-boundary-evidence
```

は登録されず、現在の実ファイルシステムにも存在しない。

runnerは成果物を読む前に、workspace rootから対象直前まで全親を`lstat`と`realpath`で確認する。この中間親で`ENOENT`となるため、7成果物すべてが意図した負例へ到達する前に`artifact-NN-open`となる。

この一原因で次を説明できる。

- 123: 一覧欠落だけの予定が、全7子open失敗を併発
- 124: `staging-read`注入へ届かず、先行open失敗を記録

### 7.2 合成namespaceの修正

test helperだけで、`runnerJob.formalRoot`から親pathを決定的に導出する。監視rootより下から`dirname(formalRoot)`までの全中間親をvirtual directoryとして事前登録する。

- candidate 13固有pathを焼き込まない。
- host側に同名directoryが存在するかに依存しない。
- virtual `lstat`と`realpath`は、同じ字面pathを安全なdirectoryとして返す。
- formal root、work、lockは実行前には従来どおり不在とする。
- 正式7ファイル、runner、production filesystem adapterは変更しない。

`formalFailure: staging`は、directory listingの一項目だけを落とす。virtual file実体、固定7読取、親pathは変えない。

### 7.3 test専用のraw trace

既存`withSyntheticReadFault`の戻り値と既存call siteは変更しない。現在の本体をtest file内のprivate builderへ切り出し、次の二入口を同じbuilderへ委譲する。

1. `withSyntheticReadFault`: recorderなしでprivate builderを呼び、従来どおりadapterだけを返す。
2. `createSyntheticReadFaultTraceHarnessV001`: recorder付きで同じprivate builderを呼び、下記wrapperを返す。これは124の9行あるtransport表だけで使う。

fault注入ロジックを二重実装しない。production runnerへ渡すのは`wrapper.adapter`だけで、`snapshotTraceV001`は渡さない。

```js
Object.freeze({
  adapter: Object.freeze({
    // production adapterと同じ11 key・同じ順序。
    // openReadOnlyだけをtest用fault wrapperへ差し替える。
  }),
  snapshotTraceV001: () => Object.freeze([
    Object.freeze({
      faultId: "<transportRowsのsuffix>",
      faultKind: "<open|read-throw|post-read-stat-error|close>",
      path: "<実際に一致したabsolute path>",
      phases: Object.freeze(["<下表の固定順>"])
    })
  ])
})
```

wrapperのkey順は`adapter / snapshotTraceV001`、trace entryのkey順は`faultId / faultKind / path / phases`とする。`snapshotTraceV001`は内部配列を返さず、呼出時点のdeep-frozen copyを返す。transport表以外の既存3 call site、`post-read-stat`を含む既存fault種類、戻り値adapterは不変。transport表の既存1 call siteだけを新harnessへ置き換え、9行それぞれで`.adapter`をproduction runnerへ渡し、実行後に`.snapshotTraceV001()`を読む。adapter自身の11 key完全一致検査も維持する。

1行ごとのtraceは**一つのentry**で、`phases`だけが複数段階を持つ。期待phaseは次に固定する。

| faultKind | phases |
|---|---|
| `open` | `["matched", "open-thrown"]` |
| `read-throw` | `["matched", "opened", "pre-read-stat-ok", "read-thrown", "closed"]` |
| `post-read-stat-error` | `["matched", "opened", "pre-read-stat-ok", "read-completed", "post-read-stat-thrown", "closed"]` |
| `close` | `["matched", "opened", "pre-read-stat-ok", "read-completed", "post-read-stat-ok", "close-thrown"]` |

`path`はmatcherが実際に一致させた最初の一件で、0件または2件以上ならfixture不成立としてそのtop-level testを失敗させる。`faultId`はtransport表のsuffix、`faultKind`は同表のkindからだけ取得し、実行結果を見て書き換えない。

既存のfilesystem operationsからは、work／formal root配下の`lstatBigInt / realpath / openReadOnly`だけを、次のkey順で投影する。

```js
Object.freeze({
  operation: "<固定3種>",
  path: "<absolute path>"
})
```

各負例は、次のkey順の一objectへまとめて完全一致させる。

```js
Object.freeze({
  faultTrace: "<上記entry 1件>",
  filesystemOperations: "<上記投影>",
  artifactReads: "<対象stageのraw artifact read列>",
  violations: "<違反列>",
  publicationFailures: "<run reportの失敗要約列>"
})
```

失敗時はこのobjectがTAPのactualへ残る。production adapter、production report schema、debug入口を増やさない。

### 7.4 決定的な回帰

1. **親chain正例**:
   中間親は全てdirectoryかつrealpath完全一致。formal root、work、lockは実行前不在。
2. **123の一覧欠落**:
   directory entryだけ6件、artifact readは7件成功。違反はcode 53の一件、publication failureは0。input再確認以降は未実行。
3. **正常公開**:
   一覧7件、固定順read 7件、fault 0、全check合格。
4. **124のtransport表**:
   各行のfault eventはexact 1件。staging／published／inputの既定path・failure pointと完全一致する。
5. **R2案Aのcore直fixture**:
   一子I/O＋残り六子正常なら、当該slotのcode 55だけ。壊れた子は内容・hash集計へ使わない。
6. **独立不正の併発**:
   stagingでdirectory不正と子I/Oが独立なら53＋55。publishedの既定抑制は維持する。
7. **fault wrapperの自己検査**:
   match 0件または2件以上をfixture自身の不成立として失敗させる。別のcode 55による偽合格を許さない。

合成FSを直した後も124でfailure pointが欠ける場合は、観測要約経路の別原因としてそのattemptで停止する。期待値を緩めない。

## 8. 修正P: 公開読取元pathの完全束縛

### 8.1 現在の問題

現在の検査は、snapshotの安全性、fileName、byte、file hash、strict JSON、canonical hash、valueを確認する。しかし、snapshotのpathが正式公開先そのものかを確認しない。

このままでは、同じbyteを別の安全なworkspace pathから読んでも合格できる。

### 8.2 stage別の期待path

期待rootを観測データから作らず、job正本からだけ導出する。

| stage | 期待root |
|---|---|
| staging | `job.value.publication.formalOutputPath + ".work"` |
| published | `job.value.publication.formalOutputPath` |

各slotの期待pathは次の完全一致だけを認める。

```text
<期待root>/<固定7ファイル名[index]>
```

prefix一致、basename一致、観測pathの正規化による救済を行わない。

### 8.3 同一検査経路

stage別期待rootを次へ明示的に渡す。

- 一件の公開読取検査
- 公開成果物集合の検査
- 公開成果物集合の合否判定
- 最終reportへ載せる公開hash投影

`derivePublication`と最終report投影が同じpath-aware検査を使う。検査用の複製関数を作らない。

既存のbyte、file hash、canonical hash、value、stable snapshotの検査は一つも削らない。

### 8.4 負例

stagingとpublishedの双方で、全ての内容・fileName・hash・snapshot identityを正しいまま保ち、親pathだけを安全な別pathへ変える。

- staging: code 53、path `$.publication.staging`
- published: code 56、path `$.publishedPackage`

既存top-level test内へ入れ、登録件数132を変えない。

## 9. 修正B: hash対照の違反列完全一致

### 9.1 現在の不足

原因Bの内容hash対照は、次しか見ていない。

- 重複を除いた違反code集合
- 期待pathが一つ存在すること
- binding違反が無いこと

同じ`PACKAGE_HASH_MISMATCH`の余分なpathが出ても合格できる。

### 9.2 修正

reportの違反列全体を次の一件へ完全一致させる。

```json
[
  {
    "code": "PACKAGE_HASH_MISMATCH",
    "path": "$.packageFiles[5].value.contentArtifacts[0].fileSha256",
    "details": {}
  }
]
```

artifact IDを変えるbinding対照は、既存の完全一致を維持する。

これにより次を双方向に固定する。

- hash負例はhashの一pathだけ
- binding負例はbindingの一pathだけ

## 10. test 132の扱い

132の期待集合、観測登録、違反×担当検査の組合せは変更しない。

118が完走した後に通常の動的観測として回復するかを全132件の新attemptで確認する。回復しなければ、132を直さず新原因として停止する。

## 11. 実データ正式生成前の残件

現在の実ファイルシステムにも、正式package出力先の直近親

```text
evals/clip_composition/outputs/presentation/segmenter-boundary-evidence
```

は存在しない。

今回の修正は合成FSの正確化であり、production側の親作成方針を決めるものではない。正式package生成の承認依頼では、実行前preflightとして次を必須にする。

1. 正式rootの直近親が安全な既存directoryか。
2. 不在なら、誰がどの工程で作成するかを別承認へ戻したか。
3. runnerの非再帰directory作成へ暗黙依存していないか。

親を自動作成するproduction変更、正式package生成、既存出力の変更は本設計に含めない。

## 12. 変更可能範囲

### 12.1 許可候補

1. `presentation_caption_semantic_source_package_v001.mjs`
   - 公開読取元pathの完全束縛
2. `test_presentation_caption_semantic_source_package_v001.mjs`
   - 118の一原因fixtureと完全oracle
   - 119の契約内別package
   - 合成FSの中間親
   - test専用raw trace
   - 123／124／P／Bの回帰

既存top-level test内へ追加し、132件を維持する。

### 12.2 変更禁止

- package正式実行処理
- 意味回答側の検査・実行処理
- Gate Aの検査・実行・job・schema
- 57違反コード、固定順、担当検査名
- 正式7ファイルschemaと製造順
- strict JSON復号
- file hash、canonical hash、bindingの意味
- R2案Aの子除外・可視化
- scanner、hashbang、字句契約
- CLI終了0/1/2、stdout/stderr分離
- 正式成果物、凍結済み評価fixture／expected、信頼binding
- 本文書で名指ししたB2合成検査fixture／oracle以外の検査データ
- dependency

## 13. 実装契約完全性チェック

| 項目 | 固定結果 |
|---|---|
| 成果物schema | 変更なし |
| 違反コード | 57件、固定順、担当を変更しない |
| CLI | 0=合格、1=信頼できる不合格、2=信頼不能を変更しない |
| 環境 | Node／ICU／locale／segmenter固定を変更しない |
| 入力範囲 | 既存package context、job正本、公開観測だけ |
| 工程間受け渡し | Gate A、package→意味回答、preflightを変更しない |
| 公開root | job正本のformalOutputPathからstage別に一意導出 |
| 合成FS | runnerJob.formalRootから親chainを一意導出。hostの偶然へ依存しない |
| 検査可能性 | productionが使う検査本体を同じ入口から検査。test専用traceは判定材料を変えない |
| 汎用性 | candidate 13固有値、354件、205件、正式hashを実装へ焼き込まない |
| 人間判断 | 本文の7対応以外に実装者判断を残さない |

## 14. 実装承認後の順序

本設計が別途明示承認された後だけ、次の順で進める。

1. 許可2ファイルだけを変更する。
2. 構文、diff、変更禁止対象のhashを静的確認する。
3. 合成FSの親chain正例とfault trace自己検査が、132件の既存top-level test内に含まれ、部分実行用の別入口が無いことを静的確認する。この段階では検査を実行しない。
4. package側132件を新attemptとして先頭から一度だけ実行する。親chain正例とfault trace自己検査も、この唯一の全件実行の中で初めて実行する。
5. 一件でも不合格、skip、todo、cancelがあれば、そのattempt内で直さず停止する。
6. 132/132の場合だけ、意味回答側全件を一度実行する。
7. 合格時だけ、Gate A回帰を一度実行する。
8. 合格時だけ、残存source atom回帰を一度実行する。
9. 全回帰合格後だけ、candidate 13読み取り専用preflight jobを排他的に一度作成・実行する。
10. 全成立時だけ、正式成果物hashを再照合し、DECISIONS／HANDOVERを同期する。
11. 安定点3条件を満たした場合だけ、JOURNALを同一commitで更新してB2 stable tagを発行する。
12. B2完了報告と次ゲート承認依頼を起草して停止する。

正式package、prompt登録、Gemini、指示書、描画は行わない。

## 15. 次attemptで保存する証拠

- package側TAP全文とSHA-256
- 意味回答側TAP全文とSHA-256
- 7項目それぞれの修正・結果対応表
- 118の完全な違反列
- 119の別package ID、正式出力path、staging／published結果
- 123のdirectory entries、7 artifact read、publication failure
- 124のfault event、関連I/O投影、違反、publication failure
- Pのstage別別path負例
- 132の全コード×担当検査の実観測集合
- 変更禁止対象の修正前後hash
- 各回帰とpreflightの実行回数

## 16. 停止条件

次の一つでも起きたら、修正・再試行せず停止する。

- 7項目の対応表で説明できない不合格
- 合成FS親補完後も123／124のraw観測が設計と違う
- production runnerの変更が必要になる
- 新しい違反コード、schema、path語彙、依存が必要になる
- hash、binding、I/O帰属、抑制の意味を変える必要が出る
- 検査を弱める、期待集合を縮める必要が出る
- host側の偶然のdirectory存在へ依存する
- candidate固有値を汎用処理へ入れる必要が出る
- 正式package出力親の作成方針を実装者判断で決める必要が出る

## 17. 承認文案

> 「candidate 13 caption Gate B2 5不合格＋事後監査2件 統合修正設計v001」を承認する。5不合格と監査2件の対応、検査意図を維持したfixture／oracle／合成FS／公開path束縛の修正、R2案Aとhash／binding区別、変更可能2ファイル、再検査順、停止条件を固定する。実装、再検査、正式package、Gemini、指示書、描画は、本承認とは別の明示承認まで開始しない。

## 18. 改訂履歴

- v001 / 2026-07-24
  - 127/132停止の5不合格と事後監査2件を統合
  - 123／124を合成FSの同一中間親不足へ帰属
  - 公開読取元pathの完全束縛を固定
  - 原因Bの違反path完全一致を固定
  - 正式package生成前の親directory preflight残件を分離
  - test専用fault traceのadapter外搬送・固定schema・種類別phaseを固定
  - 親chain／trace検査は唯一の132件全件実行内でだけ動かすと固定

# fatal観測性v002 追加監査停止報告 v001

- 日付: 2026-08-07
- 状態: **STOP**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 承認済み親設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 今回の修正設計SHA-256: `bdd4433b624017b93afda9713400ccf5090d68223c734954d9409d2ad5840fc8`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

群A〜Fの限定実装中、正式81件を始める前の追加監査で、承認済み修正設計に届いていない箇所を2件検出した。

1. 意味終端の公開前再読入口が、渡された任意のjob byteをschema検証せず「検証済みsource record」として対象file候補へ使える。
2. 意味情報packageの共通公開処理が、公開直前の競合による`target-exists`まで保存先構造不正へまとめている。

これは正式検査の不合格ではなく、正式検査前監査が実装不足を検出した結果である。指示された「新たな現物差では停止し、同attemptで直さない」に従い、修正・正式検査へ進まず停止した。

## 2. 監査で確定した事実

### 2.1 検証前job byteが対象fileになり得る

- `presentation_meaning_boundary_selection_v001.mjs:115-127`のprivate選択処理は、`sourceRecordVerified: true`を固定している。
- 同file `671-697`の公開前再読入口は、受け取った`jobBytes`をstrict decode・job schema検証せず、そのSHAを使って`job`を対象file候補にする。
- `presentation_fatal_observation_v002.test.mjs`の`FOVO002`は、正式jobでない`{"state":"initial"}`を渡し、非nullの対象fileを期待している。
- 正式runner本体はこの入口より前にjobを検証しているため、既存の正式runner正常経路で未検証jobが使われた事実は観測していない。一方、export済みproduction入口単体の契約は閉じていない。

この状態は「検証済みsource recordだけから対象fileを選ぶ」という今回の固定条件に反する。

停止時SHA-256:

- `presentation_meaning_boundary_selection_v001.mjs`: `6919dbb7017044e197eac7b2e2d5e14bca9c1e10d86288a217a20f06890bcec0`
- `presentation_fatal_observation_v002.test.mjs`: `f7eca0a9f3b2d728a67846f67f492395b0e938233a358c4e97366b669c7f7640`

### 2.2 公開競合が保存先構造不正へ混入する

- `run_presentation_meaning_information_package_job_v001.mjs:332-339`は、保存先構造不正として扱う6つの固定sentinelを列挙している。
- 同file `349-355`は、staging取得時の6 sentinelだけを`target-invalid`へ分類している。
- しかし同file `362-364`は、共通no-replace publisherが返す`target-exists`も`target-invalid`へ変換する。
- no-replace側の`target-exists`は、staging取得後に正式targetが現れた競合でも発生する。これは固定6 sentinelではなく、公開処理中の失敗として扱うべき枝である。

この状態は「固定6 sentinelだけを保存先不正、それ以外のno-replace・I/O・公開失敗を公開失敗へ帰属させる」という承認済み修正設計に反する。

停止時SHA-256:

- `run_presentation_meaning_information_package_job_v001.mjs`: `fdb13993acf2df7f883533f05f76b0692184a45df979d82683daf749341773be`

## 3. 成立を確認できた部分

- 5境界の対象file許可field表は、親契約§3.2の省略なし文字列と一致した。
- 旧`allowedSourceFields`・`acceptedBindings`・`sourceReadable`による呼出側自己許可は、F01・F06・F08から除去済みである。
- timelineの既存source拒否は単一分類表から既存違反codeへ戻り、generic fatalより先に処理される構造になった。
- 意味情報packageの正常成果物とfailure reportは、同じ単一file公開処理を呼ぶ構造になった。
- 子process失敗は、生stdout・生stderr・元Errorを上位へ渡さず、固定段階・閉語彙code・既存の安全なrenderer違反だけを保持する構造になった。
- outputの必須export guardは、実共通描画fileを安定再読してSHA一致した場合だけ対象fileを付ける構造になった。
- 変更中のproduction/test fileは構文検査に合格している。ただし正式検査の合格を意味しない。

## 4. 正式検査の実行状況

- 正式81件: **0回**
- 直接影響130件: **0回**
- green 287件: **0回**
- baseline 181件: **0回**
- 5 tree最終照合: **0回**
- 正式attempt path `test-runs/20260807-fatal-observability-v002/attempt-0001/`: **未作成**
- commit A: **未作成**

F02は41 IDを維持したまま一部を補強済みだが未検証である。F03はfixtureとhelperの準備途中で、正式40 IDの実枝証明は未完成である。したがって合計81件という件数だけをもって検査完成とは扱わない。

## 5. 帰属

| 項目 | 帰属 | 契約改訂 |
| --- | --- | --- |
| 未検証jobを対象候補化 | production入口の検証接続不足、およびfixture期待の不足 | 不要。既存strict decoderと既存job validatorの接続で閉じる見込み |
| no-replace競合の所有誤り | 今回の限定実装が承認済み固定分類へ届いていない | 不要。固定6 sentinelと公開失敗の分離を実装へ反映するだけ |

既存status、既存違反code、終了code、schema、正式成果物を変える必要は現時点で確認していない。

## 6. 推奨する次attemptの限定修正

### 6.1 意味終端のsource record検証

1. 公開前再読入口の`jobBytes`を、同fileの既存strict decoderと既存job validatorで検証する。
2. 検証成立時だけ`sourceRecordVerified=true`として`job`を対象候補化する。
3. 新しいdecoder・validator・対象file計算を作らない。
4. `FOVO002`では未検証byteの変更を同じ`FILE_CHANGED_DURING_READ`として検出しつつ、対象fileがnullであることを証明する。
5. 既存の正式job fixtureを通す境界検査で、検証済みjobなら対象fileを保持できることを同じ81 ID内で証明する。

### 6.2 no-replace競合の所有分離

1. staging取得前の固定6 sentinelだけを`target-invalid`とする。
2. staging取得後のno-replace `target-exists`は、他のwrite・I/O・公開失敗と同じ公開失敗へ送る。
3. 同一job SHAの事前存在を拒否する既存正例と、取得後競合を公開失敗へ分ける検査を維持する。

両修正はF08・F11と既存F02・F03内で閉じ、18 implementation/test path上限を増やさない。

## 7. 再開に必要な判断

次attemptでは、§6の2修正と未完成のF03証明表を完成し、追加監査6項目を最初から再実行する。その6/6合格後にだけ、正式81件を新attemptとして一度実行する。

承認依頼文案:

> 追加監査停止報告v001の§6を承認する。F08の公開前再読入口を既存strict decoder・job validatorへ接続し、未検証jobからは対象fileを出さない。F11は固定6 sentinelだけを保存先不正とし、staging取得後のno-replace競合を公開失敗へ分離する。18 path上限、81件、既存status・違反code・終了code、正式成果物不変を維持する。修正後は追加監査6/6→正式81件の新attempt→直接影響130→green 287→baseline exact→5 tree→commit A・18 path SHA表付き完了報告まで進めてよい。不合格1件または新たな現物差で停止し、同attemptで直さない。

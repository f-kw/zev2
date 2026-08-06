# 意味/表現分離 初回実データrun 横型工程入場束縛停止報告 v001

- 日付: 2026-08-04
- 対象: `qdczJpv8RCc` candidate 59
- 実行入力記録 SHA-256: `5ac80deeb0daac08ea32cad7fa9b016cf04ab95ea551fa6981e6c8151ee28680`
- 到達地点: 基礎映像生成合格後、横型出力工程への入場検査

## 結論

工程入場と工程本体の責務分担には案1を採用した。工程入場は正式byte・schema・SHA・区間投影を検査し、281文字の全量閉包は、その参照を正しく復元できる基礎映像本体が既存正本で検査する。新しい文字計算は作っていない。

関連検査77/77、基礎映像工程入場、基礎映像生成はすべて合格した。次の横型出力工程への入場検査は、横型jobと表示要求の**確定前byteに対するSHA**を束縛したままだったため、正式な現在byteとの不一致を検出して終了1で停止した。

内容値を表すcanonical SHAは一致している。失敗原因は映像・意味情報・横型出力内容ではなく、正式byteを確定する前に工程入場jobを作った順序と、その参照先を正式実行前に再照合しなかったpreflightの不足である。検査不合格1件で停止する規律に従い、束縛の修正、再実行、横型・縦型描画は行っていない。

外部API通信は0回、追加費用はUS$0。

## 1. 方式比較と採用結果

| 方式 | 工程入場の責務 | 工程本体の責務 | 評価 |
|---|---|---|---|
| 案1（採用） | 正式byte、schema、SHA、区間投影、字幕外形を確認 | 既存の全量文字参照を復元し、AtomRef全量閉包・順序・本文・時刻を確認 | receiptの来歴共束縛と工程本体の内容検査という既存分業に一致。文字計算の重複なし |
| 案2（不採用） | 全量文字参照まで再構築して再検査 | 同じ全量閉包を再検査 | receiptの保証範囲を広げ、同じ検査を二工程で行う。二重検査を正当化する必要がなく、障害面だけが増える |

案1の限定修正では、意味情報パッケージの文脈非依存部分を確認する既存計算を共有入口として公開し、工程入場がそれを呼ぶようにした。基礎映像本体の全量閉包検査は変更していない。

「参照が無いなら期待文字0件」という暗黙defaultは削除した。全量検査入口へ参照を渡さない呼び方は、今後 `EXPECTED_ATOM_OCCURRENCE_INVALID` として拒否される。明示的な空配列は、実際に文字0件の入力を検査する場合だけ有効である。

schema、違反code集合、正式serializer、基礎映像の合否基準は変更していない。

## 2. 限定修正の検査結果

- 関連検査: 77/77合格
- TAP: `evals/clip_composition/reports/presentation/test-runs/20260804-base-media-admission-envelope-v001/related-tests.tap`
- TAP SHA-256: `681006be84926d5716cdffd274cdac1f820b4533f280b99b8396ff09f4e9dbaf`
- 文脈なしの工程入場検査で、字幕を持つ意味情報パッケージを受理できることを確認した。
- 同じパッケージを全量検査入口へ文脈なしで渡すと拒否されることを確認した。
- 全量文字参照を明示して渡すと、従来どおり全量閉包に合格することを確認した。

## 3. 基礎映像までの到達結果

### 3.1 工程入場

- 工程入場job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/07-base-media-attempt-0001-admission-envelope-v001.json`
- job SHA-256: `96e02e36d7716acc8d8da76f5b8939a48db07b5b8f26ca5c2909ca161566ebd7`
- 結果: 合格
- receipt: `evals/clip_composition/outputs/presentation/meaning-output-run-input-records/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/admissions-v002/07-base-media/attempt-0001/stage-admission-receipt.json`
- receipt SHA-256: `56b2e387daf0b7d249eb7638be1d207b17dfa26f9fd3e96017fde6c4e6a73f36`

### 3.2 基礎映像生成

- 結果: 合格
- frame数: 1,547
- audio sample数: 2,475,200
- 5検査: 意味情報束縛、時間写像、映像frame数、音声sample格子、公開hash graphの全件合格
- base media: `evals/clip_composition/outputs/presentation/meaning-output-base-media/qdczJpv8RCc-candidate-59-meaning-output-first-run-meaning-package-v002-meaning-information/base-media.mp4`
- base media SHA-256: `faad660c7623cdbf3a8f3b55cdaffc34729d06683ce391997c51f10fbc076967`
- timeline SHA-256: `688d89058977faa970db0f88b23bdb685a3e021a660ac1f6766c4d914536f2ba`
- generation manifest SHA-256: `2d39c65cbae09a0f6072eea60d4ac3c7223747926ba936b90553b2ee4bec7423`
- validation receipt SHA-256: `a3c6a238c44c0559fdd54a1c5a0e795d85e8fd8695b3434aad615f98121a8225`

## 4. 横型工程入場の不合格

- 工程入場job: `evals/clip_composition/outputs/presentation/meaning-output-stage-admission-jobs/qdczJpv8RCc-candidate-59-meaning-output-first-run-v001/v002/08-output-landscape-attempt-0001.json`
- job SHA-256: `ef970ff9a932f6a41367ac83f7216ec57ca651596b312dad99c4d2eecef58687`
- 実行結果: 終了1
- 違反: `STAGE_ADMISSION_TARGET_JOB_BINDING_MISMATCH`
- stage: `input-validation`
- failure report: `evals/clip_composition/outputs/presentation/meaning-output-run-input-failures/meaning-output-run-input-failure-ef970ff9a932f6a41367ac83f7216ec5/failure-report.json`
- failure report SHA-256: `4b27323f8617d80540a38682eed18f51dcc10e42a0f515adf4da00af1a727caa`
- 横型工程のreceipt rootは未生成のままである。

### 4.1 不一致の実測

| 対象 | 工程入場jobが記録したfile SHA | 現在の正式file SHA | canonical SHA | 判定 |
|---|---|---|---|---|
| 横型正式job | `971f1fddfd3ad0ecdca3c67df7589836763f1cfbf089cfb2ba3b737787dc305d` | `e710535d830829bf905550d89c62e87d6e083cbb233f3db72b23dfc45f6fe358` | `b88d4e4823c39ed23230bf42db2cd8f49439ac6c71eca16e0ac29080951573bb`で一致 | byte束縛だけ不一致 |
| 横型表示要求 | `e2ab79c8d213aa1268039b2b1383ab494360f8c4b34379c23dc391a06413182e` | `be1ab2d03ac6d5fd72bd17d728cd31f8c610c9da7ee9720c67c25e51db96b464` | `16451f0052e131e7c2d1853fa7585b7939b43c13440c227b79a812ca2edcf5f1`で一致 | byte束縛だけ不一致 |

両方とも、工程入場jobに記録されたSHAは、現在の正式file末尾へLFをさらに1 byte加えた場合のSHAと完全一致した。現在の正式fileは正式serializerどおり末尾LFが1個であり、値内容とcanonical SHAは変わっていない。

### 4.2 原因

1. 横型表示要求と横型正式jobを最初に保存した時点では、正式serializerのbyteに末尾LFがもう1個付いていた。
2. 工程入場jobは、その確定前byteのSHAを記録した。
3. その後の正式byte preflightで余分なLFを検出し、表示要求と正式jobを正式serializerのexact byteへ直した。
4. 工程入場jobのSHA束縛を、確定後byteから再生成しなかった。
5. 実行前preflightは工程入場job自身のschema・正式byte・出力先未使用を確認したが、参照先の現在byteまで再読していなかった。
6. 正式な工程入場処理が参照先を再読し、古い束縛を正しく拒否した。

これは内容検査の欠陥ではなく、job製造順序とpreflight範囲の欠陥である。工程入場の改変検知は設計どおり機能した。

## 5. 帰属

- 意味情報パッケージ: 正常。基礎映像本体の全量閉包検査に合格。
- 基礎映像: 正常。frame・sample・公開hashの全検査に合格。
- 横型表示要求と横型正式jobの値: 正常。正式decoderと値検査に合格し、canonical SHAも工程入場jobの記録と一致。
- 横型工程入場job: 製造欠陥。確定前byteのfile SHAを保持している。
- 実行前preflight: 検査不足。参照先の現在byteを実行直前に照合していない。
- 正式な工程入場処理: 正常。古いbyte束縛を拒否した。
- 契約矛盾: 観測していない。

## 6. 保持したもの・実施していないこと

- 不合格の工程入場jobとfailure reportは上書きせず保持した。
- 合格済みの意味情報パッケージと基礎映像4成果物は変更していない。
- 横型工程のreceipt、表示計画、描画成果物は生成されていない。
- crop適用、縦型構築、横型・縦型描画、QCは未実施。
- 追加API通信0回、追加費用US$0。
- 既存3本の正式成果物への書き込みは行っていない。
- commit、tag、安定点化は行っていない。

## 7. 推測

なし。2件のfile SHA差は、現在byteへ末尾LFを1 byte追加した場合のSHAと一致することを機械照合済みである。

## 8. 未確認

- 確定後byteへ再束縛した新しい工程入場jobが合格するか。
- 横型出力、crop適用、縦型出力、両形式の描画・QCが合格するか。
- 新経路で生成した横型・縦型動画の人間目視品質。

## 9. 次の承認依頼

契約・production code・入力5項目・基礎映像を変更せず、次の限定再開を承認してほしい。

1. 今回の不合格jobとfailure reportを証拠として保持する。
2. 横型表示要求と横型正式jobの**現在の正式byte**を再読し、file SHAとcanonical SHAを束縛した新しい版付き工程入場jobを1件作る。
3. 正式実行前に、工程入場job自身だけでなく、target jobと全上流成果物の現在file SHA・canonical SHAを実体から再照合する。出力rootが未使用であることも確認する。
4. 未使用の`08-output-landscape/attempt-0001` receipt rootへ、横型工程入場を新たに1回実行する。
5. 合格時だけ、既承認範囲どおり横型構築・描画・QC、crop適用、縦型構築・描画・QCまで連続し、完成報告で停止する。
6. 不合格1件で停止し、同attemptで修正しない。API通信0回、追加費用US$0を維持する。

今回必要なのは、確定済みbyteへの再束縛と実行直前照合だけである。schema、違反code、内容検査、文字計算、表示規則、crop、presetの変更は不要である。

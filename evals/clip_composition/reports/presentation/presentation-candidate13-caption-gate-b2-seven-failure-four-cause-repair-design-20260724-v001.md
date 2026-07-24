# candidate 13 caption Gate B2 7不合格・4原因＋公開再照合 修正設計 v001

- 日付: 2026-07-24
- 状態: **設計提示・実装未承認**
- 主線: B2 package側全件検査の残存7不合格と、同時に見つかった公開再照合不足を、承認済み契約へ戻す修正
- 停止点: 本文書の提示で停止。コード修正、再検査、preflight job作成は行わない
- 人間作業: 本設計の承認1判断。動画視聴、時刻入力、正解生成は0件

## 1. 本来の目的

目的は、132件を通すために検査を緩めることではない。

承認済み契約が定めた次の意味を、検査と実装へ正確に戻す。

1. 一つの違反は、失敗した工程・変化した読取時点から担当検査が一意に決まる。
2. ファイル内容のhash不一致と、参照関係のbinding不一致を混同しない。
3. ディレクトリ一覧の並びと、成果物を読む並びを混同しない。
4. 壊れた子ファイルは正常データとして部分利用せず、その子のI/O失敗として可視化する。一般的な親全体不正へ名前を潰さない。

今回の7不合格は、この4原因で静的に説明できる。ただし、同じ静的監査で、現在の7停止とは別に公開済み7ファイルの再照合不足も見つかった。既知の契約不足を残したままB2完了とは呼べないため、本文ではこれを「必須前提P」として4原因から分離し、同じ一回の承認・修正・全件再検査に含める。

修正後の132/132を事前に保証しない。現在の停止点より後ろで別原因が初めて観測された場合は、第5原因として停止する。

## 2. 証拠と正本

### 2.1 停止証拠

- 実装・検査時点のcommit: `e915f840ea8e02dc83e535f372a65a8e9005a94c`
- 停止報告:
  `presentation-candidate13-caption-gate-b2-post-hashbang-two-defect-test-stop-report-20260724-v001.md`
- package側TAP:
  `test-runs/20260724-caption-b2-post-hashbang-two-defect-v001/package.tap`
- TAP SHA-256:
  `39cca61b2ffdea9ecc6f7b2ff63f27cc8b2b7078f9dc79d13b98402a1c838002`
- 実測:
  132件中125合格、7不合格、cancel 0、skip 0、todo 0
- 未実行:
  意味回答側全件、Gate A 21件、残存source atom 50件、candidate 13 preflight job作成とpreflight

旧attemptは132件中118合格・14不合格だった。今回、新しく不合格へ転じたtop-level testはなく、旧14件のうち7件が解消した。

### 2.2 契約の正本

本設計は次の承認済み文書からだけ導出する。

- `presentation-candidate13-caption-gate-b1-implementation-contract-design-20260723-v001.md`
  - §4.4: 公開観測、二種類の順序、個別I/O失敗の生記録
  - §7.1: 正式7ファイルの固定製造順
  - §16.2: 違反コード、担当検査、hash/bindingの意味
  - §16.5: 違反インスタンスの担当一意性と上流停止
  - §19: 一つのコードが取り得る各担当組合せの全発火
- `presentation-candidate13-caption-gate-b1-json-and-width-trust-contract-addendum-20260723-v001.md`
  - §5: file hashとcanonical hashの非互換
- `presentation-candidate13-caption-gate-b2-full-test-repair-design-20260724-v001.md`
  - R2案A: 壊れた子を全体件数へ部分利用せず、除外を違反として可視化
- `presentation-candidate13-caption-gate-b2-r1-r3-contract-clarification-addendum-20260724-v001.md`
  - §4.2〜4.6: 個別成果物のopen/read/読取後fstat/close失敗、failure point、code 55、trusted failureの直接契約

正本の違反コード集合、固定順、schema、CLI終了0/1/2、環境固定、正式7ファイル順は変更しない。

### 2.3 修正前の固定hash

| 対象 | SHA-256 | 本設計での扱い |
|---|---|---|
| package検査本体 | `bccc651485156a02971c8f34fe00d8bea331af313b66ee90f0693bb83e1e48f4` | 原因C・Dと必須前提Pだけ変更候補 |
| package検査コード | `059b89c670b41fe14a6fa4d44561f951ba6ee43c43de4f4272f66080b78cf158` | 原因A・B、C・D・P回帰だけ変更候補 |
| package実行処理 | `1a1537f279cf8b69a90b4236e69a048e7bec2d1118f1819e5bad807373c8cbff` | 変更禁止 |
| Gate A実行・検証処理 | `3f35066d43746de3b7527b0e1dc3317faeea828f8beab8bb4dde8ae072a50352` | 変更禁止 |

## 3. 4原因の全体像

| 原因 | 層 | 現在の誤り | 正しい意味 | 直接停止 |
|---|---|---|---|---|
| A | package検査コード | 一つのコードに複数の担当候補があると、全候補へ同じコードを載せる必要があると誤解 | path・失敗stageから、その違反インスタンスの担当を一意に決める | 116、117、119 |
| B | package検査コード | `fileSha256`の改変をbinding不一致と期待 | 記録hashの不一致はhash違反。path・role・artifact ID・相互参照の不一致がbinding違反 | 118 |
| C | package検査本体 | ディレクトリ一覧と成果物読取列を同じ順序で検査 | 一覧はUTF-16ファイル名順、読取列は正式7ファイルの固定製造順 | 123 |
| D | package検査本体 | 個別ファイルのI/O失敗を、親のstaging/published全体不正へ変換 | 壊れた子を利用せず、正確な子の失敗位置で`PUBLICATION_FAILED`を記録 | 124 |

test 132は第5原因ではない。116〜119が途中停止したため、全コード×担当検査の動的観測集合が欠けた派生症状である。回復は少なくとも原因A・Bの両方に依存し、test 132自体の期待集合は変更しない。

## 4. 原因A: 担当候補表と実担当の分離

### 4.1 欠陥

現在の検査コードは、ある違反コードの担当候補が複数ある場合、rootにそのコードが一件あれば全候補の検査行へ同じコードを要求する。

契約は逆である。候補は「担当し得る検査」の集合であり、実際の一件は生のpathまたは失敗stageから一意に決まる。

### 4.2 修正契約

担当候補表は削除せず、「そのコードを担当してよい検査の集合」として保持する。検査コード内で、複数担当コードの各インスタンスを次の固定規則で一意に解決する。

| 違反 | 生の根拠 | 実担当 |
|---|---|---|
| `JOB_FILE_MISMATCH` | pathが`$.job.prePublicationInput` | `jobPrePublication` |
| 同上 | pathが`$.job.preReportInput` | `jobStability` |
| `BUILD_FAILED` | 同じ検査reportを作ったcontextの`buildFailure.stage`が`gate-a-evidence` | `evidenceBuild` |
| 同上 | 同じcontextの`buildFailure.stage`が`embedded-gate-a-report` | `embeddedReportBuild` |
| 同上 | 同じcontextの`buildFailure.stage`が`package` | `packageBuild` |
| `NONDETERMINISTIC` | pathが`$.builds.embeddedReportPasses` | `gateAReport` |
| 同上 | pathが`$.builds.packageBuildPasses` | `determinism` |

規則外のpath・stage、候補集合外の担当、二つ以上に解ける状態は検査コード自身の不成立として失敗させる。

担当解決には、reportだけでなく、そのreportを作った**同一のchecker context**を渡す。別contextからstageを推測したり、reportの見た目からstageを復元したりしない。

各検査行の違反コード列は、上記で解決した担当と完全一致させる。上流失敗で未実行の後段は`not_run_with_upstream_failure`かつ空配列のままにする。全候補へのコード複製、担当が候補集合内ならどれでもよいという緩和、観測集合への手動seedは禁止する。

### 4.3 回帰検査

- `BUILD_FAILED`: 3 stageそれぞれで対象の1検査だけがコードを持つ。
- `JOB_FILE_MISMATCH`: publication直前だけ、report直前だけ、両時点の三ケースを分ける。両時点が変わった場合は異なる二pathと二担当を一件ずつ持つ。
- `NONDETERMINISTIC`: 内包Gate A報告とpackageで担当が分かれる。
- 各ケースで、実担当以外の候補検査には当該コードがなく、上流停止した後段は`not_run_with_upstream_failure`かつ空配列である。
- 個別対象を指定する既存検査を維持する。
- test 132の全コード×全許可担当組合せの期待集合と完全一致検査を維持する。

## 5. 原因B: hashとbindingの分類修正

### 5.1 欠陥

test 118の検査データは、package manifest中の内容成果物に記録された`fileSha256`を変更している。検査本体は`PACKAGE_HASH_MISMATCH`を返すが、検査コードが`PACKAGE_BINDING_MISMATCH`を期待して停止している。

### 5.2 修正契約

当該ケースでは、manifestの`contentArtifacts[0].fileSha256`だけを別の有効な64桁hashへ変える。manifest自身を再直列化・再hashし、reportの`manifestBinding`も更新する。内容成果物の実体は変えない。

期待を`PACKAGE_HASH_MISMATCH`だけへ直し、path
`$.packageFiles[5].value.contentArtifacts[0].fileSha256`
を完全一致で確認する。`PACKAGE_BINDING_MISMATCH`がないことも確認する。

意味の境界は次のまま変えない。

- file hash: 保存されたbyte列のSHA-256
- canonical hash: strict JSONを正規化した意味内容のSHA-256
- binding: path、role、artifact ID、runtime、相互参照

今回変えたのは、内容成果物のbyte hashを指す記録leafである。canonical hashへ読み替えず、bindingにも読み替えない。

対照として、先頭内容成果物の`artifactId`を変え、その成果物を再直列化・再hashする。次にmanifestの`contentArtifacts`と`contentSetCanonicalSha256`、reportの`manifestBinding`と`validatedContentArtifacts`を、変更後の実成果物hashへ同期してから各文書を再直列化・再hashする。

この対照は`PACKAGE_BINDING_MISMATCH`だけ、path
`$.packageFiles[0].value`
を期待し、`PACKAGE_HASH_MISMATCH`がないことを確認する。違反コード、検査本体の分類、正式成果物は変更しない。

## 6. 原因C: 二種類の順序を別々に検査

### 6.1 欠陥

公開観測には二つの順序がある。

1. 作業ディレクトリ直下の全項目: ファイル名のUTF-16順
2. 正式成果物の読取結果: 正式7ファイルの固定製造順

現在の共通検査は、両方を固定製造順へ位置一致させている。このため、実行処理が正しく作った正常stagingを不正と判定している。

### 6.2 修正契約

package検査本体の共通観測検査を、次の二検査へ分ける。

- ディレクトリ一覧:
  - 正式7ファイル名をUTF-16コード単位で並べた期待列と完全一致する。
  - 実観測列を検査側で並べ直して救済しない。
  - 件数、名前、kindが`file`であることを全件確認する。
- 成果物読取列:
  - 正式7ファイルの固定製造順と完全一致する。
  - 各要素のファイル名、read状態、regular file、安定snapshotを確認する。
  - こちらへUTF-16順を適用しない。

UTF-16比較にlocale依存APIを使わない。正式7ファイル配列自体を並べ替えない。stagingとpublishedの双方へ同じ規則を適用する。

### 6.3 回帰検査

- 実行処理が作る正常なUTF-16一覧＋固定読取列を受理する。
- 一覧の順序だけが違う場合を拒否する。
- 読取列の順序だけが違う場合を拒否する。
- missing、extra、非fileを従来どおり拒否する。
- test 123が正常stagingを越えて、本来のinput再確認違反まで到達することを確認する。

検査の意図を維持し、順序の意味だけを正す。runner、正式7ファイル順、違反コード、pathは変更しない。

## 7. 原因D: 個別ファイルI/O失敗の帰属

### 7.1 欠陥

実行処理は、stagingまたはpublishedの各成果物を読む際のopen/read/読取後fstat/close失敗を、子要素の`io-error`と正確なfailure pointとして残している。

現在の検査本体は、親全体のstatusが`io-error`の場合だけ`PUBLICATION_FAILED`へ帰属し、親が`observed`で子だけが`io-error`の場合を一般的なstaging/published不正へ潰している。

### 7.2 R2案Aに沿う修正契約

壊れた子は、正常な成果物として一部も利用しない。ただし、raw `artifactReads`の固定slotと固定順から削除はしない。該当slotの生の`io-error` unionを保持したまま、その子のbytes・hash・bindingを正常内容検査と集計の根拠から除外し、次の正確な違反として可視化する。

- code: `PUBLICATION_FAILED`
- path:
  `$.publication.<staging|published>.artifactReads[i].failurePoint`
- failure point:
  実行処理が記録した`artifact-NN-open`または`artifact-NN-read`

これは全体合格を意味しない。子I/O失敗が一件でもあればpublicationは失敗する。ただし同じ子I/O失敗を、一般的なstaging/published内容不正へ二重帰属させない。

stagingとpublishedでは工程状態が違うため、帰属を次に固定する。

- stagingの子I/O失敗:
  - code 55を`publication`へ一対一で置く。
  - 同じ子を理由にcode 53を出さない。
  - staging gateで停止し、input再確認、preRename、renameは未実行。
  - reportの公開状態は`not_started`。
  - 同じstaging生観測に独立したディレクトリ集合不正、または別の完全に読めた子の非I/O不正がある場合だけ、code 53を別に記録する。固定コード順では53が55より前になる。
- publishedの子I/O失敗:
  - code 55を`publication`へ一対一で置く。
  - `publishedPackage`は`not_run_with_upstream_failure`とし、code 56を発火させない。
  - reportの公開状態は、stagingとinput再確認が既に成立しているため`staging_validated`。
- input再確認のI/O失敗:
  - 子成果物I/Oとは別ケースで、既存code 55経路を維持する。

missing、non-regular、安定して読めた内容不一致を`PUBLICATION_FAILED`へ移さない。親全体のdirectory読取I/O失敗と、子ファイルI/O失敗も別branchのままにする。

trusted reportを作れる子I/O失敗はexit 1とし、`publicationFailures`へ違反pathとfailure pointを一対一で残す。複数の独立したI/O失敗が生観測にある場合は、成果物index順・既存違反固定順で全件を残し、同じ`code + path`だけを重複除去する。

### 7.3 水平回帰

- staging: open、read、読取後fstat、close
- published: open、read、読取後fstat、close
- 対照: input再確認のI/O失敗は既存経路のまま
- 各子I/Oについて、code 55のexact path、failure point、`publicationFailures`、exit 1を確認する。
- staging子I/O後にinput再確認へ進まないこと、published子I/Oで`publishedPackage`が未実行かつcode 56がないことを確認する。

現在のtest 124は最初のstaging-openで停止している。最初の停止の解消は予測できるが、後続8行の完走は再実行まで未確認であり、合格を先取りしない。

## 8. 7不合格から4原因への対応

| test ID | 現在の最初の停止 | 原因 | 修正箇所 | 合格へ転じる見込み | 修正後に初めて観測する範囲 |
|---:|---|---|---|---|---|
| 116 | build失敗の担当を全候補へ要求 | A | package検査コードの担当解決 | 現在の担当不一致を解消見込み | Gate A invalid / valid-failedを含む後続 |
| 117 | build失敗の担当を全候補へ要求 | A | 同上 | 現在の担当不一致を解消見込み | 同test内の後続 |
| 118 | file hash改変をbindingと期待 | B | package検査コードの期待分類 | 現在のhash leaf不一致を解消見込み | 同test内の後続、動的担当観測 |
| 119 | job差分の担当を両候補へ要求 | A | package検査コードの担当解決 | 現在の担当不一致を解消見込み | 両時点同時差分を含む後続 |
| 123 | 正常stagingの一覧順を固定製造順と比較 | C | package検査本体の順序分離 | 現在のstaging誤判定を解消見込み | 本来のinput再確認・preRename行 |
| 124 | staging-openをstaging全体不正へ帰属 | D | package検査本体の子I/O分類 | 最初のstaging-openを解消見込み | 残るstaging/published I/O各行 |
| 132 | 先行検査の途中停止で担当組合せ観測が欠落 | A・Bの派生 | 直接修正なし | Aで116・117・119、Bで118の後続が完走すれば既知欠落を解消見込み | 全期待組合せの最終完全一致 |

「合格へ転じる見込み」は、現在観測された最初の不一致に対する静的予測である。7件全合格、新原因なし、後続行合格を意味しない。test 132の観測集合は、個別の対象違反検査が実際に成功した後だけ更新し、期待組合せの削除・縮小・手動追加をしない。

## 9. 必須前提P: 公開済み7ファイルの再照合

### 9.1 発見した契約不足

承認済みB1契約§4.4は、stagingとpublishedの固定7ファイルについて、集合・regular file・安定読取だけでなく、strict JSON、実byte hash、canonical hash、bindingも再確認すると定める。

現在の公開観測共通検査は、集合、順序、read状態、regular file、snapshot自己整合までしか合否へ使っていない。後段は観測ファイルをstrict decodeしてhashを報告へ投影するが、生成時の期待成果物との不一致をcode 53/56へ帰属していない。

これは現在の7不合格の直接原因ではないため、原因A〜Dへ混ぜない。一方、既知の契約不足なので、これを実装・検査せずに132/132やB2完了を認定しない。

### 9.2 期待側の唯一の正本

期待成果物は、同じ正式runで次の条件を既に通過した**package第1生成結果の固定7成果物**とする。

- package生成の二回結果が決定的に一致済み
- packageShapeで固定7ファイル、strict JSON、file/canonical hash、domain schema、bindingが合格済み
- 実行処理がstagingへ書いた実体と同じ`packageBuildPasses[0].artifacts`

job、manifest単独、published側の自己申告hashを期待値へしない。観測後に期待成果物を作り直さない。

### 9.3 一件ごとの再照合

原因Cで分離した二種類の順序検査が成立した後、固定7 slotの各`read`成果物について次をすべて確認する。

1. snapshotのpath・fileName・regular file・nlink・三時点identity・自己file hashが既存安定読取契約を満たす。
2. snapshot bytesを既存のB1 strict JSON復号器で受理できる。BOM、重複key、小数、surrogate、trailing text等の規則を緩めない。
3. snapshot bytesが同位置の期待成果物bytesと完全一致する。
4. snapshotのfile hashが同位置の期待成果物file hashと完全一致する。
5. 復号値のcanonical hashが同位置の期待成果物canonical hashと完全一致する。
6. 復号値が同位置の期待成果物valueとcanonical JSONとして完全一致する。これにより、既に検査済みのpath・role・artifact ID・runtime・相互参照を、公開後に別内容へ差し替えられない。

観測7ファイル同士だけを見て自己整合しているから合格、とはしない。7ファイル全部を整合した別packageへ差し替えても、生成時の正本と違えば不合格にする。

### 9.4 違反帰属と抑制

- staging:
  - 集合、strict JSON、期待byte/hash/canonical/binding、regular file、nlinkのどれかが不成立ならcode 53 `PUBLICATION_STAGING_INVALID`
  - pathは既存どおり`$.publication.staging`
  - report状態は`not_started`
- published:
  - 固定7読取が完成したうえで同じ再照合のどれかが不成立ならcode 56 `PUBLISHED_PACKAGE_INVALID`
  - pathは既存どおり`$.publishedPackage`
- 子I/O:
  - 原因Dのcode 55を優先して正確な子failure pointへ帰属する。
  - stagingでは同じ子の内容をcode 53の根拠にしない。
  - publishedでは固定7読取が完成しないため`publishedPackage`を未実行とし、code 56を出さない。
- missing / non-regular:
  - I/O失敗へ読み替えず、stagingは53、publishedは固定7観測が完成した非I/O不正として56へ帰属する。

### 9.5 必須回帰

stagingとpublishedの双方で、次を別々の負例にする。

- BOMまたはstrict JSON不成立
- strict-valid JSONの内容変更による期待byte/file/canonical/value不一致。byteが変わればfile hashも変わるため、canonicalだけの単独不一致を作ったとは主張しない
- artifact IDまたは相互参照のbinding不一致。観測byte/hashも期待正本から変わるが、publicationではいずれも同じcode 53/56へ帰属するため、原因別の合成点を作らない
- 7ファイル全部が自己整合しているが、生成時正本とは異なるpackage
- missing、non-regular、nlink不正
- 子I/Oと独立したディレクトリ集合不正

正例は、実行処理が第1生成結果を書き、同じbyteを再読取したstagingとpublishedである。検査専用の別ロジックを作らず、runnerが実際に使う公開観測検査と同じ経路を通す。

## 10. 実装時の変更範囲

### 10.1 変更を許す2ファイル

1. `presentation_caption_semantic_source_package_v001.mjs`
   - 原因Cの二順序分離
   - 原因Dの子I/O帰属
   - 必須前提Pの公開再照合
2. `test_presentation_caption_semantic_source_package_v001.mjs`
   - 原因Aの担当一意解決
   - 原因Bの期待分類
   - 原因C・D・Pの正例、負例、境界例

既存top-level test内へ検査を追加し、登録件数132は変えない。新しいtop-level testが必要になった場合は本設計との差分なので停止する。

### 10.2 変更禁止

- package実行処理
- 意味回答側の検査本体、実行処理、検査コード
- Gate Aの検査・実行・job・schema
- 57違反コード、固定順、担当検査名
- 正式7ファイルschemaと製造順
- strict JSON復号、hashの意味、bindingの意味
- scanner、hashbang・字句契約
- CLI終了0/1/2、stdout/stderr分離
- job、信頼binding、fixture、expected、正式成果物
- 依存追加

原因Aのためにproduction側へ同一コードを重複付与しない。原因Bのためにproduction側の違反分類を変えない。原因C・Dのためにrunnerの観測形式を変えない。

## 11. 実装契約完全性チェック

| 項目 | 固定内容 |
|---|---|
| 成果物schema | 変更なし |
| 違反コード・順序 | 57件・固定順を変更しない |
| CLI終了 | 0=合格、1=信頼できる不合格、2=信頼不能を変更しない |
| 環境 | 固定Node実体、Node/ICU/locale/granularityを変更しない |
| 入力範囲 | 既存package contextと公開観測だけ |
| 工程間受け渡し | Gate Aの平坦8項目、package→意味回答、preflight job/hashを変更しない |
| 検査可能性 | runnerが使う実物の検査本体を公式132件から通す。検査専用の複製実装を作らない |
| 汎用性 | 354件、205候補、candidate 13のhash等を本体・oracleへ焼き込まない |
| 実装者判断 | 本文の原因A〜D、必須前提P、順序、path、担当以外を追加判断しない |

必須前提Pを含めても、schema、違反コード、公開入口、runner観測形式は変えない。既存の生成時成果物と公開再読取の比較を、同じpackage検査本体へ追加するだけである。

## 12. 承認後の再検査契約

本設計全体の実装が明示承認された後だけ、次の順で進める。

1. 許可2ファイルだけを変更し、構文、diff、固定hash、変更禁止対象を静的確認する。
2. package側132件を先頭から新attemptとして一度だけ実行する。
3. 1件でも不合格、skip、todo、cancel、担当組合せ欠落があれば、そのattempt内で直さず停止する。
4. 132/132の場合だけ、意味回答側全件を一度実行する。実登録件数と全結果を保存する。
5. 両方合格した場合だけ、Gate A 21件を一度実行する。
6. 合格した場合だけ、残存source atom 50件を一度実行する。
7. 全回帰合格後だけ、candidate 13 preflight jobを固定順で排他的に一度作り、読み取り専用preflightを一度実行する。
8. 全成立時だけ、B2完了報告と次ゲートの承認依頼を起草して停止する。

保存するもの:

- package側TAP全文とSHA-256
- 意味回答側TAP全文とSHA-256
- 7不合格それぞれの原因・修正・結果対応表
- test 116のGate A三状態
- test 124の全I/O行
- test 132の全コード×担当検査の実観測集合
- 各回帰とpreflightの実行回数

正式package生成、prompt登録、Gemini実走、指示書生成、描画は行わない。

## 13. 停止条件

次の一つでも起きたら、その時点の証拠を保存して停止する。

- 事前固定した期待と一件でも違う
- 原因A〜Dまたは必須前提Pで説明できない不合格が出る
- 別のファイル変更、schema変更、承認済み57集合外の違反コード、新しい契約語彙・公開入口、新依存が必要になる
- 違反の担当、順序、path、抑制を本文から一意に導けない
- 契約同士の矛盾または未定義を見つける
- 結果を見て期待値を変えたくなる
- 修正後に検査を弱める必要が生じる
- candidate固有値を汎用処理へ入れる必要が生じる

部分合格、途中までの改善、後続へ到達したことだけで完了としない。

## 14. 承認文案

> 「candidate 13 caption Gate B2 7不合格・4原因＋公開再照合 修正設計v001」を承認する。原因A〜Dの意味、7不合格との対応、必須前提Pの公開済み7ファイル再照合、変更可能2ファイル、変更禁止範囲、再検査順、停止条件を固定する。本承認をもって設計を確定するが、実装・再検査の開始は別の明示承認まで行わない。

## 15. 改訂履歴

- v001 / 2026-07-24
  - 125/132停止の7不合格を4原因へ分離
  - 担当一意解決、hash/binding分類、二順序、子I/O帰属を固定
  - 7不合格→4原因→予測検査の対応表を事前登録
  - 公開観測のstrict JSON・期待hash・binding再照合不足を、B2完了前の必須前提Pとして統合

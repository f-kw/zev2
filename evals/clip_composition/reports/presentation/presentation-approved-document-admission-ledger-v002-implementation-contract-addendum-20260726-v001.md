# 承認済み文書 admission ledger v002 実装契約追補 v001

- 日付: 2026-07-26
- 状態: **人間承認済み・§17の実装許可**
- 起点となる停止報告:
  `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b5-approved-document-binding-schema-stop-report-20260726-v001.md`
- 対象: `approved-document-admission-ledger-v002`のschema、履歴再導出、bootstrap移行、検査契約
- 今回の実装・移行・B5設計・API通信・Gemini実走: 0件
- 人間作業: 本追補を承認するか／差し戻すかの判断1件、返信操作1回。動画視聴、時刻入力、時間計測なし。相談役レビュー済みのため独立監査を人間へ追加依頼しない。本文量に対する独自の分数見積りは置かない

## 改訂履歴

- v001（2026-07-26）:
  B5設計承認文を同一commitで登録しようとした際に現行v001の`approvalCommit`が自己参照になることを受け、文書内容と登録commitの導出を分離するv002実装契約を新設した。
  人間承認時の明示修正により、§15の撤退条件は実装attempt開始時ではなく本承認時点から数える。

## 1. 結論

`approved-document-binding-v001`は、各文書の内容に加えて、その内容を持つcommit hashを同じ登録objectへ必須記入する。新しい承認記録と台帳を同じcommitへ初めて置く場合、そのcommit hashはcommit treeを含めて決まる一方、hashをtree内へ書けばtreeが変わる。したがって同じcommit自身のhashを同じtreeへ自己記入することは、Gitの構造上成立しない。

今回の矛盾は、相談役が承認条件として求めた「承認依頼書と承認文を同一commitで登録する」と、現行schema v001の`approvalCommit`必須条件が交差して生じた。相談役条件が起点であることを含め、`DECISIONS.md`の2026-07-26規則——現行schemaで同一commit更新を表現できない場合は、文書を改訂せずschema改訂を先に人間へ戻す——へ字義どおり従って停止した。仮hash、二段commit、v001内の特例を選ばなかった判断は正しい。

本追補は、次の二つを分離して自己参照をなくす。

1. 文書内容は、path、Git mode、Git blob、byte数、SHA-256でcommit前に固定する。
2. 同時登録commitは台帳へ自己記入せず、登録IDが`refs/heads/main`のfirst-parent履歴へ最初に現れたcommitとして後から一意に再導出する。

この方式を`approved-document-admission-ledger-v002`とする。

## 2. 承認済み記録との関係・今回の範囲

### 2.1 上書きする記述

本追補が人間承認された場合、起点停止報告§4の「推奨する版付き追補の方向」を、実装可能な値まで閉じた正本として本追補が上書きする。停止報告そのものは書き換えて消さず、矛盾検出の記録として保持する。

### 2.2 変えないもの

- 既存`check_approved_document_bindings_v001.mjs`と6 bindingは変更しない。
- 既存6文書のpath、承認時commit、mode、blob、byte数、SHA-256を変えない。
- 承認なしに承認済み文書を編集しない。
- 文書改訂とbinding更新を同じcommitの変更集合へ含める原則を変えない。
- B4までの正式成果物、検査、安定点を変えない。

### 2.3 今回含めないもの

- v002 schema、台帳、検査器、runner、testの実装。
- 既存6件のv002移行。
- 人間承認記録3件の作成。
- B5設計、prompt、payload、token計測、費用計算。
- API keyへのアクセス、API通信、Gemini・他LLM実走。
- 正式表示計画、指示書、描画。
- B5の実行構成を決めること。

B5側の残件は起点停止報告§7で管理し、本追補の台帳契約へ混ぜない。

### 2.4 後方互換を作らない

移行後の正式入口はv002だけとする。

- v002 parserはv001 object shapeを拒否する。
- v001失敗時にv002、v002失敗時にv001へ逃がすfallbackを作らない。
- v001からv002への自動変換を通常入口へ置かない。
- v001検査器は履歴資産として保持し、bootstrap移行前の連続性確認で一回使う。
- 移行後の`implementation-start`、`formal-test-start`、`completion-and-stable-tag`はv002だけで判定する。

## 3. 本台帳が保証すること・保証しないこと

### 3.1 保証する範囲

v002が機械的に証明するのは、次の範囲である。

1. 登録時点に宣言した文書path、mode、blob、byte数、SHA-256。
2. 承認依頼書と承認記録が、一つの登録IDの対として登録されたこと。
3. 承認記録に宣言された承認者名、受領日、判断、承認対象文書hash。
4. 承認記録と台帳entryが同じ単一親commitで初めて導入されたこと。
5. 登録後にfirst-parent正本上でentryが消失・変更・再導入されていないこと。
6. 検査時点の作業ツリーに残すことを契約で要求した文書が、**pathごとの有効末尾一件**と一致すること。revisionがないpathはlegacyまたは`approvalEffect="approve-request-document-as-contract"`のrequestが末尾、revisionがあるpathはrevision鎖の末尾だけが現在照合対象であり、旧版と新版を同じworktree byteへ同時照合しない。承認記録は各登録byteへ照合する。`approvalEffect="authorize-requested-action"`のrequestは履歴証拠としてsource commitのtreeを正本とし、後日の同pathの作業ツリーbyteとは照合しない。

### 3.2 保証しない範囲

次は証明しない。

- `declaredApprover: "kawafmm"`が暗号学的に本人から送られたこと。
- kawafmmが対象文書の全文を実際に読んだこと。
- 会話サービス上の送信者認証、message ID、server側原本。
- Git ref、履歴、ローカルrepositoryが暗号学的に改竄不能であること。
- 固定Node／Gitを起動したOS process memory、kernel、dynamic loaderが暗号学的に無改竄であること。
- toolGraphを最初にmaterializeする前のworktree上bootstrap runnerが、契約どおり子検査器を起動したことの暗号学的証明。launcherは最小責務に制限し、展開後checkerが候補commit・toolGraph・履歴を再検査するが、最初の起動点自体は運用上の信頼根である。
- repository guardを開始・終了の二観測間だけ変更して元へ戻す外部processが存在しなかったこと。二観測不一致と各観測時の禁止状態は検出するが、kernel監視による連続証明はしない。
- precommitのindex seal取得後から実際のGit commit作成まで、外部processがindexを変更しなかったことの連続監視。変更後treeをcommitした場合はpostcommitのtrailer／HEAD tree不一致で停止する。
- 検査時のraw `RepositorySnapshotV002`全体を長期保存して後日再生できること。正式reportはcanonical snapshot projectionのSHA-256と主要部分digestを保存するが、raw一時観測そのものは保存対象にしない。
- リポジトリ内外にある全ての人間判断を本台帳が網羅していること。
- 依頼書なしの直接指示を本台帳が保存していること。

Git repository、`refs/heads/main`、人間原文を版付き記録へ転記する工程は運用上の信頼根である。本台帳は保存byteと**宣言された承認来歴**を束縛するが、本人性を過大主張しない。

## 4. 登録型と適用範囲

v002は、bootstrap専用のlegacy provenanceを一種類と、`admissions`へ追加できる通常登録型を二種類だけ持つ。

### 4.1 `legacy-commit-pinned`

v001の既存6文書をbyte同一で移すbootstrap専用型。

- 既存commitを`sourceCommit`として持つ。
- v001のpath、mode、blob、byte数、SHA-256と一対一で一致しなければならない。
- bootstrap後にこの型を増やしてはならない。

### 4.2 `request-approval-pair`

実在する版付き承認依頼書と、その依頼へ答えた版付き人間承認記録を一つの`admissionId`で束ねる通常型。

- 依頼書は登録commitより前のcommitに存在する。
- 承認記録は台帳entryと同じ登録commitで初めて導入する。
- 片方だけの登録を許さない。
- 一つの承認記録を複数の依頼書へ使い回さない。
- この型は依頼書と承認記録を登録するものであり、既存の承認済み文書path自体を改訂しない。
- 一つの人間メッセージで複数項目をまとめて承認する場合は、承認対象を一つの版付き集約依頼書へ事前に列挙し、その集約依頼書と一つの承認記録を一対にする。複数の独立依頼書を一つの承認記録へ後付けで束ねない。
- 承認効果を`approvalEffect`で二つに分ける。`"authorize-requested-action"`は依頼された次工程だけを許可し、依頼書pathはcommit-pinned履歴証拠に留める。`"approve-request-document-as-contract"`は依頼書byte自体を承認済み契約として現在照合と将来revisionの対象にする。人間原文からどちらか一意に読めない場合は記録者が選ばず停止する。

### 4.3 依頼書なしの直接指示

依頼書が存在しない直接指示・直接裁定は、従来どおり`DECISIONS.md`の記録を正本とする。

- 架空の依頼書を作ってpairへ当てはめない。
- v002へ単独承認型を追加しない。
- `DECISIONS.md`にある過去の直接指示を遡及して一括移行しない。
- 将来、直接指示自体を台帳化する必要が生じた場合は、別の版付きschema設計として人間承認へ戻す。

直接メッセージであっても、実在する依頼書を明示的に承認している場合はpair型の承認記録にできる。「直接メッセージであること」と「依頼書が存在しないこと」を混同しない。

### 4.4 同じpathの承認済み改訂

`DECISIONS.md`の2026-07-26規則（承認済み文書の改訂byteとbinding更新を同じcommitへ入れる）をv002で表現するため、台帳entry自体はappend-onlyのまま、同じpathの新しい内容を`approved-document-revision`として**明示的な版鎖**へ追加できる。対象にできるのはlegacy文書、`approvalEffect="approve-request-document-as-contract"`で承認されたrequest、既存revisionの末尾版だけである。`authorize-requested-action`のrequest証拠を文書契約へ暗黙昇格しない。この型は今回のbootstrapを増やすための新規用途ではなく、既存規則をv002へ失わず移すための通常運用型である。

- 旧entryを変更・削除しない。
- 改訂内容を列挙した実在の版付き`revisionRequestDocument`を先にcommitし、人間へ提示する。
- 人間承認後、新entryの`revisedDocument.provenanceKind`を`"same-admission-revision"`とする。
- 新entryは、直前に有効だった文書identityを`revisedDocument.supersedes`で一つだけ完全参照する。
- 改訂文書byte、承認記録、ledgerの新entry、版付きadmission jobを同じ単一親commitへ入れる。
- `supersedes`が直前の有効版でない、版鎖が分岐する、循環する、飛ばす、同じcommitで同じpathを二回改訂する場合は停止する。
- formal検査では、旧版はsource commitのtreeで保持されていることを検査し、現在のworktreeは版鎖の末尾だけと照合する。

この方式により、同じpathの改訂を許しても既存entryを上書きしない。「同じpathが二つある」だけでは合格にせず、唯一の連続した`supersedes`鎖がある場合だけ受理する。

依頼書なしの直接指示だけを根拠に、承認済み文書を即時改訂しない。その指示は`DECISIONS.md`の正本に残し、実際の改訂前に実在するrevision依頼書を作って改めて人間承認へ戻す。これは過去の直接指示へ架空の依頼書を遡及製造することではなく、将来の改訂byteを事前提示する工程である。

## 5. 正式pathと責務

実装承認後に作成を許す正式pathを次へ固定する。

| path | 責務 |
|---|---|
| `evals/clip_composition/approved_document_admission_ledger_v002.mjs` | strict decode、正式serialize、内容照合、履歴再導出の共有処理 |
| `evals/clip_composition/check_approved_document_admission_ledger_v002.mjs` | materialize後の正式検査子CLI。共有処理を呼び、reportの生成・必要時の原子的保存・stdout・終了codeを所有する。operatorが作業ツリーから直接起動する入口にはしない |
| `evals/clip_composition/run_approved_document_admission_ledger_v002_bootstrap.mjs` | bootstrap jobから承認記録・台帳を作るmutation modeは一回限り。検査時は全phase共通の唯一のoperator-facing launcherとしてGit-only materializeと子CLIの透過実行だけを担い、postcommit以後も再利用する |
| `evals/clip_composition/run_approved_document_admission_v002.mjs` | bootstrap後のpair登録・承認済み文書改訂を一件ずつ準備する通常runner |
| `evals/clip_composition/test_approved_document_admission_ledger_v002.mjs` | 合成・履歴・migration検査 |
| `evals/clip_composition/approved_document_admission_ledger_v002.json` | 移行後に正式入口が読む唯一の台帳 |
| `evals/clip_composition/fixtures/presentation/approved-document-admission-ledger-v002-bootstrap-job-v001.json` | 12文書・3対・legacy 6件を閉じる一回限りの入力 |
| `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/precommit-index-report-v001.json` | Git indexを正本にしたcommit前検査記録 |
| `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/postcommit-head-report-v001.json` | HEAD treeを正本にしたcommit後検査記録 |

検査のprocess入口は二段へ固定する。

1. operatorが起動できる正式入口は、作業ツリー上のbootstrap runnerに対する
   `--launch-check-v001 <phase> <admissionId-or-dash>`だけである。IDを持たないphaseは第三引数をliteral `-`に固定し、省略を許さない。
2. launcherが固定5実体をmaterializeした後にだけ、同じ一時directory内のcheckerを
   `--materialized-child-v001 <phase> <admissionId-or-dash> <materializedRoot>`で一回起動する。
3. materialize後checkerは別runnerを再起動せず、相対importしたcoreを一回呼ぶ。したがってlauncherへの再帰はない。
4. checkerは`realpath(import.meta.filename)`の親directoryが第四引数`materializedRoot`とbyte一致し、repository実体path外にあり、§8.5の一時directory条件を満たす場合だけchild modeへ入る。したがってcheckerを作業ツリーから直接起動する、launcherへ`--materialized-child-v001`を渡す、checkerへ`--launch-check-v001`を渡す、未定義modeを渡す場合は`USAGE`のexit 2とする。
5. bootstrap mutationは同じbootstrap runnerの`--prepare-bootstrap-v001`だけであり、検査modeと同じprocessで連続実行しない。通常admissionのmutationは通常runnerだけが所有する。

この二段を「正式CLI」と総称しても、外側launcherと内側checkerの責務を入れ替えない。
`materializedRoot`は、5実体の共通親である`evals/clip_composition`相当の一時directory実体pathであり、repository root相当の上位directoryではない。

通常admissionの検査記録pathは次の二つへ決定的に導出する。

- `evals/clip_composition/outputs/presentation/approved-document-admissions-v002/<admissionId>/precommit-index-report-v002.json`
- `evals/clip_composition/outputs/presentation/approved-document-admissions-v002/<admissionId>/postcommit-head-report-v002.json`

precommit／postcommit reportは検査時の観測値を含むため、bootstrap commitにも通常admission commitにも入れない。特にprecommit reportの`indexTreeObjectId`を同じindex treeへ書き戻すと、今回解消するcommit hash自己参照と同型になる。precommit reportのSHA-256とindex tree OIDは§8.2のcommit trailerへ固定し、postcommitがcommit message、HEAD tree、保存済みprecommit reportを再照合する。postcommit reportも対象commitの外で生成する。両report familyは再生成可能な機械証拠であり、**自動的にも個別にもadmission対象にしない**。後続の人間向け設計・裁定はreportのpath＋SHAを根拠として引用できるが、承認対象はその新しい依頼書であり、引用元reportを再登録しない。この終端規則により「reportを登録したadmissionがさらにreportを生む」再帰を作らない。

次のv001 pathは変更しない。

`evals/clip_composition/check_approved_document_bindings_v001.mjs`

## 6. 正式JSONとschema

### 6.1 共通のbyte契約

台帳、bootstrap job、人間承認記録、検査reportは全て次の正式JSONとする。

- UTF-8、BOMなし。
- 改行はLFだけ。
- 2-space indent。
- 最終LFを一つ持つ。
- field順は本節の表順。
- 未知fieldを拒否する。
- array順を意味のある正式順として扱い、勝手にsortし直さない。
- `JSON.parse`後に同じfield順で`JSON.stringify(value, null, 2) + "\n"`を再生成し、元byteと完全一致しない入力を拒否する。
- 重複key、別空白、別key順、CRLF、末尾空白、BOM、指数表記、不要なescapeは正式byteへ戻らないため拒否する。
- `byteLength`は0以上のsafe integer。
- Git object IDは小文字40桁hexとし、repository object formatは`sha1`に固定する。
- SHA-256は小文字64桁hex。
- pathはrepository相対POSIX pathで、全体が`^[A-Za-z0-9][A-Za-z0-9._/-]*$`を満たす。先頭`/`、末尾`/`、空segment、`.`、`..`、NUL、backslash、制御文字、非ASCIIを拒否する。
- IDは`^[a-z0-9][a-z0-9-]*-v[0-9]{3}$`。
- 日付は`YYYY-MM-DD`。
- Unicode正規化、trim、case foldを行わない。

### 6.2 台帳top-level

field順と型を次へ固定する。

| 順 | field | exact値・型 |
|---:|---|---|
| 1 | `schemaVersion` | `"approved-document-admission-ledger-v002"` |
| 2 | `ledgerId` | `"presentation-approved-document-admission-ledger-v002"` |
| 3 | `historyPolicy` | §6.3のobject |
| 4 | `toolGraph` | §6.3.1のarray |
| 5 | `legacyDocuments` | §6.4のarray |
| 6 | `admissions` | §6.5のarray |

### 6.3 `historyPolicy`

| 順 | field | exact値 |
|---:|---|---|
| 1 | `historyAnchorRef` | `"refs/heads/main"` |
| 2 | `traversal` | `"first-parent-root-inclusive-v001"` |
| 3 | `gitObjectFormat` | `"sha1"` |
| 4 | `introductionCommitParentCount` | `1` |
| 5 | `ledgerPath` | `"evals/clip_composition/approved_document_admission_ledger_v002.json"` |

これらはCLI引数、環境変数、jobで上書きできない。

### 6.3.1 `toolGraph`

v002の共有処理・正式CLI・二つのrunner・testを、次の順の5件で固定する。

| 順 | `role` | `path` |
|---:|---|---|
| 1 | `core` | `evals/clip_composition/approved_document_admission_ledger_v002.mjs` |
| 2 | `checker` | `evals/clip_composition/check_approved_document_admission_ledger_v002.mjs` |
| 3 | `bootstrap-runner` | `evals/clip_composition/run_approved_document_admission_ledger_v002_bootstrap.mjs` |
| 4 | `admission-runner` | `evals/clip_composition/run_approved_document_admission_v002.mjs` |
| 5 | `test` | `evals/clip_composition/test_approved_document_admission_ledger_v002.mjs` |

各entryのfield順は`role`、`path`、`gitMode`、`gitBlobObjectId`、`byteLength`、`fileSha256`とする。後四値はbootstrap indexのstage 0から実装固定し、ledgerへ格納した後に同じindexから再照合する。null、仮hash、worktreeからの代用を許さない。

bootstrap後は5 entryを変更しない。v002 codeを変更する必要が生じた場合は通常admissionへ混ぜず、契約版の改訂へ戻す。formal phaseは後述のbootstrap commitから5 blobを再導出し、現在HEADの同pathと全identityが一致することを要求する。

### 6.4 `legacyDocuments[]`

field順を次へ固定する。

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `legacyId` | 一意なID |
| 2 | `provenanceKind` | `"legacy-commit-pinned"` |
| 3 | `path` | 正式path |
| 4 | `sourceCommit` | 小文字40桁Git OID |
| 5 | `gitMode` | `"100644"` |
| 6 | `gitBlobObjectId` | 小文字40桁Git OID |
| 7 | `byteLength` | safe integer |
| 8 | `fileSha256` | 小文字64桁SHA-256 |

bootstrap時は6件ちょうどで、§9.1と同じ順にする。通常登録で追加・削除・並べ替え・改値しない。

### 6.5 `admissions[]`

`admissionKind`で判別する二種類のtagged unionとする。

#### 6.5.1 `request-approval-pair`

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `admissionId` | 一意なID |
| 2 | `admissionKind` | `"request-approval-pair"` |
| 3 | `requestDocument` | §6.6のcommit-pinned document |
| 4 | `approvalRecordDocument` | §6.8 |
| 5 | `approvalClaim` | §6.9.1 |

#### 6.5.2 `approved-document-revision`

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `admissionId` | 一意なID |
| 2 | `admissionKind` | `"approved-document-revision"` |
| 3 | `revisionRequestDocument` | §6.6のcommit-pinned document |
| 4 | `revisedDocument` | §6.7 |
| 5 | `approvalRecordDocument` | §6.8 |
| 6 | `approvalClaim` | §6.9.2 |

bootstrapの3件は§9.2の順にする。その後の通常登録はarray末尾へ一件だけ追加する。既存entryの並べ替え・削除・置換を禁止する。

### 6.6 commit-pinned request document

`requestDocument`と`revisionRequestDocument`は同じshapeを使う。

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `provenanceKind` | `"commit-pinned"` |
| 2 | `path` | 登録commitより前から存在する承認依頼書 |
| 3 | `sourceCommit` | 依頼書の登録対象byteを持つ既存commit |
| 4 | `gitMode` | `"100644"` |
| 5 | `gitBlobObjectId` | sourceCommit treeのblob |
| 6 | `byteLength` | sourceCommit treeのbyte数 |
| 7 | `fileSha256` | sourceCommit treeのSHA-256 |

同じ計算を二重実装せず、一つのcommit-pinned document検査を両fieldから呼ぶ。

bootstrapの既存行7・9は§9.2でsource identityを固定済み、行11はbootstrap jobの`baseCommit`を末尾とする§9.2のsuffix導出を使う。bootstrap後の通常pair／revisionは§6.12の`approvalAnchor == baseCommit`を末尾とする同じsuffix導出を使う。通常jobでoperatorが過去commitを直接指定して`sourceCommit`を選ぶ入口は持たない。

### 6.7 `revisedDocument`

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `provenanceKind` | `"same-admission-revision"` |
| 2 | `path` | 直前の有効版と同じpath |
| 3 | `supersedes` | 下表のobject |
| 4 | `gitMode` | `"100644"` |
| 5 | `gitBlobObjectId` | 登録commitのtreeにある改訂後blob |
| 6 | `byteLength` | 改訂後byte数 |
| 7 | `fileSha256` | 改訂後SHA-256 |

`supersedes`は次のfield順とする。

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `sourceKind` | `"legacy"`または`"admission"` |
| 2 | `sourceId` | 直前の`legacyId`または`admissionId` |
| 3 | `path` | 改訂後と同じpath |
| 4 | `fileSha256` | 直前の有効版SHA-256 |

`sourceKind`が`legacy`なら`sourceId`は`legacyDocuments`の一件、`admission`なら既存`admissions`の一件を指す。存在しないID、別path、最新でない版、同じcommit内の新entryを指す値を拒否する。

### 6.8 `approvalRecordDocument`

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `provenanceKind` | `"same-admission-commit"` |
| 2 | `path` | bootstrapは§9.2の予約path、通常登録は§6.12の決定的導出path |
| 3 | `gitMode` | `"100644"` |
| 4 | `gitBlobObjectId` | 登録commitのtreeにあるblob |
| 5 | `byteLength` | 承認記録byte数 |
| 6 | `fileSha256` | 承認記録SHA-256 |

登録commitのhash fieldは持たない。

### 6.9 `approvalClaim`

#### 6.9.1 request承認

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `approvalRecordId` | 承認記録内の同名IDと完全一致 |
| 2 | `declaredApprover` | `"kawafmm"` |
| 3 | `receivedDate` | 承認メッセージの受領日 |
| 4 | `decision` | `"approved"` |
| 5 | `approvalEffect` | `"authorize-requested-action"`または`"approve-request-document-as-contract"` |
| 6 | `requestPath` | `requestDocument.path`と完全一致 |
| 7 | `requestFileSha256` | `requestDocument.fileSha256`と完全一致 |
| 8 | `messageTextSha256` | 承認記録の`messageText`をUTF-8化したSHA-256 |

#### 6.9.2 文書改訂承認

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `approvalRecordId` | 承認記録内の同名IDと完全一致 |
| 2 | `declaredApprover` | `"kawafmm"` |
| 3 | `receivedDate` | 承認メッセージの受領日 |
| 4 | `decision` | `"approved"` |
| 5 | `revisionRequestPath` | `revisionRequestDocument.path`と完全一致 |
| 6 | `revisionRequestFileSha256` | `revisionRequestDocument.fileSha256`と完全一致 |
| 7 | `revisedPath` | `revisedDocument.path`と完全一致 |
| 8 | `revisedFileSha256` | `revisedDocument.fileSha256`と完全一致 |
| 9 | `supersededFileSha256` | `revisedDocument.supersedes.fileSha256`と完全一致 |
| 10 | `messageTextSha256` | 承認記録の`messageText`をUTF-8化したSHA-256 |

### 6.10 人間承認記録

schemaVersionは`approved-document-human-approval-record-v001`とする。field順を次へ固定する。

| 順 | field | 型・制約 |
|---:|---|---|
| 1 | `schemaVersion` | `"approved-document-human-approval-record-v001"` |
| 2 | `approvalRecordId` | 一意なID |
| 3 | `admissionId` | 台帳entryと完全一致 |
| 4 | `sourceChannel` | `"codex-user-message"` |
| 5 | `declaredApprover` | `"kawafmm"` |
| 6 | `receivedDate` | `YYYY-MM-DD` |
| 7 | `decision` | `"approved"` |
| 8 | `approvalScope` | 下記tagged union |
| 9 | `messageText` | 人間が送った本文の版付き転記 |
| 10 | `messageTextSha256` | `messageText`値のUTF-8 SHA-256 |

`request-approval-pair`の`approvalScope`は`kind`=`"request-approval"`、`approvalEffect`、`requestPath`、`requestFileSha256`の順とする。`approvalEffect`は§4.2の二値だけを許す。

`approved-document-revision`の`approvalScope`は`kind`=`"document-revision"`、`revisionRequestPath`、`revisionRequestFileSha256`、`revisedPath`、`revisedFileSha256`、`supersededFileSha256`の順とする。

`messageText`は会話サービスのnetwork byteを証明するものではない。Codexへ渡されたuser-authored本文を、先頭・末尾をtrimせず、段落順を変えずに転記した値である。自動付与されたambient UI state、system、developer、assistant本文を混ぜない。誤字修正、要約、Markdown整形、Unicode正規化を行わない。

### 6.11 bootstrap job

schemaVersionは`approved-document-admission-ledger-bootstrap-job-v001`とする。field順を次へ固定する。

| 順 | field | 内容 |
|---:|---|---|
| 1 | `schemaVersion` | `"approved-document-admission-ledger-bootstrap-job-v001"` |
| 2 | `bootstrapId` | `"presentation-approved-document-admission-ledger-v002-bootstrap-v001"` |
| 3 | `baseCommit` | bootstrap commitの直前HEAD。実装開始時に小文字40桁OIDで固定 |
| 4 | `runtimeBinding` | 下記のNode・Git実体 |
| 5 | `v1CheckerBinding` | 下記の固定6値 |
| 6 | `documentPlan` | §9の12行を同じ順で持つarray |
| 7 | `pairPlan` | §9.2の3対を同じ順で持つarray |
| 8 | `approvalRecords` | §6.10の正式record 3件 |
| 9 | `bootstrapCommitPaths` | 下記10 pathのexact array |

`runtimeBinding`は`node`、`git`の順のobjectとする。各子objectは`realPath`、`version`、`fileSha256`の順とし、次へ固定する。

| 実体 | `realPath` | `version` | `fileSha256` |
|---|---|---|---|
| Node | `/Users/kawafmm/.nvm/versions/node/v20.19.6/bin/node` | `v20.19.6` | `de4f3b493b15e7a0ee311f6a2c6dbf93858052f5802aa91cfafa2c57e9d6bc5c` |
| Git | `/opt/homebrew/Cellar/git/2.52.0_1/bin/git` | `git version 2.52.0` | `6026c297b8938dc3ed7e53cb9d5d3935cae99abc1cfc05df05a904b0ef12a27e` |

runnerとcheckerはPATH検索結果をそのまま信用せず、実体pathを解決して版・SHA-256を照合する。不一致時は別binaryへfallbackせずfatal停止する。

`v1CheckerBinding`は、field順を`path`、`sourceCommit`、`gitMode`、`gitBlobObjectId`、`byteLength`、`fileSha256`とし、次へ固定する。

| field | 固定値 |
|---|---|
| `path` | `evals/clip_composition/check_approved_document_bindings_v001.mjs` |
| `sourceCommit` | `01adea0881372cb3dae0e27192e7f5543ffb9840` |
| `gitMode` | `100644` |
| `gitBlobObjectId` | `4c27b38e84b84c9e5817c79a6e806989bcbd4c04` |
| `byteLength` | `7525` |
| `fileSha256` | `688e132fdf60e1e8d36575681d6075b674d7ffa587c79d6bcf23234a5056f61e` |

`bootstrapCommitPaths`は次の順の10件ちょうどとする。

1. `evals/clip_composition/approved_document_admission_ledger_v002.mjs`
2. `evals/clip_composition/check_approved_document_admission_ledger_v002.mjs`
3. `evals/clip_composition/run_approved_document_admission_ledger_v002_bootstrap.mjs`
4. `evals/clip_composition/run_approved_document_admission_v002.mjs`
5. `evals/clip_composition/test_approved_document_admission_ledger_v002.mjs`
6. `evals/clip_composition/approved_document_admission_ledger_v002.json`
7. `evals/clip_composition/fixtures/presentation/approved-document-admission-ledger-v002-bootstrap-job-v001.json`
8. `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/b5-design-start-human-approval-v001.json`
9. `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/ledger-v002-drafting-human-approval-v001.json`
10. `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/ledger-v002-implementation-human-approval-v001.json`

`documentPlan`は次の三shapeだけを許す。field順も表順とする。

| role | field順 |
|---|---|
| `legacy` | `rowId`, `role`, `legacyId`, `path`, `identitySource`, `identity` |
| `request` | `rowId`, `role`, `admissionId`, `path`, `identitySource`, `approvalAnchor`, `identity` |
| `approval` | `rowId`, `role`, `admissionId`, `path`, `identitySource`, `approvalRecordId` |

`rowId`は§9の行順に`B001`から`B012`までを割り当てる。`legacy`の`identitySource`は`"commit-pinned"`、`identity`は`sourceCommit`、`gitMode`、`gitBlobObjectId`、`byteLength`、`fileSha256`の順とする。

request行7・9は`identitySource="commit-pinned"`、`approvalAnchor=null`。request行11だけ`identitySource="approved-suffix-start-v001"`、`approvalAnchor`を**bootstrap jobの`baseCommit`と同じ40桁OID**へ固定する。別OIDを保存できる入口を持たない。全requestの`identity`は同じ5 field順で、行11はそのbaseCommitを末尾とするrunから機械導出した値を格納する。`approval`の`identitySource`は`"serialize-approval-record"`とする。

`pairPlan`の各行は`admissionId`、`requestRowId`、`approvalRowId`、`approvalEffect`の順で、`B007`＋`B008`、`B009`＋`B010`、`B011`＋`B012`を指す3件ちょうどとする。最初の2件の`approvalEffect`は`"authorize-requested-action"`、3件目は`"approve-request-document-as-contract"`へ固定する。`approvalRecords`は`B008`、`B010`、`B012`の順とする。

実際のjobではnull、空文字、`TBD`、仮hashを許さない。承認記録のmode、blob、byte数、SHA-256は、job内の正式recordを§6.1でserializeしたbyteからrunnerがcommit前に一意に導出する。

precommit／postcommit report pathは`bootstrapCommitPaths`へ含めない。報告をstagedにした場合は`INDEX_PATH_SET_MISMATCH`とする。

### 6.12 通常admission jobと生成入口

bootstrap後の通常登録は、次の版付きpathだけを使う。

- job:
  `evals/clip_composition/fixtures/presentation/approved-document-admission-jobs/<admissionId>.json`
- 承認記録:
  `evals/clip_composition/outputs/presentation/approved-document-admissions-v002/<admissionId>/human-approval-record-v001.json`

`<admissionId>`はjob内のIDと完全一致し、path segmentとしても§6.1のID grammarを満たす。別pathをCLI引数で与えない。

通常登録の`approvalRecordId`は`<admissionId>-human-approval-v001`へ一意に導出する。ただし`admissionId`末尾の`-vNNN`を含めた単純連結でID grammarを壊すため、正式導出は次のとおりとする。

1. `admissionId`を末尾の`-vNNN`直前で`stem`と`version`へ分ける。
2. `approvalRecordId = stem + "-human-approval-" + version`。
3. 例: `sample-contract-v001` → `sample-contract-human-approval-v001`。

bootstrap 3件のIDは通常導出を使わず、次のexact値へ固定する。

| admissionId | approvalRecordId |
|---|---|
| `b5-design-start-20260726-v001` | `b5-design-start-human-approval-20260726-v001` |
| `ledger-v002-drafting-20260726-v001` | `ledger-v002-drafting-human-approval-20260726-v001` |
| `ledger-v002-implementation-20260726-v001` | `ledger-v002-implementation-human-approval-20260726-v001` |

`request-approval-pair` jobのfield順:

1. `schemaVersion` = `"approved-document-admission-job-v001"`
2. `admissionId`
3. `admissionKind` = `"request-approval-pair"`
4. `baseCommit`
5. `approvalAnchor`
6. `runtimeBinding` = bootstrap jobと同じexact object
7. `requestDocument` = §6.6
8. `approvalRecord` = §6.10
9. `admissionCommitPaths`

`approved-document-revision` jobのfield順:

1. `schemaVersion` = `"approved-document-admission-job-v001"`
2. `admissionId`
3. `admissionKind` = `"approved-document-revision"`
4. `baseCommit`
5. `approvalAnchor`
6. `runtimeBinding` = bootstrap jobと同じexact object
7. `revisionRequestDocument` = §6.6
8. `revisedDocumentPlan`
9. `approvalRecord` = §6.10
10. `admissionCommitPaths`

`revisedDocumentPlan`は`path`、`supersedes`の順とし、`supersedes`は§6.7と同じshapeで親ledgerの有効末尾版を指す。改訂後のmode、blob、byte数、SHA-256は、対象pathのworktree byteからrunnerが導出し、承認記録の`approvalScope`と完全一致しなければ生成を止める。

`admissionCommitPaths`は次へ固定する。

- pair:
  job path、承認記録path、正式ledger pathの3件。
- revision:
  job path、承認記録path、改訂対象path、正式ledger pathの4件。

runnerはjobを一回読み、親ledgerを変更せずに一entryだけ末尾へ加えた新ledgerと承認記録を生成する。Git add、Git commit、既存文書の編集、承認原文の修復は行わない。precommit checkerはindex上のpath集合とjobの`admissionCommitPaths`を照合し、postcommit checkerは`baseCommit`→HEADのdiff path集合を同じ値へ照合する。

通常jobは、人間承認原文を受領した後、承認記録を生成する前に`refs/heads/main` full OIDを`baseCommit`へ一回固定し、`approvalAnchor`へ同じOIDを写す。両値が違うjobを拒否する。`requestDocument`／`revisionRequestDocument`の`sourceCommit`はoperator入力にせず、承認記録の対象path・hash・modeと一致したまま`approvalAnchor`で終わるfirst-parent suffixの最古commitとして導出する。suffix 0件、anchorより後のcommit、途中で一度でも別identityを挟む過去の同byte、side branchだけのbyteを採らない。precommit開始時に`HEAD == refs/heads/main == baseCommit == approvalAnchor`でなければ、jobを現HEADへ合わせて再生成せず停止する。postcommit／formal phaseはjobに保存されたanchorとidentityから同じsuffixを再導出する。

### 6.13 共有処理の公開入口

`approved_document_admission_ledger_v002.mjs`がexportするproduction入口を次の六つだけへ固定する。

| export | 引数 | return |
|---|---|---|
| `decodeApprovedDocumentAdmissionLedgerV002` | `Uint8Array`一つ | `{ status: "ok", value }`または`{ status: "invalid", violations }` |
| `serializeApprovedDocumentAdmissionLedgerV002` | strict decode済み`value`一つ | canonical UTF-8 `Uint8Array` |
| `collectApprovedDocumentAdmissionSnapshotV002` | `{ phase, admissionId, jobPath, repositoryContext }` | 下記`RepositorySnapshotV002`。Git I/O不能はtyped fatal |
| `collectApprovedDocumentAdmissionIndexSealV002` | `{ repositoryContext }` | indexの最終`entries`＋`treeObjectId`。precommit以外から呼ばない |
| `validateApprovedDocumentAdmissionSnapshotV002` | `{ snapshot, indexSeal }` | §11.3のreport value。precommitだけseal必須、他phaseは`null`必須 |
| `serializeApprovedDocumentAdmissionCheckReportV002` | §11.3のstrict report value一つ | canonical UTF-8 `Uint8Array` |

`admissionId`は通常二phaseだけ文字列、他phaseは`null`。`jobPath`はprecommit／postcommitだけ正式job path、正式三phaseは`null`。未知fieldを拒否する。

`repositoryContext`は次の二つだけを許すtagged unionである。

- production:
  `kind="zev2-production-v001"`、`repositoryRoot="/Users/kawafmm/workspace/zev2"`。
- 履歴fixture:
  `kind="isolated-git-fixture-v001"`、`repositoryRoot`はtestがそのprocess専用一時directoryへ新規作成したGit repositoryの実体absolute path。

正式checker／runnerはproduction objectを内部で定数構築し、CLI引数・環境変数・jobから`repositoryContext`を受け取らない。fixture objectは§13の一時Git履歴検査が同じcollectorを通るためだけの版付き入口であり、production CLIから到達不能とする。違反を注入するtest hookではなく、読取対象repositoryを明示する共有入口である。production wrapperが別kind／別rootを渡さないことと、CLIからrootを変更できないことを固定検査する。

`RepositorySnapshotV002`のfield順を次へ固定する。

1. `phase`
2. `admissionId`
3. `jobPath`
4. `repositoryContext`
5. `jobBytes`: jobなしphaseは`null`
6. `ledgerBytes`
7. `runtimeBinding`
8. `repositoryState`
9. `firstParentCommits`
10. `sideCommits`
11. `treePathRecords`
12. `blobTable`
13. `firstParentDiffs`
14. `indexStateBefore`: indexを読まないphaseは`null`
15. `indexStateAfter`: indexを読まないphaseは`null`
16. `indexDiffNameStatus`: indexを読まないphaseは`null`
17. `headState`
18. `headDiffNameStatus`: postcommit以外は`null`
19. `worktreeDocuments`
20. `precommitReportEvidence`: postcommit二phase以外は`null`
21. `v1BaselineEvidence`: bootstrap precommit以外は`null`

`repositoryState`は`repositoryRealPath`、`symbolicHead`、`anchorBefore`、`anchorAfter`、`objectFormat`、`guardBefore`、`guardAfter`の順。`anchorAfter`は全収集後に同じliteral refを再読した値であり、validatorが開始値と比較する。

`guardBefore`／`guardAfter`は同じshapeで、`shallowFileSha256`、`graftsFileSha256`、`replaceRefs`、`alternatesFileSha256`、`promisorConfigSha256`の順とする。不存在は`null`、存在する0 byte fileは空byteのSHA-256を記録する。`replaceRefs[]`はref名のUTF-8 byte順に`refName`、`objectId`を持つ。promisorは`git config --null --list --show-origin`から、`extensions.partialClone`と全`remote.*.promisor`行だけをNUL区切りbyte順へ投影してhashする。全収集の前後で二objectがbyte意味上完全一致し、かつ§7.1の禁止状態が一度も観測されないことを要求する。

`firstParentCommits[]`はroot→anchor順、`sideCommits[]`は`reachable(anchorBefore) - firstParent(anchorBefore)`を小文字OIDのraw byte昇順にする。両arrayのcommit recordは`commitObjectId`、`parentObjectIds`、`treeObjectId`、`ledgerBlobObjectId`（不存在は`null`）、`commitMessageBytes`（`Uint8Array`）、`commitMessageBytesSha256`の順とする。

`treePathRecords[]`は`commitObjectId`、`path`、`gitMode`、`gitBlobObjectId`の順とし、不存在pathは後二値を`null`にする。順序は、first-parentのroot→anchor、sideのOID順、各commit内pathのUTF-8 byte順。対象pathは次の閉集合である。

1. 全commitの固定ledger path。
2. strict decodeできた全ledger／jobに現れる全`path` field。
3. §5、§6.11、§6.12の固定pathと導出path。
4. v001 6件、v001 checker、v002 toolGraph 5件。

malformed ledger／jobはdecoderの違反を所有し、その中から追加pathを推測しない。strict decodeできた入力のpath抽出は同じdecoder valueから行い、collector専用parserを作らない。

`blobTable[]`は上記ledger、job、commit message以外の全参照blobと、ledger／job blobを一意化して`gitBlobObjectId`のraw byte順に並べ、`gitBlobObjectId`、`bytes`（`Uint8Array`）、`byteLength`、`fileSha256`を持つ。`treePathRecords`が指す非null blobは全て一件存在し、表外blobをvalidatorがGitへ取りに行かない。

`firstParentDiffs[]`はrootを除く全first-parent commitについて一件ずつ、root→anchor順に`parentCommitObjectId`、`commitObjectId`、`records`を持つ。`records[]`は親tree→子treeの`--no-renames --name-status -z`全recordを、pathのraw byte順に`status`、`pathBytes`（`Uint8Array`）で持つ。登録commitだけをcollectorが選んで運ばず、全隣接commitの全recordをsnapshotへ運ぶ。formal validatorはこの表から各登録commitのexact diffを再構成し、未知pathを含む変更を検出する。

`indexStateBefore`と`indexStateAfter`は同じshapeで、`entries`、`treeObjectId`の順とする。entryはpathのraw byte順に`pathBytes`（`Uint8Array`）、`stage`、`gitMode`、`gitBlobObjectId`を持つ。indexが参照する対象blobも`blobTable`へ含める。`indexDiffNameStatus[]`はjob base→`indexStateBefore`の`--no-renames --name-status -z`全recordを、Git出力順を捨ててpathのraw byte順に`status`、`pathBytes`で持つ。validatorはbefore／afterのentry列とtree OIDの完全一致を自ら判定し、一致後の`indexStateAfter.treeObjectId`だけをreportとcommit trailerへ使う。collectorが「不変」booleanだけへ畳まない。

`headState`は`commitObjectId`、`parentObjectIds`、`treeObjectId`、`commitMessageBytes`の順。`headDiffNameStatus[]`はjob base→HEADの同じ全recordを`status`、`pathBytes`で持つ。未知path、非UTF-8 path、未知statusをcollectorで落とさず全recordをsnapshotへ運び、validatorだけがallowlistとkind別statusをraw byteで判定する。

`worktreeDocuments[]`は有効末尾path順に、次のfieldを持つ。

1. `path`
2. `resolvedRealPath`
3. `componentLstats`: repository root直下から最終componentまでの順で、各行は`path`、`fileType`（`"directory"`、`"regular-file"`、`"symbolic-link"`、`"other"`）
4. `finalEntryIsRegularFile`
5. `insideRepositoryRealPath`
6. `statBefore`
7. `statAfter`
8. `gitMode`
9. `byteLength`
10. `fileSha256`

`statBefore`／`statAfter`は`device`、`inode`、`size`、`mtimeNanoseconds`を10進数字列で持つ。collectorは同じfile descriptorからbyteを一回だけ読み、その前後の`fstat`をそのまま運ぶ。validatorが中間componentは全てdirectory、全componentのsymlink 0件、最終通常file、repository実体path内、前後stat完全一致、byte数・SHA-256・登録identityを判定する。collectorが`DOCUMENT_NOT_REGULAR_FILE`や読取中変化の合否をboolean一つへ隠さない。

`precommitReportEvidence`は`path`、`bytes`（`Uint8Array`）、`byteLength`、`fileSha256`の順で、対応precommit reportの固定pathを同じfile descriptorから安定読取した実体を持つ。postcommit validatorがSHAだけでなくstrict report内容を自ら検査する。collectorが「report一致」booleanへ畳まない。

`v1BaselineEvidence`は`checkerIdentity`、`phase`、`reportBytes`（`Uint8Array`）、`byteLength`、`fileSha256`の順とする。`checkerIdentity`は§6.11の6値と完全一致し、`phase="implementation-start"`。`reportBytes`はmaterializeしたv1 checkerの`checkApprovedDocumentBindingsV001`返値を`JSON.stringify(value, null, 2) + "\n"`で一回serializeしたbyteである。validatorはschemaVersion、phase、status、results 6件、各binding・observed値をstrictに読み、6/6を自ら判定する。失敗結果も同じcarrierへ運び、collectorが`V001_BASELINE_FAILED`を隠さない。

`indexSeal`は`indexStateBefore`／`indexStateAfter`と同じ`entries`、`treeObjectId` shapeである。precommit checkerは通常snapshot収集を完了した後、純粋なreport検査へ入る直前に同じcoreの`collectApprovedDocumentAdmissionIndexSealV002`を一回呼ぶ。validatorは`snapshot.indexStateBefore == snapshot.indexStateAfter == indexSeal`を完全比較し、一致したsealのtree OIDだけをreportとtrailerへ採用する。runnerがGitを直接読み直さない。

合否snapshotを作るGit・filesystem I/Oはcollectorとindex seal collectorだけが所有し、validator、mutation runner、testは別の履歴走査・hash計算・path列挙を実装しない。唯一の例外は§8.5のpre-child launcherであり、循環を解くための候補commit抽出、固定5 path読取、一時directoryへのmaterializeだけをGit-onlyで行う。この例外は合否やsnapshotへ畳まず、materialize後checkerが同じ履歴・identity・pathをcollector経由で全て再検証する。合成検査は`{snapshot,indexSeal}`を同じvalidatorへ与え、実Git履歴検査は`isolated-git-fixture-v001` contextで同じcollectorを通す。mutation runnerとmaterialize後checkerが必要なproduction contextでこの共有入口を呼ぶこと、production CLIからfixture contextへ到達できないこと、mutation runnerとcheckerが独自のreport serializerを持たないことを一件ずつ固定検査する。

## 7. 登録commitの決定的再導出

### 7.1 固定するrepository条件

正式検査は次を全て要求する。

| 項目 | 固定値・条件 |
|---|---|
| symbolic HEAD | `refs/heads/main` |
| 履歴起点ref | `refs/heads/main` |
| object format | `sha1` |
| traversal | first-parent、root含む、件数・日時の打ち切りなし |
| shallow repository | 禁止 |
| replace object／replace ref | 禁止 |
| grafts | 禁止 |
| object alternates | `objects/info/alternates`不存在または0 byte。環境変数方式も禁止 |
| partial clone／promisor | 禁止 |
| 自動fetch | 禁止 |
| locale | `LC_ALL=C` |
| replace無効化 | `GIT_NO_REPLACE_OBJECTS=1` |
| lazy fetch無効化 | `GIT_NO_LAZY_FETCH=1` |

親processに次のGit選択・差し替え用環境変数が一つでも存在する場合は、値を使わずfatal停止する。

- `GIT_DIR`
- `GIT_WORK_TREE`
- `GIT_COMMON_DIR`
- `GIT_INDEX_FILE`
- `GIT_OBJECT_DIRECTORY`
- `GIT_ALTERNATE_OBJECT_DIRECTORIES`
- `GIT_NAMESPACE`
- `GIT_CONFIG_SYSTEM`
- `GIT_CONFIG_GLOBAL`
- `GIT_CONFIG_NOSYSTEM`
- `GIT_CONFIG_COUNT`

`GIT_CONFIG_COUNT`に伴う`GIT_CONFIG_KEY_*`／`GIT_CONFIG_VALUE_*`も拒否する。解決したcommon object directoryの`info/alternates`が存在する場合は0 byteだけを許し、空白・改行だけを「空」と読み替えない。

子Git processのenvは親envを継承せず、次のkeyだけから作る。

- `HOME=<runTemp>/home`（事前に作る空directory）
- `XDG_CONFIG_HOME=<runTemp>/xdg`（事前に作る空directory）
- `TMPDIR=<runTemp>/tmp`
- `PATH=/usr/bin:/bin`
- `LC_ALL=C`
- `LANG=C`
- `TZ=UTC`
- `GIT_CONFIG_NOSYSTEM=1`
- `GIT_CONFIG_GLOBAL=/dev/null`
- `GIT_NO_REPLACE_OBJECTS=1`
- `GIT_NO_LAZY_FETCH=1`

`<runTemp>`は§8.5のprocess固有実体directoryで、他processと共有しない。Git executableはabsolute実体pathを使うためPATH探索しない。production contextでは、cwdと`git rev-parse --show-toplevel`の実体pathがともに`/Users/kawafmm/workspace/zev2`と一致することを要求し、別repositoryを選べるCLI引数を持たない。`isolated-git-fixture-v001`では同じ二値がcontextのprocess専用一時repository実体pathと一致することを要求し、正式report・正式成果物を作らない。

§3.1(6)の現在worktree照合は、repository rootから対象fileまで全path componentを`lstat`してsymlink 0件を確認し、通常fileを一回openした同じfile descriptorからbyteを読む。open後に`fstat`したdevice/inodeが、親directoryを実体解決して得たrepository realpath配下の対象と一致することを確認し、読取前後のdevice、inode、size、mtime nanosecondが不変でなければ結果を使わない。最終fileだけが通常fileでも、中間directoryがsymlinkなら拒否する。

開始時に`refs/heads/main`をfull OIDへ解決して`anchorBefore`へ固定する。検査終了時に同refを再解決し、`anchorAfter`が同一でなければ結果を使わず停止する。remote ref、`origin/main`、日時、最新tagを起点にしない。

### 7.2 first-parent走査

1. `anchorBefore`から親0件のroot commitまでfirst-parentをたどる。
2. root到達前にobjectが欠けた場合は停止する。補完fetchしない。
3. rootからanchorの順へ反転する。
4. 各commitの固定ledger pathをtreeから読む。未導入commitではpath不存在を「IDなし」とする。
5. ledger pathが存在するcommitでは、必ずstrict v002としてdecodeする。壊れたledgerを「IDなし」と扱わない。
6. `admissionId`は文字列完全一致で検索する。
7. 同一ledger内で同じIDが0件または1件でなければ停止する。

### 7.3 初出候補

commit `C`を初出候補とする条件は、次の両方である。

- `C`に対象IDが1件存在する。
- `C`がrootであるか、`C`のfirst parentに対象IDが存在しない。

候補数ごとの扱いを固定する。

| 観測 | 扱い |
|---|---|
| first-parent候補が1件 | そのfull OIDだけを登録commitとして採用 |
| first-parent候補が0件、全reachable DAGにも0件 | `ADMISSION_NOT_FOUND`で停止 |
| first-parent候補が0件、非first-parent側にだけ存在 | `ADMISSION_ONLY_OFF_FIRST_PARENT`で停止 |
| first-parent候補が2件以上 | 全候補OIDを記録し`ADMISSION_FIRST_APPEARANCE_AMBIGUOUS`で停止。最古・最新を選ばない |

唯一候補を得た後、候補からanchorまでの全first-parent commitで同じentryがbyte意味上完全一致して存在し続けることを要求する。消失、再追加、field変更、array内の別位置への移動は停止する。

### 7.4 非first-parent側

`anchorBefore`からreachableなcommit集合（`git rev-list anchorBefore`の意味）から、同じ`anchorBefore`のfirst-parent集合を引いた集合だけを補助走査する。`--all`、他branch、orphan ref、remote ref、reflog、dangling commitを走査起点へ加えない。

- first-parent候補がなく、非first-parentにだけIDがあれば前節どおり停止する。
- first-parent候補がある場合、その候補の子孫にある非first-parent側の同じIDは、正本候補へ数えず「正本から継承したside occurrence」として診断記録だけに残す。
- first-parent候補の子孫ではない非first-parent commitに同じIDがあれば、独立導入として`ADMISSION_PARALLEL_INTRODUCTION`で停止する。
- merge commitの第2親以下に対象IDが先にあり、first-parent側ではmerge treeで初めて現れた場合も独立導入として停止する。

bootstrapと通常admissionの登録commitは単一親を必須とする。merge commitを登録commitに使わない。

### 7.5 formal phaseの全ledger遷移検査

`implementation-start`、`formal-test-start`、`completion-and-stable-tag`は、現在ledgerのIDだけを検査対象にしない。rootからanchorまでに実在した全v002 ledgerを隣接比較し、履歴全体を次の状態機械で検査する。

1. v002 ledger pathが最初に現れるまでは`absent`。
2. 最初に現れるcommitはbootstrap commitであり、`legacyDocuments`が§9.1の6件、`admissions`が§9.2の3件に完全一致する。
3. bootstrap後の全commitでledger pathが存在し続ける。
4. `legacyDocuments`はbootstrap byte意味から永遠に不変。
5. 子commitの`admissions`は親commitの`admissions`を同じ順・同じ内容でexact prefixとして持つ。
6. 非登録commitではarray長も完全一致する。
7. 通常登録commitでは末尾へ一件だけ増え、そのcommitが§8.4に列挙したhistorical subsetを満たす。保存済みprecommit report実体の再照合は即時postcommitだけが所有し、formal履歴再検査へ暗黙要求しない。
8. 既存entryの削除、改値、並べ替え、途中挿入、複数同時追加を拒否する。

formal phaseは、この走査で一度でも現れた全IDの和集合を作り、anchorのledgerに全IDが同じentryで残っていることを確認する。したがってanchorから完全削除されたIDも検査対象から消えない。

全ての`legacyDocuments.sourceCommit`、`requestDocument.sourceCommit`、`revisionRequestDocument.sourceCommit`は、そのentryの導入commitより前にあるfirst-parent祖先でなければならない。同一commit、side branchだけ、orphan、dangling commitをsourceに使わない。commit-pinned byteが一致しても履歴順が不正なら停止する。

## 8. 同一commit検査

### 8.1 commit前: `bootstrap-precommit-index`

読取元は作業ツリーではなくGit indexのstage 0とする。

1. symbolic HEADが`refs/heads/main`であり、`HEAD == refs/heads/main == bootstrapJob.baseCommit`である。job作成後にmainが一commitでも進んでいれば、jobの値を更新せず停止する。
2. repositoryが§7.1を満たす。
3. unmerged index entryが0件。
4. `git diff --cached bootstrapJob.baseCommit --no-renames --name-status -z`が、`bootstrapCommitPaths`の10件を全て`A`で追加するrecordだけである。削除、改名、type change、10件外、親に既に存在するpathを一件でも許さない。
5. 対象pathのworktree byteとindex byteが一致する。別件の未stage変更は合否対象外。
6. bootstrap jobの`v1CheckerBinding`を固定`sourceCommit`のtreeからmode、blob、byte数、SHA-256で照合し、そのblobを§8.5と同じ一意な一時directoryへmaterializeして固定Node実体で既存6件の6/6を実行する。作業ツリーpathを実行しない。v001 checkerはNode組み込みmoduleだけをimportすることを静的確認し、別pathへ出れば停止する。
7. v001の6件とv002 `legacyDocuments`の6件が、path、sourceCommit、mode、blob、byte数、SHA-256で一対一に一致する。
8. bootstrap表が12文書、3 pair、legacy 6件ちょうどである。
9. 親HEAD履歴には3つのbootstrap admission IDと3つの承認記録pathが存在しない。
10. indexには3 pair、3承認記録、v002 ledger、共有処理、checker、bootstrap runner、通常runner、testが全て存在する。
11. `git write-tree`で得たindex tree OIDを検査reportへ記録する。report自体はindexへ入れない。
12. 検査中にindex projectionが変わっていないことを、`indexStateBefore`／`indexStateAfter`の全entry列とtree OIDの完全一致で確認する。
13. 通常snapshot収集後にcoreのindex seal collectorを一回呼び、`indexStateBefore == indexStateAfter == indexSeal`をvalidatorで確認する。合格したseal tree OIDを含むcanonical precommit report byteをcore serializerで作り、そのSHA-256と次節の4 trailer値をoperatorへ出す。seal後は純粋な検査・serialize・report保存だけを行い、indexへ書く処理を持たない。

通常`admission-precommit-index`も同じ規則を使い、`bootstrapJob`を通常job、10件集合をjobの`admissionCommitPaths`へ読み替える。ただしname-statusのexact期待はkind別に次へ固定する。

- pair: job=`A`、承認記録=`A`、ledger=`M`。
- revision: job=`A`、承認記録=`A`、改訂対象=`M`、ledger=`M`。

比較はjobの`admissionCommitPaths`順へ正規化して行い、Git出力の偶然の表示順へ依存しない。期待pathのstatus違い、未知status、追加pathは拒否する。通常jobでも`HEAD == refs/heads/main == job.baseCommit == job.approvalAnchor`を必須とし、承認対象request identityの連続suffixを同じanchorから再導出する。

Gitのpath列取得は`--no-renames --name-status -z`、`ls-files -z`、`ls-tree -z`等のNUL区切りraw byteを使い、表示用quoted pathをparser入力にしない。NUL区切りを持たないsubcommandのOID列は小文字hexの固定長として読む。

### 8.2 preflightからcommitへの束縛とcommit後検査

commit messageの末尾は、空行一つの後に次の4行を**この順で一回ずつ**持つ。

```text
ZEV-Approved-Document-Admission: <bootstrapId-or-admissionId>
ZEV-Approved-Document-Base-Commit: <40-hex-baseCommit>
ZEV-Approved-Document-Index-Tree: <40-hex-indexTreeObjectId>
ZEV-Approved-Document-Preflight-SHA256: <64-hex-precommitReportSha256>
```

- keyの重複、順序違い、未知の`ZEV-Approved-Document-` key、CR、末尾空白、値の省略を拒否する。
- bootstrapでは1行目を`presentation-approved-document-admission-ledger-v002-bootstrap-v001`、通常登録ではjobの`admissionId`とする。
- 4行目はcore serializerが返したprecommit report byteのSHA-256、3行目は同じreportの`source.indexTreeObjectId`（検証済みindex seal）をそのまま使う。materialize後checkerは同じbyteを固定report pathへ原子的に一回保存してからstdoutへ同一byteを出すが、保存後の再読専用入口を新設しない。外側launcherとmutation runnerはreportを保存しない。保存後の差し替え・書込実体不一致はpostcommit collectorの`precommitReportEvidence`とtrailer照合が停止させる。indexの最終再取得は§8.1のindex sealが所有し、checkerが別のGit読取実装を持たない。
- commit messageへtree OIDとreport SHAを置くためtreeの自己参照は起きない。

`bootstrap-postcommit-head`の読取元はHEAD tree、HEAD commit message、保存済みprecommit reportとする。

1. HEADが`refs/heads/main`のtipである。
2. HEADの親が1件で、そのOIDがHEAD tree内のbootstrap jobに固定された`baseCommit`と完全一致する。
3. `baseCommit`からHEADへのdiff path集合が、bootstrap jobの`bootstrapCommitPaths`と完全一致する。
4. HEAD commit messageの4 trailerがexactで、admission、baseCommit、precommit report SHAが保存実体と一致する。保存実体は§11.3でstrict canonical decodeし、phaseが対応precommit、status=`"passed"`、sourceのjob ID／path／baseCommit／index treeがjob・trailerと一致、`boundPrecommitReportSha256=null`、anchorBefore=anchorAfter=baseCommit、violations=[]であることまで照合する。任意byte fileのhashだけをtrailerへ入れても合格させない。
5. `HEAD^{tree}`がtrailerのindex tree OIDと一致する。
6. 親には10 path、3 admission ID、3承認記録pathが全て存在しない。
7. HEADでは10 path、3 admission ID、3承認記録pathが同時に存在する。
8. 12文書をprovenanceと`approvalEffect`別の正本へ照合する。legacyは固定`sourceCommit`と現在HEAD、`authorize-requested-action` requestは固定`sourceCommit`だけ、`approve-request-document-as-contract` requestは固定`sourceCommit`と現在HEAD、approvalはHEADの同時導入byteを照合する。前者request pathの現在HEAD byteがsource commit後に変わっていても、過去の承認対象を現在byteへ遡及して読み替えず、source commitのidentityを維持する。
9. 3 pairの依頼書hash、承認記録内の対象hash、台帳claimが一致する。
10. §7の履歴再導出で3 ID全ての唯一候補がHEADになる。
11. v002正式検査が全件合格する。

commit前のindex行とcommit後のHEAD行を同じ一件表で別行にする。postcommitはprecommit reportをblind trustせず、job、親、HEAD tree、履歴から条件を独立再導出した上で、commit messageが示すexact report SHAとtree OIDも照合する。report差し替え、commit前検査後のindex差し替え、別treeのcommit化をそれぞれ検出する。

### 8.3 通常admission

bootstrap後の一件追加も同じ二段を使う。

- `admission-precommit-index <admissionId>`:
  §8.1のbaseCommit、path集合、index不変、precommit report、trailer値生成を全て適用する。親ledgerの既存entryを一切変えず、一つのpairだけが末尾へ追加され、承認記録とledger変更がindexへ揃うことを確認する。承認記録pathがrootからbaseCommitまでの全first-parent treeで一度も存在しなかったことを必須とし、過去存在→削除→再追加を「初導入」と扱わない。同じpathの改訂では、改訂後文書もindexへ含め、`supersedes`が親ledgerで有効な末尾版を一意に指すことを確認する。
- `admission-postcommit-head <admissionId>`:
  §8.2の4 trailer、report SHA、HEAD tree、親、diff path集合の照合を全て適用し、親→HEADのname-statusも§8.1のkind別exact値（pair=`A/A/M`、revision=`A/A/M/M`）へ独立再照合する。単一親commitでpairと承認記録が同時導入され、改訂の場合は対象文書も同じcommitで変わり、履歴再導出の唯一候補がHEADであることを確認する。

一つのcommitで二つ以上の通常admissionを追加しない。bootstrapの3件同時導入だけが、閉じた一件表に基づく初回例外である。

### 8.4 formal phaseでの登録commit再検査

formal phaseは現在HEADだけを検査せず、履歴から再導出したbootstrap commitと全通常admission commitについて、当時のtreeとcommit messageを次のとおり再検査する。

1. 単一親。
2. tree内jobをstrict schemaでdecodeし、runtime binding、ID、kind、path列、`baseCommit`、`approvalAnchor`を検査する。親OIDはjobの`baseCommit`と一致し、通常jobでは`approvalAnchor`も同じ親OIDである。
3. bootstrap jobでは、12行・3対・legacy 6件・承認記録3件・toolGraph 5件・v1 checker bindingを§6・§9へ完全照合する。通常jobではpair／revisionのfield、承認記録、対象文書identity、`supersedes`を該当schemaへ完全照合する。
4. 各承認記録をstrict canonical decodeし、台帳のapproval claim、request／revision identity、message hashへ照合する。
5. 導入diffとjobのexact path集合・§8.1のkind別name-status一致。
6. 4 trailerのexact shapeとadmission・baseCommit・tree OID一致。
7. bootstrapでは10 pathが親に全て不存在、導入commit側に全て存在。
8. 通常登録では親ledgerのexact prefix＋一件追加であり、pair／revision以外の暗黙変更がない。
9. commit-pinned requestの`sourceCommit`が登録親と同じcommit、またはそのfirst-parent祖先であり、いずれも登録commitより前にある。bootstrap行11と通常jobは、`approvalAnchor == baseCommit == 登録親`を末尾とする承認対象identityの連続suffix最古として同じ`sourceCommit`を再導出できる。
10. bootstrap commitのtoolGraphとv1 checker実体は当時のtree／固定source commitから再materializeしてidentityを照合し、現在worktreeの同名pathで代用しない。

bootstrap・通常登録の全てで、承認記録pathが登録commitより前のfirst-parent treeに一度も存在しないことをrootから再検査する。過去に存在して削除された同pathの再追加は`APPROVAL_PROVENANCE_INVALID`で停止する。

履歴検査では過去のprecommit report実体を必須入力にしないため、trailerのpreflight SHAについて「当時のreport内容」を再証明しない。formal phaseが再証明するのは、commit messageへ固定されたindex treeと実際のcommit treeが同一であり、導入内容・親・path集合が契約どおりであることまでである。この非証明範囲をreportへ明記する。

### 8.5 検査実体の実行byte

作業ツリー上のcheckerを、そのまま検査の信頼根として実行しない。

ただしtoolGraphを取り出す最初の起動点には循環があるため、作業ツリー上の`run_approved_document_admission_ledger_v002_bootstrap.mjs`を**全phase共通の最小bootstrap launcher兼operator-facing入口**として固定Nodeで起動する。未検証launcherの許可責務は次の五つだけである。

1. 固定Node／Gitの実体identityと§7.1の親環境拒否を確認する。
2. bootstrap precommitではindex stage 0、postcommit以後では`refs/heads/main`のfirst-parent上で固定ledger pathが最初に存在するcommitを、固定Git-only走査で候補とする。
3. 固定5 pathをindexまたは候補commit treeからprocess固有一時directoryへmaterializeする。
4. materializeしたcheckerだけを、exactな`--materialized-child-v001 <phase> <admissionId-or-dash> <materializedRoot>`で固定Nodeから一回起動する。materialize後runnerを子として起動しない。IDなしphaseにはliteral `-`を渡す。
5. 子processがstdout非空・stderr 0 byte・exit 0／1／2を返した場合はstdoutとexit codeを改変せず透過する。子を起動できない、signal終了、stdout 0 byte、stderr非0 byte、または列挙外exitの場合だけ、§11.4の固定fatalをlauncherが出す。launcher自身はpassed／failed reportを作らず、report pathへ保存しない。

launcherはledgerをdecodeして「正しい候補」を先に決めたと主張しない。ledger path初出候補が誤っている、toolGraphが違う、履歴が不正である場合は、5実体を展開して子を起動できる限り、materialize後checkerが§6〜§8を全て再検査して停止する。postcommit以後の正式reportに記録する実行identityはmaterialize後のtoolGraphであり、worktree launcherのbyteを検査済み実体として報告しない。launcherを改変して子検査を省略できる運用信頼根の限界は§3.2と`bootstrapSelfAttestation`へ残し、暗号学的閉包を偽らない。

固定Node起動前に、親環境へ`NODE_OPTIONS`、`NODE_PATH`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_COMPILE_CACHE`、`DYLD_INSERT_LIBRARIES`、`DYLD_LIBRARY_PATH`、`DYLD_FRAMEWORK_PATH`、`LD_PRELOAD`、`LD_LIBRARY_PATH`のいずれかが存在すればfatal停止する。Node child envと、coreが起動するGit child envを混同しない。Node child envは親envを継承せず、次のkey/valueだけから作る。

| key | exact値 |
|---|---|
| `HOME` | `<runRoot>/home` |
| `XDG_CONFIG_HOME` | `<runRoot>/xdg` |
| `XDG_CACHE_HOME` | `<runRoot>/xdg-cache` |
| `XDG_DATA_HOME` | `<runRoot>/xdg-data` |
| `TMPDIR` | `<runRoot>/tmp` |
| `PATH` | `/opt/homebrew/Cellar/git/2.52.0_1/bin` |
| `LC_ALL` | `C` |
| `LANG` | `C` |
| `TZ` | `UTC` |
| `GIT_CONFIG_NOSYSTEM` | `1` |
| `GIT_CONFIG_GLOBAL` | `/dev/null` |
| `GIT_NO_REPLACE_OBJECTS` | `1` |
| `GIT_NO_LAZY_FETCH` | `1` |

coreが起動するGit childは§7.1の別のexact envへ組み直す。Node childの`XDG_CACHE_HOME`／`XDG_DATA_HOME`をGit childへ暗黙継承せず、Git childの`PATH`をNode childへ流用しない。

phaseごとのhandoffを次へ固定する。

| phase | launcherが5実体を読む正本 | 子entrypoint | reportの所有者 |
|---|---|---|---|
| `bootstrap-precommit-index` | Git index stage 0 | materializeしたchecker | checkerがprecommit reportを原子的保存し、同じbyteをstdoutへ出す |
| `bootstrap-postcommit-head` | `refs/heads/main`のfirst-parent上でledger pathが最初に現れた一候補commit | materializeしたchecker | checkerがpostcommit reportを原子的保存し、同じbyteをstdoutへ出す |
| `admission-precommit-index` | 同じ一候補commit | materializeしたchecker | checkerが当該admissionのprecommit reportを原子的保存し、同じbyteをstdoutへ出す |
| `admission-postcommit-head` | 同じ一候補commit | materializeしたchecker | checkerが当該admissionのpostcommit reportを原子的保存し、同じbyteをstdoutへ出す |
| `implementation-start`、`formal-test-start`、`completion-and-stable-tag` | 同じ一候補commit | materializeしたchecker | checkerが正式report byteをstdoutへ出す。固定report pathへの保存は行わない |

bootstrap precommitではlauncherは固定5 pathのstage 0 entryをそのまま展開する。ledger予定identityとの合否は子checkerが判定する。postcommit以後は、launcherが`refs/heads/main`をrootまでfirst-parentで一回走査し、固定ledger pathが不存在から存在へ変わる最初の一commitだけを候補にする。merge commitでも順序付き第1親へ一意に進み、複数親自体をpre-child fatalにしない。親object欠損等でfirst-parent経路を読めない、候補が0件、候補treeに固定5 pathの一つでも不存在、stage 0でない、blobを展開不能、または子起動不能の場合は、validatorが起動していないため§11.4のpre-child fatalとする。別commitを候補へ選び直さず、再試行しない。候補commitの複数親は、子checker起動後に`INTRODUCTION_COMMIT_PARENT_COUNT_MISMATCH`のexit 1が所有する。

5実体を展開して子checkerを起動できた後は、checkerが§7で真のbootstrap commitを再導出してlauncher候補と一致すること、ledgerの`toolGraph` identity、全履歴を照合する。固定5 pathのidentityがledgerと違っても実行可能なbyteである限りは、子checkerが`TOOL_GRAPH_IDENTITY_MISMATCH`のexit 1を所有する。ただしbootstrap時のchecker自身が誤byteならその自己申告を独立証明できない限界は、§3.2と§10の自己適用限界に含む。

- child mode:
  checkerは`realpath(import.meta.filename)`の親directoryが第四引数`materializedRoot`とbyte一致し、そのrootがrepository実体path外であることを確認する。`runRoot = dirname(dirname(materializedRoot))`と一意に導出し、`realpath(process.cwd()) == "/Users/kawafmm/workspace/zev2"`、`materializedRoot == runRoot + "/evals/clip_composition"`、上表のNode child env全key/valueの完全一致を要求する。これによりproduction collectorの§7.1 cwd契約を維持しながら、実行byteだけをrepository外のmaterialized実体へ固定する。列挙したHOME／XDG／TMPDIRの各directoryはlauncherが子起動前に通常directoryとして作り、全componentのsymlink 0件を確認する。そのdirectoryにcore、checker、bootstrap runner、通常runner、testの5通常fileが全てあり、全componentが通常directory／通常file、symlink 0件である場合だけ、相対pathからcoreをimportする。exactな`--materialized-child-v001 <phase> <admissionId-or-dash> <materializedRoot>`以外では検査へ入らない。checkerはcoreのcollector、validator、serializerだけを使い、別runnerへ戻らない。
- 一時directory:
  launcherは`realpath("/private/tmp") == "/private/tmp"`を先に確認し、`fs.mkdtempSync("/private/tmp/zev-approved-document-admission-v002-")`を一回だけ呼び、その戻り値を`runRoot`とする。不一致・不存在・作成不能は`ENVIRONMENT_UNAVAILABLE`とする。5実体の共通親を`runRoot/evals/clip_composition`へ固定する。`runRoot`と全子は通常directory／通常file、symlink 0件、processごとに一意、終了時削除とする。childのcwdはproduction repository実体path、上表のHOME／XDG／TMPDIRだけは同じ`runRoot`から導出し、job・CLI・親環境で差し替えられない。作成・展開・削除失敗はfatalとする。
- import:
  Node組み込みmoduleと、展開した`toolGraph`内の相対pathだけを許す。package解決、`node_modules`、作業ツリー、絶対path、動的import、network importへ出た場合は停止する。唯一の例外はmaterialize後checkerがcoreのsnapshot収集を通じて、§6.11のidentityで別途固定したv001 checker materialize実体を一回importする経路であり、通常phaseへ残さない。

v001連続性検査では、materialize後checkerがcoreのsnapshot収集を通じて別途materializeしたv001 moduleをimportし、export済み`checkApprovedDocumentBindingsV001`へ実repository root、固定6 binding、`"implementation-start"`を明示して呼ぶ。v001 CLI main分岐を起動しないため、temp pathから誤ったworkspace rootを導出しない。v001内部の`execFileSync("git", ...)`は上記の単一directory PATHから、SHA束縛済みGit実体だけを解決する。偽gitを先頭へ置ける親PATHを継承しない。

materialize後checkerが実際に呼ぶ検査実装と、合成検査が呼ぶ実装は同じ`core` exportであり、同等ロジックを複製しない。bootstrapのこの検査はなお自己適用であり、最初のlauncherも運用信頼根だが、合格判定本体を作業ツリーの別byteへ置く穴は閉じる。

## 9. bootstrap閉包

bootstrapは**文書12件、pair 3組、legacy 6件**で閉じる。schemaへ「12」を永続的な通常上限として焼き込まず、一回限りのbootstrap jobだけがこの集合を固定する。

### 9.1 legacy 6件

| 行 | legacyId | path | sourceCommit | mode | blob | byte数 | SHA-256 |
|---:|---|---|---|---|---|---:|---|
| 1 | `b4-display-plan-contract-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-display-plan-contract-design-20260725-v001.md` | `a651e73b043bd8cb97bfffe2f284a35ede90abd7` | `100644` | `0638369fd62e6e16a3ce4178cd25a0fd49d14c43` | 40,706 | `d16aa8fb366157ef4be30a822831e95eaed5f3616d959f8b3751c74d72c86281` |
| 2 | `b4-implementation-contract-addendum-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-implementation-contract-addendum-20260725-v001.md` | `a651e73b043bd8cb97bfffe2f284a35ede90abd7` | `100644` | `788c73c92c5ca85e8eacd9f464b40dc5185e9cec` | 60,791 | `50bd103a338449a7fe2395c9afcc58bb39d8853a6ca97b7e508c68144c056f0a` |
| 3 | `b4-v003-contract-core-addendum-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-v003-contract-core-implementation-addendum-20260725-v001.md` | `07c60b0364b7b6661e47e25c245dcc12a85f0644` | `100644` | `c22eb4a2237b3c01158be77b2cbacbae1245b02a` | 23,327 | `abeb8e098d830af1af5c540759b3971a508faa53bb75e8380e6f8352a0ccee16` |
| 4 | `b4-contract-closure-addendum-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-contract-closure-and-approved-document-recovery-addendum-20260725-v001.md` | `2ff3aa587d2029aa7e0d8ba40b712560adffdec9` | `100644` | `df49f75b14fb55726cdc2614eb28ca0049fbb521` | 22,516 | `f07f5b2daef10c5bee2f20e6b6d7cf7cfddb600c445d69a41434c19f8a6e81c2` |
| 5 | `b4-number-token-stop-report-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-number-token-invariance-comparison-stop-report-20260725-v001.md` | `171751885fc75943b392c566309062916118ba98` | `100644` | `3f1341fe2065db878855042ec10b85ae94e2fbc5` | 6,521 | `d49f6ce300fa7a6ab6b606e2551c217c53e9a9fee739e0bdeddb99e34eef6486` |
| 6 | `b4-result-provenance-addendum-v001` | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b4-result-provenance-invariance-comparison-contract-addendum-20260725-v001.md` | `ed8d1f64ade33f58c18d94ed910ef5903afb6efb` | `100644` | `a6db32d68c61f372d3a46b5163cf2026a4f24d20` | 19,781 | `e3eca7b7067773d54bdfe2efc44c740de8b4b7d10faf14148f29df1554acd4de` |

移行前のv001 6/6合格を必須とし、表の値を実測後に動かさない。

### 9.2 pair 3組、文書6件

| 行 | admissionId | 役割 | path | 提示時点 | 内容固定の段 |
|---:|---|---|---|---|---|
| 7 | `b5-design-start-20260726-v001` | request | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b5-prompt-cost-freeze-design-approval-request-20260726-v001.md` | 実在。commit `90ae604d6b0d07a30368614787acabfb31acce89`、blob `4dbea4279b918b9f15995c07a124155d47e18132`、11,145 byte、SHA-256 `cdb5b0f8d8b743ad2fcf9851c34d5edb1c0db6a78a75ce95fac462a2a9948356` | 設計固定 |
| 8 | `b5-design-start-20260726-v001` | approval | `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/b5-design-start-human-approval-v001.json` | 未作成。直前のB5設計着手承認原文を保存する予約path | v002実装承認受領後、bootstrap commit前に固定 |
| 9 | `ledger-v002-drafting-20260726-v001` | request | `evals/clip_composition/reports/presentation/presentation-candidate13-caption-gate-b5-approved-document-binding-schema-stop-report-20260726-v001.md` | 起草承認時のGit正本。commit `4b489c0e1a9d89d9672291b960c93099b29c2794`、blob `6c604f68e2604ecb7b8a10279924d8467308a701`、11,627 byte、SHA-256 `23056b628269249c78e5d5141f002a1fffb241cfe76cc3ada10450324aeddba0` | 設計固定 |
| 10 | `ledger-v002-drafting-20260726-v001` | approval | `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/ledger-v002-drafting-human-approval-v001.json` | 未作成。今回の追補起草承認原文を保存する予約path | v002実装承認受領後、bootstrap commit前に固定 |
| 11 | `ledger-v002-implementation-20260726-v001` | request | `evals/clip_composition/reports/presentation/presentation-approved-document-admission-ledger-v002-implementation-contract-addendum-20260726-v001.md` | 本文書。人間が実装承認するbyteを持つfirst-parent上の連続末尾run開始commitから機械導出 | v002実装承認受領後、bootstrap job作成前に固定 |
| 12 | `ledger-v002-implementation-20260726-v001` | approval | `evals/clip_composition/outputs/presentation/approved-document-admission-ledger-v002-bootstrap/ledger-v002-implementation-human-approval-v001.json` | 未作成。将来の実装承認原文を保存する予約path | 人間の実装承認受領後、bootstrap commit前に固定 |

行8、10、12を本追補提示commitで先に作らない。3件はv002 ledger、schema、checker、既存6件移行と同じbootstrap commitで初めて導入する。

提示時点でまだ存在しない人間承認記録のbyte、blob、SHA-256を仮置きしない。**件数、役割、path、pair関係、固定する段**は本表で設計固定し、実際の原文を受領した後の値だけを実装固定する。実装時に予約pathが欠ける、別pathが必要になる、13件目が必要になる場合は、bootstrap表を黙って増やさず停止して契約改訂へ戻す。

行9は、起草承認を受ける前に実在したbyteだけを依頼書正本とする。同じ人間メッセージが別途指示したB5 §7への申し送りは、その直接指示を受けて同pathへ追記するが、追記後byteを過去の起草依頼へ遡及して結び付けない。行10の`messageText`は、起草承認と別件の申し送りを含む受領原文をそのまま保存する。台帳の保証は宣言来歴までであり、追記後byteを承認前に読んだと主張しない。申し送りの内容自体は本追補へ取り込まず、起点停止報告§7だけを正本とする。

行11の`sourceCommit`はoperatorが任意に選ばない。実装承認原文を受領した後、承認記録を生成する前に`refs/heads/main`のtipをbootstrap jobの`baseCommit`へ一回固定し、その同じOIDを行11の`approvalAnchor`へ写す。両値が違うjobは拒否する。そのbaseCommitを末尾として、同pathのmode・blob・byte数・SHA-256が承認記録の`approvalScope`と一致したまま連続するfirst-parent suffixを求め、suffixの最古commitを`sourceCommit`とする。過去に同じbyteが一度現れて消えていてもsuffix外は候補にしない。suffixが0件、baseCommitが現在main tipでない、走査中にmain tipが移動、sourceCommitがbootstrap `baseCommit`と同じでもそのfirst-parent祖先でもない場合は停止する。baseCommit自体は後続bootstrap commitの親なので、`sourceCommit == baseCommit`は「登録commitより前」を満たす正当な値である。jobが`baseCommit`、`approvalAnchor`、導出identityを同時に保存するため、postcommit／formal phaseも同じ起点から再導出できる。これにより本提示commitのOIDを本文へ自己記入せず、承認された実byteの導入点を一意に固定する。

本表に予約済みの承認記録3件を除き、本追補承認後に生まれる文書はbootstrap表へ追加しない。通常v002 admissionとして後続commitで扱う。

## 10. 初回移行と自己適用限界

### 10.1 構造的な自己証明

v002導入commitは、v002 schema、ledger、checker、runner、test、人間承認記録を同じtreeへ初めて置く。そのv002 checkerが同じ導入commitを合格させても、checker自身の正しさを独立に証明したことにはならない。これは構造的な自己適用限界であり、完了報告で隠さない。

### 10.2 独立な連続性根拠

初回移行の独立根拠は次の二つである。

1. 導入直前の既存v001 checkerで6/6合格すること。
2. v001の6件をv002 `legacyDocuments`へ、path、commit、mode、blob、byte数、SHA-256の全項目でbyte同一移行すること。

これは「v001から文書内容が変わっていない」連続性の証拠であり、「v002実装が独立に正しい」証拠ではない。

### 10.3 一件表で分ける二行

| 検査局面 | 正本 | 証明すること | 証明しないこと |
|---|---|---|---|
| commit前 | Git index stage 0 | v001 6/6、6件byte同一移行、12行閉包、3対同時導入予定、index treeとcanonical preflight report SHAの固定 | まだ存在しないcommitの成立 |
| commit後 | HEAD tree＋commit message trailer | 単一親、trailerに束縛したindex treeとの一致、preflight report SHA一致、親にIDなし・HEADにIDあり、first-parent唯一初出、provenance別文書一致 | v002 checker自身の暗号学的正しさ、後日のformal phaseにおける当時のpreflight report内容の再証明 |

以後の通常admissionでは親commitにv002実体が既に存在するため、このbootstrap自己適用とは区別する。

## 11. 検査reportとCLI

### 11.1 phase

許可するphaseを次へ固定する。

1. `bootstrap-precommit-index`
2. `bootstrap-postcommit-head`
3. `admission-precommit-index`
4. `admission-postcommit-head`
5. `implementation-start`
6. `formal-test-start`
7. `completion-and-stable-tag`

通常admissionの二phaseだけが`admissionId`を一つ要求する。operator-facing launcherとmaterialize後checkerはいずれもID引数の位置を省略せず、他phaseではliteral `-`、通常phaseではIDを要求する。他phaseでIDを与える、通常phaseで`-`を与える、または引数を省略した場合はusage fatalとする。anchor ref、ledger path、object formatをCLI引数で変更する入口を作らない。

### 11.2 exit code

| exit | 意味 |
|---:|---|
| 0 | 全必須検査に合格 |
| 1 | 読取・decodeが成立し、契約違反を版付きcodeで報告 |
| 2 | usage、Git I/O、履歴欠損、環境不成立等で検査自体が完遂不能 |

stdoutへ正式JSONを一つだけ出し、stderrは0 byteを原則とする。秘密情報を扱わない。

### 11.3 check report top-level

field順を次へ固定する。

| 順 | field | exact shape |
|---:|---|---|
| 1 | `schemaVersion` | `"approved-document-admission-ledger-check-report-v002"` |
| 2 | `phase` | §11.1の一つ |
| 3 | `status` | `"passed"`または`"failed"` |
| 4 | `source` | 下記object |
| 5 | `runtime` | 下記object |
| 6 | `history` | 下記object |
| 7 | `evidence` | 下記object |
| 8 | `counts` | 下記object |
| 9 | `registrationCommits` | 下記array |
| 10 | `sideOccurrences` | 下記array |
| 11 | `toolResults` | 下記array |
| 12 | `documentResults` | 下記array |
| 13 | `migrationResults` | 下記array |
| 14 | `violations` | 下記array |
| 15 | `guaranteeBoundary` | 下記object |

`source`のfield順:

1. `kind`: `"index-stage-0"`または`"head-tree"`。
2. `jobId`: bootstrap ID、通常admission ID、正式phaseでは`null`。
3. `jobPath`: 使用したjob path、正式phaseでは`null`。
4. `baseCommit`: precommit／postcommitではjob値、正式phaseでは`null`。
5. `indexTreeObjectId`: precommitだけ検証済みindex sealの40桁OID、他は`null`。
6. `headCommitObjectId`: head読取phaseだけ40桁OID、他は`null`。
7. `headTreeObjectId`: head読取phaseだけ40桁OID、他は`null`。
8. `boundPrecommitReportSha256`: precommitと正式phaseでは`null`、postcommitだけcommit trailerから読んだ64桁SHA-256。precommit report自身のSHAを自分へ書かない。

`runtime`のfield順は`repositoryRealPath`、`node`、`git`。`node`と`git`は`realPath`、`version`、`fileSha256`の順で、§6.11と完全一致する。

`history`のfield順:

1. `anchorRef` = `"refs/heads/main"`。
2. `anchorBefore`。
3. `anchorAfter`。
4. `rootCommitObjectId`。
5. `bootstrapCommitObjectId`: bootstrap precommitだけ`null`、他は40桁OID。
6. `firstParentCommitCount`: 1以上のsafe integer。
7. `sideCommitCount`: 0以上のsafe integer。
8. `repositoryGuardBeforeSha256`: §6.13 guard objectのcanonical JSON SHA-256。
9. `repositoryGuardAfterSha256`: 同じ方法のSHA-256。合格時はbeforeと一致。

`evidence`のfield順:

1. `projectionSchemaVersion` = `"approved-document-admission-snapshot-evidence-v001"`
2. `repositorySnapshotSha256`
3. `firstParentDiffsSha256`
4. `indexStateBeforeSha256`: 非precommitは`null`
5. `indexStateAfterSha256`: 非precommitは`null`
6. `indexSealSha256`: 非precommitは`null`
7. `headDiffNameStatusSha256`: 非postcommitは`null`
8. `worktreeDocumentsSha256`
9. `precommitReportEvidenceSha256`: 非postcommitは`null`
10. `v1BaselineEvidenceSha256`: bootstrap precommit以外は`null`

証拠projectionのcanonical化は、§6.13でfield順を固定したvalueを再帰的にたどり、`Uint8Array`だけをfield順`type="Uint8Array"`、`hex=<小文字hex>`のobjectへ写してから、2-space indent・LF一つのJSONへserializeする一種類とする。array順を変えず、object keyを辞書sortせずschema順を使う。`repositorySnapshotSha256`はsnapshot全体、他fieldは各対応subvalueまたはindex sealのcanonical byteをSHA-256化する。report SHAはこの`evidence`を含むため、index前後、履歴diff、worktree安定読取、保存precommit report、v1 6/6の観測を検査結果から切り離さない。formal phaseは過去preflight snapshot実体を再取得しないため、digestが当時存在したことまでを後日独立証明するものではない。

`counts`のfield順:

1. `legacyDocumentCount`
2. `admissionCount`
3. `approvedDocumentRevisionCount`
4. `checkedToolCount`
5. `checkedDocumentCount`
6. `registrationCommitCount`
7. `sideOccurrenceCount`
8. `migrationResultCount`
9. `violationCount`

全て0以上のsafe integerで、対応array長と独立に再計算して一致させる。

`registrationCommits[]`は`admissionId`、`candidateCommitObjectIds`の順。候補OIDはroot→anchorの履歴順で0件以上を保持し、唯一導出成功時だけ長さ1になる。admission IDのUTF-8 byte順で並べる。`registrationCommitCount`は全`candidateCommitObjectIds`長の合計であり、0件・複数候補もreportから失われない。

`sideOccurrences[]`は`admissionId`、`commitObjectId`、`relation`の順。`relation`は`"inherited-from-first-parent"`または`"independent-introduction"`。admission ID、commit OIDのraw byte順で並べる。

`toolResults[]`は§6.3.1の順で`role`、`path`、`gitMode`、`gitBlobObjectId`、`byteLength`、`fileSha256`、`status`を持つ。常に5件で、`status`は`"passed"`または`"failed"`。

`documentResults[]`のfield順:

1. `recordKind`: `"legacy"`、`"request"`、`"approval"`、`"revised-document"`の一つ。
2. `recordId`: legacy ID、admission ID、approval record IDのいずれか。
3. `path`
4. `sourceCommit`: commit-pinned文書だけ40桁OID、same-admission文書は登録commit、現在worktree照合だけなら`null`。
5. `gitMode`
6. `gitBlobObjectId`
7. `byteLength`
8. `fileSha256`
9. `status`: `"passed"`または`"failed"`。

並びはlegacy、admissionsのarray順、各entry内の文書field順とする。全履歴identityを一件ずつ報告するが、`status`の現在worktree照合はpathごとの有効末尾だけに適用し、旧版はsource／導入commit identity照合の結果を示す。違反があっても解読できたidentityは同じ位置へ一件だけ出す。

`migrationResults[]`は`legacyId`、`v1FileSha256`、`v2FileSha256`、`allIdentityFieldsEqual`の順。bootstrap precommitは`v1BaselineEvidence`から6件、bootstrap postcommitはstrict照合済みprecommit reportから同じ6件を再掲し、他phaseは空array。

`violations[]`は`code`、`admissionId`、`path`の順。対象がない後二者は`null`。自由文detailを持たせず、§12のcode所有と固定順で機械判定を再現できる形にする。

`guaranteeBoundary`のfield順:

1. `contentAndDeclaredProvenanceOnly` = `true`
2. `cryptographicApproverIdentityProved` = `false`
3. `bootstrapSelfAttestation` = bootstrap二phaseに加え、bootstrap導入commitを検査対象へ含む正式三phaseでも`true`
4. `historicPreflightReportReverified` = 即時postcommitだけ`true`、precommitおよびformal phaseは`false`
5. `bootstrapLauncherCryptographicallyProved` = `false`

`status="passed"`では`violations=[]`、`violationCount=0`。`status="failed"`では一件以上としexit 1に対応する。

### 11.4 fatal report

exit 2は通常reportへ混ぜず、次のfield順の別schemaをstdoutへ一つだけ出す。

1. `schemaVersion` = `"approved-document-admission-ledger-fatal-report-v001"`
2. `status` = `"fatal"`
3. `phase`: 解釈済みなら§11.1、usageで解釈不能なら`null`
4. `fatalCode`: `USAGE`、`GIT_ENVIRONMENT_OVERRIDE_PRESENT`、`GIT_IO_FAILED`、`HISTORY_UNREADABLE`、`ENVIRONMENT_UNAVAILABLE`、`TOOL_GRAPH_EXECUTION_FAILED`、`REPORT_WRITE_FAILED`の一つ
5. `path`: 一意な対象pathがある場合だけ正式path、他は`null`

materialize後checkerが起動済みで、Git objectをsnapshotへ運べる場合は、「存在するが契約に違反する」状態をexit 1の版付き違反とする。object欠損・I/O不能で履歴走査を完遂できない場合は`HISTORY_UNREADABLE`のexit 2とする。

例外は§8.5のpre-child段だけである。launcher候補treeまたはindexに固定5 pathの一つがない、blobを展開できない、checkerを起動できない、または子がstdout非空・stderr 0 byte・exit 0／1／2の透過条件を満たさない場合は、違反を所有するvalidator自体が未起動なので、launcherが`TOOL_GRAPH_EXECUTION_FAILED`のexit 2を出す。launcherはこのfatal schemaだけを固定field順で生成でき、passed／failed reportや別の違反codeを生成しない。5実体を展開してcheckerが起動した後のidentity不一致は、従来どおり`TOOL_GRAPH_IDENTITY_MISMATCH`のexit 1である。

`REPORT_WRITE_FAILED`はmaterialize後checkerがprecommit／postcommitの正式report pathへ原子的保存できない場合だけであり、checkerのstdout生成失敗を成功reportで代用しない。外側launcherはreport保存を行わない。

## 12. 違反codeの固定順

違反codeは次の順を正式順とする。名称変更、追加、削除は版付き契約改訂を要する。

| 順 | code | 所有する不成立 |
|---:|---|---|
| 1 | `LEDGER_BYTES_NOT_CANONICAL` | 台帳byteが§6.1でない |
| 2 | `LEDGER_SCHEMA_UNSUPPORTED` | schemaVersionがv002でない |
| 3 | `LEDGER_SHAPE_INVALID` | top-levelの型・field順が不正 |
| 4 | `LEDGER_UNKNOWN_FIELD` | 未知fieldがある |
| 5 | `TOOL_GRAPH_INVALID` | toolGraphの件数・順・shape・pathが不正 |
| 6 | `LEGACY_ENTRY_INVALID` | legacy entryが§6.4でない |
| 7 | `ADMISSION_ENTRY_INVALID` | admission entryが§6.5でない |
| 8 | `DOCUMENT_IDENTITY_INVALID` | 文書identityの型・値が不正 |
| 9 | `APPROVAL_RECORD_BYTES_NOT_CANONICAL` | 承認記録byteが正式JSONでない |
| 10 | `APPROVAL_RECORD_SHAPE_INVALID` | 承認記録schemaが§6.10でない |
| 11 | `IDENTIFIER_INVALID` | IDが固定grammar外 |
| 12 | `PATH_INVALID` | pathが固定grammar外・workspace外 |
| 13 | `DOCUMENT_PATH_VERSION_CHAIN_INVALID` | 同じpathが一意な`supersedes`版鎖を作らない |
| 14 | `LEGACY_ID_DUPLICATED` | legacyIdが重複 |
| 15 | `ADMISSION_ID_DUPLICATED` | admissionIdが重複 |
| 16 | `PAIR_DOCUMENT_PATH_COLLISION` | pair内でrequestとapprovalが同path |
| 17 | `REQUEST_PROVENANCE_INVALID` | requestがcommit-pinnedでない |
| 18 | `APPROVAL_PROVENANCE_INVALID` | approvalがsame-admission-commitでない、または承認記録pathが登録commit以前のfirst-parent履歴に存在した |
| 19 | `APPROVAL_RECORD_PATH_MISMATCH` | bootstrap予約pathまたは通常導出pathと不一致 |
| 20 | `APPROVAL_RECORD_RELATION_MISMATCH` | record ID・admission IDの関係が不一致 |
| 21 | `APPROVAL_SCOPE_MISMATCH` | approvalScopeとentry種別・対象identityが不一致 |
| 22 | `APPROVAL_REQUEST_HASH_MISMATCH` | request hashがpair内で不一致 |
| 23 | `DECLARED_APPROVER_MISMATCH` | 宣言承認者が一致しない |
| 24 | `APPROVAL_DECISION_INVALID` | decisionがapprovedでない |
| 25 | `DOCUMENT_NOT_REGULAR_FILE` | 通常fileでない、symlinkである |
| 26 | `DOCUMENT_GIT_MODE_MISMATCH` | mode不一致 |
| 27 | `DOCUMENT_BLOB_MISMATCH` | blob不一致 |
| 28 | `DOCUMENT_BYTE_LENGTH_MISMATCH` | byte数不一致 |
| 29 | `DOCUMENT_SHA256_MISMATCH` | SHA-256不一致 |
| 30 | `SOURCE_COMMIT_DOCUMENT_MISMATCH` | sourceCommit treeとidentityが不一致 |
| 31 | `SOURCE_COMMIT_NOT_PRIOR_FIRST_PARENT` | sourceCommitが登録親と同じcommitでもそのfirst-parent祖先でもない |
| 32 | `WORKTREE_DOCUMENT_MISMATCH` | §3.1(6)の現在照合対象と登録内容が不一致、または同一file descriptorの読取前後statが変化 |
| 33 | `BOOTSTRAP_MANIFEST_INVALID` | bootstrap job自体が不正 |
| 34 | `NORMAL_ADMISSION_JOB_INVALID` | 通常job自体が不正 |
| 35 | `BOOTSTRAP_DOCUMENT_SET_MISMATCH` | 12文書集合が不一致 |
| 36 | `BOOTSTRAP_PAIR_SET_MISMATCH` | 3 pair集合が不一致 |
| 37 | `BOOTSTRAP_LEGACY_SET_MISMATCH` | legacy 6件集合が不一致 |
| 38 | `BOOTSTRAP_SCOPE_EXPANDED` | 13行目・4対目・7 legacy目がある |
| 39 | `V001_BASELINE_FAILED` | 移行直前v001 6/6が不成立 |
| 40 | `V001_TO_V002_MIGRATION_MISMATCH` | 6件byte同一移行が不成立 |
| 41 | `INDEX_UNMERGED` | indexにstage 1〜3がある |
| 42 | `INDEX_PATH_SET_MISMATCH` | staged path集合がjob allowlistと不一致 |
| 43 | `INDEX_DOCUMENT_MISMATCH` | indexと対象worktreeまたはjob期待が不一致 |
| 44 | `INDEX_CHANGED` | 検査中にindex projectionが変化 |
| 45 | `JOB_BASE_COMMIT_MISMATCH` | precommit開始HEADとjob baseCommitが不一致 |
| 46 | `REPOSITORY_OBJECT_FORMAT_MISMATCH` | object formatがsha1でない |
| 47 | `REPOSITORY_SHALLOW` | shallow repository |
| 48 | `HISTORY_REPLACEMENT_ACTIVE` | replace ref・graft・object alternatesのいずれかが有効 |
| 49 | `HISTORY_PROMISOR_ACTIVE` | partial clone・promisorが有効 |
| 50 | `HISTORY_ANCHOR_REF_MISMATCH` | symbolic HEADまたはliteral anchorがmainでない |
| 51 | `HISTORY_ANCHOR_MOVED` | 走査中にmain tipが移動 |
| 52 | `HISTORIC_LEDGER_INVALID` | 履歴中の存在するledgerがstrict v002でない |
| 53 | `LEGACY_DOCUMENT_SET_MUTATED` | bootstrap後にlegacy集合が変化 |
| 54 | `LEDGER_REMOVED_AFTER_BOOTSTRAP` | bootstrap後にledger pathが消失 |
| 55 | `LEDGER_TRANSITION_INVALID` | 親prefix不一致、途中挿入、複数追加、非登録commitでの変化 |
| 56 | `ADMISSION_NOT_FOUND` | first-parentにもreachable DAGにもIDなし |
| 57 | `ADMISSION_ONLY_OFF_FIRST_PARENT` | 非first-parentにしかIDがない |
| 58 | `ADMISSION_FIRST_APPEARANCE_AMBIGUOUS` | first-parent初出候補が複数 |
| 59 | `ADMISSION_PARALLEL_INTRODUCTION` | 正本候補と独立したside導入がある |
| 60 | `ADMISSION_ENTRY_MUTATED` | 導入後にentryが消失・変化・並べ替え |
| 61 | `INTRODUCTION_COMMIT_PARENT_COUNT_MISMATCH` | 登録commitが単一親でない |
| 62 | `POSTCOMMIT_PARENT_MISMATCH` | postcommit親がjobの`baseCommit`でない |
| 63 | `POSTCOMMIT_PATH_SET_MISMATCH` | 導入commitのname-status列がexact path追加列でない |
| 64 | `COMMIT_TRAILER_SHAPE_INVALID` | 4 trailerのkey・順・件数・byteが不正 |
| 65 | `COMMIT_TRAILER_PREFLIGHT_MISMATCH` | trailerとcanonical precommit report SHAが不一致 |
| 66 | `COMMIT_TRAILER_TREE_MISMATCH` | trailerのindex treeとcommit treeが不一致 |
| 67 | `TOOL_GRAPH_IDENTITY_MISMATCH` | materializeした5実体とledger identityが不一致 |
| 68 | `TOOL_GRAPH_IMPORT_OUTSIDE_GRAPH` | importがNode組み込み＋固定5実体の外へ出る |
| 69 | `REPORT_SHAPE_INVALID` | 通常check reportが§11.3でない |
| 70 | `REPOSITORY_GUARD_CHANGED` | 走査開始・終了のrepository guardが変化したが、個別の禁止状態codeだけでは所有できない |

同じ入力から複数違反が確定できる場合、code順、次にpathのUTF-8 byte順、次にIDのUTF-8 byte順で並べる。上位decode不能で下位検査の入力が作れない場合は、上位所有codeだけを出し、未実行を合格扱いしない。

v001 CLIを実行した事実はv002 checkerから観測できないため、発火不能な違反codeを置かない。formal completionは、固定`toolGraph`から実行したv002 reportのschema、phase、tool identityが揃わなければ成立しない。v001結果をv002結果へ変換・代用する入口も作らない。

## 13. 検査設計と完了条件

### 13.1 code probe

- 違反probeは`V001`〜`V070`の70件ちょうどとし、`Vnnn`は§12の同じ順番号のcode一つを期待する。
- fatal probeは次の7件ちょうどとする。

| test ID | fatalCode |
|---|---|
| `F001` | `USAGE` |
| `F002` | `GIT_ENVIRONMENT_OVERRIDE_PRESENT` |
| `F003` | `GIT_IO_FAILED` |
| `F004` | `HISTORY_UNREADABLE` |
| `F005` | `ENVIRONMENT_UNAVAILABLE` |
| `F006` | `TOOL_GRAPH_EXECUTION_FAILED` |
| `F007` | `REPORT_WRITE_FAILED` |

- exportされた違反code集合と`V001`〜`V070`の観測集合を完全一致assertする。
- 一つのprobeが偶然別codeで合格扱いにならないよう、期待code、admission ID、pathを固定する。
- probe用の不正をproduction codeへtest hookで注入しない。`RepositorySnapshotV002`または一時Git repositoryを正式入口へ与える。

### 13.2 正常・履歴fixture

統合fixtureは次の24件ちょうどとする。

| test ID | 検査内容 |
|---|---|
| `I001` | bootstrap正常: 12文書・3対・legacy 6件・単一親・4 trailer |
| `I002` | 通常pair正常: index→commit→postcommit→formal再検査、および承認記録pathの過去存在→削除→再追加拒否 |
| `I003` | 承認済み同一path改訂正常: 直前版への一意な`supersedes` |
| `I004` | 複数判断は事前の集約依頼書一件にまとめ、直接指示へ架空requestを作らない |
| `I005` | `authorize-requested-action` requestの現在pathが後日変わってもsource commit証拠は不変、契約承認requestなら現在不一致を拒否 |
| `I006` | entry削除・改値・並べ替え・anchorからの完全削除をrootから検出 |
| `I007` | bootstrap行11と通常jobで`approvalAnchor == baseCommit`から連続suffix最古をsourceCommitへ再導出し、登録commit自身・side・dangling・途中で別identityを挟む過去同byteを拒否 |
| `I008` | side occurrenceの継承と独立導入、off-first-parent-onlyの区別 |
| `I009` | merge第2親先行と登録commit複数親の拒否 |
| `I010` | production root固定とCLIからのfixture context到達不能、isolated temp repositoryでのshallow・replace・graft・alternates・promisor・missing object・guard前後変化の停止区分 |
| `I011` | Git選択環境変数とNode／dynamic-loader差し替え環境変数の全列挙拒否、およびGit・Nodeそれぞれの固定child env |
| `I012` | 走査中の`refs/heads/main`移動を開始・終了OIDで検出 |
| `I013` | unmerged index、exact name-status、親に既存pathがあるbootstrapの拒否 |
| `I014` | snapshot前後／index sealの不一致、seal後に別treeをcommitした差し替え、precommit report差し替えを別々に検出 |
| `I015` | commit trailerの順・重複・report SHA・tree OIDの完全照合 |
| `I016` | bootstrap親に10 path全て不存在、導入commitで10 path全て追加 |
| `I017` | 通常pair 3 path／revision 4 path以外の変更を拒否 |
| `I018` | 唯一のoperator-facing launcherがphase表どおりindex／Git-only候補treeからtoolGraphをmaterializeし、exactな非再帰child modeでcheckerを一回起動する。子checkerは真のbootstrap再導出・identity照合・report保存を所有し、launcherは透過条件成立時だけstdout／exitを転送する。pre-child欠落・展開不能・起動不能は固定fatal、起動後identity不一致は版付き違反になる |
| `I019` | toolGraph外import、package解決、絶対path importの拒否 |
| `I020` | passed／failed reportと7 fatal reportのexact shape・exit対応 |
| `I021` | 固定v001 checker materialize実行結果をraw carrierへ運び、strict 6/6とlegacy 6件byte同一移行をvalidatorで判定 |
| `I022` | bootstrap行9はcommit `4b489c0e...`の旧byteを証拠とし、同メッセージによる別件§7追記後byteへ遡及変更しない |
| `I023` | bootstrap 12行の一件欠落、13行目、4対目、7 legacy目の拒否 |
| `I024` | formal phaseが全登録commitの親・diff・trailer・treeを再検査し、v001結果を代用できない |

履歴fixtureは一時Git repositoryを自前生成し、production履歴走査と同じ共有処理を呼ぶ。検査専用の同等履歴判定を複製しない。

正式な新規検査総数は、違反70件＋fatal 7件＋統合24件の**101件**である。表外の「最低限」検査を実装者判断で足して総数を変えない。設計漏れを見つけた場合はtestを黙って追加せず契約改訂へ戻す。これとは別に既存v001の6/6を回帰として実行し、新規101件へ水増し計上しない。

### 13.3 bootstrap実行時の完了条件

全て成立した場合だけv002移行完了と報告できる。

1. v001 6/6。
2. v001→v002 legacy 6/6の全項目一致。
3. §12全code発火。
4. 正常・履歴fixture全件合格。
5. `bootstrap-precommit-index`合格。
6. 単一親migration commit作成。
7. `bootstrap-postcommit-head`合格。
8. 3 IDの登録commit再導出がmigration commitへ一致。
9. 12文書のprovenance別照合合格（legacyはsource＋現在、action承認requestはsourceだけ、契約承認requestはsource＋現在、approvalは導入commit）。
10. v002 `implementation-start`合格。

一つでも不成立なら同attemptで期待値変更・修正・再commitせず停止する。修正は別承認と新attemptを要する。

## 14. 代替案と不採用理由

代替として次の二段方式は構造上成立する。

1. commit Nへ人間承認記録を置く。
2. commit N+1でcommit Nのtreeから文書byteを読み、bindingを登録する。

観測済みの単一文字置換2例は、いずれも作業ツリーだけが変わり、Git正本とindexは無傷だった。このためcommit treeから読む二段方式にも実務上の防御力はある。

ただし、commit NからN+1まで承認記録が台帳未登録になり、2026-07-26にkawafmmが定めた同一commit規則への恒久例外になる。本追補は例外を自動導入せずv002を推奨する。

二段方式へ切り替える判断はkawafmmに留保する。v002 checkerが失敗時に二段方式へfallbackする実装は作らない。

## 15. 文書統治層の撤退条件

本件は文書統治層で4回目の停止である。

1. 承認済み文書が`s`一文字へ置換。
2. 承認済み停止報告が`å`一文字へ置換。
3. 承認済み改訂にbinding更新が追随せず停止。
4. 今回、同一commit規則とv001 `approvalCommit`が自己参照になり停止。

本承認以後の撤退条件を次へ固定する。

- 起算点:
  kawafmmが本追補と§17の実装を承認した時点。コード変更前のpreflight停止も含める。
- 数えるもの:
  ledger、schema、checker、bootstrap、migration、admissionという同じ文書統治層に帰属し、人間判断を要した独立停止イベント。
- 数えないもの:
  同じ根因の補足文書数、B5本文、API、外部サービス、動画、別層の不合格。
- 撤退:
  独立停止イベントが2件目に達した時点で、追加patch、3件目への掘削、B5再開を止める。
- 戻す問い:
  「どの文書に台帳束縛が必要か」という対象範囲の問題としてkawafmmへ返す。
- 接続先:
  リポジトリ実体棚卸しを入力にしたスケルトン設計の議題へ接続する。

最新の検証済み安定点と既知成果物を変更せず維持する。

## 16. 実装契約完全性チェック

| 項目 | 判定 | 根拠 |
|---|---|---|
| 本来の目的 | 閉じた | 同一commit登録を保ちながらcommit自己参照だけを除く |
| 成果物schema | 閉じた | §5、§6 |
| 正式path | 閉じた | §5 |
| JSON byte・field順 | 閉じた | §6.1 |
| ID・path・hashの値域 | 閉じた | §6 |
| 登録型 | 閉じた | §4 |
| 承認効果と現在照合 | 閉じた | action承認requestはsource証拠だけ、契約承認requestとrevision有効末尾は現在照合、§4.2・§6.9・§8.2 |
| 同じpathの承認済み改訂 | 閉じた | append-only版鎖、§4.4・§6.5.2・§6.7・§8.3 |
| 直接指示の扱い | 閉じた | DECISIONS正本、単独型なし |
| guarantee boundary | 閉じた | §3 |
| 履歴起点 | 閉じた | `refs/heads/main` |
| first-parent経路・打ち切り | 閉じた | rootまで無上限 |
| 0件・複数・side履歴 | 閉じた | §7.3、§7.4 |
| commit前の読取元 | 閉じた | Git index stage 0 |
| commit後の読取元 | 閉じた | HEAD tree |
| index不変検査 | 閉じた | before／after全entry＋tree OID、§6.13・§8.1 |
| 過去登録commitのdiff | 閉じた | root→anchorの全first-parent隣接diff、§6.13・§8.4 |
| worktree安全読取 | 閉じた | 全component lstat、同一FD前後stat、repository実体path、§6.13・§7.1 |
| preflight→commit束縛 | 閉じた | 4 trailer、report strict照合、index tree＝HEAD tree、§8.2 |
| 自己適用限界 | 閉じた | §10 |
| bootstrap件数・全行 | 閉じた | 12文書・3対・legacy 6件、§9 |
| request sourceの再導出起点 | 閉じた | bootstrap行11と通常jobで`approvalAnchor == baseCommit`、末尾suffix最古、§6.6・§6.11・§6.12・§9.2 |
| 将来承認記録 | 閉じた | path・役割は設計固定、実原文byteは承認受領後に固定。欠落時停止 |
| 違反codeと順序 | 閉じた | §12 |
| CLI phase・終了code | 閉じた | §11 |
| report schemaと来歴境界 | 閉じた | 通常／fatal report、即時postcommitとformalの非証明範囲、§11 |
| 検査可能性 | 閉じた | 共有処理と履歴fixture、§13 |
| 工程間受け渡し | 閉じた | job→index→commit→HEAD→formal phase |
| 観測データ取得可能性 | 閉じた | index、HEAD tree、Git履歴、worktreeの正本入口 |
| 実行実体とimport範囲 | 閉じた | toolGraph 5実体、固定Node＋固定Git、合否本体のworktree実行なし、network・fetchなし、§6.3.1・§8.5 |
| bootstrap起動循環 | 境界を宣言 | 最小worktree launcherだけがoperator-facing入口であり運用信頼根。exact child modeは非再帰、合否・report保存はmaterialize後checker、pre-child不能は限定fatal、§3.2・§5・§8.5・§11.3〜11.4 |
| 後方互換 | 禁止を確認 | v001は一回の連続性確認のみ |
| 停止点 | 閉じた | 不合格時は同attempt修正なし |

### 16.1 A/B/C地雷探知

- A（契約から導出済み）:
  schema、path、履歴経路、登録型、bootstrap行、承認効果、版鎖、再導出式、停止code、CLI、検査、report形、toolGraphの役割とpath。
- B（人間の追加判断が必要）:
  0件。
- C（実測時にのみ確定）:
  将来の実装承認原文byteと正式承認記録identity、`toolGraph` 5実体のmode・blob・byte数・SHA-256、bootstrap jobの`baseCommit`、それと同値の行11 `approvalAnchor`、行11のsuffixから導出するsource identity、将来の通常jobごとの`baseCommit`／同値`approvalAnchor`／suffix導出source identity、index before／after／sealのentry列とtree OID、preflight report SHA-256、migration commit OID、各runのanchor OID、worktree読取時のstat実測値。

Cは設計値の穴ではない。取得入口、取得時点、合否、不成立時停止を本追補で固定済みである。Cの値を予想して埋めない。

## 17. 本追補承認後に許可を求める実装範囲

本追補の提示だけでは、次へ進まない。人間が本追補を承認した場合に、改めて次の範囲の実装承認が成立する。

1. §5のv002実装・job・test。
2. 3件の人間承認記録の版付き保存。
3. 既存6件のbyte同一移行。
4. bootstrap commit前のindex検査。
5. 単一親bootstrap commit。
6. commit後HEAD検査。
7. 完了または停止報告。

B5設計、B5実装、token計測、API通信、Gemini実走へ自動進行しない。

## 18. 承認依頼文

> `approved-document-admission-ledger-v002`実装契約追補v001を承認する。文書内容をpath・mode・blob・byte数・SHA-256でcommit前に固定し、preflight report・index tree・commit trailer・HEAD treeを照合する。同時登録commitは`refs/heads/main`のfirst-parent履歴に登録IDが最初に現れた単一親commitとして後から一意に再導出する。依頼書が存在する承認だけをrequest＋approvalの対型とし、依頼書なしの直接指示は`DECISIONS.md`を正本のまま維持して架空requestを作らない。`authorize-requested-action`の依頼書は固定source commitの履歴証拠とし後日の現在path変更を承認対象へ遡及しない。`approve-request-document-as-contract`の依頼書と、明示承認された同一path revisionの有効末尾だけを現在worktree照合の対象とする。bootstrapは12文書・3対・legacy 6件で閉じ、行11の再導出起点はbootstrap jobの`baseCommit`へ束縛し、v001 6/6と6件byte同一移行を初回の連続性根拠とする。初回v002検査が構造的自己証明であり、最初のworktree launcherが運用上の信頼根であって暗号学的には証明されない限界と、kawafmm本人性を暗号学的に証明しない保証境界を維持する。実装はschema・台帳・検査器・runner・test・既存6件移行・承認記録3件・commit前後検査までとし、B5設計、B5実装、API通信、Gemini実走を含めない。不成立時は仮値・特例・二段commitへ逃がさず停止する。

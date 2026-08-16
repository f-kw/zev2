# ZEVO字幕品質v002 staging前内側観測 追補 v012

- 日付: 2026-08-13
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v011
- 変更対象: F proof runnerの返却envelope、F testのTAP診断、全formal jobの契約来歴
- 通信・費用・正式描画: 0

## 1. 実現性調査

F proof runnerの現物を実読した。正式output/staging取得前の順序は、入口検査、job byte読取、strict decodeとjob検査、実装・契約・runtime-data binding前読、runtime実体照合、atomic publisher loader取得、19依存module初期化、同bindingのimport後再読、output/staging path解決、output不在検査、staging不在検査、staging directory取得である。現在の外側返却は`schemaVersion,status,action,jobId,attemptId,outputRoot,stage,primaryCode`だけで、staging取得前の例外は保存成果物を作れず、内側段階・操作・対象・OS codeを失う。

返却envelopeは正式保存成果物ではなく、CLI/test processが呼出側へ返すfreeze済みobjectである。`rejection-report-v001.json`、`fatal-observation-v001.json`、`completion-report-v001.json`のbuilderとschemaは別に実在する。したがって返却envelopeへ一fieldを足しても、保存成果物schemaを変えずF production一pathとF test一pathで観測処理を閉じられる。

全formal jobのapproved contract集合は各runner内のexact表で個別に実在する。本書の来歴追加は観測処理と分け、既存17 path集合内の既存binding表だけを更新する。新しいrunner、共通観測module、保存処理、filesystem診断fileは作らない。

## 2. 返却envelopeのexact拡張

`presentation-zevo-caption-local-cli-result-v001`へ`innerObservation`一fieldを追加する。外側の既存8 field、status、stage、primaryCode、終了codeの意味は変えない。

`innerObservation`は次のunion exactとする。

- staging取得前のfatal/rejected: exact 4 keyのfreeze済みobject `checkpoint,operation,targetPath,osCode`
- staging取得後の結果およびpassed: `null`

外側envelope自体も従来どおりfreezeする。objectを返す場合は内外を別々にfreezeし、同一入力・同一失敗でformal JSON投影が決定的になることを検査する。

### 2.1 checkpoint閉語彙と固定順

次の順序だけを許す。IDは現物の実処理順から導出した。

1. `entry-validation`
2. `job-byte-read`
3. `job-decode-validation`
4. `binding-pre-read`
5. `runtime-verification`
6. `publisher-load`
7. `dependency-initialization`
8. `binding-post-import-reread`
9. `output-root-resolution`
10. `output-root-absence-check`
11. `staging-root-absence-check`
12. `staging-root-acquisition`

`staging-root-acquisition`の完了後は正式staging内の既存failure artifact経路が所有するため、本fieldは`null`へ戻す。後段の観測を本追補へ混ぜない。

### 2.2 operation閉語彙

次だけを許す。

- `validate-entry`
- `read-job`
- `decode-and-validate-job`
- `read-bound-input`
- `verify-runtime-binding`
- `load-atomic-publisher`
- `import-runtime-dependencies`
- `resolve-workspace-root`
- `inspect-output-root-absence`
- `inspect-staging-root-absence`
- `create-staging-root`

checkpointとoperationの対応は§2.1の各段で一意に固定し、任意文字列を保存しない。

### 2.3 targetPathとosCode

`targetPath`は、検証済みbinding、検証済みjob path、または実際に呼んだworkspace内pathから得たworkspace相対pathだけを文字列で持つ。外部runtime実体、未検証入力、対象を一意にできない複数並列読取では`null`とする。絶対path、workspace外path、推測pathを入れない。

`osCode`は`null`または次のerrno閉語彙だけとする: `EACCES,EPERM,ENOENT,EIO,ENOTDIR,EEXIST,ENOSPC,EMFILE,ENFILE,EROFS,EINVAL,ENAMETOOLONG,ELOOP,EXDEV,ERR_FS_FILE_TOO_LARGE`。生message、stack、生stderr、file本文、secret、未知error文字列を入れない。閉語彙外は`null`とする。

## 3. 実装配線と不変条件

### 3.1 F production

F execute入口は、§2.1の段へ入る直前に現在checkpoint、operation、検証済み対象pathをメモリ内で置く。前段の成功後だけ次段へ進める。例外時は例外objectの`code`を§2.3の閉語彙へ写し、既知のbinding read wrapperが保持する検証済み対象pathと合わせて返却envelopeを作る。

output/staging不在検査は、現行短絡順を維持したまま二呼出しを明示的に分け、どちらで止まったかだけを観測する。検査回数、判定、root取得、公開処理を変えない。

### 3.2 保存成果物とfilesystem

- staging取得前のfilesystem書込は0件のまま維持する。
- 内側観測は返却値だけに存在し、診断fileをproductionから書かない。
- `rejection-report-v001.json`、`fatal-observation-v001.json`、`completion-report-v001.json`のschema、key、byteを変更しない。
- 返却envelope拡張が保存schema変更を要求する現物差が出た場合は実装せず停止する。
- S/A/L runnerへ同型拡張を行わない。新設runnerのstaging前観測標準化はスケルトン清書時の在庫とする。

### 3.3 F testとTAP

F testは、期待した外側tripleまたはpassed envelopeと実測が不一致になる直前に、実測`innerObservation`の`checkpoint,operation,targetPath,osCode`をTAP diagnosticへ一行の構造化JSONとして印字する。TAPへ生error、stack、stderr、本文を出さない。

検査は少なくとも次を実測する。

1. staging取得前の決定的な`create-staging-root`失敗が、freeze済み4-key観測へ写る。
2. targetPathがstaging workspace相対path、osCodeが`ENOENT`である。
3. passed結果では`innerObservation=null`である。
4. 既存三つの保存reportに`innerObservation`が混入しない。
5. 不一致時TAP helperが4 fieldだけを印字するsource/runtime接続を持つ。

## 4. approved contract binding

本書を全formal jobへ一件加える。roleは`caption-quality-pre-staging-inner-observation-addendum`、pathは本書path、SHAは承認時実測値を使う。観測処理の変更対象はF production/testだけだが、承認来歴は全formal jobが同じ累積契約集合を検証する。

| job | v011 | v012 | exact構成 |
|---|---:|---:|---|
| source | 10 | 11 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、v011、本書 |
| B5 | 10 | 11 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、v011、本書 |
| B6 | 11 | 12 | parent、complete design、v002、v004、v005、v006、v007、v008、v009、v010、v011、本書 |
| selection | 12 | 13 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、v011、本書 |
| proof | 12 | 13 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、v011、本書 |

implementation binding source/B5/B6/selection/proof=36/11/19/41/51、path 17、code 49、検査ID 46、proof総数489、全owner件数は増減0とする。ZCQ044 35枝の証明内容を変更しない。

## 5. proof exact置換

次の7件だけを一対一置換する。表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V11-ZCQ001-01` | `V12-ZCQ001-01` |
| `V11-ZCQ007-01` | `V12-ZCQ007-01` |
| `V11-ZCQ018-01` | `V12-ZCQ018-01` |
| `V11-ZCQ018-02` | `V12-ZCQ018-02` |
| `V11-ZCQ027-01` | `V12-ZCQ027-01` |
| `V11-ZCQ042-01` | `V12-ZCQ042-01` |
| `V11-ZCQ042-02` | `V12-ZCQ042-02` |

期待集合はexact `(v011適用後489件 − 上記7件) ∪ §6の7件`とする。期待、test source宣言、TAP observed、TAP passedを489件へexact一致させる。

## 6. V12-PROOF-ITEMS-BEGIN

- V12-ZCQ001-01 | source implementation 36件とapproved contract 11件のexact role/path/SHA集合を検査し、本書を含むsource構成へ一致する
- V12-ZCQ007-01 | B5/B6 implementation 11/19件を維持し、approved contractが本書を含む11/12件へexact一致する
- V12-ZCQ018-01 | selection implementation 41件とapproved contract 13件のexact role/path/SHA集合を前読・import後・公開直前三時点で実再読する
- V12-ZCQ018-02 | selection approved contract 13件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V12-ZCQ027-01 | selection approved contract 13件とatomic helper 3 implementation bindingを公開直前まで照合する
- V12-ZCQ042-01 | proof implementation 51件とapproved contract 13件のexact role/path/SHA集合を前読・import後・公開直前三時点で実再読する
- V12-ZCQ042-02 | v011のF module descriptor・同一formal capability参照・readonly実測を全て維持し、staging取得前create失敗がfreeze済みinnerObservation exact 4 keyへ写り、passedはnull、保存report schema不変、不一致時TAPが4 fieldだけを構造化表示することを実観測する

## 7. V12-PROOF-ITEMS-END

## 8. 完全性と停止条件

- 観測fieldの値は現物段階と実読取証拠だけから作り、path・errnoを推測しない。
- production観測処理はF一path、観測検査はF test一pathに限定する。binding/proofの累積更新は既存17 path集合内だけで行い、18 path目を作らない。
- 保存成果物schema、49 code、46検査ID、489 proof、owner件数、ZCQ044 35枝の意味を変更しない。
- 生message、stack、生stderr、本文、secret、workspace外pathを返却・保存しない。
- 新たな契約判断、保存schema変更、18 path目、既存成果物差、不合格一件が出た場合は同attemptで直さず停止する。
- API通信、countTokens、generateContent、費用、正式描画、stable tagを行わない。

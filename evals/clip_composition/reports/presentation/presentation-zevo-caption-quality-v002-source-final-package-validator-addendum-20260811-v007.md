# ZEVO字幕品質v002 source最終package validator共有・上流支配証明 追補 v007

- 日付: 2026-08-11 JST
- 状態: kawafmm裁定に基づく正本候補
- 対象: S工程の最終package判定、ZCQ004証明、formal jobの承認契約binding
- 新規path: 0件
- 既存変更path: S production 1件、S test 1件
- API通信: 0回
- 費用: US$0

## 0. 結論

S production内で既に3箇所から使われる最終package判定を、版付きnamed export `validatePresentationOutputCaptionCueSourcePackageV001`として一つだけ公開する。builder、正式serializer後の再読、staging公開前再読は同じ関数実体を使う。logic複製、共有最終化入口、runnerへのcase注入口、test専用分岐、新pathを作らない。

`CUE_SOURCE_PROMPT_PROJECTION_INVALID`は、可視prompt projectionと再構築mapを含む最終source package検査の不成立を所有する。code名、rejected status、49 code集合は変えない。正式runnerでは上流meaning package validatorが`captionId`空を先に拒否するため、本codeのrunner exact tripleを要求しない。code実発火、上流支配、projection各predicateをそれぞれ別の実観測として証明する。

## 1. 正本と適用順

本書以外の親契約、完全実装設計v001、累積追補v002、実値配線追補v003、atomic公開・B6所有追補v004、B6 credential追補v005、atomic runtime追補v006は不変である。本書は次だけを追加・置換する。

1. source最終package validatorの版付きpure入口。
2. `CUE_SOURCE_PROMPT_PROJECTION_INVALID`の所有意味とZCQ004の観測方法。
3. formal jobのapproved contract binding件数と構成。
4. V6契約件数proofとZCQ004既存4 proofのV7置換。

適用順はparent→complete design→v002→v003→v004→v005→v006→本書とする。本書の実測SHA-256をDECISIONSへ記録し、role `caption-quality-source-final-package-validator-addendum`として§6のformal jobへ束縛する。

## 2. 実現性調査

### 2.1 現物入口と支配関係

| 観測対象 | 現物 | 結論 |
|---|---|---|
| 最終package判定 | S production内のprivate `validatePackage` | named exportへ置換できる |
| builder | source package組立て後に同判定を1回使用 | 同じexportを直接呼べる |
| formal serializer後 | strict decode後に同判定を1回使用 | 同じexportを直接呼べる |
| staging公開前 | stable再読・strict decode後に同判定を1回使用 | 同じexportを直接呼べる |
| formal runner上流 | meaning package validatorがcaption ID形式をbuilderより前に検査 | `captionId`空は`input-reread / CUE_SOURCE_INPUT_BINDING_INVALID`で先に拒否される |
| source pure builder | 簡易meaning envelopeはcaption ID形式を検査せず、最終package再構築mapで拒否 | `CUE_SOURCE_PROMPT_PROJECTION_INVALID`の実code発火に使える |

### 2.2 path・件数・逆影響

- 新規pathは0件、18 path目は作らない。
- production変更はS production 1 path、test変更はS test 1 pathだけである。
- code集合49件、検査ID46件、proof item489件、各owner件数は不変である。
- builder正常出力、正式serializer byte、公開済み成果物schema、status、CLI stage、既存違反codeは変えない。
- 正式runnerへ新しい入力経路を追加しないため、上流validatorの支配順も変えない。

## 3. 版付きpure validator入口

### 3.1 export名とexact入力

```text
validatePresentationOutputCaptionCueSourcePackageV001(sourcePackage)
```

引数はexact 1件で、source package objectそのものとする。wrapper object、option、context、test mode、validator注入を受けない。

### 3.2 exact返却shape

合格は次である。

```json
{"status":"passed","violations":[]}
```

不合格は次である。

```json
{"status":"rejected","violations":[{"path":"/JSON/pointer","rule":"closed-rule"}]}
```

- top-level key順は`status`, `violations`。
- violation key順は`path`, `rule`。
- statusは`passed | rejected`だけ。
- `violations`、各violation、返却objectを全て`Object.freeze`する。
- 生本文、stack、stderr、secretを返さない。
- 入力を変更しない。

### 3.3 rule閉語彙と固定順

ruleは次の閉語彙だけとする。

```text
exact-key-set
schema-version
formal-id
task-description
dense-nonempty-array
nonempty-string
unique-id
positive-integer
formal-binding
resolved-style
style-limit-mismatch
reconstruction-caption-mismatch
reconstruction-boundary-mismatch
```

違反は次の大分類順、同一分類内では配列ordinal順・field順で並べる。

1. root
2. prompt
3. prompt caption ordinal
4. prompt boundary ordinal
5. style
6. reconstruction caption ordinal
7. reconstruction boundary ordinal
8. reconstruction case ordinal
9. provenance

同じ入力は常に同じpath・rule・順序を返す。最初の違反だけで打ち切らず、検査できた範囲の違反を固定順で全件返す。ただし親shape不成立で子pathを安全に読めない場合、当該親の違反だけを返し、推測した子違反を加えない。

### 3.4 最終packageで検査する一致

既存検査に加え、最終packageとして次の対応を一意に検査する。

- prompt caption IDは重複せず、同ordinalのreconstruction caption IDと一致する。
- 各prompt boundary IDはcaption内で重複せず、同ordinalのreconstruction boundary IDと一致する。
- prompt boundaryはexact `boundaryId / text`以外のkeyを持たない。path、SHA、時刻等のローカル文脈混入は`exact-key-set`で拒否する。
- boundary textは非空である。
- prompt style上限と各reconstruction caseのresolved style上限が一致する。不一致は`style-limit-mismatch`で拒否する。

同じtextが異なるboundary IDへ正当に現れることは拒否しない。「重複boundary」は同一caption内のboundary ID重複を意味する。

## 4. runner内の同一関数参照

S production内の次の3箇所は、全て§3のnamed exportを直接呼ぶ。

1. pure builderがsource packageを組み立てた直後。
2. formal bytesをstrict decodeした直後。
3. staging成果物をstable再読・strict decodeした直後。

private wrapper、alias validator、別組立て、test専用分岐を作らない。testはmodule namespaceとsource byteを実読し、named exportの存在、3箇所の同一symbol call、旧private `validatePackage` 0件を検査する。

## 5. ZCQ004の三点セット実観測

### 5.1 code実発火

正常合成入力から意味captionの`captionId`だけを空にし、source pure builder production実体へ直接渡す。次を実測する。

```text
rejected / CUE_SOURCE_PROMPT_PROJECTION_INVALID
```

これは「再構築map枝によるcode発火」とlabelし、projection不正の証明とは主張しない。builder返値へstageを追加しない。

### 5.2 上流支配の実観測

同じ`captionId`空のmeaning packageを、正式job・正式binding・正式CLI経路へ渡す。上流validatorが次で先に拒否することを実測する。

```text
rejected / input-reread / CUE_SOURCE_INPUT_BINDING_INVALID
```

この観測を「runnerからは`CUE_SOURCE_PROMPT_PROJECTION_INVALID`へ到達できない上流支配」の証明とする。本codeについてrunner exact tripleを要求しない。

### 5.3 projection predicateの実発火

正常なsource packageを§3のpure validatorへplain dataとして直接渡し、少なくとも次を個別に実発火させる。

| 不正入力 | 期待する実観測 |
|---|---|
| boundaryへpath/SHA/時刻keyを混入 | 対象boundary pathの`exact-key-set` |
| boundary textを空 | 対象text pathの`nonempty-string` |
| 同一caption内でboundary IDを重複 | 後出boundary ID pathの`unique-id` |
| prompt style上限とresolved styleを不一致 | 対象resolved style pathの`style-limit-mismatch` |

全caseで戻り値のfreeze、固定違反順、同一入力二回のbyte同一も実測する。これはprojection側predicateの証明であり、§5.1のcode発火とは分けて報告する。

## 6. approved contract bindingのexact更新

本書を全formal jobへ一件加える。v003はsource/B5/B6へ、v005はsource/B5へ追加しない既存分離を維持する。

| formal job | v007前 | v007後 | exact contract構成 |
|---|---:|---:|---|
| source | 5 | 6 | parent、complete design、v002、v004、v006、本書 |
| B5 | 5 | 6 | parent、complete design、v002、v004、v006、本書 |
| B6 | 6 | 7 | parent、complete design、v002、v004、v005、v006、本書 |
| selection | 7 | 8 | parent、complete design、v002、v003、v004、v005、v006、本書 |
| proof | 7 | 8 | parent、complete design、v002、v003、v004、v005、v006、本書 |

各formal jobはrole狭義昇順のexact role/path/SHA集合を検査する。件数不足・余分・本書SHA不一致は各jobの既存job-invalid ownerがdynamic import前に拒否する。implementation binding件数36/11/19/41/51は増減0である。

## 7. proof itemのexact置換

検査ID46件、code49件、proof総数489件、owner件数は不変である。次の10件だけを失効し、同ownerのV7 proof 10件へ一対一置換する。

### 7.1 exact失効・置換表

| 失効ID | 置換ID | 理由 |
|---|---|---|
| `V6-ZCQ001-01` | `V7-ZCQ001-01` | source contract 5件を6件へ改訂 |
| `ZCQ004-P-01-bf7a27f4d607` | `V7-ZCQ004-01` | 旧task本文単独proofをpure validator正常系・共有入口proofへ置換 |
| `ZCQ004-P-02-37f5cbb4704b` | `V7-ZCQ004-02` | 旧境界本文単独proofをcode発火・上流支配proofへ置換 |
| `ZCQ004-P-03-78319f76f785` | `V7-ZCQ004-03` | 旧style単独proofをprojection predicate実発火proofへ置換 |
| `ZCQ004-P-04-b7300cb7db88` | `V7-ZCQ004-04` | 旧非混入正例proofを固定順・freeze・同一関数参照proofへ置換 |
| `V6-ZCQ007-01` | `V7-ZCQ007-01` | B5/B6 contract 5/6件を6/7件へ改訂 |
| `V6-ZCQ018-01` | `V7-ZCQ018-01` | selection contract 7件を8件へ改訂 |
| `V6-ZCQ018-02` | `V7-ZCQ018-02` | selection contract不正拒否を8件へ改訂 |
| `V6-ZCQ027-01` | `V7-ZCQ027-01` | selection公開前照合を8件へ改訂 |
| `V6-ZCQ042-01` | `V7-ZCQ042-01` | proof contract 7件を8件へ改訂 |

### 7.2 V7-PROOF-ITEMS-BEGIN

- V7-ZCQ001-01 | source implementation 36件とapproved contract 6件のexact role/path/SHA集合を検査し、approved contractがparent、complete design、v002、v004、v006、本書へ一致する
- V7-ZCQ004-01 | 正常source packageを版付きpure validatorへ渡すとpassed・空違反となり、task本文・境界本文・style上限・ローカル文脈非混入の既存4正例を同じpackage上で保持し、builder・formal decode後・staging再読後の3箇所が同一named exportを参照する
- V7-ZCQ004-02 | captionId空のplain dataをsource pure builderへ直接渡して再構築map枝のCUE_SOURCE_PROMPT_PROJECTION_INVALIDを実発火し、同じcaptionId空meaning packageを正式runnerへ渡すと上流支配によりinput-reread/CUE_SOURCE_INPUT_BINDING_INVALIDで先に拒否されることを実測する
- V7-ZCQ004-03 | 版付きpure validatorへpath/SHA/時刻混入、boundary text空、boundary ID重複、style上限不一致をplain dataで個別投入し、それぞれのprojection predicate違反を実発火する
- V7-ZCQ004-04 | pure validatorのexact入出力、違反固定順、全返却値freeze、同一入力二回のbyte同一、test専用分岐・旧private validator・新runner入口0件を実測する
- V7-ZCQ007-01 | B5 approved contractがparent、complete design、v002、v004、v006、本書の6件、B6がそれらとv005の7件へexact一致し、implementation 11/19件を維持する
- V7-ZCQ018-01 | selection implementation 41件とapproved contract 8件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V7-ZCQ018-02 | selection approved contract 8件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V7-ZCQ027-01 | selection approved contract 8件とatomic helper 3 implementation bindingを公開直前まで照合する
- V7-ZCQ042-01 | proof implementation 51件とapproved contract 8件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する

### 7.3 V7-PROOF-ITEMS-END

期待集合はexact `(v006適用後489件 − §7.1の失効10件) ∪ §7.2のV7 10件`とする。期待、test source宣言、TAP observed、TAP passedを各489件へexact一致させる。各ID合計はZCQ001=22、ZCQ004=4、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36で不変である。表外proofを失効しない。

## 8. ZCQ005とS検査設営

### 8.1 ZCQ005 production限定修正

atomic公開prepareのstaging初回`lstat`だけを局所try/catchで囲む。`ENOENT`だけを`source-invalid`へ写し、非directory・symlink・identity/type差は既存判定、binding shape不正は`helper-invocation-invalid`、binding byte差と通常I/Oは`helper-execution-failed`へ維持する。`ENOENT`以外を再throwして外側catchへ渡し、`helper-execution-failed`の本来の受け皿を変えない。

検査は欠落、非directory、symlink、identity/type差、binding shape不正、binding byte差、通常I/Oの7行を決定的に実発火させる。

### 8.2 S設営再実装

S所有6検査・50 proof・7 codeを全件対象にし、各負例は最初に不成立となるpredicateが狙った枝へ一致するplain dataまたは明示的filesystem状態から作る。getter、Proxy副作用、読取回数、登録順、file watcher、polling、timerへ依存しない。直接起動時はS 6検査を登録し、B5/B6 testからimportした時はS検査0件・共用owner解決入口だけを公開する既存guard目的を維持する。

## 9. 実装・実行順

本書がkawafmm裁定1〜5へ完全一致し、新たな契約判断0件であることを機械・目視で照合した場合だけ、次へ連続する。

1. 本書SHAをDECISIONSへ記録。
2. S productionのpure validator共有とZCQ005限定修正。
3. S test設営再実装、V7 proof derivation、両側自己検査。
4. S局所6件を新attemptとして頭から1回実行し、TAP全文を監視root外の版付きpathへ保存。
5. 6/6の場合だけA→L→P→R→F→Uを既承認順で実行。
6. Uまで全合格・契約判断0件の場合だけ、正式46件、直接影響回帰、green 287/287、baseline 86/203 exact、既存5 treeとA-v002記録対象treeの不変照合、完了報告へ進む。

S新attemptで検査設営起因の不合格が再発した場合は、個別修正も設営再見直しも行わず、S工程計画ごとkawafmmへ戻す。production起因または契約起因は三分法で証拠を提示して停止する。不合格1件を同attemptで直さない。

API通信、countTokens、generateContent、費用支出、正式描画、stable tagは本書の範囲外である。

## 10. 完全一致監査

| kawafmm裁定 | 本書 | 判定 |
|---|---|---|
| 1. code実発火・上流支配・runner exact triple不要 | §5.1〜5.2 | closed |
| 2. projection各predicateのpure実発火 | §5.3 | closed |
| 3. 実production枝・上流支配・静的証明禁止の整合 | §2・§5 | closed |
| 4. named export、exact shape、固定順、同一関数、freeze、code意味、contract構成、proof会計 | §3〜§7 | closed |
| 5. ZCQ005限定修正とS設営再実装 | §8 | closed |

新しい共有最終化入口、runner case注入口、test専用分岐、18 path目、logic複製は0件である。追加の契約判断はない。

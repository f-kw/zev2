# ZEVO字幕品質v002 解決済みURL評価 追補 v015

- 日付: 2026-08-14
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v014
- 変更対象: F proof runnerのdependency-evaluate入力、F test、全formal jobの契約来歴
- 通信・費用・正式描画: 0

## 1. 実現性調査

### 1.1 現物入口

F productionの`dynamicDependencies`は、19件のprivate rowを固定順に一件ずつ処理し、各rowについて次を実行している。

1. relative literalの`specifier`を`new URL(row.specifier, import.meta.url)`で解決する。
2. 解決先をworkspace相対pathへ写し、登録済み`targetPath`との一致を検査する。
3. rowのprivate loaderを一回awaitする。
4. namespaceが非null objectであることを検査する。
5. 同じnamespace参照を登録済みkeyへ一回格納する。

v014の4段checkpoint、19件表、targetPath、relative literal、返却keyは現物に実在する。変更対象は第3項へ渡す評価入力だけである。

### 1.2 起草前診断

v015診断v001は`import(RELATIVE_FROM_DIAG)`というruntime変数指定子を「relative literal」と誤記していたため、v001と停止報告を上書きせずerrataを追加した。追加実行は0回である。

保存済み証拠を正しく照合すると、固定Node→固定TSX CLI→`--test`という同じ正式launcher形で次が成立する。

| 指定子形 | 実測 | code識別子 | 証拠 |
|---|---|---|---|
| F private loader内のrelative literal | 失敗 | `ERR_UNSUPPORTED_RESOLVE_REQUEST` | F formal attempt-0007 TAP |
| F module URLから解決したabsolute file URL | 成功 | `null` | v015診断実行v001 TAP |

正本診断recordは`presentation-zevo-caption-quality-v002-v015-resolved-url-import-diagnosis-20260814-v002.json`である。

### 1.3 原因

attempt-0003まではdirect await importが固定TSXの静的変換範囲に入り、relative literalを評価できた。v013で観測のためにprivate loader closureへ再構成した結果、relative importが同変換範囲から外れた。v014のresolve段は正しいabsolute file URLを既に計算・検証しているが、evaluate段はその結果を捨て、relative literalを再評価していた。

production処理内容、fixture、検査設営の欠陥ではなく、観測契約のloader構造と固定TSX変換範囲の相互作用を実装前に閉じなかった契約設計の不足である。

## 2. dependency loadの改訂

### 2.1 維持する構造

次を変更しない。

- 4段のcheckpointとoperation
- 固定順
- 一件ずつawait
- retry、fallback、並列、二重import 0件
- 19件閉集合
- rowのkey、targetPath、relative literal specifier
- namespaceの非null object検査
- 同じnamespace参照の返却keyへの一回格納
- 外側status、stage、primaryCode、終了code
- staging前filesystem書込0件
- 生message、stack、生stderr、本文、secretの保存0件

### 2.2 dependency-resolve

rowのrelative literal指定子を`new URL(row.specifier, import.meta.url)`で一回だけ解決し、得たURLを`resolvedUrl`として保持する。`fileURLToPath(resolvedUrl)`を既存workspace相対化入口へ渡し、次の両方を検査する。

1. workspace相対化した値が登録済み`targetPath`とexact一致する。
2. 解決先の絶対pathがworkspace root自身ではなく、その配下にある。

workspace外、workspace root自身、登録targetPath不一致はresolve段で拒否し、evaluateへ進めない。新しいpath計算・reader・fallbackを作らない。

### 2.3 dependency-evaluate

resolve段で検証済みの`resolvedUrl.href`を、同じrowの評価入力へ一回だけ渡す。relative literalを直接importしない。

v014 §3の「実importはrelative literalをそのまま使い、absolute URLへ置換しない」は、本追補がforward-onlyに改訂する。黙った実装修正として扱わない。

rowの`specifier`は契約データとして保持し、resolveの入力と19/19対応検査を所有する。evaluateの入力だけをresolve済みURLへ変更する。

### 2.4 loader shape

private rowのloaderはexact一引数`resolvedUrl`を受け、`import(resolvedUrl)`を一回だけ返す。job、環境変数、test条件による指定子選択、既定値、部分省略を認めない。resolve済みURLをloader内で再計算しない。

## 3. 実装

### 3.1 F production

既存F production一path内だけで次を行う。

1. 19 rowのloaderを`load: resolvedUrl => import(resolvedUrl)`へ同形置換する。
2. resolve段で`resolvedUrl`を一回生成する。
3. workspace内・targetPath一致を確認する。
4. evaluate段で`dependency.load(resolvedUrl.href)`を一回awaitする。

19件を個別に異なる方式へせず、全rowを同じ一方式へ統一する。

### 3.2 F test

既存ZCQ042へ、production sourceを実読して次を証明するsubcaseを追加する。検査IDは増やさない。

1. 19 rowのrelative literal specifierとtargetPathがv014表に19/19一致する。
2. 19 rowのloaderがexact一引数のresolved URLだけをimportする。
3. resolve段が`new URL(dependency.specifier, import.meta.url)`を一回生成する。
4. workspace外と登録targetPath不一致をevaluate前に拒否する。
5. evaluate段が同じ`resolvedUrl.href`をloaderへ渡す。
6. relative literalをloaderが直接importする形が0件である。
7. retry、fallback、並列、二重importが0件である。

ZCQ044 35枝のfixture、到達方法、証明内容は変更しない。

## 4. approved contract binding

本書を全formal jobへ一件加える。roleは`caption-quality-resolved-url-evaluation-addendum`、pathは本書path、SHAは本書の実測値を使う。role狭義昇順を維持する。

| job | v014 | v015 | exact構成 |
|---|---:|---:|---|
| source | 13 | 14 | parent、complete design、v002、v004、v006〜v015。ただしv003/v005は含めない |
| B5 | 13 | 14 | parent、complete design、v002、v004、v006〜v015。ただしv003/v005は含めない |
| B6 | 14 | 15 | parent、complete design、v002、v004〜v015。ただしv003は含めない |
| selection | 15 | 16 | parent、complete design、v002〜v015。ただし履歴v001は重複束縛しない |
| proof | 15 | 16 | parent、complete design、v002〜v015。ただし履歴v001は重複束縛しない |

現物のjob別構成へ本書一件だけを追加した件数であり、v003/v005の既存除外を変えない。

implementation binding source/B5/B6/selection/proof=36/11/19/41/51、path 17、code 49、検査ID 46、proof総数489、owner件数は増減0とする。

## 5. proof exact置換

次の7件だけを一対一置換し、表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V14-ZCQ001-01` | `V15-ZCQ001-01` |
| `V14-ZCQ007-01` | `V15-ZCQ007-01` |
| `V14-ZCQ018-01` | `V15-ZCQ018-01` |
| `V14-ZCQ018-02` | `V15-ZCQ018-02` |
| `V14-ZCQ027-01` | `V15-ZCQ027-01` |
| `V14-ZCQ042-01` | `V15-ZCQ042-01` |
| `V14-ZCQ042-02` | `V15-ZCQ042-02` |

期待集合はexact `(v014適用後489件 − 上記7件) ∪ §6の7件`とする。期待、test source宣言、TAP observed、TAP passedの四者をexact一致させる。

## 6. V15-PROOF-ITEMS-BEGIN

- V15-ZCQ001-01 | source implementation 36件とapproved contract 14件のexact role/path/SHA集合を検査する
- V15-ZCQ007-01 | B5/B6 implementation 11/19件とapproved contract 14/15件を検査する
- V15-ZCQ018-01 | selection implementation 41件とapproved contract 16件を前三時点で実再読する
- V15-ZCQ018-02 | selection approved contract 16件の不足・余分・本書SHA不一致をimport前に拒否する
- V15-ZCQ027-01 | selection approved contract 16件とatomic helper 3 implementation bindingを公開直前まで照合する
- V15-ZCQ042-01 | proof implementation 51件とapproved contract 16件を前三時点で実再読する
- V15-ZCQ042-02 | v012〜v014の安全観測を維持し、19依存のrelative specifierをresolveした検証済みabsolute file URLだけをevaluateへ一回渡すことを実測する

## 7. V15-PROOF-ITEMS-END

## 8. 完全一致監査

| 裁定A項 | 本書 | 判定 |
|---|---|---|
| 読み取り診断の二枡 | §1.2 | closed |
| 4段・19件・順序・一回性の維持 | §2 | closed |
| resolve済みURLをevaluateへ渡す | §2.2〜§3 | closed |
| relative literal契約データ維持 | §2.3、§3.2 | closed |
| source実読検査 | §3.2 | closed |
| binding 14/14/15/16/16 | §4 | closed |
| path/code/ID/proof/owner不変 | §4〜§6 | closed |
| exact proof置換・四者一致 | §5〜§6 | closed |

新たなpath、保存schema、違反code、検査ID、proof、ownerの増減は0件である。

## 9. 実行・停止条件

本書のSHAを実測し、DECISIONSの承認行と全formal jobへ同じ値を束縛する。実装後は正式command全文のbyte照合、固定Node、固定TSX CLI、`NODE_OPTIONS`不存在、native、Chromium、FFmpeg/FFprobe実体をpreflightする。

F局所3件を未使用attempt/rootで頭から一回実行し、TAP、stderr、終了codeを独立保存する。3/3時だけU、正式46件、直接影響回帰、green 287/287、baseline 86/203 exact、既存5 tree・A-v002記録対象tree照合へ進む。

不合格一件で同attempt修正を行わない。v015実装由来で契約不変のF production/test二path内修正に限る通算二回の限定修正権、契約判断・帰属不能・検査設営・path/schema追加時の停止を維持する。

API通信、countTokens、generateContent、費用、正式描画、commit、stable tagを行わない。

## 10. 在庫

観測契約・loader構造を変更するときは、固定toolchainがどのimport形を静的変換し、どの形をruntime評価へ残すかを実現性調査の必須項目とする。

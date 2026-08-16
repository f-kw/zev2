# ZEVO字幕品質v002 依存load細段階観測 追補 v014

- 日付: 2026-08-13
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v013
- 変更対象: F proof runnerの依存load細段階返却観測、F test、全formal jobの契約来歴
- 通信・費用・正式描画: 0

## 1. 実現性調査と診断

### 1.1 件数閉包

現行F productionの`dynamicDependencies`は19 direct importである。v013診断recordの19件とordinal、返却key、workspace相対targetPathが19/19一致し、差分は0件だった。従来報告の20件目は`dynamicDependencies`直前のatomic publisher loaderであり、同閉集合のmemberではない。

### 1.2 指定子三者比較

最初のsource dependencyは次の三形だった。

| 対象 | 指定子 | 形式 |
|---|---|---|
| v013 production | `./presentation_output_caption_cue_source_package_v001.mjs` | relative literalをprivate loader closure内で使用 |
| v013診断 | `file:///Users/kawafmm/workspace/zev2/evals/clip_composition/presentation_output_caption_cue_source_package_v001.mjs` | absolute file URL |
| v012 productionの固定TSX変換記録 | `./presentation_output_caption_cue_source_package_v001.mjs` | relative literalをdirect await importで使用 |

v013診断は対象実体を同じにしたが、指定子形式とimporter文脈をproductionと同じにしていなかった。

### 1.3 文脈対照

固定TSX実行系で、F module URLを解決基点にしたrelative literal importはcode識別子なしで失敗した。物理`.mjs` importerから同じ対象をabsolute file URLでimportした対照は成功した。正式attempt-0005も最初のsource dependency処理中にcode識別子なしで停止した。

診断record: `presentation-zevo-caption-quality-v002-v014-import-context-diagnosis-20260813-v001.json`

同record SHA-256: `c8cc8e409c1f5d134a57926897776e5157e3806c1f754c53a8bb763a4a37dcc9`

この結果でimport文脈差は再現したが、module resolve、module evaluate、TSX wrapper、namespace処理のいずれへ帰属するかは確定しない。よって本追補で生文字列を保存せず細段階を観測する。

## 2. 返却envelopeの追加field

v012の`innerObservation` exact shapeを次の5 keyへforward-only改訂する。

1. `checkpoint`
2. `operation`
3. `targetPath`
4. `osCode`
5. `errorCodeIdentifier`

`errorCodeIdentifier`は例外objectの`code`が文字列で、`^E[A-Z0-9_]+$`または`^ERR_[A-Z0-9_]+$`へ一致するときだけ同じ文字列を返し、それ以外は`null`とする。`osCode`はv012の固定allowlistだけを受けるため役割を変えない。両fieldが同じerrno名を持つことは許可する。

`innerObservation`と外側envelopeはfreezeする。同一入力・同一例外objectからの写像は決定的とする。

## 3. dependency loadの4段閉語彙

v013の19件・固定順・一件ずつawait・指定子を変えない性質を維持し、各rowを次の順に観測する。

| 順 | checkpoint | operation | 実処理 | 失敗時targetPath |
|---:|---|---|---|---|
| 1 | `dependency-resolve` | `resolve-dependency` | rowのrelative literal指定子をF moduleの`import.meta.url`で解決し、既存targetPathとの一致を確認 | 現在rowのworkspace相対path |
| 2 | `dependency-evaluate` | `evaluate-dependency` | v013の既存loaderを一回だけawaitする | 同上 |
| 3 | `dependency-namespace-verify` | `verify-dependency-namespace` | 返却値が非null objectであることを確認する | 同上 |
| 4 | `dependency-store` | `store-dependency` | 同じnamespace参照をrowの返却keyへ一回格納する | 同上 |

resolve確認は新しいmodule readerを作らず、`new URL(row.specifier, import.meta.url)`と既存workspace相対化処理だけを使う。実importはv013のrow loaderが持つrelative literalをそのまま使い、absolute URLへ置換しない。retry、fallback、並列化、順序変更、二重importを禁止する。

namespace確認はmoduleの中身・default wrapper・named exportを再解釈せず、非null objectであることだけを確認する。各module固有surfaceは既存ownerが検査し、本追補は複製しない。

一段が失敗したら後続段へ進まず、その段のcheckpoint、operation、現在targetPath、許可された`osCode`と`errorCodeIdentifier`を返す。

## 4. 不変条件

- 観測は返却envelopeだけで運ぶ。
- staging取得前のfilesystem書込は0件を維持する。
- `rejection-report-v001.json`、`fatal-observation-v001.json`、`completion-report-v001.json`のschema、key、byteを変えない。
- 外側status、stage、primaryCode、終了codeを変えない。
- 生message、stack、生stderr、本文、secret、絶対path、workspace外pathを返却・保存しない。
- v013の19件閉集合、指定子、順序、返却key、namespace参照を変えない。
- S/A/L runnerへ同型拡張を行わない。

## 5. 実装・検査

### 5.1 F production

v013のprivate rowへ既存relative literalの`specifier`を明示dataとして追加し、loader literalとの一致をF testが確認する。`dynamicDependencies`の観測callbackはexact `{checkpoint, operation, targetPath}`を受け、4段の直前にv014の現在観測を更新する。

例外時は`preStagingObservation`が既存4 fieldと`errorCodeIdentifier`を安全に写す。保存report builderへ同fieldを渡さない。

### 5.2 F test

ZCQ042は次を実測する。

1. v013の19件表、v014の指定子、production private rowのkey・targetPath・specifier・順序が19/19一致する。
2. production sourceが4段を固定順で一回ずつ観測し、同じloader namespaceを格納する。
3. `errorCodeIdentifier`の正例`ENOENT`、正例`ERR_MODULE_NOT_FOUND`、負例の任意文字列をそれぞれ同値、同値、`null`へ写す。
4. v012のstaging取得失敗では`osCode=ENOENT`かつ`errorCodeIdentifier=ENOENT`を返す。
5. invalid entryとpassedではそれぞれ安全な5 fieldまたは`innerObservation=null`を返す。
6. 保存report schemaへ`innerObservation`と`errorCodeIdentifier`が混入しない。
7. 不合格時のTAPは5 fieldだけを印字する。

検査専用production分岐、故障用import path、watcher、polling、timer、並行差替えを作らない。

## 6. approved contract binding

本書を全formal jobへ一件加える。roleは`caption-quality-dependency-load-stage-observation-addendum`、pathは本書path、SHAは本書の実測値を使う。role狭義昇順を維持する。

| job | v013 | v014 | exact構成 |
|---|---:|---:|---|
| source | 12 | 13 | parent、complete design、v002、v004、v006〜v014。ただしv003/v005は含めない |
| B5 | 12 | 13 | parent、complete design、v002、v004、v006〜v014。ただしv003/v005は含めない |
| B6 | 13 | 14 | parent、complete design、v002、v004〜v014。ただしv003は含めない |
| selection | 14 | 15 | parent、complete design、v002〜v014。ただし履歴v001は重複束縛しない |
| proof | 14 | 15 | parent、complete design、v002〜v014。ただし履歴v001は重複束縛しない |

implementation binding source/B5/B6/selection/proof=36/11/19/41/51、path 17、code 49、検査ID 46、proof総数489、owner件数は増減0とする。ZCQ044 35枝の証明内容を変更しない。

## 7. proof exact置換

次の7件だけを一対一置換し、表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V13-ZCQ001-01` | `V14-ZCQ001-01` |
| `V13-ZCQ007-01` | `V14-ZCQ007-01` |
| `V13-ZCQ018-01` | `V14-ZCQ018-01` |
| `V13-ZCQ018-02` | `V14-ZCQ018-02` |
| `V13-ZCQ027-01` | `V14-ZCQ027-01` |
| `V13-ZCQ042-01` | `V14-ZCQ042-01` |
| `V13-ZCQ042-02` | `V14-ZCQ042-02` |

期待集合はexact `(v013適用後489件 − 上記7件) ∪ §8の7件`とする。

## 8. V14-PROOF-ITEMS-BEGIN

- V14-ZCQ001-01 | source implementation 36件とapproved contract 13件のexact role/path/SHA集合を検査する
- V14-ZCQ007-01 | B5/B6 implementation 11/19件とapproved contract 13/14件を検査する
- V14-ZCQ018-01 | selection implementation 41件とapproved contract 15件を前三時点で実再読する
- V14-ZCQ018-02 | selection approved contract 15件の不足・余分・本書SHA不一致をimport前に拒否する
- V14-ZCQ027-01 | selection approved contract 15件とatomic helper 3 implementation bindingを公開直前まで照合する
- V14-ZCQ042-01 | proof implementation 51件とapproved contract 15件を前三時点で実再読する
- V14-ZCQ042-02 | v012/v013の安全性を維持し、19依存の指定子・targetPath対応と4段checkpoint、5 field返却、保存schema不変を実測する

## 9. V14-PROOF-ITEMS-END

## 10. 完全一致監査と停止条件

| kawafmm裁定 | 本書 | 判定 |
|---|---|---|
| 4段閉語彙とcode識別子一field | §2〜§5 | closed |
| v012/v013不変条件 | §3〜§5 | closed |
| binding 13/13/14/15/15、他会計不変 | §6〜§9 | closed |
| pin proofのexact一対一置換と四者一致 | §7〜§9 | closed |

新たなpath、保存schema、違反code、検査ID、proof、ownerの増減は0件である。contract binding追加と返却envelopeの観測改訂だけを行う。

新正式attemptで不合格が出たら同attemptで修正しない。検査設営帰属ならF/U fixture製造独立工程化の論点を添えて停止し、帰属不能が再発した場合はその事実を契約判断として停止する。API通信、countTokens、generateContent、費用、正式描画、stable tagを行わない。

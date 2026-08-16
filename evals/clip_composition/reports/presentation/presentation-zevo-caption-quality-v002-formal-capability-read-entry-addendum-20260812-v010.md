# ZEVO字幕品質v002 formal capability読み取り入口 追補 v010

- 日付: 2026-08-12
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v009
- 変更対象: F proof module表面、全formal jobの契約来歴、対応proof
- 通信・費用・正式描画: 0

## 1. 実現性調査

v009はF module内に19件のformal正本関数とfreeze済み`FORMAL_PROOF_CAPABILITIES_V001`をprivate値として置き、formal CLIが同objectを直接渡す。一方、別moduleのF testにはprivate値を参照する経路がなく、非故障capabilityを同一関数参照へ委譲できない。test側の再実装は計算複製、隠しpropertyは未契約入口、別module分離は18 path目となる。

既存F moduleへ引数0件のnamed exportを一件追加し、同じprivate objectを返せば、17 path内でformal CLIとtestが同一参照を共有できる。使用を約束する値の逆引きでは、`FORMAL_PROOF_CAPABILITIES_V001`→本入口→F testのplain capability object→F execute入口までmodule境界を越えるexport経路が連続する。

## 2. 読み取り専用入口

F production moduleへ次のnamed exportを一件追加する。

`readPresentationZevoCaptionQualityV002FormalCapabilitiesV001()`

- 引数は0件exact。1件以上なら副作用前に同期`TypeError`。
- 返却値はmodule-privateの`FORMAL_PROOF_CAPABILITIES_V001`そのもの。同値の新objectを作らない。
- 返却objectは`Object.isFrozen(value) === true`。
- 19 propertyはv009 §2の順・key・関数参照exactで、各関数値も`Object.isFrozen(value[key]) === true`とする。
- setter、getter、symbol key、追加data、追加functionは0件。
- testが返却objectまたは19 propertyを変更・追加・削除する操作はstrict modeで実際に失敗し、前後のobject同一性と19参照が不変でなければならない。

testは返却objectを直接変更しない。新しいplain objectへ19 propertyを同順・同一参照で転記し、各負例で故障対象の一件だけを決定的関数へ置換する。非故障18件は返却objectと`===`で一致する。既定値、fallback、部分省略、job/env/test条件によるproduction側の選択・test専用production分岐を作らない。

formal CLIは引き続きmodule-privateの`FORMAL_PROOF_CAPABILITIES_V001`を直接渡す。source/module実読検査は、formal CLIの実引数objectと読み取り入口の返却objectが同じidentifierへ解決し、runtimeでも`===`であることを観測する。

## 3. F module表面とTSX wrapper

source authored named export集合を次の6件exactへ改訂する。

1. `buildPresentationZevoCaptionQualityV002OutputRequestV001`
2. `decodePresentationZevoCaptionQualityV002ProofJobV001`
3. `derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001`
4. `executePresentationZevoCaptionQualityV002ProofJobV001`
5. `readPresentationZevoCaptionQualityV002FormalCapabilitiesV001`
6. `validatePresentationZevoCaptionQualityV002ProofJobV001`

固定TSX環境のruntime namespaceは上記6 named exportと`default`の7 key exactとする。`default` wrapperは同じ6 string-key exactを持ち、6件全てで`namespace.default[name] === namespace[name]`、symbol/getter/追加値0件を要求する。S/A/L/P/Rは`.ts` pathの有無を再照合し、該当する場合だけ同じ読みを遡及適用した版付き記録を残す。

## 4. bindingと数量

本書を全formal jobへ一件加える。roleは`caption-quality-formal-capability-read-entry-addendum`、pathは本書path、SHAは承認時実測値を使う。

| job | v009 | v010 | exact構成 |
|---|---:|---:|---|
| source | 8 | 9 | parent、complete design、v002、v004、v006、v007、v008、v009、本書 |
| B5 | 8 | 9 | parent、complete design、v002、v004、v006、v007、v008、v009、本書 |
| B6 | 9 | 10 | parent、complete design、v002、v004、v005、v006、v007、v008、v009、本書 |
| selection | 10 | 11 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、本書 |
| proof | 10 | 11 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、本書 |

path数17、implementation binding source/B5/B6/selection/proof=36/11/19/41/51、code 49、検査ID46、proof総数489、全owner件数は不変とする。ZCQ044 35件の証明内容を変更しない。

## 5. proof exact置換

次の7件だけを一対一置換する。表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V9-ZCQ001-01` | `V10-ZCQ001-01` |
| `V9-ZCQ007-01` | `V10-ZCQ007-01` |
| `V9-ZCQ018-01` | `V10-ZCQ018-01` |
| `V9-ZCQ018-02` | `V10-ZCQ018-02` |
| `V9-ZCQ027-01` | `V10-ZCQ027-01` |
| `V9-ZCQ042-01` | `V10-ZCQ042-01` |
| `V9-ZCQ042-02` | `V10-ZCQ042-02` |

期待集合はexact `(v009適用後489件 − 上記7件) ∪ §6の7件`とする。期待、test source宣言、TAP observed、TAP passedを489件へexact一致させる。

## 6. V10-PROOF-ITEMS-BEGIN

- V10-ZCQ001-01 | source implementation 36件とapproved contract 9件のexact role/path/SHA集合を検査し、本書を含むsource構成へ一致する
- V10-ZCQ007-01 | B5/B6 implementation 11/19件を維持し、approved contractが本書を含む9/10件へexact一致する
- V10-ZCQ018-01 | selection implementation 41件とapproved contract 11件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V10-ZCQ018-02 | selection approved contract 11件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V10-ZCQ027-01 | selection approved contract 11件とatomic helper 3 implementation bindingを公開直前まで照合する
- V10-ZCQ042-01 | proof implementation 51件とapproved contract 11件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V10-ZCQ042-02 | F入口がexact三keyと19 capabilityを要求し、formal CLIと引数0件読み取り入口が同一freeze済みobjectを共有すること、変更操作の実失敗、source 6 export、TSX wrapper同一6参照、S/A/L/P/R遡及結果を実観測する

## 7. V10-PROOF-ITEMS-END

## 8. 保証境界と停止条件

- 読み取り入口は検査可能性だけを供給し、formal経路のcapability選択を変更しない。
- testの一件置換はtest側plain objectだけに作用し、返却objectとformal objectは不変である。
- 18 path目、数量差、別参照、追加export、fallback、計算複製、新code、ZCQ044証明内容変更が必要なら停止する。
- 不合格1件で同attempt内に直さない。API通信、countTokens、generateContent、費用、正式描画、stable tagを行わない。

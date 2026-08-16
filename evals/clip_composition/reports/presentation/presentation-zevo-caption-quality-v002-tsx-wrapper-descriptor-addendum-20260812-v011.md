# ZEVO字幕品質v002 TSX wrapper descriptor 追補 v011

- 日付: 2026-08-12
- 親契約: `presentation-zevo-caption-quality-v002-contract-design-20260810-v001.md`
- 完全実装設計: `presentation-zevo-caption-quality-v002-complete-implementation-design-20260810-v001.md`
- 累積追補: v002〜v010
- 変更対象: F `.ts` moduleの固定TSX相互運用wrapper、全formal jobの契約来歴、対応proof
- 通信・費用・正式描画: 0

## 1. 実現性調査

固定Nodeと登録済み固定TSX CLIから物理`.mjs` importerを起動し、F `.ts` moduleをimportした。判定には`--eval`経由のCJS出力形を使わず、`Object.keys`、`Object.getOwnPropertyNames`、`Object.getOwnPropertySymbols`、`Object.getOwnPropertyDescriptors`の実測を使った。

source authored named exportは6件exact、runtime namespaceはnamed 6件と`default`一件exactだった。`default` wrapperの列挙keyは同じ6件で、各propertyはgetter、setterなし、enumerable=true、configurable=falseだった。各getterの返却値は対応するsource authored named exportと`===`で一致した。wrapperにはさらに非列挙の`__esModule`一件があり、descriptorはenumerable=false、configurable=false、writable=false、value=trueだった。symbolは0件だった。

v009/v010が固定したaccessor 0件・追加data 0件はこの現物と非両立である。別実装・参照ずれは観測されず、契約のdescriptor指定だけを現物へ一致させれば17 path内で閉じる。

## 2. F wrapper descriptorのexact契約

source authored named export集合はv010の6件から変更しない。

1. `buildPresentationZevoCaptionQualityV002OutputRequestV001`
2. `decodePresentationZevoCaptionQualityV002ProofJobV001`
3. `derivePresentationZevoCaptionQualityV002ObservedFadeFrameCountV001`
4. `executePresentationZevoCaptionQualityV002ProofJobV001`
5. `readPresentationZevoCaptionQualityV002FormalCapabilitiesV001`
6. `validatePresentationZevoCaptionQualityV002ProofJobV001`

固定TSX環境のruntime namespaceは上記6 named exportと`default`の7 enumerable key exactとする。`default` wrapperは次を全て満たす。

- `Object.getOwnPropertyNames(wrapper).sort()`は、上記6名と`__esModule`のexact 7件である。
- `Object.keys(wrapper).sort()`は上記6名exactである。
- 上記6 propertyは全てgetterで、setter 0件、enumerable=true、configurable=false、data value/writableを持たない。
- 各getterをwrapperをreceiverとして呼んだ返却値が、対応する`namespace[name]`と`===`で一致する。
- `__esModule`はdata property一件で、enumerable=false、configurable=false、writable=false、value=trueである。
- own symbolは0件である。
- 8件目のown property、named propertyのdata化、setter追加、descriptor flag差、getter返却参照差、`__esModule`値差を全て不一致とする。

getterを一般に許可する契約ではない。上記のfixed descriptor形だけを許可する。

## 3. toolchain束縛と検査方法

本descriptor形の保証は、proof runtime profileが束縛する固定TSX実体pathとSHA-256 `5c916fa6ecad44aedbb01ca5815536d00ea07de6b73eeb9443d317326b0218d8`に限定する。

- TSX実体の更新・差替え時は、runtime binding照合後、物理`.mjs` importerから§2の全descriptorを再実測する。
- `--eval`経由のCJS出力形をmodule surface判定根拠に使わない。
- descriptor形が変わった場合、期待値を黙って更新せず、正式attempt前に停止して報告する。
- source authored export集合、runtime namespace、wrapper own property、descriptor、参照同一性を別層で全件照合する。

これはv006のtoolchain来歴・再製造時再照合規律と同じ分離である。

## 4. bindingと数量

本書を全formal jobへ一件加える。roleは`caption-quality-tsx-wrapper-descriptor-addendum`、pathは本書path、SHAは承認時実測値を使う。

| job | v010 | v011 | exact構成 |
|---|---:|---:|---|
| source | 9 | 10 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、本書 |
| B5 | 9 | 10 | parent、complete design、v002、v004、v006、v007、v008、v009、v010、本書 |
| B6 | 10 | 11 | parent、complete design、v002、v004、v005、v006、v007、v008、v009、v010、本書 |
| selection | 11 | 12 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、本書 |
| proof | 11 | 12 | parent、complete design、v002、v003、v004、v005、v006、v007、v008、v009、v010、本書 |

implementation binding source/B5/B6/selection/proof=36/11/19/41/51、path 17、code 49、検査ID 46、proof総数489、全owner件数は増減0とする。ZCQ044 35件の証明内容を変更しない。

## 5. proof exact置換

次の7件だけを一対一置換する。表外proofを失効しない。

| 失効ID | 置換ID |
|---|---|
| `V10-ZCQ001-01` | `V11-ZCQ001-01` |
| `V10-ZCQ007-01` | `V11-ZCQ007-01` |
| `V10-ZCQ018-01` | `V11-ZCQ018-01` |
| `V10-ZCQ018-02` | `V11-ZCQ018-02` |
| `V10-ZCQ027-01` | `V11-ZCQ027-01` |
| `V10-ZCQ042-01` | `V11-ZCQ042-01` |
| `V10-ZCQ042-02` | `V11-ZCQ042-02` |

期待集合はexact `(v010適用後489件 − 上記7件) ∪ §6の7件`とする。期待、test source宣言、TAP observed、TAP passedを489件へexact一致させる。

## 6. V11-PROOF-ITEMS-BEGIN

- V11-ZCQ001-01 | source implementation 36件とapproved contract 10件のexact role/path/SHA集合を検査し、本書を含むsource構成へ一致する
- V11-ZCQ007-01 | B5/B6 implementation 11/19件を維持し、approved contractが本書を含む10/11件へexact一致する
- V11-ZCQ018-01 | selection implementation 41件とapproved contract 12件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V11-ZCQ018-02 | selection approved contract 12件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V11-ZCQ027-01 | selection approved contract 12件とatomic helper 3 implementation bindingを公開直前まで照合する
- V11-ZCQ042-01 | proof implementation 51件とapproved contract 12件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V11-ZCQ042-02 | 物理.mjs importerから固定TSX実体でFを読み、source 6 export、namespace 7 key、wrapper own property exact 7件、named getter 6件のdescriptorと同一参照、readonly __esModule、symbol 0件を全実測する。formal CLIと読み取り入口が同じfreeze済み19-key objectを共有し、変更操作が実失敗すること、S/A/L/P/Rの遡及照合5/5も確認する

## 7. V11-PROOF-ITEMS-END

## 8. 実現性調査の標準深度

`.ts`と相互運用wrapperを持つpathのmodule surface照合は、key集合と参照同一性だけでclosedと判定しない。own property全件について、getter、setter、enumerable、configurable、writable、data value、getter返却参照、symbolを実測し、承認済みexact表へ一致した場合だけclosedとする。

値の供給者とconsumerがmodule境界を越える場合のexport経路照合、物理import時のI/O・process・stdout/stderr 0件照合も従来どおり併用する。

## 9. 保証境界と停止条件

- v009/v010は承認済み履歴として不変保持し、本書がwrapper descriptor条件だけをforward-onlyで置換する。
- formal capability object、19関数、formal CLIのprivate直接渡し、testの一件置換方式を変更しない。
- 18 path目、数量差、別参照、追加export、fallback、計算複製、新code、ZCQ044証明内容変更が必要なら停止する。
- 不合格1件で同attempt内に直さない。API通信、countTokens、generateContent、費用、正式描画、stable tagを行わない。

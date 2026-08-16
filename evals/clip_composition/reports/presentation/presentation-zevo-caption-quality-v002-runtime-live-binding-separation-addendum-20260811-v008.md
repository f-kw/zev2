# ZEVO字幕品質v002 runtime製造来歴・live束縛分離 追補 v008

- 日付: 2026-08-11 JST
- 状態: kawafmm条件付き裁定との完全一致時に承認発効する正本候補
- 対象: S局所gateのatomic native runtime証明、formal jobの承認契約binding
- 新規path: 0件
- 既存変更path: S production 1件（approved contract binding定数への本書1行追加だけ）、S test 1件（再build proof置換と契約件数pin）。他工程のformal job binding一覧は各工程実装時に同じ正本値へ更新する
- API通信・countTokens・generateContent・費用支出・正式描画・stable tag: 0件

## 0. 結論

atomic native runtimeの「製造時に同一basenameを独立二回buildしてbyte同一であること」と「現在実体が承認済みruntimeであること」を別の証明層へ分ける。

再build再現性は追補v006の製造・機能gate記録が所有し、S局所gateの毎attemptでは再buildしない。S局所gateは、現在runtimeのSHA一致、`LC_UUID` exact 1件、親環境0件対照の終了25・stdout/stderr 0 byteという安価で決定的なlive束縛3点だけを所有する。改竄・差替えはlive SHA照合が検出し、製造再現性は製造記録が証明するため、防御の緩和ではない。

再buildは、toolchainまたはsourceの変更によりruntimeを再製造するときだけ実行する。その前に追補v006 §3のtoolchain実体をpath・SHA・versionで照合し、固定値差またはbyte不一致があれば黙って受理せず停止する。

## 1. 正本と適用順

本書以外の親契約、完全実装設計v001、累積追補v002、実値配線追補v003、atomic公開・B6所有追補v004、B6 credential追補v005、atomic runtime追補v006、source最終package validator追補v007は不変である。本書は次だけを置換・追加する。

1. S局所gateのruntime再build proofをlive束縛3点proofへ一対一置換する。
2. 全formal jobのapproved contract bindingへ本書を一件加える。
3. 外部tool補助処理の観測順序を固定する。
4. runtime再build証明の所有と再実行条件を明文化する。

適用順はparent→complete design→v002→v003→v004→v005→v006→v007→本書とする。本書の実測SHA-256をDECISIONSへ記録し、role `caption-quality-runtime-live-binding-separation-addendum`として§5のformal jobへ束縛する。

## 2. 実現性調査

### 2.1 現物照合

| 観測対象 | 現物 | 判定 |
|---|---|---|
| 正式runtime path #17 | `evals/clip_composition/presentation_atomic_directory_publish_v001-darwin-arm64` | 実在。SHA-256は`ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3` |
| runtime製造再現性 | 追補v006 §4条件1と版付き製造・機能gate記録 | 既に製造時性質として所有済み |
| `LC_UUID`構造読取 | `/usr/bin/otool -l`のload command列 | 現runtimeでexact 1件を決定的に観測可能 |
| 親環境0件対照 | runtimeへ`source target`を渡し、`env={}`で直接起動 | C source所有の終了25・stdout/stderr 0 byteを決定的に観測可能 |
| S testの再build補助 | `observeV6RuntimeCompatibility` | build結果保存前に出力fileを読み、出力欠落でtool終了code・stderr観測を失う構造。S gateから除去できる |
| S production | runtime path/SHAをimplementation bindingとしてlive再読 | live束縛の正本は維持される |

### 2.2 値・path・逆影響

- path上限17件は不変で、18 path目を作らない。
- implementation binding件数はsource/B5/B6/selection/proofの順に36/11/19/41/51で増減0である。
- code集合49件、検査ID46件、proof item489件、owner件数は増減0である。
- ZCQ004三点証明4件、ZCQ005の7分類、版付きpure validator共有、production 3箇所の同一関数参照へ触れない。
- productionの計算、契約schema、fixture値、status、違反code、終了code、正式成果物byteを変えない。

## 3. S局所gateのlive runtime証明

`V6-ZCQ001-02`を失効し、`V8-ZCQ001-02`へ一対一置換する。新proofは次の3点を一つのAND条件で実観測する。

| # | live束縛 | exact観測 |
|---:|---|---|
| 1 | 現在runtime byte | path #17を実読し、SHA-256が`ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3`へ一致 |
| 2 | Mach-O構造 | 現在runtimeへ`/usr/bin/otool -l`を一回適用し、終了0・`LC_UUID` exact 1件 |
| 3 | C source到達 | 親環境entry 0件、fd 3/4未供給、引数`source target`で直接起動し、signalなし、終了25、stdout 0 byte、stderr 0 byte |

S gateではcompiler、linker、SDK headerを読まず、runtimeを再buildしない。正式runtimeのpath/SHA live再読、終了前再読、implementation binding検査は従来どおり維持する。

## 4. 再build証明の所有と観測順序

### 4.1 所有と再実行条件

- 同一basename独立二回buildのbyte同一は、追補v006のruntime製造・機能gate記録が所有する。
- 再build証明を再実行する条件は、toolchain変更、source変更、またはruntime再製造のいずれかである。
- 再実行前に追補v006 §3のcompiler、linker、SDK、OS、sourceのpath・SHA・versionを照合する。
- 固定値差、build失敗、二runtimeのbyte差、正式期待SHA差を黙って受理、期待値更新、fallbackせず停止する。

### 4.2 外部tool補助処理の標準観測順序

test、製造、診断を問わず、compiler等の外部toolを起動する補助処理は次の順を守る。

1. tool processの終了を待つ。
2. 終了code、signal、stdout byte数、stderr byte数を構造化recordへ保存する。
3. その後にだけ、生成を期待する出力fileの存在、type、内容、SHAを読む。

出力fileの不存在・読取失敗により、tool結果の保存前に例外終了してはならない。診断用にstderrが必要な場合も生stderrを正式成果物へ混ぜず、秘密を含まないことを確認した版付き診断記録だけに扱う。

### 4.3 非阻害診断

S新attempt前に、追補v006と同じ固定compile入力・同じbasenameで隔離A/Bを各一回buildする診断を一度だけ行う。§4.2の順序で両tool結果を保存してから出力を読む。

- 両方成功しbyte同一なら、attempt-0004の隔離B欠落は一過性だった事実として記録する。
- 一件でも失敗した場合は、保存したcompiler終了codeとstderrから帰属を確定し、runtime再製造工事の在庫へ送る。
- どちらの結果でもS gateを阻害しない。S gateの合否は§3だけで決める。
- 診断結果はreports配下の版付き新規文書へ保存し、production、test、正式成果物へ混ぜない。

## 5. approved contract bindingのexact更新

本書を全formal jobへ一件加える。v003をsource/B5/B6へ、v005をsource/B5へ加えない既存分離を維持する。roleは狭義昇順で保存する。

| formal job | v007後 | v008後 | exact contract構成 |
|---|---:|---:|---|
| source | 6 | 7 | parent、complete design、v002、v004、v006、v007、本書 |
| B5 | 6 | 7 | parent、complete design、v002、v004、v006、v007、本書 |
| B6 | 7 | 8 | parent、complete design、v002、v004、v005、v006、v007、本書 |
| selection | 8 | 9 | parent、complete design、v002、v003、v004、v005、v006、v007、本書 |
| proof | 8 | 9 | parent、complete design、v002、v003、v004、v005、v006、v007、本書 |

各formal jobは本書role/path/SHAの不足・余分・不一致をdynamic import前の既存job invalid ownerへ写す。implementation binding件数36/11/19/41/51は増減0である。

## 6. proof itemのexact置換

code49件、検査ID46件、proof総数489件、owner件数は不変である。次の7件だけを失効し、同ownerのV8 proof 7件へ一対一置換する。

### 6.1 exact失効・置換表

| 失効ID | 置換ID | 理由 |
|---|---|---|
| `V7-ZCQ001-01` | `V8-ZCQ001-01` | source contract 6件を7件へ改訂 |
| `V6-ZCQ001-02` | `V8-ZCQ001-02` | 毎attempt再buildをlive runtime 3点証明へ置換 |
| `V7-ZCQ007-01` | `V8-ZCQ007-01` | B5/B6 contract 6/7件を7/8件へ改訂 |
| `V7-ZCQ018-01` | `V8-ZCQ018-01` | selection contract 8件を9件へ改訂 |
| `V7-ZCQ018-02` | `V8-ZCQ018-02` | selection contract不正拒否を9件へ改訂 |
| `V7-ZCQ027-01` | `V8-ZCQ027-01` | selection公開前照合を9件へ改訂 |
| `V7-ZCQ042-01` | `V8-ZCQ042-01` | proof contract 8件を9件へ改訂 |

### 6.2 V8-PROOF-ITEMS-BEGIN

- V8-ZCQ001-01 | source implementation 36件とapproved contract 7件のexact role/path/SHA集合を検査し、approved contractがparent、complete design、v002、v004、v006、v007、本書へ一致する
- V8-ZCQ001-02 | path #17の現在runtime SHAがv006登録値ba5067dd933ae9b1213ab39236bf07c7e87513afbb384643347cefe0a75084b3へbyte一致し、LC_UUID exact 1件、親環境0件対照がsignalなし・終了25・stdout/stderr 0 byteであることを実観測する
- V8-ZCQ007-01 | B5 approved contractがparent、complete design、v002、v004、v006、v007、本書の7件、B6がそれらとv005の8件へexact一致し、implementation 11/19件を維持する
- V8-ZCQ018-01 | selection implementation 41件とapproved contract 9件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する
- V8-ZCQ018-02 | selection approved contract 9件の不足・余分・本書SHA不一致をdynamic import前のjob-read/CUE_SELECTION_JOB_INVALIDで拒否する
- V8-ZCQ027-01 | selection approved contract 9件とatomic helper 3 implementation bindingを公開直前まで照合する
- V8-ZCQ042-01 | proof implementation 51件とapproved contract 9件のexact role/path/SHA集合を前読・import後・公開直前の三時点で実再読する

### 6.3 V8-PROOF-ITEMS-END

期待集合はexact `(v007適用後489件 − §6.1の失効7件) ∪ §6.2のV8 7件`とする。期待、test source宣言、TAP observed、TAP passedを各489件へexact一致させる。各ID合計はZCQ001=22、ZCQ007=17、ZCQ018=30、ZCQ027=34、ZCQ042=36で不変である。表外proofを失効せず、特にV7-ZCQ004-01〜04とZCQ005既存13件へ触れない。

## 7. 実装・実行順

本書がkawafmm裁定1〜5へ完全一致し、新たな契約判断0件であることを確認した場合だけ次へ進む。

1. 本書SHAをDECISIONSへ記録する。
2. §4.3の隔離二回build診断を一度だけ行い、reports配下へ保存する。
3. S production 1 pathのapproved contract binding定数へ本書を一件加える。計算・status・codeは変えない。S test 1 pathでV8 derivation、contract件数pin、live runtime 3点proofを実装する。ZCQ004・ZCQ005のproof byteへ触れない。
4. 直接起動時S 6件・import時S登録0件の両側自己検査を行う。
5. S局所6件を新attemptとして頭から一回実行し、TAP全文を監視root外の版付きpathへ保存する。
6. 6/6の場合だけA→L→P→R→F→Uへ既承認順で進む。
7. Uまで全合格・契約判断0件の場合だけ、正式46件、直接影響回帰、green 287/287、baseline 86/203 exact、既存5 treeとA-v002記録対象treeの不変照合、完了報告へ進む。

本再計画後のS新attemptで検査設営起因の不合格が出た場合は、個別修正、設営見直し、再計画案を提示せず、全証拠を整理してS工程を停止し人間へ戻す。production起因・契約起因は三分法で報告する。不合格を同attemptで直さない。

API通信、countTokens、generateContent、費用支出、正式描画、stable tagは本書の範囲外である。

## 8. 完全一致監査

| kawafmm裁定 | 本書 | 判定 |
|---|---|---|
| 1. 再build証明を製造時へ分離し、Sはlive束縛3点だけ所有 | §0・§3・§4.1 | closed |
| 2. tool終了code・stderr byte先行保存後に出力を読む | §4.2〜4.3 | closed |
| 3. v007中核proofを不変維持 | §2.2・§6.3・§7 | closed |
| 4. 7 proofのexact置換、contract 7/7/8/9/9、各件数増減0 | §5〜§6 | closed |
| 5. 非阻害の隔離二回build診断を一回だけ実施 | §4.3・§7 | closed |

再buildの毎attempt実行、proof総数・owner件数の変更、production計算変更、18 path目、新たな契約判断は0件である。よって本書の実測SHAをDECISIONSへ記録した時点で、kawafmmの条件付き承認が発効する。

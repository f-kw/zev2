# ZEVO字幕品質v002 v005実装 atomic runtime preflight停止報告 v001

- 日付: 2026-08-11 JST
- 対象: 追補v005承認後のatomic公開実装前ゲート
- 結論: 固定compile条件で製造されたnative実行体を現行macOS loaderが起動前拒否するため、S工程開始前に停止
- 外部通信: 0回
- 費用: US$0
- 正式46件・API通信・描画: 未実施

## 1. 30秒版

承認済み追補v005と停止時のatomic部分実装3件は、開始時SHA・実行形式・権限まで一致した。固定compile条件を同じ実行体名で隔離再現すると、正式実行体へbyte同一になった。

しかし固定条件はlinkerへ`-Wl,-no_uuid`を渡す。現行macOS 26.5のloaderは`LC_UUID`を持たないMach-Oを`main`到達前に`SIGABRT`で拒否した。したがってAPFS正常公開・late collision検査へ入れず、v004 §10第3手は不成立である。

これはC sourceのrename処理、JavaScript共用入口、fixtureの合否ではなく、承認済み固定compile条件と現在のruntime要件の衝突である。compile条件または実行体製造規則の契約改訂が必要なため、同attemptで直さず停止した。

## 2. 開始時照合

| 対象 | 期待SHA-256 | 実測 | 判定 |
|---|---|---|---|
| 追補v005 | `573b705f80935ba0015a2f509371f17911d6aa0ea2fd7130b097ed98262b07dd` | 一致 | passed |
| atomic JavaScript入口 | `7dac5ada527c2f73b08c385a119e921c1e3777054b99c5679175a1b8b00e41c6` | 一致 | passed |
| native source | `6c237ceac499a83db74324165d630e14857a86165267cdbbc88c46b92c01150c` | 一致 | passed |
| native runtime | `15f73dcf286ebed88300bb7ad8366f2b31631288816ceb4c9edd3f509d71e02c` | 一致 | passed |
| native runtime形式 | Mach-O 64-bit arm64、mode 0555 | 一致 | passed |

3 pathは追記・削除・再作成していない。S/A production・test、L/P/R/F/Uも変更していない。

## 3. 観測

### 3.1 隔離再build

承認済み固定commandを使い、隔離先でも正式runtimeと同じbasename `presentation_atomic_directory_publish_v001-darwin-arm64`へ二回製造した。

- 隔離build AとB: byte同一
- 隔離build Aと正式runtime: byte同一
- source、compiler、SDK、flags、basenameを含む固定入力の再現性: 成立

最初の診断commandでは隔離出力名を`rebuilt`へ変えたため、linker署名識別子が変わりbyte不一致となった。この観測は正式固定入力の不一致を示さない。出力basenameもcompiler入力の一部として同一化した再検査で訂正し、元の観測記録は上書きせず本節へ残す。

### 3.2 native起動

JavaScript共用入口を通した正常公開では、prepareは成立したがnative processが`main`到達前にsignal終了し、共用入口はexact次へ写した。

```text
status=failed
reason=helper-execution-failed
toolExitCode=null
```

固定runtimeを親環境0件で直接起動した対照では、終了codeではなく`SIGABRT`となった。loaderの構造化診断は`LC_UUID` load command不存在を原因として示した。C sourceが定める不正引数終了25へ到達していないため、C処理より前のruntime loader拒否である。

### 3.3 改訂候補の読み取り比較

正式pathは変更せず、隔離一時領域だけで`-Wl,-no_uuid`を除いた候補を二回製造した。

| 観測 | 結果 |
|---|---|
| 同じbasenameの候補2体 | byte同一 |
| Mach-O `LC_UUID` | exact 1件 |
| 親環境0件・fd未供給・引数2件での対照 | C source所有の終了25へ到達 |

この観測は「現行linkerの既定UUID生成を使えば、同じ固定入力で再現可能かつ現行loaderを通過する」ことの診断証拠である。正式compile規則として採用した事実ではなく、正式runtimeも置換していない。

## 4. 三分法

| 区分 | 判定 | 根拠 |
|---|---|---|
| production実装が契約へ届かない | 単独原因ではない | 現在のnative sourceとruntimeは、承認済み`-Wl,-no_uuid`固定commandをbyte同一で再現する |
| fixture・検査設営 | 該当しない | 正式basenameを含む固定入力で再build一致後も、同じruntimeがOS loaderに起動前拒否された |
| 契約・実行環境の両立不成立 | **該当** | 承認済みcompile条件はUUID load commandを禁止する一方、現在のmacOS loaderはUUID無しMach-Oを実行しない。APFS成功検査を同時に満たせない |

帰属は「固定native runtime製造契約の現行macOS不適合」である。atomic rename計算、B6 credential code、S/A/L/P/R/F/Uの欠陥は未観測であり、合否も未確定である。

## 5. 停止位置

| 工程 | 状態 |
|---|---|
| 追補v005承認記録 | 完了 |
| 追補v005・atomic 3 path開始SHA照合 | 完了 |
| 隔離再build byte一致 | 完了 |
| helper protocol・APFS成功 | **不合格。loader起動前拒否** |
| late collision実発火 | 未実施 |
| S局所ゲート | 未開始 |
| A局所ゲート | 未開始 |
| L→P→R→F→U | 未実装 |
| 正式46件 | 承認外・未実施 |
| API通信・描画 | 承認外・未実施 |

## 6. 修正方向の比較

| 案 | 内容 | 決定性 | 契約影響 | 判定 |
|---|---|---|---|---|
| A | 固定compile入力から`-Wl,-no_uuid`だけを除き、`LC_UUID` exact 1件・同basename二回build byte一致・runtime起動・APFS成功/late collisionを正式条件にする | 隔離実測ではbyte同一 | compile条件とruntime SHAを版付き改訂。旧runtime SHAは本停止証拠として保持 | **推奨** |
| B | UUIDを別処理で後付けする | 新しいbinary加工正本と検査が必要 | path/計算/来歴が増え、17 path限定と単一製造正本へ不利 | 非推奨 |
| C | UUID無しruntimeを許すOSまたは旧環境へ固定する | 現行native環境で実行不能 | 現在の正式実行環境規律と衝突 | 不採用 |

案Aでも、現行path #17を無断置換してはならない。最小追補で、compile flag、`LC_UUID`検査、旧runtime証拠保持、同じpathへの新版runtime製造、implementation binding SHA更新、APFS機能検査の再開点を固定した後に別承認が必要である。

## 7. 事実・推測・未確認

### 事実

- 固定3 pathと追補v005は開始時byte一致した。
- 正式basenameを含む固定commandの隔離buildは正式runtimeとbyte同一だった。
- UUID無しruntimeは現行loaderにより`main`前にsignal終了した。
- UUID既定生成候補は二回buildでbyte同一、UUID load command 1件、C source終了25へ到達した。
- production/testの実装変更、正式検査、API通信、描画は0件である。

### 推測

- なし。修正案Aの採用可否は人間裁定前である。

### 未確認

- UUID付き正式候補による共用入口のAPFS正常公開とlate collision。
- S→A→L→P→R→F→Uの実装・局所ゲート結果。
- 49 code・489 proofの実装閉包。

## 8. 次の裁定依頼

推奨案Aを版付き最小追補として起草する承認が必要である。追補承認までは、atomic 3 path、S/A 4 path、既存成果物、stable tagを変更せず停止する。

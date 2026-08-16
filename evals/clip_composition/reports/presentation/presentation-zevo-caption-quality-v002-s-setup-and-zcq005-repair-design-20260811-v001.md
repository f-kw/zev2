# ZEVO字幕品質v002 S設営全体見直し・ZCQ005限定修正設計 v001

- 日付: 2026-08-11
- 作業種別: 実現性調査・修正設計（未実装）
- 対象: S工程の6検査・50 proof item・7 codeとZCQ005のatomic公開準備
- 外部通信: 0回
- 費用: US$0
- 結論: **ZCQ004の契約上の実枝は、現行pure入口と安定した入力からは到達不能である。新たな契約判断が必要なため、production/testを変更せず本書の提示で停止する。**

## 1. 実現性調査

### 1.1 照合した現物

| 実体 | 役割 | SHA-256 | 主な現物位置 |
| --- | --- | --- | --- |
| `presentation_output_caption_cue_source_package_v001.mjs` | source job検査、意味packageから可視projectionと再構築mapを作るproduction正本 | `c1ac456b3d72bdddb97551ceb9adec8bb92bd6d42c50f2bd4e9dcb16444b7fa3` | 意味envelope 343〜349行、最終package検査354〜383行、builder 385〜509行 |
| `presentation_output_caption_cue_source_package_v001.test.mjs` | S局所6検査と50 proofの現行実体 | `7d52425edd4ba4c2689fd97db4cb8a4e6ba4761ed3d600f2f2963155ef8dfcf5` | proof宣言105〜113行、ZCQ004 1070〜1091行、ZCQ005 1093〜1347行 |
| `presentation_atomic_directory_publish_v001.mjs` | no-replace公開の共通production正本 | `7dac5ada527c2f73b08c385a119e921c1e3777054b99c5679175a1b8b00e41c6` | 公開準傔294〜417行 |
| 完全実装設計v001 | Sのstatus/stage/codeとproof ownerの契約 | `44fb6199a80663657bf056df0118def3db750fe65813d86e9d106cdc4f42d6e4` | 拒否表377〜388行、code owner 1525〜1531行、1577〜1583行 |
| atomic公開追補v004 | staging前提とhelper失敗の所有分類 | `39e7c9b9005fb8ec762c19c0e6fde86acb398f1e99c75dd5d7100eabf452eade` | 分類表235〜238行、V4-ZCQ005 proof 435〜438行 |
| S attempt-0003停止報告 | 今回の4/6実測と三分法 | `16442f89918c53899e5fb7198f06ef6b9b032ccec1513ff2097d406ead630bf1` | ZCQ004/ZCQ005実測、設営見直し要件 |

調査は作業ツリーの現物に対して行った。attempt-0003のTAPは監視root外の版付き保存先に残っており、SHA-256は`ffe86e30f04415fc0c70b404efab1a352e613a1780116150f9a6d318adeb5afc`。既存の正式成果物、stable tag、API入力は読み書きしていない。

### 1.2 三分法

| 対象 | 帰属 | 根拠 |
| --- | --- | --- |
| ZCQ004 attempt-0003 | 検査設営欠陥 | atomの値をgetterの読取回数で変化させたため、可視projection検査より前のatom全量閉包が先に不成立となった。productionの拒否順は正しい。 |
| ZCQ004の決定的実枝 | 契約判断が必要 | 現契約は可視projection不正を実枝で観測するよう求めるが、現行builderは前段で検査済みの値と固定値からprojectionを構築するため、安定入力では対象predicateを単独で落とせない。 |
| ZCQ005 attempt-0003 | production欠陥 | staging欠落の初回`lstat`が`ENOENT`となり、契約上の`source-invalid`へ写らず、外側catchの既定`helper-execution-failed`へ落ちる。 |

ZCQ005は、ゲートが初めて実枝へ到達してproductionの本物の欠陥を露出させた例である。検査体系が機能した証拠であり、ZCQ004の設営欠陥と混ぜない。

## 2. ZCQ004の実枝到達可能性

### 2.1 前段と可視projectionの支配関係

現行pure builderでは次の順にpredicateが支配する。

1. source jobのexact schema、binding、styleを検査する。
2. 意味packageの外形とcase入力のexact schemaを検査する。
3. 各captionのordinal、atom ID全量、atom本文の非空、連結文字列とcaption本文の一致、atom ID重複0件を検査する。
4. 上記3を通ったatom本文からだけ可視境界片を作る。caption IDとboundary IDはproductionが決定的に製造する。task本文とschemaは固定値、style上限は検査済みjob値のcloneである。
5. 最後のpackage validatorで可視projectionと再構築mapの両方を一括検査し、一件でも落ちると`CUE_SOURCE_PROMPT_PROJECTION_INVALID`を返す。

安定したplain dataの範囲では、可視projectionの次の条件はすべて前段またはproduction製造から導かれる。

| 可視projectionのpredicate | 成立根拠 |
| --- | --- |
| schemaとtask本文 | production固定値 |
| caption 1件以上 | job caseと意味captionの全量閉包を前段で確認 |
| caption ID非空 | productionがglobal ordinalから製造 |
| boundary 1件以上 | captionのatom ID 1件以上を前段で確認 |
| boundary ID非空 | productionがcaption/atom ordinalから製造 |
| boundary本文非空 | atom本文非空を前段で確認し、同じ値を転記 |
| style上限 | jobとresolved styleの一致を前段で確認したjob値をclone |
| path/SHA/時刻/crop/titleの非混入 | 可視projectionの構築key集合に供給経路が存在しない |

### 2.2 attempt-0003のfixtureが不正な理由

attempt-0003は、同一atomの`text`を初回と2回目は有効、3回目以降は空文字列にするgetterで故障を作った。実際には可視projection作成より前のatom全量閉包がその値を読み、`CUE_SOURCE_ATOM_CLOSURE_INVALID`で正しく拒否した。この方式は読取回数、実行順、副作用に依存し、正式故障注入の条件を満たさない。

### 2.3 代用にできない別の到達枝

意味captionの`captionId`を空にすると、現行の簡易meaning envelope検査とatom全量閉包を通過した後、最終package validatorの**再構築map側**で落とせる。しかし、これは「path/SHA/時刻または重複本文が可視projectionへ混入」というZCQ004の所有理由ではない。最終validatorがprojectionと再構築mapを一つのcodeへ写す現状を利用し、無関係な枝でcodeだけを発火させるのは証明のすり替えである。本設計は採用しない。

### 2.4 判定

**可視projectionだけを不成立にする決定的入力は、現行pure入口からは存在しない。**

したがって、実枝不成立を契約判断へ戻すという停止条件が成立した。ZCQ004の検査細工、新しいproduction入口、codeの所有変更、proofの静的証明への置換は、いずれも新たな契約判断なしには行わない。

## 3. S設営の全件一件表

### 3.1 6検査・50 proof

| 検査 | proof数 | 証明対象 | proof ID全件 |
| --- | ---: | --- | --- |
| ZCQ001 | 22 | job exact schema、runtime/binding、CLI正常系、job拒否、atomic入口、公開前再読、loader、v006 runtime再現 | `ZCQ001-P-01-13c0f4fa9b24`, `ZCQ001-P-02-eec89906405e`, `ZCQ001-P-03-850e16d958ce`, `ZCQ001-P-04-bfa4a1b9c46d`, `ZCQ001-P-05-b8ff0c3b79be`, `V4-ZCQ001-01`, `V6-ZCQ001-01`, `ZCQ001-P-08-e3cff4d98376`, `ZCQ001-P-09-e55f181b8f6a`, `ZCQ001-P-10-ec1eb56272fc`, `ZCQ001-P-11-6044e9f095e0`, `ZCQ001-P-12-80f70afeef3c`, `ZCQ001-P-13-c972c530f95a`, `ZCQ001-P-14-42330d1b09c4`, `ZCQ001-P-15-842ae1113f59`, `ZCQ001-P-16-e1304a457d97`, `ZCQ001-P-17-877c9602a746`, `ZCQ001-V2-01-38e27cb76066`, `V4-ZCQ001-02`, `ZCQ001-V2-03-5f660c8cc348`, `V4-ZCQ001-03`, `V6-ZCQ001-02` |
| ZCQ002 | 3 | 複数meaning packageの入力順、caption ID、boundary IDの決定性 | `ZCQ002-P-01-167db456a837`, `ZCQ002-P-02-4b8fe2566ede`, `ZCQ002-P-03-df11878b850b` |
| ZCQ003 | 3 | atomの一意保持、本文一致、caseとcaptionの一対一 | `ZCQ003-P-01-f194c81fac64`, `ZCQ003-P-02-8073a63752e1`, `ZCQ003-P-03-9dc4b2c72978` |
| ZCQ004 | 4 | task本文、境界片本文、style上限、ローカル文脈の非混入 | `ZCQ004-P-01-bf7a27f4d607`, `ZCQ004-P-02-37f5cbb4704b`, `ZCQ004-P-03-78319f76f785`, `ZCQ004-P-04-b7300cb7db88` |
| ZCQ005 | 13 | binding/style拒否、実行fatal、no-replace、native成功、late/pre-prepare collision、path安全性、helper分類、FD/one-shot | `ZCQ005-P-01-45440c1d3fb3`, `ZCQ005-P-02-5e698b570508`, `ZCQ005-P-03-341f8b2db3e3`, `ZCQ005-P-04-ab5e7a3ec0f1`, `ZCQ005-P-05-9046b29ea2f5`, `V4-ZCQ005-01`, `V4-ZCQ005-02`, `V4-ZCQ005-03`, `V4-ZCQ005-04`, `V4-ZCQ005-05`, `V4-ZCQ005-06`, `V4-ZCQ005-07`, `V4-ZCQ005-08` |
| ZCQ006 | 5 | 正式byteの決定性、file/canonical SHA、job来歴、stagingとpublished byte一致 | `ZCQ006-P-01-0e4db82712cf`, `ZCQ006-P-02-b7c7ba6f37b1`, `ZCQ006-P-03-e7de2476355c`, `ZCQ006-V2-01-8920d8468d0b`, `V4-ZCQ006-01` |
| 合計 | 50 | S所有全proof | 22 + 3 + 3 + 4 + 13 + 5 = 50 |

### 3.2 7 codeと最初に不成立とするpredicate

| code | owner | 決定的に作る状態 | それより前に合格させるpredicate | 最初の不成立predicate | 観測 |
| --- | --- | --- | --- | --- | --- |
| `CUE_SOURCE_JOB_INVALID` | ZCQ001 | 検査済み正常jobから1 keyだけを欠落、または承認済みimplementation SHA 1件だけを不一致 | strict JSON byte受理 | job exact/value validator | `rejected / job-read` |
| `CUE_SOURCE_INPUT_BINDING_INVALID` | ZCQ005 | 正常jobと正常上流実体に対しcanonical SHAだけ1件不一致 | job/schema、file SHA、path/role | canonical binding一致 | `rejected / input-reread` |
| `CUE_SOURCE_STYLE_INVALID` | ZCQ005 | 正常source閉包とbindingに対し、resolved styleの幅上限だけをjobと不一致 | job、case exact schema、meaning envelope | resolved styleとjob style上限の一致 | `rejected / style-resolution` |
| `CUE_SOURCE_ATOM_CLOSURE_INVALID` | ZCQ003 | case inputを1件欠落、またはatom ID全量を決定的に不成立 | job、binding、style、意味envelope | case/caption/atomの全量閉包 | `rejected / package-build` |
| `CUE_SOURCE_PROMPT_PROJECTION_INVALID` | ZCQ004 | **現行入口では作れない** | atom全量閉包まで全合格 | 可視projectionのみの不成立 | 契約判断待ち |
| `CUE_SOURCE_EXECUTION_FAILED` | ZCQ005 | 正常なentry objectのjob pathを、I/O上存在しないpathに固定 | entry exact schema | jobのstrict read I/O | `fatal / job-read` |
| `CUE_SOURCE_PUBLICATION_FAILED` | ZCQ005 | 公開直前の承認文書1件の差替え、または検査が明示作成したtarget競合 | package製造、staging保存、公開前までの全再読 | 公開前再読またはno-replace commit | `fatal / package-validation` または `root-publication` |

### 3.3 設営正本

S test内に一つだけ次の一件表を置き、全6検査が参照する設計とする。ZCQ004の契約判断が済むまで実装は開始しない。

| 欄 | 必須内容 |
| --- | --- |
| 検査所有 | ZCQ ID、proof ID、code owner |
| 入口 | 正常入力を製造する共用fixtureと実production/pure入口 |
| 前段成立 | 狙ったpredicateより前の全predicateの合格値 |
| 故障状態 | 一つだけ変えるplain dataまたは明示的filesystem状態 |
| 初回不成立 | status、stage、primary codeと対応する最初のpredicate |
| 実観測 | production返値、正式CLI終了、公開root/staging実体のいずれか |
| 非依存 | getter回数、Proxy副作用、watcher、polling、timer、test登録順、filesystemスケジュールへの依存0件 |

検査moduleの直接起動ではS 6件と全fixture helperの参照成立、B5/B6側からimportした場合はS test登録0件と共用owner入口だけの可視性を、正式attempt前の両側自己検査で必須とする。

## 4. ZCQ005 production限定修正設計

### 4.1 staging前提分類の横断監査

| staging状態 | 現productionの最初分岐 | 現状の写像 | v004契約 | 判定 |
| --- | --- | --- | --- | --- |
| 欠落 | 初回`lstat`が`ENOENT` | 外側catchの`helper-execution-failed` | `source-invalid` | **未到達、修正必要** |
| 非directory | 初回`lstat`成功後の`isDirectory()` | `source-invalid` | `source-invalid` | 到達済み |
| symlinkまたはlogical/real不一致 | `isSymbolicLink()`または`realpath`不一致 | `source-invalid` | `source-invalid` | 到達済み |
| 初回確認後のidentity/type差 | FD open後の`fstat/lstat`一致 | reason付き`source-invalid` | `source-invalid` | 到達済み |
| 検査済みimplementation bindingのshape/role/path/count/executable不正 | binding validator | `helper-invocation-invalid` | `helper-invocation-invalid` | 到達済み |
| binding検査後のbyte/identity差 | stable reread | `helper-execution-failed` | `helper-execution-failed` | 到達済み |
| `realpath/open/fstat/read/close`のI/O・権限・資源失敗 | 各OS I/O | `helper-execution-failed` | `helper-execution-failed` | 到達済み |

### 4.2 修正差分

変更対象はS production 1 pathに限定する。staging初回`lstat`のみを局所`try/catch`で受け、`ENOENT`の場合だけは`source-invalid`を返す。その他の例外は再throwし、外側catchによる`helper-execution-failed`を維持する。

これにより次を変えない。

- 非directory、symlink、identity/type差の既存`source-invalid`。
- verified bindingのshape不正を所有する`helper-invocation-invalid`。
- 本来のI/O・権限・資源・helper実行失敗を所有する`helper-execution-failed`。
- 検査期待、契約、status、CLI stage、code数、proof数、正式成果物。

### 4.3 限定修正後の決定的自己検査

ZCQ004の契約判断後に実装を再開する場合、ZCQ005は少なくとも次を別行で実発火させる。

1. staging欠落 → `source-invalid`。
2. staging非directory → `source-invalid`。
3. staging symlink/logical-real差 → `source-invalid`。
4. stagingのFD open前後identity/type差 → `source-invalid`。
5. verified binding shape不正 → `helper-invocation-invalid`。
6. verified binding byte差 → `helper-execution-failed`。
7. 通常I/O・helper実行失敗 → `helper-execution-failed`。

各行は、それより前のpredicateが成立した値とhelper呼出し回数を同時に記録する。欠落だけを直して兄弟分類を未観測のまま済ませない。

## 5. 契約判断が必要な一点

ZCQ004には次のいずれかの判断が必要である。本書は選択しない。

| 選択肢 | 意味 | 影響 |
| --- | --- | --- |
| A. codeを到達不能なproduction invariantとし、実枝発火ではなく支配関係と可視byte正例で証明する | 現行builder構造と一致 | 49 codeの全実発火要求、proof ownerの契約改訂が必要 |
| B. 可視projection validatorを独立pure入口として持ち、不正projectionを直接渡して実枝を証明する | codeの意味と実発火を両立可能 | production export/実装設計の契約改訂が必要。test専用分岐は禁止 |
| C. builderの中間データ供給を改訂し、検査済み前段からも可視projection不正が生じ得る契約にする | 実枝は作れる | 現在の「検査済み値だけでprojection製造」を弱めるため非推奨 |
| D. codeを削除または再構築map不正も所有する別意味に改める | 現状の実装へ合わせられる | 49 code集合と所有契約の明示改訂が必要 |

到達性だけのために品質防御を弱めないため、設計上の第一候補はAまたはBである。どちらを採用するかは、49 code全実発火とproduction APIのどちらを優先するかという契約判断である。

## 6. 停止と未実施

- production変更: 0件
- test/fixture/期待値変更: 0件
- 新しいS attempt: 0回
- A/L/P/R/F/U: 未着手
- 正式46件、直接影響回帰、green 287、baseline 86/203、tree照合: 未実施
- API通信、countTokens、generateContent、費用支出、正式描画、stable tag: 0件
- attempt-0001〜0003のTAP、停止報告、作業ツリーの部分実装: 上書き・削除0件

ZCQ004の契約判断を受けるまで、ZCQ005の準備済み限定修正も実装しない。判断後のS新attemptで検査設営起因の不合格が再発した場合は、個別修正も設営再見直しも行わず、S工程計画自体をkawafmmへ戻す。

## 7. 完全性チェック

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| S 6検査 | 閉包 | 6行の一件表あり |
| S 50 proof | 閉包 | ID全50件を列挙、合計50 |
| S 7 code owner | ZCQ004以外は閉包 | 7行の初回不成立predicate表あり |
| ZCQ004到達可能性 | 不成立確定 | 前段predicateから可視projectionの全predicateが導かれる |
| ZCQ005兄弟分類 | 閉包 | 欠落・非directory・symbolic link・identity/type・binding・I/Oを全行監査 |
| 実装path | 固定可能 | ZCQ005はS production 1 path、S設営は既存S test 1 pathの想定。ただしZCQ004判断で変わり得る |
| 既存成果物・stable tag | 不干渉 | 読み書き0件 |
| 新たな契約判断 | **1件あり** | ZCQ004の証明方式またはproduction入口の所有 |

## 8. 判断依頼

`CUE_SOURCE_PROMPT_PROJECTION_INVALID`について、上記A〜Dのいずれにするかをkawafmmへ戻す。現行の「可視projection不正の実枝発火」と「検査済み値からだけprojectionを作る」を同時に満たす決定的fixtureは作れない。

## 9. Errata（2026-08-11）

本書§1.1のattempt-0003 TAP SHA-256に誤記がある。誤記文字列は履歴として上書きせず残す。実fileを2026-08-11に再計測した正値は`ffe86e30f4e0dea9f10f76c03004458abcb4cad51613387aa73907c7069e8f39`である。attempt-0003停止報告の記載値はこの正値と一致し、誤記側は本書§1.1だけである。

# fatal観測性 v002 正式検査前監査 停止報告 v001

- 日付: 2026-08-07
- 対象設計: `presentation-fatal-observability-v002-complete-implementation-design-draft-20260807-v001.md`
- 対象設計SHA-256: `945b3337b90fde6969963a4dc051778b3aaf015be90e57193b97bd2d63dc7369`
- 承認済み追補: `presentation-fatal-observability-v002-implementation-feasibility-stop-report-20260807-v001.md` §4の10点
- 結果: **新たな現物差を正式81件の実行前に検出したため、同attemptで直さず停止**

## 1. 結論

承認済みの18 path内へfatal観測性v002を実装し、正式81件を流す直前にproductionと検査の逆影響監査を行った。その監査で、独立したproduction側の不成立を6群、検査証明の不足を1群確認した。

特に、意味情報パッケージの正常公開が未定義処理の呼び出しで必ず失敗する点と、timelineの既存の検査済み拒否がfatalへ変わる点は、承認設計が明示的に不変とした成功経路・status・終了codeを破る。したがって、新しい正式attemptを開始できる状態ではない。

承認条件「新たな現物差では同attempt内に直さず停止」に従い、正式81件、直接影響130件、green 287件、baseline 181件、5 tree最終照合、commit Aは実行していない。途中実装は作業ツリーへ保持し、修正・commitは行っていない。

## 2. 正式検査前に確認した事実

- 正式attempt予定先 `evals/clip_composition/reports/presentation/test-runs/20260807-fatal-observability-v002/attempt-0001/` は未作成である。
- 正式81件の実行数は0件である。TAPとstderrも未生成である。
- `git diff --check`は合格した。
- 対象のJavaScript production/test 9 fileは固定Nodeによる構文検査に合格した。
- 外部通信は0回、費用はUS$0である。
- 正式成果物を生成・変更・削除していない。

## 3. production側の現物差

### 3.1 独立した停止原因6群

| 群 | 重要度 | 現物位置 | 観測事実 | 契約・処理への影響 |
| --- | --- | --- | --- | --- |
| A | P0 | `run_presentation_meaning_information_package_job_v001.mjs:1146` | 正常package公開が、このfile内に定義もimportもない`publishOneFileRoot`を呼ぶ。参照は1件、定義は0件 | 正常公開が`ReferenceError`となり、成功ではなく`MEANING_PUBLICATION_FAILED`へ落ちる。正常経路と終了0が成立しない |
| B | P1 | `presentation_timeline_composition_decision_v001.mjs:836-846,859-869,897-909` | source identity、媒体、残存発話の読取を包むcatchが、I/O失敗だけでなく期待SHA不一致・JSON不成立・canonical不一致も一律fatalへ包む | 外側の既存mapping（同file `1042-1055`）へ届かず、従来の`SOURCE_IDENTITY_INVALID` / `SOURCE_MEDIA_BINDING_MISMATCH`による検査済み拒否がfatal・終了2へ変わる |
| C | P1 | `render_presentation_v002.mjs:142-153,1271-1280,1954-1981,2004-2015` | 子processの生stderr/stdoutを例外messageへ連結し、Bufferも親結果へ保持する。後段はmessageを失敗結果とCLI stderrへ出せる | 「親へは閉語彙だけを渡す」「生message・stdout・stderr・本文・secretを正式記録へ残さない」を満たさない |
| D | P1 | `render_presentation_v002.mjs:448-455,732-755,1494-1547` | 描画後QCのframe数取得、透明画像生成、frame抽出、画像差分は内部工程を指定せず、既定の`runner-bootstrap`になる。反実仮想合成は初回描画用の`overlay-render`を再利用する | 本来`post-render-qc`で起きた失敗が別工程として記録され、13段階の原因所在が誤る |
| E | P1 | `presentation_fatal_observation_v002.mjs:220-243`とF04/F08/F11の呼出箇所 | 共通selectorは、呼出側自身が渡した許可fieldと束縛候補を照合するだけである。3境界には固定表外のfield名または既定`tracked-input`を自分で許可してtarget化する経路がある | 「targetFileは設計で固定した検証済み束縛だけ。不明はnull」という保証が共通入口で閉じず、表外参照を正式観測へ混入できる |
| F | P2 | `run_presentation_meaning_information_package_job_v001.mjs:334-359` | failure report用staging root作成の全例外を`REPORT_TARGET_INVALID`へ分類する。既存targetと、EACCES・EPERM・I/O失敗を分けない | 「公開前の不正target」と「target検査後の実公開失敗」という2 ownerの意味が成立しない |

### 3.2 検査証明の不足1群

`run_presentation_output_job_v001.ts:1514-1535`の必須export guardは、渡されたjobの実装束縛をそのまま候補にし、guard自身では実file読取・SHA一致の証拠を受けずに読取済みとして扱う。現行の正式mainでは先行する環境照合後に呼ばれるため、直ちに本番経路のstatusを変える独立主因とは数えない。

ただし、exportされたguard単体へ合成jobを渡すFOVO006は「検証済み束縛だけをtargetFileへ載せた」ことを証明していない。呼出順変更や再利用時にも安全であることを局所契約として閉じるか、少なくとも正式mainの検証済み観測を検査へ渡す必要がある。

## 4. 新規81件の検査網で不足していた証明

| 対象 | 現在の不足 |
| --- | --- |
| 意味情報パッケージ正常公開 | 正常公開を実経路で通す検査がなく、未定義呼び出しを検出できない |
| timelineの既存rejected | SHA不一致・JSON不成立・canonical不一致が従来のstatus/codeを保つ検査がない |
| 描画後QCの内部工程 | 子process実発火は描画工程の一例だけで、QC中の全child callと工程値を検査していない |
| targetFileの固定field表 | 共通selectorへ呼出側が渡した表だけを検査し、5境界ごとの固定許可表との一致を検査していない |
| failure report target/publication | 既存targetと書込失敗はあるが、staging root作成時のI/O失敗を実発火していない |
| output export guard | 合成jobの自己申告束縛を使っており、正式な読取・SHA照合済み観測との接続を証明していない |

このため、仮に81件を流して全件合格しても、上記のproduction不成立を見逃す可能性がある。正式attemptを始めず止める必要があった。

## 5. 帰属

### 事実

- 群A〜Fは、承認済み契約が要求した意味を実装が満たしていない、または検査がその意味を証明できない現物差である。
- 契約の矛盾は現時点で確認していない。
- 既存の違反code集合やstatusを変更して解決する必要性も現時点では確認していない。
- 群A〜Fの該当production/testは全て承認済み18 path内にある。

### 推測

- 6群は、成功公開処理の接続復元、期待不一致とI/O失敗のcatch分離、生出力を捨てた閉語彙証拠への限定、QC工程の明示、targetFile許可表と実読取証拠の固定、公開targetとI/O失敗の分類分離で修正できる可能性が高い。
- 上記方向だけで閉じるなら、19 path目や既存code改訂は不要である可能性が高い。

### 未確認

- 6群を一組で直した後に81/81へ到達するか。
- 直接影響130/130、green 287/287、baseline exact不変、5 tree不変。
- targetFileの安全性を、既存18 path内で重複計算なしにどの入力証拠へ一本化するか。
- failure report用staging rootの例外を、既存14 inner codeのまま全て正しく分類できるか。

## 6. 実現性調査の自己評価

今回の6主因は全て正式attempt前の読み取り監査で検出できた。

- 群B〜Fは、設計時の現物調査で「変更対象の全catch・全child call・全targetFile呼出し・全公開分岐」を逆影響まで全数照合すれば、実装前に検出できた。
- 群Aの未定義symbolそのものは実装で生じたため実装前には存在しなかったが、実装後・正式検査前のsymbol/call graph照合で検出できた。
- 今回、正式81件の前にproduction call graphと既存status mappingを再監査したため、壊れた成功経路を実行してから直す周回を回避できた。

以後の実現性調査では、既に標準化された「所有の実在・逆影響・値レベルargv」に加え、実装後の正式attempt前に次を全数照合する必要がある。

1. 新規・移動した関数呼出しの定義/import実在。
2. catch内で既存の検査済み拒否とfatalを混同していないこと。
3. 子processを呼ぶ全箇所の工程値と、生出力が親へ漏れないこと。
4. targetFileの全source fieldが固定許可表と実読取証拠へ接続していること。
5. 公開target検査と、検査後のI/O・公開失敗が別ownerへ帰属すること。
6. 新規検査が正常経路と既存rejected経路を少なくとも1件ずつ実経路で通すこと。

## 7. 実施していないこと

- 正式81件: 0/81（未実行）
- 直接影響130件: 未実行
- green 287件: 未実行
- baseline 181件: 未実行
- 5 tree最終照合: 未実行
- commit A: 未作成
- 18 path SHA表: 未作成
- API通信: 0回
- 費用: US$0

## 8. 次の判断

次に必要なのは、群A〜Fと検査証明不足を一組にした版付き修正設計の承認である。実装へ直接進まず、各修正が次の条件を満たすことを先に一件表で閉じる。

1. 成功経路、既存status、既存違反code、終了codeを変えない。
2. 生message・stack・stdout・stderr・本文・secretを保存しない。
3. 13 stage・14 inner code・targetFile安全規則を正しい実枝で実発火する。
4. 18 path上限を維持し、計算を複製しない。
5. 81件の一件表へ、今回不足した正常経路・既存rejected・QC工程・固定field表・staging root I/O・検証済みexport guardの証明を割り当てる。件数を81のまま維持するなら、どの既存IDを置換するかを事前固定する。

修正設計の提示後に、実装と正式attemptの再開を別途判断する。

# candidate 13 基本テロップ ゲートB2 観測記録置換 契約追補 v001

- 作成日: 2026-07-24
- 状態: **kawafmm承認済み（2026-07-24）。実装前の完全性監査で未固定4点を検出し、コード変更・検査実行前に停止**
- 追補先:
  `presentation-candidate13-caption-gate-b2-five-failure-two-audit-integrated-repair-design-20260724-v001.md`
- 起草根拠:
  - `presentation-candidate13-caption-gate-b2-integrated-repair-implementation-preflight-stop-20260724-v001.md`
  - 2026-07-24のkawafmmによる、観測記録置換追補の起草承認
- 承認根拠:
  - 2026-07-24のkawafmmによる本追補の明示承認と、2ファイル実装・全132件再検査の再開承認
- 人間作業: 本追補の承認1判断は完了。現在の再開条件は§16の4点を一つの版付き追補として確定する1判断。媒体視聴、時刻入力、正解生成は0件

## 1. 目的

承認済み統合修正設計§7.3は、検査用の一つの記録へ、対象stageの生の
`artifactReads`を含めるよう要求した。

実装前監査により、この生列はproduction runnerの内部状態にしかなく、承認済みの変更範囲である
package検査本体と合成検査の2ファイルから取得できないと確定した。

取得するには、次のいずれかが必要になる。

1. production runner、正式report、debug入口の公開面を増やす。
2. test側でproduction内部の生列に似た列を別実装で再構成する。

1は変更禁止範囲への拡張、2は実物と別の検査用ロジックの複製になる。
本追補はどちらも採らず、取得可能なproduction実操作と正式な判定結果の組合せへ検査記録を置換する。

置換後も確認したい事実は変えない。

> 対象stageの正式成果物読取りが、jobから導出した束縛済みrootの固定7ファイルへ到達し、
> 余分な成果物読取りをせず、注入した故障を指定位置で一度だけ観測し、
> 正式検査器と正式reportが同じ失敗へ帰属したこと。

ただし、生列そのものを失うため、置換で直接観測できなくなる情報と、
監視対象外について証明できないことは§7へ明記する。

## 2. 承認時の効力と上書き範囲

本追補が承認された場合、追補先設計v001と本追補v001を一組の実装正本とする。
追補先本文を黙って書き換えない。

本追補が改訂するのは次の記述だけである。

| 追補先 | 本追補による改訂 |
|---|---|
| §7.3の集約object | 取得不能な生の`artifactReads`を削除し、§3の4項目へ置換 |
| §7.3の実操作投影 | §4の対象root・全操作投影・固定7 `openReadOnly`完全一致を追加 |
| §7.4項目2〜4 | 生列を使う期待を、§5の複合証拠へ置換 |
| §13の検査可能性 | 「観測データの取得可能性」を独立項目として追加 |
| §15の保存証拠 | 生列を要求せず、§3〜§5の集約記録と既知限界を保存 |
| §16の停止条件 | 生列の一致を停止条件から外す。§3〜§5の完全一致不成立は停止条件として維持 |

次は変更しない。

- 118、119、123、124、132の原因帰属と修正対象
- R2案A
- file hash、canonical hash、bindingの意味
- 公開読取元pathの完全束縛
- 既存57違反コード、固定順、担当検査
- production runner、正式report、debug入口
- 正式7ファイル、schema、製造順
- package側132件を一度だけ頭から実行する順序
- 意味回答側、回帰、preflight、前提P、安定tagの完了条件
- 変更可能範囲2ファイル

承認時は、追補先設計の改訂履歴へ、本追補名、上書き対象、承認日を案内行として追記する。
それ以外の追補先本文は変更しない。

## 3. 置換後の集約記録

各対象行は、次のkey順の一objectとしてTAPのactualへ保存し、期待objectと完全一致させる。

```js
Object.freeze({
  faultTrace: null, // 故障注入なし。故障行では追補先§7.3のdeep-frozen entry一件
  filesystemOperations: Object.freeze([]), // §4の全操作投影
  violations: Object.freeze([]), // production package検査器の違反列
  publicationFailures: Object.freeze([]) // production reportの公開失敗要約列
})
```

上記の空配列は型を示す。各行では実観測の全要素を同じ順序で入れたdeep-frozen配列にする。
故障注入なしの`faultTrace`は必ず`null`とし、`[]`、`undefined`、空objectを認めない。
故障行のtrace entryのfield、順序、phaseは追補先§7.3を変更せず使う。

次を禁止する。

- 生の`artifactReads`に似た列をtest側で再構成する。
- 合格させるために4項目のいずれかを省略する。
- 実行結果を見て投影対象、操作種別、root、固定7ファイルの順序を変える。
- `filesystemOperations`から、期待に合わない操作だけを後から取り除く。
- production runner、正式report、debug入口へ観測用fieldを追加する。

## 4. 実ファイル操作と固定7読取りの契約

### 4.1 対象stage root

対象rootは実操作から推測せず、job正本だけから導出する。

| stage | 対象root |
|---|---|
| staging | `job.value.publication.formalOutputPath + ".work"` |
| published | `job.value.publication.formalOutputPath` |

input再確認の故障行は、新しい成果物rootを定義しない。
その行で成果物操作として投影するのは、input再確認より前に完了したstaging rootの操作である。
input側の故障pathは、jobへ固定済みのGate A入力pathを`faultTrace`で確認する。
Gate A入力directoryを成果物rootへ混ぜない。

各成果物の期待pathは、次の完全一致だけを認める。

```text
<対象root>/<固定PACKAGE_FILES[index]>
```

prefix一致、basename一致、実操作側pathの正規化による救済を行わない。

### 4.2 全操作投影

合成filesystem adapterが記録した実操作から、対象root配下の次の3種類を、
発生順のまま全件投影する。

1. `lstatBigInt`
2. `realpath`
3. `openReadOnly`

一件の形とkey順は次へ固定する。

```js
Object.freeze({
  operation: "<上記3種のいずれか>",
  path: "<absolute path>"
})
```

「全件」とは、対象root配下で上記3種類に該当した操作を、成功・失敗、期待内・期待外を問わず
一件も落とさないという意味である。余分、欠落、重複、順序違い、別pathの操作は
`filesystemOperations`全体の不一致にする。

### 4.3 固定7ファイルのopen完全一致

正常公開とtest 123の一覧欠落行では、§4.2から`openReadOnly`だけを順序保持で取り出した列を、
固定`PACKAGE_FILES`順の7 absolute pathと完全一致させる。

この検査は、固定7ファイルを「読み取った内容の生列」ではなく、
production runnerが実際に使うfilesystem adapterへ到達した7回のopen操作として観測する。

test 123は実行前に、合成filesystemへ置く固定7ファイルそれぞれについて、
fileName、byte列、file SHA-256、strict JSON復号値、canonical hashを、
その行のproduction builderが作った期待7成果物と完全一致させる。
一覧だけを6件へする処置より先に固定し、実行結果を見て再生成しない。

実行前束縛と、次の実行時証拠を共同で確認する。

- 違反列に子I/O、内容、hash、snapshot不成立が無い。
- `publicationFailures`が空である。
- test 123では一覧欠落のcode 53だけが存在する。

この組合せにより、test 123について
「一覧だけが6件で不正だが、固定7実体の読取り・検査は成立した」を確認する。

### 4.4 故障行

test 124の各故障行は、故障位置までに発生する操作列を行別oracleとして事前固定する。
故障後の操作を補完せず、別stageの操作を混ぜない。

各行で次を完全一致させる。

1. `faultTrace`: 故障ID、故障種類、absolute path、通過段階
2. `filesystemOperations`: 対象stage root配下で実際に発生した全対象操作
3. `violations`: production package検査器の帰属
4. `publicationFailures`: production reportの失敗位置と段階

`open`故障はopenを試みた事実、read／stat／close故障はopen後にどの段階へ到達したかを、
fault traceと実操作の組合せで区別する。
wrapperがbase adapterへ渡す前に`open`故障を投げる行では、失敗した一pathは
`filesystemOperations`へ現れない。その一件だけは`faultTrace`の
`matched / open-thrown`で補い、base adapterへ到達した残りのopen列と合わせて
固定7 slotの試行を確認する。成功openが7件あったとは主張しない。

input再確認の故障行は、staging固定7実体の成立と、続くGate A入力再読取の故障を分離する。
`filesystemOperations`はstaging rootの成果物操作、`faultTrace`はGate A入力path、
`violations`と`publicationFailures`はinput再確認段階の帰属をそれぞれ担当する。

## 5. 複合証拠が含意すること

| 確認したいこと | 使う証拠 | 含意する範囲 |
|---|---|---|
| 読取先が正規rootか | job由来root、固定7 absolute path、全操作投影、path-aware production検査 | 対象stage root配下の成果物openが、束縛済みpathへ向いた |
| 固定7以外を読んでいないか | 対象root配下の全`openReadOnly`列と固定7列の完全一致 | 対象stage root配下では、余分・欠落・重複・順序違いの成果物openが無い |
| 7実体が正常に検査されたか | 実行前の固定7実体束縛、固定7 open、子I/O・内容・hash・snapshot違反なし、公開失敗なし | production検査が、事前に期待成果物へ束縛した7実体を正常として扱った |
| 故障を指定位置へ一度だけ入れたか | fault traceのID・path・phases、実操作列 | test fixtureが指定path・段階へ一件だけ故障を注入した |
| 故障の帰属が一貫したか | fault trace、違反列、公開失敗要約 | 注入位置、検査器の違反、reportの失敗位置が同じ行の期待へ一致した |
| 一覧欠落だけを作れたか | directory entry 6件、固定7 open、code 53だけ、公開失敗0 | 一覧不正と7成果物の正常読取りを分離できた |

この複合証拠は、生の一列をtest側で模倣せず、production実操作とproductionの正式判定を
別々の由来のまま突き合わせる。

## 6. 生の読取列と同じ検査意図を保つ範囲

本置換は、次の検査意図については等価である。

1. 対象stageの成果物読取りが、jobから導出した正式rootへ向いたか。
2. 対象stage root配下で固定7ファイル以外の成果物openが起きていないか。
3. 固定7ファイルに欠落、重複、順序違いが無いか。
4. 注入した故障が、指定したpathと段階へ一度だけ到達したか。
5. production検査器と正式reportが、故障を期待した違反と失敗位置へ帰属したか。

これは、`filesystemOperations`を期待に都合のよい7件へ抽出するからではない。
対象root配下の全対象操作を先に順序保持で固定し、その中の`openReadOnly`列が
固定7 pathと完全一致するためである。

また、公開読取元pathの完全束縛はproduction検査本体で行う。
test専用操作記録だけで正規pathを認定しない。

## 7. 既知限界と主張しないこと

生の`artifactReads`を外すことで、次の直接観測は失われる。

1. 成功した7件それぞれの内部slot、status、snapshotを、runner内部と同じraw shapeでTAPへ出すこと。
2. 各成功読取りの内部状態遷移を、raw列単独で追うこと。

代わりに、実操作とproduction検査結果の組合せから成立を確認する。
したがって、本置換を「raw列と情報量まで完全同一」「検出力が一切下がらない」とは主張しない。

また、次は本検査の証明範囲外である。

- staging／publishedの対象root外にある任意ファイルを、production全体が一切読んでいないこと。
- §4.2に含めない別operation名による読取りが、production全体のどこにも無いこと。
- metadata確認を含む全filesystem操作が固定7回だけであること。
- 故障したslotの内容が正しいこと。故障行で確認するのは、読取不能を指定位置へ正しく帰属したこと。

本追補が証明する「それ以外を読んでいない」は、
**対象stage root配下で、adapterが記録する成果物内容openに余分が無い**
という範囲に限定する。

対象root外の読取りや別operationについては、既存のjob入力束縛、source監視、実装binding、
production入口制限がそれぞれの担当範囲を検査する。本追補から
「productionが全世界で他ファイルを一切読まない」へ拡張しない。

## 8. Gate Aの読み取り専用入口を採らない理由

Gate Aで採用した前例は、runnerがproductionで実際に使う**純粋な判定処理**を、
同じ関数bindingのまま検査から呼べるようにしたものである。
判定処理を共有し、production内部の実行時状態を新たに公開したものではない。

今回必要だった生の`artifactReads`は、判定関数ではなくrunner内部で生きる実行時観測列である。
同じ前例を適用するには、その内部列を返す新しい観測点をproductionへ追加しなければならない。

hash計算や純粋validatorの「同じ処理を共有すること」と、
runner内部の生観測を「新しい公開面として外へ出すこと」は別である。
検査都合でproductionの公開面を増やさないため、Gate A方式は本件では採らない。

## 9. test 123・124の改訂後期待

### 9.1 test 123

- 実行前の固定7実体: fileName、byte、file SHA-256、strict JSON復号値、canonical hashが
  production builderの期待7成果物と完全一致
- directory entry: 6件
- 固定7 `openReadOnly`: 固定順で完全一致
- 子I/O・内容・hash・snapshotの追加違反: 0件
- 違反: code 53の一件だけ
- publication failure: 0件
- input再確認以降: 未実行

生の`artifactReads`件数は期待値にもTAP actualにも含めない。

### 9.2 test 124

9行のtransport表それぞれについて、次を一つの集約記録へ保存する。

- fault trace一件
- 対象stage root配下の全対象操作
- 違反列
- publication failure要約

input再確認行は、staging rootの固定7成果物操作と、job固定のGate A入力pathに対する
fault traceを別由来のまま同じ記録へ持つ。

行別の故障位置、故障段階、操作到達点、違反、失敗要約を完全一致させる。
一致しない場合は同attempt内で期待値を直さず停止する。

### 9.3 fault wrapper自己検査

match 0件または2件以上は、fixture自身の不成立として失敗させる。
別のproduction違反による偽合格を認めない。

## 10. 保存する証拠の改訂

追補先§15のうち、本件に関する保存物を次へ置換する。

1. test 123の集約記録
2. test 124の9行分の集約記録
3. 対象rootと固定7 expected pathの導出根拠
4. `filesystemOperations`全件投影と、`openReadOnly`固定7完全一致結果
5. fault trace、違反列、publication failureの完全一致結果
6. §7の既知限界

TAP全文とSHA-256を保存する既存条件は維持する。

## 11. 実装契約完全性チェックの追加項目

今後の実装系設計ゲートでは、既存の「検査可能性」「工程間の受け渡し」と別に、
次の**観測データの取得可能性**を承認前に確認する。

設計が合否根拠、完全一致assert、TAP actual、完了報告へ要求する各観測項目について、
一項目ずつ次を固定する。

1. 値の生成場所と生存期間
2. 許可された変更範囲内の取得入口または既存返却値
3. exact shape、順序、取得時点
4. production実体の直接観測か、test専用観測か
5. 複数証拠から含意する場合は、含意する命題と検出不能範囲
6. 取得するconsumerまたは検査
7. 取得不能と判明した場合の停止点

取得不能な値を、未承認のproduction公開面、debug入口、同等ロジックの複製で補わない。
要求を代替観測へ変更する場合、または変更範囲を広げる場合は、
検出力の差と既知限界を明記した版付き追補として人間承認へ戻す。

既存項目との違いは次のとおり。

| 項目 | 問うこと |
|---|---|
| 検査可能性 | 正本入口から判定器を呼び、正常・違反の合否を観測できるか |
| 工程間の受け渡し | production上流の必須値が、承認済み経路で下流consumerへ届くか |
| 観測データの取得可能性 | 設計が証拠として要求した詳細値を、許可範囲内で実際に取得・保存できるか |

今回、runnerは呼べて合否も観測でき、production工程の必須入力受け渡しも成立していた。
それでも、test証拠として要求した生の`artifactReads`だけが取得不能だった。
このため第三の独立項目が必要である。

## 12. 変更可能範囲と禁止事項

承認後の変更可能範囲は、追補先設計§12の2ファイルから広げない。

許可候補:

1. `presentation_caption_semantic_source_package_v001.mjs`
2. `test_presentation_caption_semantic_source_package_v001.mjs`

本追補で新たに許可しないもの:

- production runner、正式report、debug入口の変更
- 生の読取列を返す新しいexport、CLI引数、環境変数、stdin
- test側のraw読取列再構成
- 既存違反コード、schema、hash意味、正式7ファイルの変更
- 正式package生成、prompt登録、Gemini実走、指示書、描画

## 13. 承認後の再開順序

本追補の明示承認後だけ、追補先設計§14の順序へ戻る。

1. 追補先の改訂履歴へ案内行を追加し、DECISIONS／HANDOVERを承認済みへ同期する。
2. 許可2ファイルだけを修正する。
3. package側132件を先頭から一度だけ実行する。
4. 一件でも不合格、skip、todo、cancelがあれば、同attemptで修正せず停止する。
5. 全件合格時だけ、意味回答側、Gate A回帰、残存source atom回帰、candidate 13 preflight、前提P再照合へ進む。
6. 安定点3条件を満たした場合だけ、JOURNALと同一commitでB2 stable tagを発行する。
7. B2完了報告と、正式package生成・Gemini実走の次ゲート承認依頼を起草して停止する。

## 14. 停止条件

次の一つでも起きた場合は、期待値の修正や再実行へ進まず停止する。

- §3の4項目を許可範囲内で取得できない。
- §4の全操作投影または固定7 `openReadOnly`完全一致を実装者判断なしに作れない。
- fault trace、実操作、違反、公開失敗の帰属が一意でない。
- 対象root外まで「余分な読取りなし」と主張しなければ検査を成立させられない。
- production runner、正式report、debug入口の変更が必要になる。
- test側でproductionの生観測を模倣する必要が生じる。
- 追補先設計との新しい矛盾、未固定事項、実測前提不一致が見つかる。

## 15. 人間へ求める判断

1判断だけでよい。

> 本追補v001を承認し、取得不能な生の`artifactReads`を、
> fault trace・対象root配下の全実操作・違反列・公開失敗要約と、
> 固定7 `openReadOnly`の完全一致へ置換してよいか。

承認前は、コード変更、package側132件、後続検査、正式package、Gemini、指示書、描画を行わない。

## 16. 承認後の実装前監査記録

2026-07-24、kawafmmの承認を受領した後、§13のコード変更前に実装契約完全性を再監査した。
その結果、次の4点は実装者判断なしに一意な期待列へ落とせないと判明した。

1. test 123で、production builderが実行中に生成する固定7実体を「実行前」に束縛する時点
2. jobの相対pathからabsolute pathへ変換する正本と、「対象root配下」がroot自身を含むか
3. 故障後もrunnerが実際に継続した対象操作を集約記録へ含めるか
4. 一件だけであるfault traceのsnapshot配列を、集約objectへ配列のまま入れるかentry一件へ展開するか

いずれもTAPの完全一致期待を変える契約事項であり、§14の
「全操作投影を実装者判断なしに作れない」「帰属が一意でない」
「追補先設計との新しい矛盾・未固定事項」に該当する。
このため、許可2ファイル、変更禁止runner、package側132件、後続検査には着手せず停止した。

正本停止報告:
`presentation-candidate13-caption-gate-b2-observation-replacement-implementation-preflight-stop-20260724-v001.md`

本節は承認と停止の事実記録であり、上記4点を黙って補う契約改訂ではない。
再開には、停止報告の推奨方向を版付き追補として確定する人間承認を要する。

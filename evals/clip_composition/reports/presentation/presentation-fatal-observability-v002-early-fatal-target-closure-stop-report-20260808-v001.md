# fatal観測性v002 早期fatal対象file閉包 停止報告 v001

- 日付: 2026-08-08
- 状態: **STOP**
- 開始commit: `84c723362de8a0ee0d74fd0303eabab0992c879f`
- 実装正本（正式attempt前・閉包監査 修正設計v001）SHA-256: `e28c1ece96cc33bc25bbac5aa1c2381b10a872041943548f0befbe763b23bbf6`
- 承認元停止報告SHA-256: `f65e364bee7a9acafd9b479e9a31e97dd0a2e6bb7ec411975191dda073760e15`
- 外部通信: 0回
- 費用: US$0

## 1. 結論

承認された2群のうち、公開前再読入口の自己認定除去と、F03既存40 ID内の実経路証明強化は実装できた。

しかし、正式81件の前に行う追加監査4で、新たな現物差を確認した。timelineと意味情報packageの**通常の早期fatal経路**に、呼出側が渡したfield名・path・SHAだけから「検証済み対象」を自作するprivate helperが残っている。公開前再読入口だけを直しても、境界全体としての「呼出側自己許可0件」は成立していない。

これは実装正本§3.2と追加監査4の不成立であり、停止条件「新たな現物差」に該当する。正式81件、後続回帰、5 tree照合、commit Aは実行せず停止した。

## 2. 成立した修正

### 2.1 timelineの公開前再読入口

- 対象: `evals/clip_composition/presentation_timeline_composition_decision_v001.mjs`
- 現在SHA-256: `42a3ecc545e4abc425a099eae7f2fd1caad8329605e86151bf944f43dc53d90e`
- jobの実byteを既存strict decoderと既存validatorで検証する。
- 検証済みjobから許可対象のpath・SHA・正式field名を組み立てる。
- 呼出側のfield名を選択根拠にせず、path・SHAのexact一件一致だけを対象fileにする。
- 0件・複数件・未検証jobでは`targetFile: null`とする。
- formal runnerは、実際に読んだjob pathとjob byteを同じ入口へ渡す。

### 2.2 意味情報packageの公開前再読入口

- 対象: `evals/clip_composition/run_presentation_meaning_information_package_job_v001.mjs`
- 現在SHA-256: `34f070c02d472375a6bc43f23376bcee7013c579f82b13f649cec4b4e011c846`
- jobと上流timeline decisionの実byteを既存decoder・validator・file/canonical SHAで検証する。
- 検証済みjobとtimeline decisionから許可対象集合を組み立て、path・SHA exact一件一致だけを対象fileにする。
- 0件・複数件・未検証recordでは`targetFile: null`とする。
- formal runnerは実際に読んだjob byteとtimeline decision byteを同じ入口へ渡す。

### 2.3 F03の実経路証明

- 対象: `evals/clip_composition/presentation_fatal_observability_v002.integration.test.mjs`
- 現在SHA-256: `b9d1c12aea0ee69040d32050335433eb59443d68edfe536992858b4e13f9dea5`
- 40 IDは不変（FOVI 9、FOVB 18、FOVF 8、FOVT 5）。
- Gate Aと描画QCはproduction core／evaluatorの実返値を直接確認し、手製の結果objectを廃止した。
- 旧B1、意味終端、timeline拒否4枝は、正式writer byte・status・終了code・exact codeの照合へ強化した。
- 横断検査はtimeline以外も実際のrejected経路へ接続し、source中の語だけを証拠にしない形へ直した。

構文検査と差分空白検査は合格した。正式検査は未実行であるため、本節は静的な実装成立を示すだけで、81/81合格を示さない。

## 3. 追加監査6項目

| 項目 | 判定 | 現物照合の結果 |
| --- | --- | --- |
| 1. 定義・import・export実在 | PASS | F03・F04・F11の参照実体と構文を再照合した |
| 2. rejectedとfatalのcatch分離 | PASS | 今回の変更は既存の拒否順・status・codeを変更していない |
| 3. child process工程値と生出力非漏洩 | PASS | 今回の変更にchild process経路と保存内容の変更はない |
| 4. targetFileと検証済みsource recordの接続 | **FAIL** | 公開前再読は成立したが、F04・F11の通常早期fatal helperに呼出側自己許可が残る |
| 5. 保存先不正と公開失敗のowner分離 | PASS | 固定sentinelと公開開始後の失敗ownerは不変 |
| 6. 正常経路と既存rejected経路の実検査 | PASS（静的） | F03既存40 IDの実入口・正式byte・exact codeへの接続を確認した。正式test実行は監査4の停止により未実施 |

総合: **6/6不成立**。監査4のFAILだけで正式attempt開始条件を満たさない。

## 4. 新たに確認した現物差

### 4.1 F04 timelineの通常早期fatal

`presentation_timeline_composition_decision_v001.mjs:101-113`のprivate helperは、呼出側から受けた`sourceField`とbindingを一件の`verifiedTargetSources`へそのまま入れ、`sourceRecordVerified: true`として共通selectorへ渡す。

このhelperは次の早期fatalで使われる。

- source identity読取失敗: 同file `925-928`
- 正式媒体読取失敗: 同file `949-952`
- 残存発話成果物読取失敗: 同file `989-992`
- 実装・契約binding読取失敗: 同file `1111`

現在のcallsiteは検証済みjobからbindingを取っている。しかし、その検証証拠をhelperへ渡さず、helper内でcaller値だけを検証済み扱いしているため、構造としての自己許可が残る。

### 4.2 F11 意味情報packageの通常早期fatal

`run_presentation_meaning_information_package_job_v001.mjs:153-165`のprivate helperも、呼出側の`sourceField`とbindingから一件の検証済み集合を作る。さらに`sourceRecordVerified`の既定値が`true`である。

このhelperは次の早期fatalで使われる。

- source identity／正式媒体: 同file `769-772`、`798-801`
- 残存発話成果物: 同file `855-858`
- 実装・契約binding: 同file `960`
- timeline decision: 同file `983-986`
- 意味検証成果物: 同file `1055-1058`
- 意味入力package: 同file `1091-1094`
- 意味選択成果物: 同file `1123-1126`

`semanticValidation.sourcePackageBinding`は固定許可field表の外なので、共通selectorの最終結果はnullになる。それでも、private helperがcaller値から検証済み集合を自作する構造そのものは、追加監査4の条件を満たさない。

### 4.3 固定許可field表

固定許可field表と共通selectorは正しく機能しており、変更していない。

- 対象: `evals/clip_composition/presentation_fatal_observation_v002.mjs`
- SHA-256: `cf95c2ba8785be681dcecc03dc4ec009d6f02b4161e3c39f7edbf431b92b6115`
- 検証済みrecord、許可field、path・SHA exact一件一致を要求する。
- 0件・複数件・未検証recordではnullを返す。

今回の穴は表や共通selectorではなく、その手前でprivate helperが検証済み集合を自己申告していることにある。

## 5. 帰属

### 5.1 事実

- production側の対象file閉包が、公開前再読exportでは成立し、通常早期fatal helperでは不成立である。
- 固定許可field表、schema、status、既存違反code、終了codeの矛盾は見つかっていない。
- 現callsiteのbindingは、既存jobまたは上流timeline decisionから追跡できる。
- 正式成果物、既存5 tree、固定許可field表は変更していない。
- 正式81件と後続検査は0回である。

### 5.2 帰属判定

**production実装の閉包不足**である。契約矛盾、fixtureの期待誤り、固定許可field表の不足ではない。

### 5.3 推測

既存job／timeline decisionの検証済み集合を通常早期fatalにも渡せば、F04・F11の2 path内で閉じる見込みである。ただし未実装・未検査なので、合格は未確認である。

### 5.4 未確認

- 修正後の追加監査6/6
- 正式81/81
- 直接影響130/130
- green 287/287
- baseline 64/181 exact集計不変
- 既存5 tree最終照合

## 6. 実現性調査で事前検出できたか

**検出できた。**

今回の実現性調査は、停止報告で名指しされた公開前再読exportを中心に追跡し、同じ共通selectorを包むprivate helperと全callsiteの列挙まで深度を広げなかった。そのため「公開入口は閉じたが、同じ境界の通常早期fatalは閉じていない」という差を実装後監査まで残した。

今後この型では、公開exportだけでなく、共通selectorへ到達する全wrapper・全callsiteを列挙し、各経路について「検証済みrecordをどこで作り、どこまで渡すか」を表にする必要がある。これは契約の不足ではなく、実現性調査の探索範囲不足である。

## 7. 次の最小修正案（未実装）

一つの版付き修正設計で次を固定する。

1. F04・F11の自己許可private helperを廃止するか、検証済みsource集合を必須引数とする。
2. 既存decoder・validatorでjob／timeline decisionを検証した直後に、公開前再読と同じ既存処方で検証済み集合を一度だけ作る。
3. 通常早期fatalは、その集合と実読取対象のpath・SHAを共通selectorへ渡す。callerのfield名だけから集合を作らない。
4. exact一件一致だけを対象fileにし、0件・複数件・未検証・固定表外はnullにする。
5. F03既存40 ID内を第一候補に、通常早期fatalの検証済み一件／未検証／複数一致を実枝で証明する。件数変更が必要なら事前に閉じる。

固定許可field表、新しい対象file計算、decoder、validator、schema、status、既存違反code、終了codeは変更しない。F04／F11の2 path内で閉じない場合は、19 path目を追加せず範囲改訂として戻す。

## 8. 停止時点

- 公開前再読入口の限定修正: 静的実装済み
- F03 40 IDの証明強化: 静的実装済み
- 追加監査: 監査4でFAIL、総合6/6不成立
- 正式81件: **0回**
- 正式TAP: 未作成
- 正式attempt root: 未作成
- 直接影響130件: **0回**
- green 287件: **0回**
- baseline 181件: **0回**
- 5 tree最終照合: **0回**
- commit A: 未作成
- 正式成果物変更: 0件
- API通信: 0回
- 費用: US$0

不合格を見て期待値を動かす行為、固定表の拡張、同attemptでの追加修正は行っていない。

## 9. 再開に必要な判断

承認依頼文案:

> 早期fatal対象file閉包停止報告v001の停止を受理し、§7の限定修正設計の起草を承認する。F04・F11の通常早期fatalでは、呼出側のfield名・bindingから検証済み集合を自作するprivate helperを廃し、既存decoder・validatorで検証済みのjob／timeline decisionから一度だけ構築した集合を全早期fatalへ明示的に渡す。対象fileは固定許可field・実読取path・SHAのexact一件一致だけとし、0件・複数件・未検証・許可外はnullにする。固定許可field表、新しい対象file計算、schema、status、既存違反code、終了code、正式成果物は変更しない。F03既存40 ID内を第一候補に通常早期fatalの検証済み一件／未検証／複数一致を実枝で証明する。修正後は追加監査6/6を最初から行い、合格時だけ正式81件の新attempt、直接影響130、green 287、baseline exact、5 tree、commit Aと18 path SHA表へ進む。新たな現物差、不合格1件、19 path目、契約解釈が必要な場合は同attemptで直さず停止する。
